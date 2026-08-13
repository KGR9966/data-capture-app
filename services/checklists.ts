import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";

import { buildChecklistUrl } from "./deeplinks";
import { db } from "./firebase";
import { CaptureItem, createItem, getItemById, updateItem } from "./items";
import {
  Checkpoint,
  createCheckpoint,
  deriveCheckpointsFromItem,
  getCheckpointsForItem,
  getOrCreateCheckpointsForItem,
  updateCheckpoint,
} from "./checkpoints";
import { parseSearchQuery, searchItems } from "./search";
import { deleteRemindersForChecklist, deleteRemindersForChecklistItem } from "./reminders";

/** Hardcoded test-seed email -> UID mapping. Seed script does not create /users docs,
 *  so this fallback lets E2E/manual tests share with the seeded users. */
const SEED_EMAIL_TO_UID: Record<string, string> = {
  "owner@example.com": "user_owner",
  "editor@example.com": "user_editor",
  "viewer@example.com": "user_viewer",
  "admin@example.com": "user_admin",
  "email_editor@example.com": "email_user",
};

const SEED_UID_TO_EMAIL: Record<string, string> = Object.fromEntries(
  Object.entries(SEED_EMAIL_TO_UID).map(([email, uid]) => [uid, email])
);

export type ChecklistSortBy = "alphabetical" | "date" | "priority";
export type SourceField = "title" | "content" | "category";

export interface ChecklistLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  notifyOnArrival: boolean;
  notifyOnDeparture?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Checklist {
  id: string;
  name: string;
  ownerId: string;
  projectId?: string;
  isDynamic: boolean;
  searchQuery?: { raw: string; [key: string]: unknown };
  sourceFields?: SourceField[];
  sortBy?: ChecklistSortBy;
  sharedWith: Record<string, "owner" | "admin" | "editor" | "viewer">;
  /** @deprecated Adskillelse af status gør denne toggle overflødig; beholdes for backwards compat. */
  syncStatusToSource?: boolean;
  hasNewMatches?: boolean;
  deletedItemKeys?: string[];
  lastViewedAt?: any;
  locations?: ChecklistLocation[];
  createdAt?: any;
  updatedAt?: any;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  sourceItemId: string;
  sourceProjectId: string;
  sourceItemPath?: string;
  sourceCheckpointId?: string;
  sourceField: SourceField | "manual";
  lineIndex?: number;
  title: string;
  notes: string;
  isCompleted: boolean;
  completedAt?: any;
  completedBy?: string;
  orderIndex: number;
  priority?: number;
  isNewMatch?: boolean;
  isStale?: boolean;
  staleNote?: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
  createdAt?: any;
  updatedAt?: any;
  isPending?: boolean;
  pendingError?: string;
  localOnly?: boolean;
}

export interface SharedChecklistIndex {
  checklistId: string;
  ownerId: string;
  name: string;
  sharedAt: any;
}

export interface CreateDynamicChecklistOptions {
  /** Påkrævet ved oprettelse fra søgning. */
  projectId: string;
  sourceFields?: SourceField[];
  sortBy?: ChecklistSortBy;
}

export function projectChecklistsCollection(projectId: string) {
  return collection(db, "projects", projectId, "checklists");
}

export function personalChecklistsCollection(userId: string) {
  return collection(db, "users", userId, "checklists");
}

export function sharedChecklistsCollection(userId: string) {
  return collection(db, "users", userId, "sharedChecklists");
}

export function projectChecklistItemsCollection(projectId: string, checklistId: string) {
  return collection(db, "projects", projectId, "checklists", checklistId, "items");
}

export function personalChecklistItemsCollection(userId: string, checklistId: string) {
  return collection(db, "users", userId, "checklists", checklistId, "items");
}

function checklistCollection(checklist: Pick<Checklist, "projectId" | "id" | "ownerId">) {
  return checklist.projectId
    ? projectChecklistsCollection(checklist.projectId)
    : personalChecklistsCollection(checklist.ownerId);
}

function checklistItemsCollection(checklist: Pick<Checklist, "projectId" | "id" | "ownerId">) {
  return checklist.projectId
    ? projectChecklistItemsCollection(checklist.projectId, checklist.id)
    : personalChecklistItemsCollection(checklist.ownerId, checklist.id);
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

function cleanLocationForFirestore(
  loc: ChecklistLocation | Record<string, unknown>
): ChecklistLocation {
  // Firestore rejects undefined values inside array elements, so strip them.
  const cleaned = stripUndefined(loc as Record<string, unknown>) as Record<string, unknown>;
  // Ensure numeric coordinates are real finite numbers.
  const latitude =
    typeof cleaned.latitude === "string"
      ? parseFloat(cleaned.latitude)
      : Number(cleaned.latitude);
  const longitude =
    typeof cleaned.longitude === "string"
      ? parseFloat(cleaned.longitude)
      : Number(cleaned.longitude);
  const radiusMeters =
    typeof cleaned.radiusMeters === "string"
      ? parseFloat(cleaned.radiusMeters)
      : Number(cleaned.radiusMeters);

  return {
    id: String(cleaned.id),
    name: String(cleaned.name),
    latitude,
    longitude,
    radiusMeters,
    notifyOnArrival: Boolean(cleaned.notifyOnArrival),
    notifyOnDeparture:
      cleaned.notifyOnDeparture === undefined ? undefined : Boolean(cleaned.notifyOnDeparture),
    createdAt: cleaned.createdAt,
    updatedAt: cleaned.updatedAt,
  };
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

function normalizeItemKey(title: string): string {
  return normalizeTitle(title);
}

/** Deterministic checklist-item ID so concurrent sync calls converge to one doc. */
function checklistItemDocId(
  checklistId: string,
  point: Pick<ChecklistItem, "sourceItemId" | "sourceField" | "lineIndex">
): string {
  return `${checklistId}_${point.sourceItemId}_${point.sourceField}_${point.lineIndex ?? 0}`;
}

function getUserId(): string | null {
  try {
    return getAuth().currentUser?.uid || null;
  } catch {
    return null;
  }
}

function statusToPriority(status?: string): number {
  switch (status) {
    case "new":
      return 3;
    case "in_progress":
      return 2;
    case "done":
      return 1;
    case "archived":
      return 0;
    default:
      return 1;
  }
}

function splitEnumeration(text: string): string[] {
  const separator = /[,;]|\s+og\s+|\s+eller\s+/i;
  const parts = text
    .split(separator)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  if (parts.length <= 1) return [text.trim()];
  return parts;
}

function splitTextIntoPoints(text: string): string[] {
  const points: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s]*[-*•][\s]+/, "").trim())
    .filter(Boolean);
  for (const line of lines) {
    // Split sentences first.
    const sentences = line.split(/(?<=[.!?])\s+/).filter(Boolean);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      // For short enumerations (shopping-list style), also split on comma / og / eller.
      const fragments = splitEnumeration(trimmed);
      for (const fragment of fragments) {
        if (fragment) points.push(fragment);
      }
    }
  }
  return points;
}

