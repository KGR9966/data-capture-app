import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
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

  const payload = {
    itemId,
    projectId,
    authorId: currentUser.uid,
    authorName: currentUser.displayName || undefined,
    authorEmail: currentUser.email || undefined,
    text: trimmed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(commentsCollection(itemId), payload);
  return { id: docRef.id, ...payload };
}

export function subscribeToComments(
  projectId: string,
  itemId: string,
  callback: (comments: Comment[]) => void
) {
  const q = query(commentsCollection(itemId), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const comments = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Comment, "id">),
      }));
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
