import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
} from "@react-native-firebase/firestore";

import { db } from "./firebase";

export interface Comment {
  id: string;
  itemId: string;
  projectId: string;
  authorId: string;
  authorName?: string;
  authorEmail?: string;
  text: string;
  createdAt?: any;
  updatedAt?: any;
}

const MAX_COMMENT_LENGTH = 2000;

function commentsCollection(itemId: string) {
  return collection(db, "items", itemId, "comments");
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function getCommentTimestamp(comment: Comment): number {
  const ts = comment.createdAt;
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  if (typeof ts === "number") return ts;
  const parsed = new Date(ts).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function createComment(
  projectId: string,
  itemId: string,
  text: string
): Promise<Comment> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Kommentaren må ikke være tom.");
  }
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Kommentaren må højst være ${MAX_COMMENT_LENGTH} tegn.`);
  }

  let currentUser;
  try {
    const auth = getAuth();
    currentUser = auth.currentUser;
  } catch (error) {
    console.error("[createComment] auth error:", error);
    throw new Error("Kunne ikke verificere din bruger. Prøv igen.");
  }
  if (!currentUser) {
    throw new Error("Du skal være logget ind for at skrive en kommentar.");
  }

  const payload = stripUndefined({
    itemId,
    projectId,
    authorId: currentUser.uid,
    authorName: currentUser.displayName || undefined,
    authorEmail: currentUser.email || undefined,
    text: trimmed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    const docRef = await addDoc(commentsCollection(itemId), payload);
    return { id: docRef.id, ...payload } as Comment;
  } catch (error) {
    const code = (error as { code?: string })?.code || "unknown";
    const message = (error as { message?: string })?.message || String(error);
    console.error("[createComment] Firestore write failed:", {
      code,
      message,
      projectId,
      itemId,
      authorId: currentUser.uid,
      hasText: !!trimmed,
      textLength: trimmed.length,
    });

    if (code === "permission-denied") {
      throw new Error(
        "Kommentaren blev afvist af sikkerhedsreglerne. Tjek at du har skriverettigheder i projektet."
      );
    }
    if (code === "unauthenticated") {
      throw new Error("Du er ikke logget ind. Log ind og prøv igen.");
    }
    if (code === "invalid-argument") {
      throw new Error("Ugyldige data sendt til serveren. Prøv igen.");
    }
    if (code === "not-found") {
      throw new Error("Sagen blev ikke fundet. Den kan være slettet.");
    }
    throw new Error(`Kunne ikke sende kommentaren (${code}). Prøv igen.`);
  }
}

export function subscribeToComments(
  projectId: string,
  itemId: string,
  callback: (comments: Comment[]) => void
) {
  const q = query(commentsCollection(itemId));
  return onSnapshot(
    q,
    (snapshot) => {
      const comments = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Comment, "id">),
        }))
        .sort((a, b) => getCommentTimestamp(a) - getCommentTimestamp(b));
      callback(comments);
    },
    (error) => {
      console.error("[subscribeToComments] error:", error);
      callback([]);
    }
  );
}

export async function deleteComment(
  projectId: string,
  itemId: string,
  commentId: string
): Promise<void> {
  await deleteDoc(doc(db, "items", itemId, "comments", commentId));
}

export async function deleteAllCommentsForItem(itemId: string): Promise<number> {
  const snapshot = await getDocs(commentsCollection(itemId));
  if (snapshot.empty) return 0;
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  return snapshot.docs.length;
}