function parseSourceTextIntoPoints(
  text: string,
  sourceItem: CaptureItem,
  orderOffset: number,
  sourceField: SourceField
): Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt">[] {
  if (!text || !text.trim()) return [];

  const pointTitles = splitTextIntoPoints(text);
  const points: Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt">[] = [];

  for (let i = 0; i < pointTitles.length; i++) {
    const line = pointTitles[i];
    if (!line) continue;
    points.push({
      sourceItemId: sourceItem.id,
      sourceProjectId: sourceItem.projectId,
      sourceItemPath: `projects/${sourceItem.projectId}/items/${sourceItem.id}`,
      sourceField,
      lineIndex: sourceField === "content" ? i : undefined,
      title: line,
      notes: sourceItem.title ? `Fra: ${sourceItem.title}` : "",
      isCompleted: false,
      orderIndex: orderOffset + points.length,
      priority: statusToPriority(sourceItem.status),
    });
  }

  return points;
}

function extractPointsFromItem(
  item: CaptureItem,
  sourceFields: SourceField[],
  orderOffset: number
): Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt" | "sourceCheckpointId">[] {
  const points: Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt" | "sourceCheckpointId">[] = [];

  for (const field of sourceFields) {
    if (field === "title" && item.title) {
      points.push({
        sourceItemId: item.id,
        sourceProjectId: item.projectId,
        sourceItemPath: `projects/${item.projectId}/items/${item.id}`,
        sourceField: "title",
        title: item.title,
        notes: "",
        isCompleted: false,
        orderIndex: orderOffset + points.length,
        priority: statusToPriority(item.status),
      });
    } else if (field === "content" && item.content) {
      points.push(
        ...parseSourceTextIntoPoints(item.content, item, orderOffset + points.length, "content")
      );
    } else if (field === "category" && item.category) {
      points.push({
        sourceItemId: item.id,
        sourceProjectId: item.projectId,
        sourceItemPath: `projects/${item.projectId}/items/${item.id}`,
        sourceField: "category",
        title: item.category,
        notes: "",
        isCompleted: false,
        orderIndex: orderOffset + points.length,
        priority: statusToPriority(item.status),
      });
    }
  }

  return points;
}

function deduplicateStrict<
  T extends { title: string }
>(points: T[]): { kept: T[]; removedKeys: string[] } {
  const seen = new Set<string>();
  const kept: T[] = [];
  const removedKeys: string[] = [];

  for (const point of points) {
    const key = normalizeItemKey(point.title);
    if (!key || seen.has(key)) {
      if (key) removedKeys.push(key);
      continue;
    }
    seen.add(key);
    kept.push(point);
  }

  return { kept, removedKeys };
}

