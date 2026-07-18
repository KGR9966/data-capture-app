import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";

import { db } from "./firebase";
import { CaptureItem, updateItem } from "./items";

export interface Checklist {
  id: string;
  name: string;
  ownerId: string;
  projectId?: string;
  isDynamic: boolean;
  searchQuery?: Record<string, unknown>;
  sharedWith: Record<string, "owner" | "admin" | "editor" | "viewer">;
  syncStatusToSource: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  sourceItemId: string;
  sourceProjectId: string;
  sourceItemPath?: string;
  title: string;
  notes: string;
  isCompleted: boolean;
  completedAt?: any;
  completedBy?: string;
  orderIndex: number;
  createdAt?: any;
  updatedAt?: any;
}

const checklistsCollection = collection(db, "checklists");

function checklistItemsCollection(checklistId: string) {
  return collection(db, "checklists", checklistId, "items");
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

function prepareUpdateFields(
  updates: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(updates).map(([key, value]) => [
      key,
      value === undefined ? deleteField() : value,
    ])
  );
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function getUserId(): string | null {
  try {
    return getAuth().currentUser?.uid || null;
  } catch {
    return null;
  }
}

export async function createChecklist(
  name: string,
  options: {
    projectId?: string;
    isDynamic?: boolean;
    searchQuery?: Record<string, unknown>;
    syncStatusToSource?: boolean;
  } = {}
): Promise<Checklist> {
  const ownerId = getUserId();
  if (!ownerId) throw new Error("Du skal være logget ind for at oprette en liste.");

  const payload = stripUndefined({
    name: name.trim(),
    ownerId,
    projectId: options.projectId || undefined,
    isDynamic: options.isDynamic || false,
    searchQuery: options.searchQuery || undefined,
    sharedWith: {},
    syncStatusToSource: options.syncStatusToSource !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const docRef = await addDoc(checklistsCollection, payload);
  return { id: docRef.id, ...(payload as Omit<Checklist, "id">) };
}

export async function createChecklistFromItems(
  name: string,
  items: CaptureItem[],
  options: {
    projectId?: string;
    syncStatusToSource?: boolean;
  } = {}
): Promise<{ checklist: Checklist; items: ChecklistItem[] }> {
  const ownerId = getUserId();
  if (!ownerId) throw new Error("Du skal være logget ind for at oprette en liste.");

  const seen = new Set<string>();
  const deduplicatedItems = items.filter((item) => {
    const key = normalizeTitle(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduplicatedItems.sort((a, b) => a.title.localeCompare(b.title, "da-DK"));

  const checklist = await createChecklist(name, {
    projectId: options.projectId,
    syncStatusToSource: options.syncStatusToSource,
  });

  const checklistItems: ChecklistItem[] = [];
  for (let i = 0; i < deduplicatedItems.length; i++) {
    const item = deduplicatedItems[i];
    const payload = {
      checklistId: checklist.id,
      sourceItemId: item.id,
      sourceProjectId: item.projectId,
      sourceItemPath: `items/${item.id}`,
      title: item.title,
      notes: item.content || "",
      isCompleted: false,
      orderIndex: i,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(checklistItemsCollection(checklist.id), payload);
    checklistItems.push({ id: docRef.id, ...payload });
  }

  return { checklist, items: checklistItems };
}

export function subscribeToChecklists(
  userId: string,
  callback: (checklists: Checklist[]) => void
) {
  const q = query(
    checklistsCollection,
    where("ownerId", "==", userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const checklists = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Checklist, "id">),
        }))
        .sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() || 0;
          const bTime = b.updatedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
      callback(checklists);
    },
    (error) => {
      console.error("[subscribeToChecklists] error:", error);
      callback([]);
    }
  );
}

export function subscribeToChecklistItems(
  checklistId: string,
  callback: (items: ChecklistItem[]) => void
) {
  const q = query(checklistItemsCollection(checklistId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        checklistId,
        ...(d.data() as Omit<ChecklistItem, "id" | "checklistId">),
      }));
      callback(items);
    },
    (error) => {
      console.error("[subscribeToChecklistItems] error:", error);
      callback([]);
    }
  );
}

export async function getChecklistById(checklistId: string): Promise<Checklist | null> {
  const snap = await getDocs(query(checklistsCollection, where("__name__", "==", checklistId)));
  const doc_ = snap.docs[0];
  if (!doc_) return null;
  return { id: doc_.id, ...(doc_.data() as Omit<Checklist, "id">) };
}

export async function updateChecklist(
  checklistId: string,
  updates: Partial<Omit<Checklist, "id" | "createdAt">>
) {
  const ref = doc(db, "checklists", checklistId);
  await updateDoc(ref, {
    ...prepareUpdateFields(updates as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function updateChecklistItem(
  checklistId: string,
  itemId: string,
  updates: Partial<Omit<ChecklistItem, "id" | "checklistId" | "createdAt">>
) {
  const ref = doc(db, "checklists", checklistId, "items", itemId);
  await updateDoc(ref, {
    ...prepareUpdateFields(updates as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleChecklistItemComplete(
  checklist: Checklist,
  item: ChecklistItem,
  userId: string
): Promise<void> {
  const nextCompleted = !item.isCompleted;
  const now = serverTimestamp();

  await updateChecklistItem(checklist.id, item.id, {
    isCompleted: nextCompleted,
    completedAt: nextCompleted ? now : undefined,
    completedBy: nextCompleted ? userId : undefined,
  });

  if (nextCompleted && checklist.syncStatusToSource !== false) {
    try {
      await updateItem(item.sourceItemId, { status: "done" });
    } catch (error) {
      console.error("[toggleChecklistItemComplete] failed to sync source item status:", error);
    }
  }
}

export async function shareChecklistText(
  checklist: Checklist,
  items: ChecklistItem[]
): Promise<void> {
  const completedCount = items.filter((i) => i.isCompleted).length;
  const total = items.length;
  const openItems = items
    .filter((i) => !i.isCompleted)
    .sort((a, b) => a.title.localeCompare(b.title, "da-DK"));

  const lines = [
    `${checklist.name}`,
    ``,
    `${completedCount} af ${total} punkter udført`,
    ``,
    ...openItems.map((item, index) => `${index + 1}. ${item.title}`),
    ``,
    `Delt fra Data Capture`,
  ];

  const message = lines.join("\n");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Share = require("react-native-share").default;
  await Share.open({
    message,
    title: checklist.name,
    subject: checklist.name,
    failOnCancel: false,
  });
}

export async function deleteChecklist(checklistId: string): Promise<void> {
  const itemsSnapshot = await getDocs(checklistItemsCollection(checklistId));
  await Promise.all(itemsSnapshot.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "checklists", checklistId));
}
