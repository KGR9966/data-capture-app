import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";

import { db } from "./firebase";

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberEmails?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface ProjectMember {
  userId: string;
  email: string;
  displayName?: string;
  role: "owner" | "admin" | "member" | "viewer";
  joinedAt?: any;
}

const projectsCollection = collection(db, "projects");
const membersSubcollection = (projectId: string) =>
  collection(doc(db, "projects", projectId), "members");

export async function createProject(
  name: string,
  ownerId: string,
  ownerEmail?: string,
  description?: string
): Promise<Project> {
  const projectRef = await addDoc(projectsCollection, {
    name,
    description: description || "",
    ownerId,
    memberEmails: ownerEmail ? [ownerEmail] : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(membersSubcollection(projectRef.id), ownerId), {
    userId: ownerId,
    email: ownerEmail || "",
    role: "owner",
    joinedAt: serverTimestamp(),
  });

  return {
    id: projectRef.id,
    name,
    description,
    ownerId,
  };
}

export function subscribeToProjects(
  userId: string,
  userEmail: string | null,
  callback: (projects: Project[]) => void
) {
  const queries = [
    query(collection(db, "projects"), where("ownerId", "==", userId)),
  ];

  if (userEmail) {
    queries.push(
      query(
        collection(db, "projects"),
        where("memberEmails", "array-contains", userEmail)
      )
    );
  }

  const snapshots: Project[][] = [];
  let results: Project[] = [];

  const unsubscribes = queries.map((q, index) =>
    onSnapshot(q, (snapshot) => {
      const projects: Project[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Project, "id">),
      }));
      snapshots[index] = projects;
      results = snapshots.flat().filter(Boolean);

      const unique = new Map<string, Project>();
      results.forEach((p) => unique.set(p.id, p));

      callback(
        Array.from(unique.values()).sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() || 0;
          const bTime = b.updatedAt?.toMillis?.() || 0;
          return bTime - aTime;
        })
      );
    })
  );

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

export async function getProjectsForUser(
  userId: string,
  userEmail?: string | null
): Promise<Project[]> {
  const ownedQuery = query(
    collection(db, "projects"),
    where("ownerId", "==", userId)
  );
  const owned = await getDocs(ownedQuery);

  let shared: Project[] = [];
  if (userEmail) {
    const sharedQuery = query(
      collection(db, "projects"),
      where("memberEmails", "array-contains", userEmail)
    );
    const sharedSnap = await getDocs(sharedQuery);
    shared = sharedSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Project, "id">),
    })) as Project[];
  }

  const all: Project[] = [
    ...owned.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Project, "id">),
    })) as Project[],
    ...shared,
  ];

  const unique = new Map<string, Project>();
  all.forEach((p) => unique.set(p.id, p));

  return Array.from(unique.values()).sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() || 0;
    const bTime = b.updatedAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, "projects", projectId));
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Project, "id">) };
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, "name" | "description">>
) {
  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string) {
  await deleteDoc(doc(db, "projects", projectId));
}

export async function addProjectMemberByEmail(
  projectId: string,
  email: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    memberEmails: arrayUnion(normalizedEmail),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(membersSubcollection(projectId), normalizedEmail), {
    email: normalizedEmail,
    role: "member",
    joinedAt: serverTimestamp(),
  });
}

export async function getProjectMembers(
  projectId: string
): Promise<ProjectMember[]> {
  const snap = await getDocs(membersSubcollection(projectId));
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<ProjectMember, "userId">),
    userId: d.id,
  }));
}
