#!/usr/bin/env node
/**
 * Seed testdata script for US-004 Solution B + A + A2 E2E.
 *
 * Creates two projects, members, items, checkpoints, comments,
 * project-scoped checklist, personal/shared checklist with discovery index.
 *
 * Requires Firebase Admin SDK credentials via GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *   export EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=data-capture-506bd.firebasestorage.app
 *   node scripts/seed-us004-testdata.js
 */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

function requireEnvOrCred() {
  const key = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (key) return key;
  return null;
}

async function main() {
  if (getApps().length === 0) {
    const credPath = requireEnvOrCred();
    if (credPath) {
      initializeApp({ credential: cert(require(credPath)) });
    } else {
      initializeApp();
    }
  }

  const db = getFirestore();
  const storage = getStorage();
  const bucketName = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    console.error(
      "[seed] Error: EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET is not set. " +
        "Load your .env or set it manually."
    );
    process.exit(1);
  }
  const bucket = storage.bucket(bucketName);

  const now = Timestamp.now();

  const ROLES = {
    owner: "user_owner",
    admin: "user_admin",
    editor: "user_editor",
    viewer: "user_viewer",
    emailEditor: "email_editor@example.com",
    nonMember: "user_non_member",
  };

  // Helper to ensure users exist as auth identities would be handled by client sign-in.
  // We just use the UIDs in documents.

  console.log("[seed] Creating Project A...");
  const projectAId = "projectA_us004";
  const projectARef = db.collection("projects").doc(projectAId);
  await projectARef.set({
    name: "Projekt A — US-004 E2E",
    description: "Testprojekt til US-004 E2E",
    ownerId: ROLES.owner,
    memberEmails: [ROLES.emailEditor],
    roles: {
      [ROLES.admin]: "admin",
      [ROLES.editor]: "editor",
      [ROLES.viewer]: "viewer",
    },
    createdAt: now,
    updatedAt: now,
  });

  // Members subcollection
  for (const [roleName, uid] of Object.entries({
    owner: ROLES.owner,
    admin: ROLES.admin,
    editor: ROLES.editor,
    viewer: ROLES.viewer,
    emailEditor: "email_user",
  })) {
    await projectARef.collection("members").doc(uid).set({
      userId: uid,
      email: uid === "email_user" ? ROLES.emailEditor : `${roleName}@example.com`,
      role: roleName === "emailEditor" ? "editor" : roleName,
      joinedAt: now,
    });
  }

  // Items
  const itemA1 = projectARef.collection("items").doc("itemA1");
  await itemA1.set({
    title: "Knap virker ikke",
    content: "Når jeg trykker på gem-knappen sker der intet.",
    type: "bug",
    status: "new",
    createdBy: ROLES.owner,
    assignedTo: ROLES.editor,
    projectId: projectAId,
    createdAt: now,
    updatedAt: now,
  });

  const itemA2 = projectARef.collection("items").doc("itemA2");
  await itemA2.set({
    title: "Idé. Vi skal have mørkt tema som standard.",
    content: "Mørkt tema som standard indstilling.",
    type: "idea",
    status: "new",
    createdBy: ROLES.owner,
    assignedTo: ROLES.owner,
    projectId: projectAId,
    createdAt: now,
    updatedAt: now,
  });

  const itemA3 = projectARef.collection("items").doc("itemA3");
  await itemA3.set({
    title: "Checkout flow skal valideres",
    content: "1. Valider email\n2. Valider postnummer\n3. Bekræft betaling",
    type: "task",
    status: "new",
    createdBy: ROLES.owner,
    assignedTo: ROLES.editor,
    projectId: projectAId,
    createdAt: now,
    updatedAt: now,
  });

  // Checkpoints on itemA3
  await itemA3.collection("checkpoints").doc("cp1").set({
    text: "Valider email",
    sourceField: "content",
    lineIndex: 0,
    status: "new",
    createdAt: now,
    updatedAt: now,
  });
  await itemA3.collection("checkpoints").doc("cp2").set({
    text: "Valider postnummer",
    sourceField: "content",
    lineIndex: 1,
    status: "new",
    createdAt: now,
    updatedAt: now,
  });
  await itemA3.collection("checkpoints").doc("cp3").set({
    text: "Bekræft betaling",
    sourceField: "content",
    lineIndex: 2,
    status: "new",
    createdAt: now,
    updatedAt: now,
  });

  // Comments
  await itemA1.collection("comments").doc("com1").set({
    text: "Jeg kan reproducere det på iPad.",
    authorId: ROLES.editor,
    itemId: "itemA1",
    projectId: projectAId,
    createdAt: now,
    updatedAt: now,
  });

  // Project-scoped checklist from search-like term "knap" or "tema"
  const projectChecklist = projectARef.collection("checklists").doc("checklistProjectA");
  await projectChecklist.set({
    name: "Dynamisk: knap + tema",
    ownerId: ROLES.owner,
    projectId: projectAId,
    isDynamic: true,
    searchQuery: { raw: "knap" },
    sourceFields: ["content"],
    sortBy: "alphabetical",
    sharedWith: {},
    hasNewMatches: false,
    deletedItemKeys: [],
    createdAt: now,
    updatedAt: now,
  });
  await projectChecklist.collection("items").doc("cli1").set({
    checklistId: "checklistProjectA",
    sourceItemId: "itemA1",
    sourceProjectId: projectAId,
    sourceItemPath: `projects/${projectAId}/items/itemA1`,
    sourceField: "content",
    lineIndex: 0,
    title: "Knap virker ikke",
    notes: "Fra: Knap virker ikke",
    isCompleted: false,
    orderIndex: 0,
    priority: 3,
    createdAt: now,
    updatedAt: now,
  });
  await projectChecklist.collection("items").doc("cli2").set({
    checklistId: "checklistProjectA",
    sourceItemId: "itemA2",
    sourceProjectId: projectAId,
    sourceItemPath: `projects/${projectAId}/items/itemA2`,
    sourceField: "title",
    title: "Idé. Vi skal have mørkt tema som standard.",
    notes: "",
    isCompleted: false,
    orderIndex: 1,
    priority: 1,
    createdAt: now,
    updatedAt: now,
  });

  console.log("[seed] Creating Project B...");
  const projectBId = "projectB_us004";
  const projectBRef = db.collection("projects").doc(projectBId);
  await projectBRef.set({
    name: "Projekt B — Email editor",
    description: "Testprojekt til email-medlem E9",
    ownerId: ROLES.owner,
    memberEmails: [ROLES.emailEditor],
    roles: {},
    createdAt: now,
    updatedAt: now,
  });
  await projectBRef.collection("members").doc(ROLES.owner).set({
    userId: ROLES.owner,
    email: "owner@example.com",
    role: "owner",
    joinedAt: now,
  });
  await projectBRef.collection("members").doc("email_user").set({
    userId: "email_user",
    email: ROLES.emailEditor,
    role: "editor",
    joinedAt: now,
  });

  console.log("[seed] Creating personal/shared checklist for user_owner...");
  const personalChecklistId = "personalChecklistA";
  const personalChecklistRef = db
    .collection("users")
    .doc(ROLES.owner)
    .collection("checklists")
    .doc(personalChecklistId);
  await personalChecklistRef.set({
    name: "Min personlige liste",
    ownerId: ROLES.owner,
    projectId: null,
    isDynamic: false,
    sharedWith: { [ROLES.editor]: "editor" },
    hasNewMatches: false,
    deletedItemKeys: [],
    createdAt: now,
    updatedAt: now,
  });
  await personalChecklistRef.collection("items").doc("pc1").set({
    checklistId: personalChecklistId,
    sourceItemId: "manual",
    sourceProjectId: "",
    sourceField: "manual",
    title: "Husk at teste deling",
    notes: "Personligt punkt",
    isCompleted: false,
    orderIndex: 0,
    priority: 1,
    createdAt: now,
    updatedAt: now,
  });

  // Discovery index for recipient
  await db
    .collection("users")
    .doc(ROLES.editor)
    .collection("sharedChecklists")
    .doc(personalChecklistId)
    .set({
      checklistId: personalChecklistId,
      ownerId: ROLES.owner,
      name: "Min personlige liste",
      sharedAt: now,
    });

  // Reminder for itemA1 (optional test data)
  await db.collection("users").doc(ROLES.owner).collection("reminders").doc("reminder1").set({
    userId: ROLES.owner,
    targetType: "item",
    targetId: "itemA1",
    targetProjectId: projectAId,
    title: "Følg op på knap-fejl",
    scheduledAt: Timestamp.fromMillis(Date.now() + 3600000), // 1 hour from now
    repeat: "once",
    createdAt: now,
    updatedAt: now,
  });

  console.log("[seed] Done.");
  console.log("Created:");
  console.log(`  - Project A: ${projectAId}`);
  console.log(`  - Project B: ${projectBId}`);
  console.log(`  - Personal checklist: /users/${ROLES.owner}/checklists/${personalChecklistId}`);
  console.log(`  - Shared index: /users/${ROLES.editor}/sharedChecklists/${personalChecklistId}`);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