function wordSetSimilarity(a: string, b: string): number {
  const wordsA = new Set(
    normalizeTitle(a)
      .split(/(\d+|[a-z]+)/)
      .filter((w) => w.length > 2)
  );
  const wordsB = new Set(
    normalizeTitle(b)
      .split(/(\d+|[a-z]+)/)
      .filter((w) => w.length > 2)
  );
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

function markSemanticDuplicates<T extends { title: string }>(points: T[]): T[] {
  const marked: T[] = [];
  const representativeKeys: string[] = [];

  for (const point of points) {
    const key = normalizeItemKey(point.title);
    let duplicateOf: string | undefined;

    for (const rep of representativeKeys) {
      if (wordSetSimilarity(point.title, rep) >= 0.7) {
        duplicateOf = rep;
        break;
      }
    }

    if (!duplicateOf && key) {
      representativeKeys.push(point.title);
    }

    marked.push({
      ...point,
      isDuplicate: !!duplicateOf,
      duplicateOf,
    } as T);
  }

  return marked;
}

export async function createChecklist(
  name: string,
  options: {
    projectId?: string;
    isDynamic?: boolean;
    searchQuery?: Record<string, unknown>;
    sourceFields?: SourceField[];
    sortBy?: ChecklistSortBy;
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
    sourceFields: options.sourceFields || undefined,
    sortBy: options.sortBy || undefined,
    sharedWith: {},
    syncStatusToSource: options.syncStatusToSource,
    hasNewMatches: false,
    deletedItemKeys: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const col = options.projectId
    ? projectChecklistsCollection(options.projectId)
    : personalChecklistsCollection(ownerId);
  const docRef = await addDoc(col, payload);
  return { id: docRef.id, ...(payload as Omit<Checklist, "id">) };
}

export async function createChecklistFromItems(
  name: string,
  items: CaptureItem[],
  options: {
    projectId?: string;
    sourceFields?: SourceField[];
  } = {}
): Promise<{ checklist: Checklist; items: ChecklistItem[] }> {
  const ownerId = getUserId();
  if (!ownerId) throw new Error("Du skal være logget ind for at oprette en liste.");

  const sourceFields: SourceField[] =
    options.sourceFields?.length ? options.sourceFields : ["content"];

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
  });

  const checklistItems: ChecklistItem[] = [];
  for (let i = 0; i < deduplicatedItems.length; i++) {
    const item = deduplicatedItems[i];

    // Opret checkpoints for title/category/content så toggle kan linke tilbage.
    const checkpoints = await getOrCreateCheckpointsForItem(item.projectId, item, sourceFields);
    const checkpointByKey = new Map<
      string,
      { checkpointId: string; lineIndex?: number; sourceField: SourceField }
    >();
    for (const cp of checkpoints) {
      const key =
        cp.sourceField === "content" ? `content:${cp.lineIndex ?? 0}` : cp.sourceField;
      checkpointByKey.set(key, {
        checkpointId: cp.id,
        lineIndex: cp.lineIndex,
        sourceField: cp.sourceField,
      });
    }

    const points = extractPointsFromItem(item, sourceFields, i * 1000);
    for (const point of points) {
      const key =
        point.sourceField === "content"
          ? `content:${point.lineIndex ?? 0}`
          : point.sourceField;
      const cp = checkpointByKey.get(key);

      const payload = {
        checklistId: checklist.id,
        ...point,
        sourceCheckpointId: cp?.checkpointId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(checklistItemsCollection(checklist), payload);
      checklistItems.push({ id: docRef.id, ...payload });
    }
  }

  return { checklist, items: checklistItems };
}

export async function createDynamicChecklistFromSearch(
  name: string,
  rawQuery: string,
  items: CaptureItem[],
  options: CreateDynamicChecklistOptions
): Promise<{ checklist: Checklist; items: ChecklistItem[] }> {
  const ownerId = getUserId();
  if (!ownerId) throw new Error("Du skal være logget ind for at oprette en liste.");
  if (!options.projectId) throw new Error("Vælg et projekt for listen.");
  if (items.length === 0) throw new Error("Søgningen gav ingen resultater at oprette en liste af.");

  const sourceFields: SourceField[] =
    options.sourceFields && options.sourceFields.length > 0
      ? options.sourceFields
      : ["content"];

  const projectId = options.projectId;
  const sortBy: ChecklistSortBy = options.sortBy || "alphabetical";

  // Filtrér resultater til det valgte projekt.
  const projectItems = items.filter((item) => item.projectId === projectId);
  if (projectItems.length === 0) {
    throw new Error("Ingen søgeresultater tilhører det valgte projekt.");
  }

  const candidatePoints = projectItems.flatMap((item, index) =>
    extractPointsFromItem(item, sourceFields, index * 1000)
  );

  const { kept: uniquePoints, removedKeys } = deduplicateStrict(candidatePoints);
  const markedPoints = markSemanticDuplicates(uniquePoints);

  const batch = writeBatch(db);
  const now = serverTimestamp();

  // Opret checklist-dokumentet indenfor samme batch for atomicitet.
  const checklistRef = doc(projectChecklistsCollection(projectId));
  const checklistPayload = stripUndefined({
    name: name.trim(),
    ownerId,
    projectId,
    isDynamic: true,
    searchQuery: { raw: rawQuery },
    sourceFields,
    sortBy,
    sharedWith: {},
    deletedItemKeys: removedKeys,
    hasNewMatches: false,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(checklistRef, checklistPayload);

  const createdCheckpoints = new Map<
    string,
    { checkpointId: string; lineIndex?: number; sourceField: SourceField }[]
  >();

  // Opret checkpoints for hver kilde-sag i det valgte projekt.
  for (const item of projectItems) {
    const checkpoints = await getOrCreateCheckpointsForItem(item.projectId, item, sourceFields);
    createdCheckpoints.set(
      item.id,
      checkpoints.map((cp) => ({
        checkpointId: cp.id,
        lineIndex: cp.lineIndex,
        sourceField: cp.sourceField,
      }))
    );
  }

  const checklistItems: ChecklistItem[] = [];
  for (let i = 0; i < markedPoints.length; i++) {
    const point = markedPoints[i];
    const cps = createdCheckpoints.get(point.sourceItemId) || [];
    const key =
      point.sourceField === "content"
        ? `content:${point.lineIndex ?? 0}`
        : point.sourceField;
    const cp = cps.find((c) => {
      const cpKey =
        c.sourceField === "content" ? `content:${c.lineIndex ?? 0}` : c.sourceField;
      return cpKey === key;
    });

    const payload = stripUndefined({
      checklistId: checklistRef.id,
      ...point,
      sourceCheckpointId: cp?.checkpointId,
      isNewMatch: false,
      createdAt: now,
      updatedAt: now,
    });
    const docId = checklistItemDocId(checklistRef.id, point);
    const docRef = doc(projectChecklistItemsCollection(projectId, checklistRef.id), docId);
    batch.set(docRef, payload);
    checklistItems.push({ id: docId, ...payload } as ChecklistItem);
  }

  await batch.commit();

  const checklist: Checklist = {
    id: checklistRef.id,
    ...(checklistPayload as Omit<Checklist, "id">),
  };
  return { checklist, items: checklistItems };
}

async function addChecklistItem(
  checklist: Pick<Checklist, "id" | "projectId" | "ownerId">,
  point: Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt">
): Promise<ChecklistItem> {
  const payload = {
    checklistId: checklist.id,
    ...point,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(checklistItemsCollection(checklist), payload);
  return { id: docRef.id, ...payload };
}

export async function deleteChecklistItem(
  checklistId: string,
  itemId: string,
  userId?: string
): Promise<void> {
  const checklist = await getChecklistById(checklistId, undefined, userId);
  if (!checklist) throw new Error(`Liste ikke fundet: ${checklistId}`);
  if (userId) {
    await deleteRemindersForChecklistItem(userId, checklistId, itemId);
  }
  const itemRef = checklist.projectId
    ? doc(db, "projects", checklist.projectId, "checklists", checklistId, "items", itemId)
    : doc(db, "users", checklist.ownerId, "checklists", checklistId, "items", itemId);
  await deleteDoc(itemRef);
}

export function subscribeToChecklists(
  userId: string,
  callback: (checklists: Checklist[]) => void
) {
  // Personal/shared checklists only. Project-scoped checklists are subscribed via subscribeToProjectChecklists.
  // Own checklists live under /users/{userId}/checklists. Shared-with-me discovery lives under
  // /users/{userId}/sharedChecklists and resolves to the owner's /users/{ownerId}/checklists/{checklistId}.
  let personal: Checklist[] = [];
  let shared: Checklist[] = [];
  let personalUnsub: (() => void) | undefined;
  let sharedUnsub: (() => void) | undefined;

  const emit = () => {
    callback(
      [...personal, ...shared].sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      })
    );
  };

  const resolveShared = async (indexDocs: SharedChecklistIndex[]) => {
    const resolved: Checklist[] = [];
    for (const index of indexDocs) {
      if (!index.ownerId) continue;
      try {
        const snap = await getDoc(
          doc(db, "users", index.ownerId, "checklists", index.checklistId)
        );
        if (snap.exists()) {
          resolved.push({ id: snap.id, ...(snap.data() as Omit<Checklist, "id">) });
        }
      } catch (error) {
        console.error("[subscribeToChecklists] resolve shared error:", error);
      }
    }
    shared = resolved;
    emit();
  };

  personalUnsub = onSnapshot(
    query(personalChecklistsCollection(userId)),
    (snapshot) => {
      personal = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Checklist, "id">),
      }));
      emit();
    },
    (error) => {
      console.error("[subscribeToChecklists] personal error:", error);
      personal = [];
      emit();
    }
  );

  sharedUnsub = onSnapshot(
    query(sharedChecklistsCollection(userId)),
    (snapshot) => {
      const indexDocs = snapshot.docs.map((d) => ({
        checklistId: d.id,
        ...(d.data() as Omit<SharedChecklistIndex, "checklistId">),
      }));
      resolveShared(indexDocs);
    },
    (error) => {
      console.error("[subscribeToChecklists] shared error:", error);
      shared = [];
      emit();
    }
  );

  return () => {
    personalUnsub?.();
    sharedUnsub?.();
  };
}

