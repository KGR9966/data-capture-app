import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";

import { db } from "./firebase";

export type ItemType = "idea" | "observation" | "bug" | "comment" | "photo" | "voice" | "other";
export type ItemStatus = "new" | "in_progress" | "done" | "archived";

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
  createdAt?: any;
  updatedAt?: any;
}

const itemsCollection = collection(db, "items");

function stripUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export async function createItem(
  item: Omit<CaptureItem, "id" | "createdAt" | "updatedAt">
): Promise<CaptureItem> {
  const payload = stripUndefined({
    ...item,
    status: item.status || "new",
    mediaUrl: item.mediaUrl ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docRef = await addDoc(itemsCollection, payload);
  return { id: docRef.id, ...item };
}

export function subscribeToItems(
  projectId: string,
  callback: (items: CaptureItem[]) => void
) {
  const q = query(itemsCollection, where("projectId", "==", projectId));

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
  const q = query(itemsCollection, where("projectId", "==", projectId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CaptureItem, "id">),
    }))
    .sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || 0;
      const bTime = b.updatedAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
}

export async function updateItem(
  itemId: string,
  updates: Partial<Omit<CaptureItem, "id" | "createdAt" | "updatedAt">>
) {
  const itemRef = doc(db, "items", itemId);
  await updateDoc(itemRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(itemId: string) {
  await deleteDoc(doc(db, "items", itemId));
}

export async function getItemById(itemId: string): Promise<CaptureItem | null> {
  const snap = await getDoc(doc(db, "items", itemId));
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<CaptureItem, "id">) };
}
