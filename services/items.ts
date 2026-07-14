import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

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

const db = firestore();
const itemsCollection = db.collection("items");

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
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
  const docRef = await itemsCollection.add(payload);
  return { id: docRef.id, ...item };
}

export function subscribeToItems(
  projectId: string,
  callback: (items: CaptureItem[]) => void
) {
  const q = itemsCollection
    .where("projectId", "==", projectId)
    .orderBy("updatedAt", "desc");

  return q.onSnapshot((snapshot) => {
    const items = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CaptureItem, "id">),
    }));
    callback(items);
  });
}

export async function getItemsForProject(projectId: string): Promise<CaptureItem[]> {
  const snapshot = await itemsCollection
    .where("projectId", "==", projectId)
    .orderBy("updatedAt", "desc")
    .get();
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<CaptureItem, "id">),
  }));
}

export async function updateItem(
  itemId: string,
  updates: Partial<Omit<CaptureItem, "id" | "createdAt" | "updatedAt">>
) {
  const itemRef = itemsCollection.doc(itemId);
  await itemRef.update({
    ...updates,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function deleteItem(itemId: string) {
  await itemsCollection.doc(itemId).delete();
}

export async function getItemById(itemId: string): Promise<CaptureItem | null> {
  const snap = await itemsCollection.doc(itemId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<CaptureItem, "id">) };
}