/** Alias for personal/shared checklists. */
export function subscribeToPersonalChecklists(
  userId: string,
  callback: (checklists: Checklist[]) => void
) {
  return subscribeToChecklists(userId, callback);
}

export function subscribeToSharedChecklists(
  userId: string,
  callback: (checklists: Checklist[]) => void
) {
  return onSnapshot(
    query(sharedChecklistsCollection(userId)),
    (snapshot) => {
      const indexDocs = snapshot.docs.map((d) => ({
        checklistId: d.id,
        ...(d.data() as Omit<SharedChecklistIndex, "checklistId">),
      }));
      resolveSharedChecklists(indexDocs, callback);
    },
    (error) => {
      console.error("[subscribeToSharedChecklists] error:", error);
      callback([]);
    }
  );
}

async function resolveSharedChecklists(
  indexDocs: SharedChecklistIndex[],
  callback: (checklists: Checklist[]) => void
) {
  const resolved: Checklist[] = [];
  for (const index of indexDocs) {
    if (!index.ownerId) continue;
    try {
      const snap = await getDoc(
        doc(db, "users", index.ownerId, "checklists", index.checklistId)
      );
      if (snap.exists()) {
        resolved.push({ id: snap.id, ...(snap.data() as Omit<Checklist, "id">) });
      }
    } catch (error) {
      console.error("[subscribeToSharedChecklists] resolve error:", error);
    }
  }
  callback(
    resolved.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || 0;
      const bTime = b.updatedAt?.toMillis?.() || 0;
      return bTime - aTime;
    })
  );
}

export function subscribeToProjectChecklists(
  projectId: string,
  callback: (checklists: Checklist[]) => void
) {
  const q = query(projectChecklistsCollection(projectId));
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
      console.error(`[subscribeToProjectChecklists] projectId=${projectId} error:`, error);
      callback([]);
    }
  );
}

