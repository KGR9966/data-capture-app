import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

import { Checklist, ChecklistItem, deleteChecklist, deleteChecklistItem, toggleChecklistPoint, updateChecklistItem } from "./checklists";

const CHECKLISTS_CACHE_KEY = (userId: string) => `@checklists_cache:${userId}`;
const ITEMS_CACHE_KEY = (checklistId: string) => `@checklist_items_cache:${checklistId}`;
const PENDING_OPS_KEY = (userId: string) => `@checklists_pending_ops:${userId}`;

export type PendingOpType =
  | "updateChecklist"
  | "deleteChecklist"
  | "updateChecklistItem"
  | "deleteChecklistItem"
  | "toggleChecklistItem";

export interface PendingOp {
  id: string;
  type: PendingOpType;
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
  error?: string;
}

let networkUnsubscribe: (() => void) | null = null;
let currentUserId: string | null = null;

function generateOpId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function loadCachedChecklists(userId: string): Promise<Checklist[]> {
  try {
    const raw = await AsyncStorage.getItem(CHECKLISTS_CACHE_KEY(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Checklist[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[checklistsOffline] loadCachedChecklists error:", error);
    return [];
  }
}

export async function saveCachedChecklists(
  userId: string,
  checklists: Checklist[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CHECKLISTS_CACHE_KEY(userId),
      JSON.stringify(checklists)
    );
  } catch (error) {
    console.error("[checklistsOffline] saveCachedChecklists error:", error);
  }
}

export async function clearCachedChecklists(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHECKLISTS_CACHE_KEY(userId));
  } catch (error) {
    console.error("[checklistsOffline] clearCachedChecklists error:", error);
  }
}

export async function loadCachedItems(
  checklistId: string
): Promise<ChecklistItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ITEMS_CACHE_KEY(checklistId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChecklistItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[checklistsOffline] loadCachedItems error:", error);
    return [];
  }
}

export async function saveCachedItems(
  checklistId: string,
  items: ChecklistItem[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ITEMS_CACHE_KEY(checklistId),
      JSON.stringify(items)
    );
  } catch (error) {
    console.error("[checklistsOffline] saveCachedItems error:", error);
  }
}

export async function clearCachedItems(checklistId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(ITEMS_CACHE_KEY(checklistId));
  } catch (error) {
    console.error("[checklistsOffline] clearCachedItems error:", error);
  }
}

async function loadPendingOps(userId: string): Promise<PendingOp[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_OPS_KEY(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[checklistsOffline] loadPendingOps error:", error);
    return [];
  }
}

async function savePendingOps(userId: string, ops: PendingOp[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_OPS_KEY(userId), JSON.stringify(ops));
  } catch (error) {
    console.error("[checklistsOffline] savePendingOps error:", error);
  }
}

export async function getPendingOpsCount(userId: string): Promise<number> {
  const ops = await loadPendingOps(userId);
  return ops.length;
}

export async function getPendingOpsForChecklist(
  userId: string,
  checklistId: string
): Promise<PendingOp[]> {
  const ops = await loadPendingOps(userId);
  return ops.filter(
    (op) =>
      op.payload.checklistId === checklistId ||
      (op.payload.checklist as Checklist | undefined)?.id === checklistId
  );
}

export function compactPendingOps(ops: PendingOp[]): PendingOp[] {
  // Keep non-toggle ops in order. For consecutive toggle ops targeting the same
  // checklist item, only keep the last one so we don't fire multiple writes.
  const result: PendingOp[] = [];
  const lastByKey: Record<string, PendingOp> = {};

  for (const op of ops) {
    if (op.type === "toggleChecklistItem") {
      const key = `toggle:${op.payload.checklistId}:${op.payload.itemId}`;
      lastByKey[key] = op;
    } else {
      result.push(op);
    }
  }

  const toggleOps = Object.values(lastByKey).sort(
    (a, b) => a.createdAt - b.createdAt
  );
  return [...result, ...toggleOps].sort((a, b) => a.createdAt - b.createdAt);
}

async function addPendingOp(userId: string, op: PendingOp): Promise<void> {
  const ops = compactPendingOps([...(await loadPendingOps(userId)), op]);
  await savePendingOps(userId, ops);
}

async function removePendingOp(userId: string, opId: string): Promise<void> {
  const ops = (await loadPendingOps(userId)).filter((op) => op.id !== opId);
  await savePendingOps(userId, ops);
}

async function markPendingOpError(
  userId: string,
  opId: string,
  error: string
): Promise<void> {
  const ops = (await loadPendingOps(userId)).map((op) =>
    op.id === opId ? { ...op, error, retries: op.retries + 1 } : op
  );
  await savePendingOps(userId, ops);
}

