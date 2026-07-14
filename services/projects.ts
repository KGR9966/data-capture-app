import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

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

const db = firestore();

const projectsCollection = db.collection("projects");
const membersSubcollection = (projectId: string) =>
  db.collection("projects").doc(projectId).collection("members");

export async function createProject(
  name: string,
  ownerId: string,
  ownerEmail?: string,
  description?: string
): Promise<Project> {
  const projectRef = await projectsCollection.add({
    name,
    description: description || "",
    ownerId,
    memberEmails: ownerEmail ? [ownerEmail] : [],
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  await membersSubcollection(projectRef.id).doc(ownerId).set({
    userId: ownerId,
    email: ownerEmail || "",
    role: "owner",
    joinedAt: firestore.FieldValue.serverTimestamp(),
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
  const queries: FirebaseFirestoreTypes.Query[] = [
    db.collection("projects").where("ownerId", "==", userId),
  ];

  if (userEmail) {
    queries.push(
      db.collection("projects").where("memberEmails", "array-contains", userEmail)
    );
  }

  const snapshots: Project[][] = [];
  let results: Project[] = [];

  const unsubscribes = queries.map((q, index) =>
    q.onSnapshot((snapshot) => {
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
  const owned = await db
    .collection("projects")
    .where("ownerId", "==", userId)
    .get();

  let shared: Project[] = [];
  if (userEmail) {
    const sharedSnap = await db
      .collection("projects")
      .where("memberEmails", "array-contains", userEmail)
      .get();
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
  const snap = await db.collection("projects").doc(projectId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Project, "id">) };
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, "name" | "description">>
) {
  const projectRef = db.collection("projects").doc(projectId);
  await projectRef.update({
    ...updates,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function deleteProject(projectId: string) {
  await db.collection("projects").doc(projectId).delete();
}

export async function addProjectMemberByEmail(
  projectId: string,
  email: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const projectRef = db.collection("projects").doc(projectId);
  await projectRef.update({
    memberEmails: firestore.FieldValue.arrayUnion(normalizedEmail),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  await membersSubcollection(projectId)
    .doc(normalizedEmail)
    .set({
      email: normalizedEmail,
      role: "member",
      joinedAt: firestore.FieldValue.serverTimestamp(),
    });
}

export async function getProjectMembers(
  projectId: string
): Promise<ProjectMember[]> {
  const snap = await membersSubcollection(projectId).get();
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<ProjectMember, "userId">),
    userId: d.id,
  }));
}
