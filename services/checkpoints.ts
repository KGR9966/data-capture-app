import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "@react-native-firebase/firestore";

import { db } from "./firebase";
import { CaptureItem } from "./items";
import type { SourceField } from "./checklists";

export type CheckpointStatus = "new" | "done";

export interface Checkpoint {
  id: string;
  itemId: string;
  projectId: string;
  sourceField: SourceField;
  lineIndex?: number;
  text: string;
  status: CheckpointStatus;
  createdAt?: any;
  updatedAt?: any;
}

export function checkpointsCollection(projectId: string, itemId: string) {
  return collection(db, "projects", projectId, "items", itemId, "checkpoints");
}

function parseContentLines(content: string): string[] {
  if (!content || !content.trim()) return [];
  return content
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s]*[-*•][\s]+/, "").trim())
    .filter(Boolean);
}

export function deriveCheckpointsFromItem(
  item: CaptureItem,
  sourceFields: SourceField[]
): Omit<Checkpoint, "id" | "createdAt" | "updatedAt">[] {
  const points: Omit<Checkpoint, "id" | "createdAt" | "updatedAt">[] = [];

  for (const field of sourceFields) {
    if (field === "title" && item.title) {
      points.push({
        itemId: item.id,
        projectId: item.projectId,
        sourceField: "title",
        text: item.title,
        status: "new",
      });
    } else if (field === "content" && item.content) {
      const lines = parseContentLines(item.content);
      for (let i = 0; i < lines.length; i++) {
        points.push({
          itemId: item.id,
          projectId: item.projectId,
          sourceField: "content",
          lineIndex: i,
          text: lines[i],
          status: "new",
        });
      }
    } else if (field === "category" && item.category) {
      points.push({
        itemId: item.id,
        projectId: item.projectId,
        sourceField: "category",
        text: item.category,
        status: "new",
      });
    }
  }

  return points;
}

export async function getCheckpointsForItem(
  projectId: string,
  itemId: string
): Promise<Checkpoint[]> {
  const snap = await getDocs(checkpointsCollection(projectId, itemId));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Checkpoint, "id">),
  }));
}

export async function getOrCreateCheckpointsForItem(
  projectId: string,
  item: CaptureItem,
  sourceFields: SourceField[]
): Promise<Checkpoint[]> {
  const existing = await getCheckpointsForItem(projectId, item.id);

  // Sikr at eksisterende checkpoints dækker alle ønskede sourceFields.
  // Hvis ikke, tilføj de manglende (fx hvis et item tidligere kun fik title).
  const coveredFields = new Set(existing.map((cp) => cp.sourceField));
  const missingFields = sourceFields.filter((f) => !coveredFields.has(f));

  if (existing.length > 0 && missingFields.length === 0) return existing;

  const derived = deriveCheckpointsFromItem(item, sourceFields).filter((p) =>
    missingFields.includes(p.sourceField)
  );
  const created: Checkpoint[] = [...existing];
  for (const point of derived) {
    const payload = {
      ...point,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(checkpointsCollection(projectId, item.id), payload);
    created.push({ id: docRef.id, ...payload });
  }
  return created;
}

export async function updateCheckpoint(
  projectId: string,
  itemId: string,
  checkpointId: string,
  updates: Partial<Omit<Checkpoint, "id" | "itemId" | "projectId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const ref = doc(db, "projects", projectId, "items", itemId, "checkpoints", checkpointId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function createCheckpoint(
  projectId: string,
  itemId: string,
  point: Omit<Checkpoint, "id" | "itemId" | "projectId" | "createdAt" | "updatedAt">
): Promise<Checkpoint> {
  const payload = {
    ...point,
    itemId,
    projectId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(checkpointsCollection(projectId, itemId), payload);
  return { id: docRef.id, ...payload };
}