export function subscribeToChecklistItems(
  checklistId: string,
  callback: (items: ChecklistItem[]) => void,
  projectId?: string,
  ownerId?: string
) {
  // If projectId is known (e.g. passed from the list screen), subscribe to the project-scoped path.
  // If ownerId is known for a personal/shared checklist, subscribe directly under /users/{ownerId}.
  // Otherwise, fetch the checklist doc to determine its scope. This preserves the legacy signature
  // while supporting both personal and project-scoped checklists.
  if (projectId) {
    const q = query(projectChecklistItemsCollection(projectId, checklistId));
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

  if (ownerId) {
    const q = query(personalChecklistItemsCollection(ownerId, checklistId));
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

  let unsubscribe: (() => void) | undefined;
  let active = true;

  getChecklistById(checklistId).then((checklist) => {
    if (!active) return;
    const resolvedOwnerId = checklist?.ownerId || getUserId() || undefined;
    if (!resolvedOwnerId) {
      callback([]);
      return;
    }
    const q = checklist?.projectId
      ? query(projectChecklistItemsCollection(checklist.projectId, checklistId))
      : query(personalChecklistItemsCollection(resolvedOwnerId, checklistId));
    unsubscribe = onSnapshot(
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
  });

  return () => {
    active = false;
    unsubscribe?.();
  };
}

export function subscribeToProjectChecklistItems(
  projectId: string,
  checklistId: string,
  callback: (items: ChecklistItem[]) => void
) {
  return subscribeToChecklistItems(checklistId, callback, projectId);
}

export function subscribeToPersonalChecklistItems(
  userId: string,
  checklistId: string,
  callback: (items: ChecklistItem[]) => void
) {
  return subscribeToChecklistItems(checklistId, callback, undefined, userId);
}

export async function getChecklistById(
  checklistId: string,
  projectId?: string,
  ownerId?: string
): Promise<Checklist | null> {
  if (projectId) {
    const snap = await getDocs(
      query(projectChecklistsCollection(projectId), where("__name__", "==", checklistId))
    );
    const doc_ = snap.docs[0];
    if (doc_) return { id: doc_.id, ...(doc_.data() as Omit<Checklist, "id">) };
    return null;
  }

  // Personal/shared checklists live under /users/{ownerId}/checklists/{checklistId}.
  // If caller supplies ownerId, try that path first.
  if (ownerId) {
    const ref = doc(db, "users", ownerId, "checklists", checklistId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { id: snap.id, ...(snap.data() as Omit<Checklist, "id">) };
  }

  // Fallback for deep links / legacy callers: try current user's own path, then look up
  // the checklist id in the current user's sharedChecklists index to find the owner.
  const currentUserId = getUserId();
  if (currentUserId) {
    const ownRef = doc(db, "users", currentUserId, "checklists", checklistId);
    const ownSnap = await getDoc(ownRef);
    if (ownSnap.exists()) return { id: ownSnap.id, ...(ownSnap.data() as Omit<Checklist, "id">) };

    const indexRef = doc(db, "users", currentUserId, "sharedChecklists", checklistId);
    const indexSnap = await getDoc(indexRef);
    if (indexSnap.exists()) {
      const index = indexSnap.data() as SharedChecklistIndex;
      if (index.ownerId) {
        const sourceRef = doc(db, "users", index.ownerId, "checklists", checklistId);
        const sourceSnap = await getDoc(sourceRef);
        if (sourceSnap.exists()) {
          return { id: sourceSnap.id, ...(sourceSnap.data() as Omit<Checklist, "id">) };
        }
      }
    }
  }

  return null;
}

export async function updateChecklist(
  checklistId: string,
  updates: Partial<Omit<Checklist, "id" | "createdAt">>,
  userId?: string
) {
  const checklist = await getChecklistById(checklistId, undefined, userId);
  if (!checklist) throw new Error(`Liste ikke fundet: ${checklistId}`);

  const batch = writeBatch(db);
  const ref = checklist.projectId
    ? doc(db, "projects", checklist.projectId, "checklists", checklistId)
    : doc(db, "users", checklist.ownerId, "checklists", checklistId);
  batch.update(ref, {
    ...prepareUpdateFields(updates as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });

  // Sync renamed personal lists to every recipient's sharedChecklists discovery document.
  if (updates.name !== undefined && !checklist.projectId && checklist.sharedWith) {
    const recipients = Object.keys(checklist.sharedWith);
    for (const recipientUserId of recipients) {
      const discoveryRef = doc(db, "users", recipientUserId, "sharedChecklists", checklistId);
      batch.update(discoveryRef, { name: updates.name });
    }
  }

  await batch.commit();
}

export async function updateChecklistItem(
  checklistId: string,
  itemId: string,
  updates: Partial<Omit<ChecklistItem, "id" | "checklistId" | "createdAt">>,
  userId?: string
) {
  const checklist = await getChecklistById(checklistId, undefined, userId);
  if (!checklist) throw new Error(`Liste ikke fundet: ${checklistId}`);
  const ref = checklist.projectId
    ? doc(db, "projects", checklist.projectId, "checklists", checklistId, "items", itemId)
    : doc(db, "users", checklist.ownerId, "checklists", checklistId, "items", itemId);
  await updateDoc(ref, {
    ...prepareUpdateFields(updates as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });

  if (userId && updates.title !== undefined) {
    try {
      const { getRemindersForChecklistItem, updateReminder } = await import("./reminders");
      const reminders = await getRemindersForChecklistItem(userId, checklistId, itemId);
      await Promise.all(
        reminders.map((r) => updateReminder(userId, r.id, { title: updates.title || r.title }))
      );
    } catch (error) {
      console.error("[updateChecklistItem] failed to update reminder titles:", error);
    }
  }
}

export async function toggleChecklistPoint(
  checklist: Checklist,
  point: ChecklistItem,
  userId: string
): Promise<void> {
  return setChecklistPointCompleted(checklist, point, !point.isCompleted, userId);
}

export async function setChecklistPointCompleted(
  checklist: Checklist,
  point: ChecklistItem,
  completed: boolean,
  userId: string
): Promise<void> {
  const nextCompleted = completed;
  const now = serverTimestamp();
  const batch = writeBatch(db);

  const pointRef = checklist.projectId
    ? doc(db, "projects", checklist.projectId, "checklists", checklist.id, "items", point.id)
    : doc(db, "users", checklist.ownerId, "checklists", checklist.id, "items", point.id);
  batch.update(pointRef, {
    isCompleted: nextCompleted,
    completedAt: nextCompleted ? now : deleteField(),
    completedBy: nextCompleted ? userId : deleteField(),
    updatedAt: now,
  });

  const sourceProjectId = point.sourceProjectId || checklist.projectId;
  const hasSourceLink =
    sourceProjectId &&
    point.sourceItemId &&
    point.sourceItemId !== "manual" &&
    point.sourceCheckpointId;

  if (hasSourceLink) {
    const checkpointRef = doc(
      db,
      "projects",
      sourceProjectId as string,
      "items",
      point.sourceItemId as string,
      "checkpoints",
      point.sourceCheckpointId as string
    );
    batch.update(checkpointRef, {
      status: nextCompleted ? "done" : "new",
      updatedAt: now,
    });
  } else {
    console.warn(
      "[setChecklistPointCompleted] no source checkpoint to sync for point",
      point.id,
      "sourceItemId:",
      point.sourceItemId,
      "sourceCheckpointId:",
      point.sourceCheckpointId,
      "sourceProjectId:",
      sourceProjectId
    );
  }

  await batch.commit();

  if (hasSourceLink) {
    const checkpoints = await getCheckpointsForItem(sourceProjectId, point.sourceItemId);
    if (checkpoints.length > 0) {
      // Only consider checkpoints that are actually referenced by items in this
      // checklist. This prevents orphaned duplicate checkpoints from blocking
      // item status progression.
      const referencedIds = new Set(
        (
          await getDocs(
            query(
              checklistItemsCollection(checklist),
              where("sourceItemId", "==", point.sourceItemId)
            )
          )
        ).docs
          .map((d) => (d.data() as ChecklistItem).sourceCheckpointId)
          .filter(Boolean) as string[]
      );

      const relevant = referencedIds.size > 0
        ? checkpoints.filter((cp) => referencedIds.has(cp.id))
        : checkpoints;

      const allDone = relevant.length > 0 && relevant.every((cp) => cp.status === "done");
      const item = await getItemById(sourceProjectId, point.sourceItemId);

      if (allDone && item?.status !== "done") {
        await updateItem(sourceProjectId, point.sourceItemId, { status: "done" });
      } else if (!allDone && item?.status === "done" && !nextCompleted) {
        await updateItem(sourceProjectId, point.sourceItemId, { status: "in_progress" });
      }
    }
  }

  if (completed && userId) {
    try {
      await deleteRemindersForChecklistItem(userId, checklist.id, point.id);
    } catch (error) {
      console.error("[setChecklistPointCompleted] failed to cancel reminders:", error);
    }
  }
}

/** Deprecated: beholdes for backwards compatibility; delegerer til toggleChecklistPoint. */
export async function toggleChecklistItemComplete(
  checklist: Checklist,
  item: ChecklistItem,
  userId: string
): Promise<void> {
  return toggleChecklistPoint(checklist, item, userId);
}

export async function markChecklistAsViewed(
  checklistId: string,
  userId?: string
): Promise<void> {
  const checklist = await getChecklistById(checklistId, undefined, userId);
  if (!checklist) throw new Error(`Liste ikke fundet: ${checklistId}`);
  const now = serverTimestamp();
  const batch = writeBatch(db);
  const checklistRef = checklist.projectId
    ? doc(db, "projects", checklist.projectId, "checklists", checklistId)
    : doc(db, "users", checklist.ownerId, "checklists", checklistId);
  batch.update(checklistRef, {
    hasNewMatches: false,
    lastViewedAt: now,
    updatedAt: now,
  });

  const itemsSnap = await getDocs(checklistItemsCollection(checklist));
  for (const itemDoc of itemsSnap.docs) {
    if (itemDoc.data().isNewMatch) {
      batch.update(itemDoc.ref, { isNewMatch: false, updatedAt: now });
    }
  }

  await batch.commit();
}

export async function synchronizeDynamicChecklist(
  checklist: Checklist,
  currentItems: CaptureItem[]
): Promise<void> {
  if (!checklist.isDynamic || !checklist.searchQuery?.raw) return;
  const rawQuery = String(checklist.searchQuery.raw);
  const sourceFields: SourceField[] = checklist.sourceFields?.length
    ? checklist.sourceFields
    : ["content"];
  const projectId = checklist.projectId;

  const matchedItems = searchItems(currentItems, rawQuery).filter(
    (item) => !projectId || item.projectId === projectId
  );

  const existingSnap = await getDocs(checklistItemsCollection(checklist));
  const existingItems = existingSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ChecklistItem, "id">),
  }));

  const existingBySource = new Map<string, ChecklistItem[]>();
  for (const item of existingItems) {
    const list = existingBySource.get(item.sourceItemId) || [];
    list.push(item);
    existingBySource.set(item.sourceItemId, list);
  }

  const matchedSourceIds = new Set(matchedItems.map((i) => i.id));
  const deletedKeys = new Set(checklist.deletedItemKeys || []);
  const batch = writeBatch(db);
  const now = serverTimestamp();
  let newMatchesAdded = false;

  // Mark items whose source no longer matches or has been deleted as stale.
  for (const [sourceId, itemsForSource] of existingBySource) {
    const sourceStillExists = matchedSourceIds.has(sourceId);
    for (const item of itemsForSource) {
      if (sourceStillExists && !item.isStale) continue;
      if (!sourceStillExists && item.isStale) continue;

      if (!sourceStillExists) {
        batch.update(checklistItemRef(checklist.id, item.id, projectId), {
          isStale: true,
          staleNote: "Sagen er slettet eller matcher ikke længere",
          updatedAt: now,
        });
      } else {
        batch.update(checklistItemRef(checklist.id, item.id, projectId), {
          isStale: false,
          staleNote: deleteField(),
          updatedAt: now,
        });
      }
    }
  }

  // Add new matches
  const existingKeys = new Set(existingItems.map((i) => normalizeItemKey(i.title)));
  let orderIndex = existingItems.length;

  for (const item of matchedItems) {
    const alreadyHasSource = existingBySource.has(item.id);
    if (alreadyHasSource) continue;

    // Opret checkpoints for ny match så den kan afkrydses korrekt.
    const checkpoints = await getOrCreateCheckpointsForItem(item.projectId, item, sourceFields);
    const cpByKey = new Map<
      string,
      { checkpointId: string; lineIndex?: number; sourceField: SourceField }
    >();
    for (const cp of checkpoints) {
      const key =
        cp.sourceField === "content" ? `content:${cp.lineIndex ?? 0}` : cp.sourceField;
      cpByKey.set(key, {
        checkpointId: cp.id,
        lineIndex: cp.lineIndex,
        sourceField: cp.sourceField,
      });
    }

    const newPoints = extractPointsFromItem(item, sourceFields, orderIndex);
    orderIndex += newPoints.length;

    for (const point of newPoints) {
      const key = normalizeItemKey(point.title);
      if (!key || deletedKeys.has(key) || existingKeys.has(key)) continue;
      existingKeys.add(key);

      const ptKey =
        point.sourceField === "content"
          ? `content:${point.lineIndex ?? 0}`
          : point.sourceField;
      const cp = cpByKey.get(ptKey);

      const docId = checklistItemDocId(checklist.id, point);
      const docRef = doc(checklistItemsCollection(checklist), docId);
      batch.set(docRef, {
        checklistId: checklist.id,
        ...point,
        sourceCheckpointId: cp?.checkpointId,
        isNewMatch: true,
        createdAt: now,
        updatedAt: now,
      });
      newMatchesAdded = true;
    }
  }

  if (newMatchesAdded) {
    batch.update(checklistRef(checklist), {
      hasNewMatches: true,
      updatedAt: now,
    });
  }

  await batch.commit();
}

function checklistRef(checklist: Pick<Checklist, "id" | "projectId" | "ownerId">) {
  return checklist.projectId
    ? doc(db, "projects", checklist.projectId, "checklists", checklist.id)
    : doc(db, "users", checklist.ownerId, "checklists", checklist.id);
}

function checklistItemRef(
  checklistId: string,
  itemId: string,
  projectId?: string,
  ownerId?: string
) {
  if (projectId) {
    return doc(db, "projects", projectId, "checklists", checklistId, "items", itemId);
  }
  if (!ownerId) throw new Error("ownerId kræves for personlige listepunkter.");
  return doc(db, "users", ownerId, "checklists", checklistId, "items", itemId);
}

export async function addManualItemToChecklist(
  checklist: Checklist,
  title: string,
  notes?: string
): Promise<ChecklistItem> {
  if (!checklist.id) throw new Error("Liste mangler id.");

  const existingSnap = await getDocs(checklistItemsCollection(checklist));
  const orderIndex = existingSnap.docs.length;

  if (checklist.isDynamic) {
    if (!checklist.projectId) throw new Error("Dynamisk liste mangler projekt.");

    const sourceItem = await createItem(checklist.projectId, {
      createdBy: getUserId() || "",
      type: "note",
      title,
      content: notes || checklist.searchQuery?.raw || "",
      status: "new",
    });

    // Opret ét checkpoint for den manuelt tilføjede note, så den kan afkrydses.
    const checkpoint = await createCheckpoint(checklist.projectId, sourceItem.id, {
      sourceField: "content",
      lineIndex: 0,
      text: notes || title,
      status: "new",
    });

    return addChecklistItem(checklist, {
      sourceItemId: sourceItem.id,
      sourceProjectId: checklist.projectId,
      sourceItemPath: `projects/${checklist.projectId}/items/${sourceItem.id}`,
      sourceCheckpointId: checkpoint.id,
      sourceField: "manual",
      title,
      notes: notes || "",
      isCompleted: false,
      orderIndex,
      priority: statusToPriority("new"),
    });
  }

  return addChecklistItem(checklist, {
    sourceItemId: "manual",
    sourceProjectId: checklist.projectId || "",
    sourceField: "manual",
    title,
    notes: notes || "",
    isCompleted: false,
    orderIndex,
    priority: 1,
  });
}

export async function deleteChecklistItemAndTrack(
  checklist: Checklist,
  item: ChecklistItem
): Promise<void> {
  await deleteChecklistItem(checklist.id, item.id);

  const key = normalizeItemKey(item.title);
  if (!key) return;

  const deletedKeys = new Set(checklist.deletedItemKeys || []);
  if (deletedKeys.has(key)) return;

  deletedKeys.add(key);
  await updateChecklist(
    checklist.id,
    {
      deletedItemKeys: Array.from(deletedKeys),
    },
    checklist.ownerId
  );
}

export async function shareChecklist(
  checklist: Checklist,
  recipientUserId: string,
  role: "admin" | "editor" | "viewer"
): Promise<void> {
  const batch = writeBatch(db);
  const sourceRef = checklistRef(checklist);
  batch.update(sourceRef, {
    [`sharedWith.${recipientUserId}`]: role,
    updatedAt: serverTimestamp(),
  });

  const discoveryRef = doc(
    db,
    "users",
    recipientUserId,
    "sharedChecklists",
    checklist.id
  );
  batch.set(discoveryRef, {
    checklistId: checklist.id,
    ownerId: checklist.ownerId,
    name: checklist.name,
    sharedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function unshareChecklist(
  checklist: Checklist,
  recipientUserId: string
): Promise<void> {
  const batch = writeBatch(db);
  const sourceRef = checklistRef(checklist);
  batch.update(sourceRef, {
    [`sharedWith.${recipientUserId}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });

  const discoveryRef = doc(
    db,
    "users",
    recipientUserId,
    "sharedChecklists",
    checklist.id
  );
  batch.delete(discoveryRef);

  await batch.commit();
}

export function getSeedUserEmail(uid: string): string | null {
  return SEED_UID_TO_EMAIL[uid] || null;
}

export async function findUserByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  // Fallback for test seed users.
  const seedUid = SEED_EMAIL_TO_UID[normalized];
  if (seedUid) return seedUid;

  // Real lookup against /users collection (document ID is the UID, email field is stored).
  try {
    const q = query(collection(db, "users"), where("email", "==", normalized));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
  } catch (error) {
    console.error("[findUserByEmail] Firestore lookup failed:", error);
  }
  return null;
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

  const url = buildChecklistUrl(checklist.id);
  const lines = [
    `${checklist.name}`,
    ``,
    `${completedCount} af ${total} punkter udført`,
    ``,
    ...openItems.map((item, index) => `${index + 1}. ${item.title}`),
    ``,
    `Åbn i Data Capture: ${url}`,
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

export async function addChecklistLocation(
  checklistId: string,
  location: Omit<ChecklistLocation, "id" | "createdAt" | "updatedAt">,
  projectId?: string,
  ownerId?: string
): Promise<ChecklistLocation> {
  const checklist = await getChecklistById(checklistId, projectId, ownerId);
  if (!checklist) throw new Error(`Liste ikke fundet: ${checklistId}`);

  const now = Date.now();
  const newLocation = cleanLocationForFirestore({
    ...location,
    id: Math.random().toString(36).slice(2),
    createdAt: now,
    updatedAt: now,
  });

  const existing = checklist.locations || [];
  const updatedLocations = [...existing, newLocation].map((loc) =>
    cleanLocationForFirestore(loc)
  );

  await updateDoc(checklistRef(checklist), {
    locations: updatedLocations,
    updatedAt: serverTimestamp(),
  });

  return newLocation;
}

export async function updateChecklistLocation(
  checklistId: string,
  locationId: string,
  updates: Partial<Omit<ChecklistLocation, "id" | "createdAt" | "updatedAt">>,
  projectId?: string,
  ownerId?: string
): Promise<void> {
  const checklist = await getChecklistById(checklistId, projectId, ownerId);
  if (!checklist) throw new Error(`Liste ikke fundet: ${checklistId}`);

  const now = Date.now();
  const existing = checklist.locations || [];
  const updatedLocations = existing.map((loc) =>
    loc.id === locationId
      ? cleanLocationForFirestore({ ...loc, ...updates, updatedAt: now })
      : cleanLocationForFirestore(loc)
  );

  await updateDoc(checklistRef(checklist), {
    locations: updatedLocations,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteChecklistLocation(
  checklistId: string,
  locationId: string,
  projectId?: string,
  ownerId?: string
): Promise<void> {
  const checklist = await getChecklistById(checklistId, projectId, ownerId);
  if (!checklist) throw new Error(`Liste ikke fundet: ${checklistId}`);

  const updatedLocations = (checklist.locations || [])
    .filter((loc) => loc.id !== locationId)
    .map((loc) => cleanLocationForFirestore(loc));

  await updateDoc(checklistRef(checklist), {
    locations: updatedLocations,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleChecklistLocationArrival(
  checklistId: string,
  locationId: string,
  projectId?: string,
  ownerId?: string
): Promise<boolean> {
  const checklist = await getChecklistById(checklistId, projectId, ownerId);
  if (!checklist) throw new Error(`Liste ikke fundet: ${checklistId}`);

  const now = Date.now();
  const existing = checklist.locations || [];
  const nextLocations = existing.map((loc) =>
    loc.id === locationId
      ? cleanLocationForFirestore({
          ...loc,
          notifyOnArrival: !loc.notifyOnArrival,
          updatedAt: now,
        })
      : cleanLocationForFirestore(loc)
  );

  await updateDoc(checklistRef(checklist), {
    locations: nextLocations,
    updatedAt: serverTimestamp(),
  });

  const toggled = nextLocations.find((loc) => loc.id === locationId);
  return toggled?.notifyOnArrival ?? false;
}

export async function deleteChecklist(
  checklistId: string,
  projectId?: string,
  ownerId?: string,
  currentUserId?: string
): Promise<void> {
  // ownerId bruges til at finde listen (især delte personlige lister).
  // currentUserId bruges til at rydde reminders for den aktuelle bruger.
  const lookupId = ownerId || currentUserId;
  const checklist = await getChecklistById(checklistId, projectId, lookupId);
  if (!checklist) {
    // Hvis listen allerede er væk, er der ikke mere at rydde op.
    return;
  }
  if (currentUserId) {
    await deleteRemindersForChecklist(currentUserId, checklistId);
  }
  const itemsSnapshot = await getDocs(checklistItemsCollection(checklist));
  await Promise.all(itemsSnapshot.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(checklistRef(checklist));
}