export async function flushPendingOps(userId: string): Promise<void> {
  const ops = await loadPendingOps(userId);
  if (ops.length === 0) return;

  for (const op of ops) {
    if (op.retries >= 3) continue; // Give up after repeated failures.

    try {
      await executePendingOp(op);
      await removePendingOp(userId, op.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[checklistsOffline] flushPendingOp error:", op, error);
      await markPendingOpError(userId, op.id, message);
    }
  }
}

async function executePendingOp(op: PendingOp): Promise<void> {
  switch (op.type) {
    case "updateChecklist": {
      const { checklistId, updates } = op.payload as {
        checklistId: string;
        updates: Partial<Omit<Checklist, "id" | "createdAt">>;
      };
      const { updateChecklist } = await import("./checklists");
      await updateChecklist(checklistId, updates);
      break;
    }
    case "deleteChecklist": {
      const { checklistId, userId } = op.payload as {
        checklistId: string;
        userId: string;
      };
      await deleteChecklist(checklistId, userId);
      break;
    }
    case "updateChecklistItem": {
      const { checklistId, itemId, updates, userId } = op.payload as {
        checklistId: string;
        itemId: string;
        updates: Partial<Omit<ChecklistItem, "id" | "checklistId" | "createdAt">>;
        userId: string;
      };
      await updateChecklistItem(checklistId, itemId, updates, userId);
      break;
    }
    case "deleteChecklistItem": {
      const { checklistId, itemId, userId } = op.payload as {
        checklistId: string;
        itemId: string;
        userId: string;
      };
      await deleteChecklistItem(checklistId, itemId, userId);
      break;
    }
    case "toggleChecklistItem": {
      const { checklist, item, userId } = op.payload as {
        checklist: Checklist;
        item: ChecklistItem;
        userId: string;
      };
      await toggleChecklistPoint(checklist, item, userId);
      break;
    }
    default:
      console.warn("[checklistsOffline] unknown pending op type:", op.type);
  }
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function initializeNetworkListener(userId: string): () => void {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
  currentUserId = userId;

  networkUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    if (online && currentUserId) {
      flushPendingOps(currentUserId).catch((error) => {
        console.error("[checklistsOffline] auto-flush error:", error);
      });
    }
  });

  return () => {
    if (networkUnsubscribe) {
      networkUnsubscribe();
      networkUnsubscribe = null;
    }
    currentUserId = null;
  };
}

export function stopNetworkListener(): void {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
  currentUserId = null;
}

export async function clearAllOfflineData(userId: string): Promise<void> {
  try {
    await clearCachedChecklists(userId);
    await savePendingOps(userId, []);
    const keys = await AsyncStorage.getAllKeys();
    const itemKeys = keys.filter((k) => k.startsWith("@checklist_items_cache:"));
    await AsyncStorage.multiRemove(itemKeys);
  } catch (error) {
    console.error("[checklistsOffline] clearAllOfflineData error:", error);
  }
}

// Optimistic offline helpers used by the UI.

export async function toggleChecklistPointOffline(
  checklist: Checklist,
  item: ChecklistItem,
  completed: boolean,
  userId: string
): Promise<PendingOp> {
  const op: PendingOp = {
    id: generateOpId(),
    type: "toggleChecklistItem",
    payload: { checklist, item, completed, userId },
    createdAt: Date.now(),
    retries: 0,
  };
  await addPendingOp(userId, op);

  if (await isOnline()) {
    await flushPendingOps(userId);
  }
  return op;
}

export async function updateChecklistItemOffline(
  checklistId: string,
  itemId: string,
  updates: Partial<Omit<ChecklistItem, "id" | "checklistId" | "createdAt">>,
  userId: string
): Promise<void> {
  const op: PendingOp = {
    id: generateOpId(),
    type: "updateChecklistItem",
    payload: { checklistId, itemId, updates, userId },
    createdAt: Date.now(),
    retries: 0,
  };
  await addPendingOp(userId, op);

  if (await isOnline()) {
    await flushPendingOps(userId);
  }
}

export async function deleteChecklistItemOffline(
  checklistId: string,
  itemId: string,
  userId: string
): Promise<void> {
  const op: PendingOp = {
    id: generateOpId(),
    type: "deleteChecklistItem",
    payload: { checklistId, itemId, userId },
    createdAt: Date.now(),
    retries: 0,
  };
  await addPendingOp(userId, op);

  if (await isOnline()) {
    await flushPendingOps(userId);
  }
}

export async function deleteChecklistAndClearCache(
  checklistId: string,
  userId: string
): Promise<void> {
  const op: PendingOp = {
    id: generateOpId(),
    type: "deleteChecklist",
    payload: { checklistId, userId },
    createdAt: Date.now(),
    retries: 0,
  };
  await addPendingOp(userId, op);
  await clearCachedItems(checklistId);

  if (await isOnline()) {
    await flushPendingOps(userId);
  }
}
