import {
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
  writeBatch,
} from "@react-native-firebase/firestore";
import { deleteObject, listAll, ref } from "@react-native-firebase/storage";

import { db, storage } from "./firebase";
import { getItemsForProject } from "./items";
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

  await batch.commit();

  return {
    id: projectRef.id,
    name: trimmedName,
    description: trimmedDescription,
    ownerId,
    memberEmails: ownerEmail ? [ownerEmail] : [],
    roles: { [ownerId]: "owner" },
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

export async function deleteProject(projectId: string) {
  await deleteDoc(doc(db, "projects", projectId));
}

const MAX_BATCH_OPERATIONS = 400;

async function commitChunkedDeletes(
  refs: { path: string; ref: ReturnType<typeof doc> }[]
): Promise<void> {
  for (let i = 0; i < refs.length; i += MAX_BATCH_OPERATIONS) {
    const chunk = refs.slice(i, i + MAX_BATCH_OPERATIONS);
    const batch = writeBatch(db);
    chunk.forEach(({ ref }) => batch.delete(ref as any));
    await batch.commit();
  }
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  let deleted = 0;
  try {
    const folderRef = ref(storage, prefix);
    const list = await listAll(folderRef);

    const fileDeletions = list.items.map(async (item) => {
      try {
        await deleteObject(item);
        return 1;
      } catch (error) {
        console.warn(`[deleteStoragePrefix] Kunne ikke slette ${item.fullPath}:`, error);
        return 0;
      }
    });

    const prefixDeletions = list.prefixes.map(async (subPrefix) => {
      const subDeleted = await deleteStoragePrefix(subPrefix.fullPath);
      return subDeleted;
    });

    const results = await Promise.all([...fileDeletions, ...prefixDeletions]);
    deleted = results.reduce((sum, n) => sum + n, 0);
  } catch (error) {
    console.warn(`[deleteStoragePrefix] Kunne ikke liste ${prefix}:`, error);
  }
  return deleted;
}

export interface ProjectDeletionStats {
  itemCount: number;
  checklistCount: number;
  photoCount: number;
}

export async function getProjectDeletionStats(
  projectId: string
): Promise<ProjectDeletionStats> {
  const [items, checklists, photoCount] = await Promise.all([
    getItemsForProject(projectId),
    getDocs(query(collection(db, "checklists"), where("projectId", "==", projectId))),
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
    itemCount: items.length,
    checklistCount: checklists.size,
    photoCount,
  };
}

export async function deleteProjectCascade(projectId: string): Promise<void> {
  const projectSnap = await getProjectById(projectId);
  if (!projectSnap) {
    throw new Error("Projektet findes ikke.");
  }

  // Slet sager + checkpoints + kommentarer.
  const items = await getItemsForProject(projectId);
  for (const item of items) {
    const [checkpointsSnap, commentsSnap] = await Promise.all([
      getDocs(collection(db, "items", item.id, "checkpoints")),
      getDocs(collection(db, "items", item.id, "comments")),
    ]);

    const childRefs = [
      ...checkpointsSnap.docs.map((d) => ({ path: d.ref.path, ref: d.ref })),
      ...commentsSnap.docs.map((d) => ({ path: d.ref.path, ref: d.ref })),
      { path: `items/${item.id}`, ref: doc(db, "items", item.id) },
    ];

    await commitChunkedDeletes(childRefs);
  }

  // Slet checklister + listepunkter.
  const checklistsSnap = await getDocs(
    query(collection(db, "checklists"), where("projectId", "==", projectId))
  );
  for (const checklist of checklistsSnap.docs) {
    const pointsSnap = await getDocs(collection(db, "checklists", checklist.id, "items"));
    const pointRefs = pointsSnap.docs.map((d) => ({ path: d.ref.path, ref: d.ref }));
    await commitChunkedDeletes(pointRefs);
    await deleteDoc(doc(db, "checklists", checklist.id));
  }

  // Slet projekt-medlemmer.
  const membersSnap = await getDocs(membersSubcollection(projectId));
  const memberRefs = membersSnap.docs.map((d) => ({ path: d.ref.path, ref: d.ref }));
  await commitChunkedDeletes(memberRefs);

  // Slet selve projektet.
  await deleteDoc(doc(db, "projects", projectId));

  // Slet fotos i Storage.
  await deleteStoragePrefix(`projects/${projectId}/items`);
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
