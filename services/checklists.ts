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
  writeBatch,
} from "@react-native-firebase/firestore";

import { buildChecklistUrl } from "./deeplinks";
import { db } from "./firebase";
import { CaptureItem, createItem, getItemById, updateItem } from "./items";
import { parseSearchQuery, searchItems } from "./search";

export type ChecklistSortBy = "alphabetical" | "date" | "priority";
export type SourceField = "title" | "content" | "category";

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
  syncStatusToSource: boolean;
  hasNewMatches?: boolean;
  lastViewedAt?: any;
  deletedItemKeys?: string[];
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
  priority?: number;
  isNewMatch?: boolean;
  isStale?: boolean;
  staleNote?: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
  sourceStatusBeforeSync?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CreateDynamicChecklistOptions {
  projectId?: string;
  sourceFields?: SourceField[];
  sortBy?: ChecklistSortBy;
  syncStatusToSource?: boolean;
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

function normalizeItemKey(title: string): string {
  return normalizeTitle(title);
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

function parseSourceTextIntoPoints(
  text: string,
  sourceItem: CaptureItem,
  orderOffset: number
): Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt">[] {
  if (!text || !text.trim()) return [];

  const rawLines = text.split(/\r?\n/);
  const points: Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt">[] = [];

  for (const rawLine of rawLines) {
    const line = rawLine.replace(/^[\s]*[-*•][\s]+/, "").trim();
    if (!line) continue;
    points.push({
      sourceItemId: sourceItem.id,
      sourceProjectId: sourceItem.projectId,
      sourceItemPath: `items/${sourceItem.id}`,
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
): Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt">[] {
  const points: Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt">[] = [];

  for (const field of sourceFields) {
    if (field === "title" && item.title) {
      points.push({
        sourceItemId: item.id,
        sourceProjectId: item.projectId,
        sourceItemPath: `items/${item.id}`,
        title: item.title,
        notes: "",
        isCompleted: false,
        orderIndex: orderOffset + points.length,
        priority: statusToPriority(item.status),
      });
    } else if (field === "content" && item.content) {
      points.push(
        ...parseSourceTextIntoPoints(item.content, item, orderOffset + points.length)
      );
    } else if (field === "category" && item.category) {
      points.push({
        sourceItemId: item.id,
        sourceProjectId: item.projectId,
        sourceItemPath: `items/${item.id}`,
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

function deduplicateStrict<T extends { title: string }>(
  points: T[]
): { kept: T[]; removedKeys: string[] } {
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

function markSemanticDuplicates<T extends { title: string }>(
  points: T[]
): T[] {
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
    });
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
    syncStatusToSource: options.syncStatusToSource !== false,
    hasNewMatches: false,
    deletedItemKeys: [],
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

export async function createDynamicChecklistFromSearch(
  name: string,
  rawQuery: string,
  items: CaptureItem[],
  options: CreateDynamicChecklistOptions = {}
): Promise<{ checklist: Checklist; items: ChecklistItem[] }> {
  const ownerId = getUserId();
  if (!ownerId) throw new Error("Du skal være logget ind for at oprette en liste.");
  if (items.length === 0) throw new Error("Søgningen gav ingen resultater at oprette en liste af.");

  const sourceFields: SourceField[] =
    options.sourceFields && options.sourceFields.length > 0
      ? options.sourceFields
      : ["content"];

  const projectId = options.projectId || items[0].projectId;
  const sortBy: ChecklistSortBy = options.sortBy || "alphabetical";

  const candidatePoints = items.flatMap((item, index) =>
    extractPointsFromItem(item, sourceFields, index * 1000)
  );

  const { kept: uniquePoints, removedKeys } = deduplicateStrict(candidatePoints);
  const markedPoints = markSemanticDuplicates(uniquePoints);

  const checklist = await createChecklist(name, {
    projectId,
    isDynamic: true,
    searchQuery: { raw: rawQuery },
    sourceFields,
    sortBy,
    syncStatusToSource: options.syncStatusToSource,
  });

  const batch = writeBatch(db);
  const checklistRef = doc(db, "checklists", checklist.id);
  batch.update(checklistRef, {
    deletedItemKeys: removedKeys,
    updatedAt: serverTimestamp(),
  });

  const checklistItems: ChecklistItem[] = [];
  for (let i = 0; i < markedPoints.length; i++) {
    const point = markedPoints[i];
    const payload = {
      checklistId: checklist.id,
      ...point,
      isNewMatch: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = doc(checklistItemsCollection(checklist.id));
    batch.set(docRef, payload);
    checklistItems.push({ id: docRef.id, ...payload });
  }

  await batch.commit();
  return { checklist, items: checklistItems };
}

export async function addChecklistItem(
  checklistId: string,
  point: Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt">
): Promise<ChecklistItem> {
  const payload = {
    checklistId,
    ...point,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(checklistItemsCollection(checklistId), payload);
  return { id: docRef.id, ...payload };
}

export async function deleteChecklistItem(
  checklistId: string,
  itemId: string
): Promise<void> {
  await deleteDoc(doc(db, "checklists", checklistId, "items", itemId));
}

export function subscribeToChecklists(
  userId: string,
  callback: (checklists: Checklist[]) => void
) {
  const q = query(checklistsCollection, where("ownerId", "==", userId));
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

  try {
    if (checklist.syncStatusToSource !== false && nextCompleted) {
      // Snapshot current source status so we can restore it on uncheck.
      const sourceItem = await getItemById(item.sourceItemId);
      if (sourceItem) {
        await updateChecklistItem(checklist.id, item.id, {
          sourceStatusBeforeSync: sourceItem.status,
        });
      }
    }
  } catch (error) {
    console.error("[toggleChecklistItemComplete] failed to snapshot source status:", error);
  }

  await updateChecklistItem(checklist.id, item.id, {
    isCompleted: nextCompleted,
    completedAt: nextCompleted ? now : undefined,
    completedBy: nextCompleted ? userId : undefined,
  });

  if (checklist.syncStatusToSource === false) return;

  try {
    if (nextCompleted) {
      await updateItem(item.sourceItemId, { status: "done" });
    } else {
      const restoredStatus: CaptureItem["status"] =
        (item.sourceStatusBeforeSync as CaptureItem["status"]) || "in_progress";
      await updateItem(item.sourceItemId, { status: restoredStatus });
    }
  } catch (error) {
    console.error("[toggleChecklistItemComplete] failed to sync source item status:", error);
  }
}

export async function markChecklistAsViewed(checklistId: string): Promise<void> {
  const now = serverTimestamp();
  const batch = writeBatch(db);
  const checklistRef = doc(db, "checklists", checklistId);
  batch.update(checklistRef, {
    hasNewMatches: false,
    lastViewedAt: now,
    updatedAt: now,
  });

  const itemsSnap = await getDocs(checklistItemsCollection(checklistId));
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

  const queryObj = parseSearchQuery(rawQuery);

  const existingSnap = await getDocs(checklistItemsCollection(checklist.id));
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

  // Mark items whose source no longer matches as stale
  for (const [sourceId, itemsForSource] of existingBySource) {
    if (!matchedSourceIds.has(sourceId)) {
      for (const item of itemsForSource) {
        if (!item.isStale) {
          batch.update(doc(db, "checklists", checklist.id, "items", item.id), {
            isStale: true,
            staleNote: "Kilden matcher ikke længere søgningen",
            updatedAt: now,
          });
        }
      }
    } else {
      for (const item of itemsForSource) {
        if (item.isStale) {
          batch.update(doc(db, "checklists", checklist.id, "items", item.id), {
            isStale: false,
            staleNote: deleteField(),
            updatedAt: now,
          });
        }
      }
    }
  }

  // Add new matches
  const existingKeys = new Set(existingItems.map((i) => normalizeItemKey(i.title)));
  let orderIndex = existingItems.length;

  for (const item of matchedItems) {
    const alreadyHasSource = existingBySource.has(item.id);
    if (alreadyHasSource) continue;

    const newPoints = extractPointsFromItem(item, sourceFields, orderIndex);
    orderIndex += newPoints.length;

    for (const point of newPoints) {
      const key = normalizeItemKey(point.title);
      if (!key || deletedKeys.has(key) || existingKeys.has(key)) continue;
      existingKeys.add(key);

      const docRef = doc(checklistItemsCollection(checklist.id));
      batch.set(docRef, {
        checklistId: checklist.id,
        ...point,
        isNewMatch: true,
        createdAt: now,
        updatedAt: now,
      });
      newMatchesAdded = true;
    }
  }

  if (newMatchesAdded) {
    batch.update(doc(db, "checklists", checklist.id), {
      hasNewMatches: true,
      updatedAt: now,
    });
  }

  await batch.commit();
}

export async function addManualItemToChecklist(
  checklist: Checklist,
  title: string,
  notes?: string
): Promise<ChecklistItem> {
  if (!checklist.id) throw new Error("Liste mangler id.");

  const existingSnap = await getDocs(checklistItemsCollection(checklist.id));
  const orderIndex = existingSnap.docs.length;

  if (checklist.isDynamic) {
    if (!checklist.projectId) throw new Error("Dynamisk liste mangler projekt.");

    const sourceItem = await createItem({
      projectId: checklist.projectId,
      createdBy: getUserId() || "",
      type: "note",
      title,
      content: notes || checklist.searchQuery?.raw || "",
      status: "new",
    });

    return addChecklistItem(checklist.id, {
      sourceItemId: sourceItem.id,
      sourceProjectId: checklist.projectId,
      sourceItemPath: `items/${sourceItem.id}`,
      title,
      notes: notes || "",
      isCompleted: false,
      orderIndex,
      priority: statusToPriority("new"),
    });
  }

  return addChecklistItem(checklist.id, {
    sourceItemId: "manual",
    sourceProjectId: checklist.projectId || "",
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
  await updateChecklist(checklist.id, {
    deletedItemKeys: Array.from(deletedKeys),
  });
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

export async function deleteChecklist(checklistId: string): Promise<void> {
  const itemsSnapshot = await getDocs(checklistItemsCollection(checklistId));
  await Promise.all(itemsSnapshot.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "checklists", checklistId));
}
