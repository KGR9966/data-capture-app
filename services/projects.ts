import {
  addDoc,
  arrayRemove,
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
import type { ProjectRole } from "./roles";

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberEmails?: string[];
  roles?: Record<string, ProjectRole>;
  createdAt?: any;
  updatedAt?: any;
}

export interface ProjectMember {
  userId: string;
  email: string;
  displayName?: string;
  role: ProjectRole;
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
    roles: ownerEmail ? { [ownerId]: "owner" } : {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(membersSubcollection(projectRef.id), ownerEmail || ownerId), {
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
    onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot || !snapshot.docs) {
          snapshots[index] = [];
          callback([]);
          return;
        }
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
      },
      (error) => {
        console.error(`[subscribeToProjects] query ${index} onSnapshot error:`, error);
        snapshots[index] = [];
        callback([]);
      }
    )
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
  email: string,
  role: ProjectRole = "editor"
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
    role,
    joinedAt: serverTimestamp(),
  });
}

export async function updateProjectMemberRole(
  projectId: string,
  userIdOrEmail: string,
  newRole: ProjectRole
): Promise<void> {
  const memberRef = doc(membersSubcollection(projectId), userIdOrEmail);
  await updateDoc(memberRef, {
    role: newRole,
    updatedAt: serverTimestamp(),
  });

  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    [`roles.${userIdOrEmail}`]: newRole,
    updatedAt: serverTimestamp(),
  });
}

export async function removeProjectMember(
  projectId: string,
  email: string,
  userIdOrEmail?: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const docId = userIdOrEmail || normalizedEmail;

  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    memberEmails: arrayRemove(normalizedEmail),
    [`roles.${docId}`]: deleteFieldHack(),
    updatedAt: serverTimestamp(),
  });

  await deleteDoc(doc(membersSubcollection(projectId), docId));
}

function deleteFieldHack(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { deleteField } = require("@react-native-firebase/firestore");
  return deleteField();
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

export function subscribeToProjectMembers(
  projectId: string,
  callback: (members: ProjectMember[]) => void
) {
  const q = membersSubcollection(projectId);
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot || !snapshot.docs) {
        callback([]);
        return;
      }
      const members = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<ProjectMember, "userId">),
        userId: d.id,
      }));
      callback(members);
    },
    (error) => {
      console.error("[subscribeToProjectMembers] error:", error);
      callback([]);
    }
  );
}
