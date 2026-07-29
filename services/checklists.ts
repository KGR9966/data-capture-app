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
import { CaptureItem, getItemById, updateItem } from "./items";
import {
  Checkpoint,
  createCheckpoint,
  deriveCheckpointsFromItem,
  getCheckpointsForItem,
  getOrCreateCheckpointsForItem,
  updateCheckpoint,
} from "./checkpoints";
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
  /** @deprecated Adskillelse af status gør denne toggle overflødig; beholdes for backwards compat. */
  syncStatusToSource?: boolean;
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
}

export interface CreateDynamicChecklistOptions {
  /** Påkrævet ved oprettelse fra søgning. */
  projectId: string;
  sourceFields?: SourceField[];
  sortBy?: ChecklistSortBy;
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
  orderOffset: number,
  sourceField: SourceField
): Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt">[] {
  if (!text || !text.trim()) return [];

  const rawLines = text.split(/\r?\n/);
  const points: Omit<ChecklistItem, "id" | "checklistId" | "createdAt" | "updatedAt">[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const line = rawLine.replace(/^[\s]*[-*•][\s]+/, "").trim();
    if (!line) continue;
    points.push({
      sourceItemId: sourceItem.id,
      sourceProjectId: sourceItem.projectId,
      sourceItemPath: `items/${sourceItem.id}`,
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
        sourceItemPath: `items/${item.id}`,
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
        sourceItemPath: `items/${item.id}`,
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

  const docRef = await addDoc(checklistsCollection, payload);
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
    const checkpoints = await getOrCreateCheckpointsForItem(item, sourceFields);
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
      const docRef = await addDoc(checklistItemsCollection(checklist.id), payload);
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

  const checklist = await createChecklist(name, {
    projectId,
    isDynamic: true,
    searchQuery: { raw: rawQuery },
    sourceFields,
    sortBy,
  });

  const batch = writeBatch(db);
  const checklistRef = doc(db, "checklists", checklist.id);
  batch.update(checklistRef, {
    deletedItemKeys: removedKeys,
    updatedAt: serverTimestamp(),
  });

  const createdCheckpoints = new Map<
    string,
    { checkpointId: string; lineIndex?: number; sourceField: SourceField }[]
  >();

  // Opret checkpoints for hver kilde-sag i det valgte projekt.
  for (const item of projectItems) {
    const checkpoints = await getOrCreateCheckpointsForItem(item, sourceFields);
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

    const payload = {
      checklistId: checklist.id,
      ...point,
      sourceCheckpointId: cp?.checkpointId,
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
  // @deprecated Brug project-scoped lister via subscribeToProjectChecklists.
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

export function subscribeToProjectChecklists(
  projectId: string,
  callback: (checklists: Checklist[]) => void
) {
  const q = query(checklistsCollection, where("projectId", "==", projectId));
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

export async function toggleChecklistPoint(
  checklist: Checklist,
  point: ChecklistItem,
  userId: string
): Promise<void> {
  const nextCompleted = !point.isCompleted;
  const now = serverTimestamp();
  const batch = writeBatch(db);

  // 1. Opdater listepunkt
  const pointRef = doc(db, "checklists", checklist.id, "items", point.id);
  batch.update(pointRef, {
    isCompleted: nextCompleted,
    completedAt: nextCompleted ? now : deleteField(),
    completedBy: nextCompleted ? userId : deleteField(),
    updatedAt: now,
  });

  // 2. Opdater matchende checkpoint hvis det findes
  if (
    point.sourceItemId &&
    point.sourceItemId !== "manual" &&
    point.sourceCheckpointId
  ) {
    const checkpointRef = doc(
      db,
      "items",
      point.sourceItemId,
      "checkpoints",
      point.sourceCheckpointId
    );
    batch.update(checkpointRef, {
      status: nextCompleted ? "done" : "new",
      updatedAt: now,
    });
  }

  await batch.commit();

  // 3. Tjek om alle checkpoints for item er done (separate læseoperation;
  // item-status opdateres kun hvis nødvendigt).
  if (point.sourceItemId && point.sourceItemId !== "manual") {
    const checkpoints = await getCheckpointsForItem(point.sourceItemId);
    if (checkpoints.length > 0) {
      const allDone = checkpoints.every((cp) => cp.status === "done");
      const anyOpen = checkpoints.some((cp) => cp.status !== "done");

      if (allDone) {
        await updateItem(point.sourceItemId, { status: "done" });
      } else if (anyOpen && !nextCompleted) {
        const item = await getItemById(point.sourceItemId);
        if (item?.status === "done") {
          await updateItem(point.sourceItemId, { status: "in_progress" });
        }
      }
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

    // Opret checkpoints for ny match så den kan afkrydses korrekt.
    const checkpoints = await getOrCreateCheckpointsForItem(item, sourceFields);
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

      const docRef = doc(checklistItemsCollection(checklist.id));
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

    const { createItem } = await import("./items");
    const sourceItem = await createItem({
      projectId: checklist.projectId,
      createdBy: getUserId() || "",
      type: "note",
      title,
      content: notes || checklist.searchQuery?.raw || "",
      status: "new",
    });

    // Opret ét checkpoint for den manuelt tilføjede note, så den kan afkrydses.
    const checkpoint = await createCheckpoint(sourceItem.id, {
      itemId: sourceItem.id,
      projectId: checklist.projectId,
      sourceField: "content",
      lineIndex: 0,
      text: notes || title,
      status: "new",
    });

    return addChecklistItem(checklist.id, {
      sourceItemId: sourceItem.id,
      sourceProjectId: checklist.projectId,
      sourceItemPath: `items/${sourceItem.id}`,
      sourceCheckpointId: checkpoint.id,
      sourceField: "manual",
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
