import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import { httpsCallable } from "@react-native-firebase/functions";
import { listAll, ref } from "@react-native-firebase/storage";

import { db, storage, waitForNetwork } from "./firebase";
import { getItemsForProject } from "./items";
import type { ProjectRole } from "./roles";

const DEFAULT_OPERATION_TIMEOUT_MS = 15000;

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(`${label} tog for lang tid (mere end ${ms / 1000} sekunder).`)
          ),
        ms
      )
    ),
  ]);
}

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

export const MIN_PROJECT_NAME_LENGTH = 1;

export function isDuplicateProjectName(
  name: string,
  ownedProjects: Project[]
): boolean {
  const normalized = name.trim().toLowerCase();
  return ownedProjects.some(
    (p) => p.name.trim().toLowerCase() === normalized
  );
}

export function validateProjectName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < MIN_PROJECT_NAME_LENGTH) {
    return "Projektnavn må ikke være tomt";
  }
  return null;
}

export async function createProject(
  name: string,
  ownerId: string,
  ownerEmail?: string,
  description?: string
): Promise<Project> {
  await waitForNetwork(5000, "Projektoprettelse");

  const trimmedName = name.trim();
  const trimmedDescription = (description || "").trim();

  const validationError = validateProjectName(trimmedName);
  if (validationError) {
    throw new Error(validationError);
  }

  // Server-side duplicate guard: kun ejerens egne projekter.
  const normalized = trimmedName.toLowerCase();
  const existing = await getDocs(
    query(projectsCollection, where("ownerId", "==", ownerId))
  );
  const duplicate = existing.docs.find(
    (d) => (d.data().name as string | undefined)?.trim().toLowerCase() === normalized
  );
  if (duplicate) {
    throw new Error("Der findes allerede et projekt med dette navn.");
  }

  const memberDocId = ownerEmail || ownerId;
  const projectRef = doc(projectsCollection);
  const memberRef = doc(membersSubcollection(projectRef.id), memberDocId);

  const batch = writeBatch(db);

  batch.set(projectRef, {
    name: trimmedName,
    description: trimmedDescription,
    ownerId,
    memberEmails: ownerEmail ? [ownerEmail] : [],
    roles: { [ownerId]: "owner" },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(memberRef, {
    userId: ownerId,
    email: ownerEmail || "",
    role: "owner",
    joinedAt: serverTimestamp(),
  });

  console.log("[createProject] committing batch for", trimmedName);
  await batch.commit();
  console.log("[createProject] batch committed, project id", projectRef.id);

  return {
    id: projectRef.id,
    name: trimmedName,
    description: trimmedDescription,
    ownerId,
    memberEmails: ownerEmail ? [ownerEmail] : [],
    roles: { [ownerId]: "owner" },
  };
}

function mergeAndSortProjects(projectLists: Project[][]): Project[] {
  const results = projectLists.flat().filter(Boolean);
  const unique = new Map<string, Project>();
  results.forEach((p) => unique.set(p.id, p));
  return Array.from(unique.values()).sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() || 0;
    const bTime = b.updatedAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
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

  // Seed the list from the server first. This prevents deleted/ghost projects
  // from appearing because Firestore offline persistence still has them cached.
  getDocsFromServer(queries[0])
    .then((ownedSnap) => {
      const owned = ownedSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Project, "id">),
      }));
      if (queries.length === 1) {
        callback(mergeAndSortProjects([owned]));
        return;
      }
      return getDocsFromServer(queries[1]).then((sharedSnap) => {
        const shared = sharedSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Project, "id">),
        }));
        callback(mergeAndSortProjects([owned, shared]));
      });
    })
    .catch((error) => {
      console.warn(
        "[subscribeToProjects] server seed failed, falling back to snapshot:",
        error
      );
    });

  const snapshots: Project[][] = [];

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
        callback(mergeAndSortProjects(snapshots));
      },
      (error) => {
        console.error(
          `[subscribeToProjects] query ${index} onSnapshot error:`,
          error
        );
        snapshots[index] = [];
        callback(mergeAndSortProjects(snapshots));
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
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Project, "id">) };
}

export async function getProjectByIdFromServer(
  projectId: string
): Promise<Project | null> {
  try {
    const snap = await getDocFromServer(doc(db, "projects", projectId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Project, "id">) };
  } catch (error) {
    console.warn(
      `[getProjectByIdFromServer] kunne ikke hente ${projectId} fra server:`,
      error
    );
    return null;
  }
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, "name" | "description">>
) {
  const payload: Partial<Pick<Project, "name" | "description">> = {};

  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    const validationError = validateProjectName(trimmed);
    if (validationError) {
      throw new Error(validationError);
    }
    payload.name = trimmed;
  }

  if (updates.description !== undefined) {
    payload.description = updates.description.trim();
  }

  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  const user = getAuth().currentUser;
  if (!user?.uid) {
    throw new Error("Du skal være logget ind for at slette et projekt.");
  }

  // Project deletion requires a network connection and is performed exclusively
  // via the Cloud Function. TC-B9.6 explicitly forbids a client-side cascade
  // fallback.
  await waitForNetwork(5000, "Sletning af projekt");

  try {
    const { functions } = await import("./firebase");
    console.log("[deleteProject] functions instance initialized:", !!functions);
    const fn = httpsCallable<{ projectId: string }, { success: boolean }>(
      functions,
      "deleteProject"
    );
    console.log("[deleteProject] calling Cloud Function for", projectId);
    const result = await withTimeout(
      fn({ projectId }),
      25000,
      "Server-sletning af projekt"
    );
    console.log("[deleteProject] Cloud Function result", result.data);
    if (result.data.success) {
      return;
    }
    throw new Error("Cloud Function-sletningen returnerede ikke success.");
  } catch (error) {
    console.error("[deleteProject] Cloud Function failed:", error);
    console.error("[deleteProject] error code:", (error as any)?.code, "message:", (error as any)?.message, "details:", (error as any)?.details);
    throw error;
  }
}

export interface ProjectDeletionStats {
  items: number;
  checkpoints: number;
  comments: number;
  checklists: number;
  photos: number;
}

export async function getProjectDeletionStats(
  projectId: string
): Promise<ProjectDeletionStats> {
  const items = await getItemsForProject(projectId);

  const [checkpoints, comments, checklists, photos] = await Promise.all([
    (async () => {
      let count = 0;
      for (const item of items) {
        const snap = await getDocs(
          collection(db, "projects", projectId, "items", item.id, "checkpoints")
        );
        count += snap.size;
      }
      return count;
    })(),
    (async () => {
      let count = 0;
      for (const item of items) {
        const snap = await getDocs(
          collection(db, "projects", projectId, "items", item.id, "comments")
        );
        count += snap.size;
      }
      return count;
    })(),
    getDocs(query(collection(db, "projects", projectId, "checklists"))),
    (async () => {
      try {
        const folderRef = ref(storage, `projects/${projectId}/items`);
        const list = await listAll(folderRef);
        return list.items.length + list.prefixes.length;
      } catch {
        return 0;
      }
    })(),
  ]);

  return {
    items: items.length,
    checkpoints,
    comments,
    checklists: checklists.size,
    photos,
  };
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
    [`roles.${normalizedEmail}`]: role,
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
