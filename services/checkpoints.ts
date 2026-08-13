import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
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

/** Normaliser tekst til en stabil nøgle, så identiske checkpoints kan genkendes. */
function normalizeCheckpointText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function checkpointKey(p: { sourceField: SourceField; lineIndex?: number; text: string }): string {
  return `${p.sourceField}:${p.lineIndex ?? "none"}:${normalizeCheckpointText(p.text)}`;
}

function checkpointDocId(p: { sourceField: SourceField; lineIndex?: number; text: string }): string {
  // Deterministic ID so concurrent callers write the same document and converge.
  const key = checkpointKey(p);
  if (key.length <= 150) return key;
  return key.slice(0, 150);
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
  const itemId = item.id;
  const existing = await getCheckpointsForItem(projectId, itemId);

  // Index existing checkpoints by their semantic key (field + line + text).
  const existingByKey = new Map(existing.map((cp) => [checkpointKey(cp), cp]));

  const derived = deriveCheckpointsFromItem(item, sourceFields);
  const created: Checkpoint[] = [...existing];

  for (const point of derived) {
    const key = checkpointKey(point);
    if (existingByKey.has(key)) continue;

    const id = checkpointDocId(point);
    const payload = {
      ...point,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    // setDoc with merge prevents race-created duplicates; deterministic ID converges.
    await setDoc(doc(checkpointsCollection(projectId, itemId), id), payload, { merge: true });
    const checkpoint: Checkpoint = { id, ...payload };
    existingByKey.set(key, checkpoint);
    created.push(checkpoint);
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
  const id = checkpointDocId(point);
  const payload = {
    ...point,
    itemId,
    projectId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(checkpointsCollection(projectId, itemId), id), payload, { merge: true });
  return { id, ...payload };
}
