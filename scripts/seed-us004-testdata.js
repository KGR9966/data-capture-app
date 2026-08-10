#!/usr/bin/env node
/**
 * Seed testdata script for US-004 Solution B + A + A2 E2E.
 *
 * Creates two projects, members, items, checkpoints, comments,
 * project-scoped checklist, personal/shared checklist with discovery index.
 *
 * Requires Firebase Admin SDK credentials via GOOGLE_APPLICATION_CREDENTIALS.
 *
 * For EAS preview builds you MUST set SEED_OWNER_UID and SEED_MEMBER_EMAIL to the
 * Firebase Auth UID/email of the test user that signs in on the device. Otherwise
 * the projects and shared checklist will not be visible in the app (P1, Build 1).
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *   export EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=data-capture-506bd.firebasestorage.app
 *   export SEED_OWNER_UID=<real-firebase-auth-uid>
 *   export SEED_MEMBER_EMAIL=<real-test-user-email>
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

  // Allow seed data to be matched against a real Firebase Auth user for EAS preview.
  // Defaults keep local/emulator runs working without extra configuration.
  const OWNER_UID = process.env.SEED_OWNER_UID || "user_owner";
  const MEMBER_UID = process.env.SEED_MEMBER_UID || "email_user";
  const MEMBER_EMAIL = process.env.SEED_MEMBER_EMAIL || "email_editor@example.com";
  const ADMIN_UID = process.env.SEED_ADMIN_UID || "user_admin";
  const EDITOR_UID = process.env.SEED_EDITOR_UID || "user_editor";
  const VIEWER_UID = process.env.SEED_VIEWER_UID || "user_viewer";
  const NON_MEMBER_UID = process.env.SEED_NON_MEMBER_UID || "user_non_member";

  const ROLES = {
    owner: OWNER_UID,
    admin: ADMIN_UID,
    editor: EDITOR_UID,
    viewer: VIEWER_UID,
    emailEditor: MEMBER_EMAIL,
    nonMember: NON_MEMBER_UID,
    emailUser: MEMBER_UID,
  };

  // Helper to ensure users exist as auth identities would be handled by client sign-in.
  // We just use the UIDs in documents.

  console.log("[seed] Creating Project A...");
  const projectAId = "projectA_us004";
  const projectARef = db.collection("projects").doc(projectAId);
  const memberEmails = ROLES.emailEditor ? [ROLES.emailEditor] : [];
  await projectARef.set({
    name: "Projekt A — US-004 E2E",
    description: "Testprojekt til US-004 E2E",
    ownerId: ROLES.owner,
    memberEmails,
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
    emailEditor: ROLES.emailUser,
  })) {
    await projectARef.collection("members").doc(uid).set({
      userId: uid,
      email: uid === ROLES.emailUser ? ROLES.emailEditor : `${roleName}@example.com`,
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
  const projectBMemberEmails = ROLES.emailEditor ? [ROLES.emailEditor] : [];
  await projectBRef.set({
    name: "Projekt B — Email editor",
    description: "Testprojekt til email-medlem E9",
    ownerId: ROLES.owner,
    memberEmails: projectBMemberEmails,
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
  await projectBRef.collection("members").doc(ROLES.emailUser).set({
    userId: ROLES.emailUser,
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
    sharedWith: { [ROLES.emailUser]: "editor" },
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
    .doc(ROLES.emailUser)
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
  console.log("Created (owner UID =", OWNER_UID, "):");
  console.log(`  - Project A: ${projectAId}`);
  console.log(`  - Project B: ${projectBId}`);
  console.log(`  - Personal checklist: /users/${ROLES.owner}/checklists/${personalChecklistId}`);
  console.log(`  - Shared index: /users/${ROLES.emailUser}/sharedChecklists/${personalChecklistId}`);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
