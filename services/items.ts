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
} from "@react-native-firebase/firestore";

import { deleteAllCommentsForItem } from "./comments";
import { db } from "./firebase";
import {
  ItemStatus,
  ItemType,
  normalizeItemType,
  VALID_ITEM_TYPES,
} from "./itemTypes";

export type { ItemStatus, ItemType } from "./itemTypes";
export { normalizeItemType, VALID_ITEM_TYPES };

export interface CaptureItem {
  id: string;
  projectId: string;
  createdBy: string;
  createdByName?: string;
  createdByEmail?: string;
  type: ItemType;
  title: string;
  content?: string;
  category?: string;
  status: ItemStatus;
  mediaUrl?: string;
  mediaDuration?: number;
  tags?: string[];
  assignedTo?: string;
  assignedToName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export function itemsCollection(projectId: string) {
  return collection(db, "projects", projectId, "items");
}

function stripUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export async function createItem(
  projectId: string,
  item: Omit<CaptureItem, "id" | "projectId" | "createdAt" | "updatedAt">
): Promise<CaptureItem> {
  const payload = stripUndefined({
    ...item,
    projectId,
    status: item.status || "new",
    mediaUrl: item.mediaUrl ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docRef = await addDoc(itemsCollection(projectId), payload);
  return { id: docRef.id, projectId, ...item };
}

export function subscribeToItems(
  projectId: string,
  callback: (items: CaptureItem[]) => void
) {
  const q = query(itemsCollection(projectId));

  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot || !snapshot.docs) {
        callback([]);
        return;
      }
      const items = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CaptureItem, "id">),
          type: normalizeItemType((d.data() as { type?: string }).type),
        }))
        .sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() || 0;
          const bTime = b.updatedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
      callback(items);
    },
    (error) => {
      console.error("[subscribeToItems] onSnapshot error:", error);
      callback([]);
    }
  );
}

export async function getItemsForProject(projectId: string): Promise<CaptureItem[]> {
  const q = query(itemsCollection(projectId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CaptureItem, "id">),
      type: normalizeItemType((d.data() as { type?: string }).type),
    }))
    .sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || 0;
      const bTime = b.updatedAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
}

function prepareUpdateFields(updates: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(updates).map(([key, value]) => [
      key,
      value === undefined ? deleteField() : value,
    ])
  );
}

export async function updateItem(
  projectId: string,
  itemId: string,
  updates: Partial<Omit<CaptureItem, "id" | "projectId" | "createdAt" | "updatedAt">>
) {
  const itemRef = doc(db, "projects", projectId, "items", itemId);
  await updateDoc(itemRef, {
    ...prepareUpdateFields(updates as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(projectId: string, itemId: string) {
  await deleteAllCommentsForItem(projectId, itemId);
  await deleteDoc(doc(db, "projects", projectId, "items", itemId));
}

export async function getItemById(
  projectId: string,
  itemId: string
): Promise<CaptureItem | null> {
  const snap = await getDoc(doc(db, "projects", projectId, "items", itemId));
  if (!snap.exists) return null;
  const data = snap.data() as Omit<CaptureItem, "id" | "type"> & { type?: string };
  return { id: snap.id, ...data, type: normalizeItemType(data.type) };
}

export async function getItemsByAssignee(
  projectId: string,
  assigneeId: string
): Promise<CaptureItem[]> {
  const q = query(
    itemsCollection(projectId),
    where("assignedTo", "==", assigneeId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<CaptureItem, "id">),
    type: normalizeItemType((d.data() as { type?: string }).type),
  }));
}

export async function unassignItemsFromMember(
  projectId: string,
  assigneeId: string
): Promise<void> {
  const items = await getItemsByAssignee(projectId, assigneeId);
  if (items.length === 0) return;
  await Promise.all(
    items.map((item) =>
      updateDoc(doc(db, "projects", projectId, "items", item.id), {
        assignedTo: deleteField(),
        assignedToName: deleteField(),
        updatedAt: serverTimestamp(),
      })
    )
  );
}

/** Tjekker om der allerede findes en sag med samme titel i projektet.
 *  Beregnet til senere brug ved validering før oprettelse/opdatering. */
export async function isTitleDuplicate(
  projectId: string,
  title: string,
  excludeItemId?: string
): Promise<boolean> {
  if (!title.trim()) return false;
  const q = query(
    itemsCollection(projectId),
    where("title", "==", title.trim())
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return false;
  if (excludeItemId) {
    return snapshot.docs.some((d) => d.id !== excludeItemId);
  }
  return true;
}
