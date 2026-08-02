#!/usr/bin/env node
/**
 * Emulator-only wipe-and-recreate script for US-004 Solution B validation.
 *
 * Connects to the Firestore emulator, wipes all emulator data, seeds
 * two projects with owner/admin/editor/viewer/email-editor/non-member roles,
 * items, checkpoints, comments, project-scoped checklists, and personal/shared
 * checklists. Then runs a basic smoke read to confirm rules allow the expected
 * access.
 *
 * Requires the Firestore emulator to be running on port 8080.
 * Usage:
 *   firebase emulators:exec --only firestore "node scripts/wipe-and-recreate-emulator.js"
 */

const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, setDoc, collection, getDocs, query, where, getDoc, deleteDoc } = require("firebase/firestore");

const PROJECT_ID = "data-capture-us004";

const ROLES = {
  owner: "user_owner",
  admin: "user_admin",
  editor: "user_editor",
  viewer: "user_viewer",
  emailEditor: "email_editor@example.com",
  nonMember: "user_non_member",
  other: "user_other",
};

async function seedProjectA(env) {
  const ownerCtx = env.authenticatedContext(ROLES.owner);
  const db = ownerCtx.firestore();

  const projectId = "projectA";
  const projectRef = doc(db, "projects", projectId);

  await setDoc(projectRef, {
    name: "Project A",
    description: "Test project A",
    ownerId: ROLES.owner,
    memberEmails: [ROLES.emailEditor],
    roles: {
      [ROLES.admin]: "admin",
      [ROLES.editor]: "editor",
      [ROLES.viewer]: "viewer",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await setDoc(doc(collection(projectRef, "members"), ROLES.owner), {
    userId: ROLES.owner,
    email: "owner@example.com",
    role: "owner",
    joinedAt: new Date(),
  });
  await setDoc(doc(collection(projectRef, "members"), ROLES.admin), {
    userId: ROLES.admin,
    email: "admin@example.com",
    role: "admin",
    joinedAt: new Date(),
  });
  await setDoc(doc(collection(projectRef, "members"), ROLES.editor), {
    userId: ROLES.editor,
    email: "editor@example.com",
    role: "editor",
    joinedAt: new Date(),
  });
  await setDoc(doc(collection(projectRef, "members"), ROLES.viewer), {
    userId: ROLES.viewer,
    email: "viewer@example.com",
    role: "viewer",
    joinedAt: new Date(),
  });
  await setDoc(doc(collection(projectRef, "members"), ROLES.emailEditor), {
    userId: "email_user",
    email: ROLES.emailEditor,
    role: "editor",
    joinedAt: new Date(),
  });

  const item1 = doc(collection(projectRef, "items"), "item1");
  await setDoc(item1, {
    title: "Test item 1",
    content: "Content 1",
    type: "note",
    createdBy: ROLES.owner,
    assignedTo: ROLES.editor,
    projectId: projectId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await setDoc(doc(collection(item1, "checkpoints"), "cp1"), {
    text: "Checkpoint 1",
    completed: false,
    createdAt: new Date(),
  });
  await setDoc(doc(collection(item1, "comments"), "com1"), {
    text: "First comment",
    authorId: ROLES.editor,
    itemId: "item1",
    projectId: projectId,
    createdAt: new Date(),
  });

  const projectChecklist = doc(collection(projectRef, "checklists"), "checklist1");
  await setDoc(projectChecklist, {
    name: "Project checklist",
    ownerId: ROLES.owner,
    projectId: projectId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await setDoc(doc(collection(projectChecklist, "items"), "cli1"), {
    text: "Project checklist item",
    completed: false,
    sourceItemPath: `projects/${projectId}/items/item1`,
    sourceProjectId: projectId,
    sourceItemId: "item1",
    createdAt: new Date(),
  });

  // Personal/shared checklist
  const personalChecklist = doc(db, "checklists", "checklist2");
  await setDoc(personalChecklist, {
    name: "Personal checklist",
    ownerId: ROLES.owner,
    sharedWith: [ROLES.editor],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await setDoc(doc(collection(personalChecklist, "items"), "cli1"), {
    text: "Personal checklist item",
    completed: false,
    createdAt: new Date(),
  });

  return projectId;
}

async function runSmokeTests(env) {
  const ownerCtx = env.authenticatedContext(ROLES.owner);
  const editorCtx = env.authenticatedContext(ROLES.editor);
  const viewerCtx = env.authenticatedContext(ROLES.viewer);
  const emailCtx = env.authenticatedContext("email_user", { email: ROLES.emailEditor });
  const nonMemberCtx = env.authenticatedContext(ROLES.nonMember);

  // Owner can list project items
  await assertSucceeds(getDocs(query(collection(ownerCtx.firestore(), "projects", "projectA", "items"))));
  // Editor can update own assigned item
  await assertSucceeds(
    setDoc(doc(editorCtx.firestore(), "projects", "projectA", "items", "item1"), { title: "Updated" }, { merge: true })
  );
  // Viewer cannot update item
  await assertFails(
    setDoc(doc(viewerCtx.firestore(), "projects", "projectA", "items", "item1"), { title: "Updated" }, { merge: true })
  );
  // Email editor can list project items
  await assertSucceeds(getDocs(query(collection(emailCtx.firestore(), "projects", "projectA", "items"))));
  // Non-member cannot list project items
  await assertFails(getDocs(query(collection(nonMemberCtx.firestore(), "projects", "projectA", "items"))));
  // Owner can read personal/shared checklist
  await assertSucceeds(getDoc(doc(ownerCtx.firestore(), "checklists", "checklist2")));
  // Editor can read shared checklist
  await assertSucceeds(getDoc(doc(editorCtx.firestore(), "checklists", "checklist2")));
  // Non-member cannot read shared checklist
  await assertFails(getDoc(doc(nonMemberCtx.firestore(), "checklists", "checklist2")));

  console.log("[recreate] Smoke tests passed.");
}

async function main() {
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: require("fs").readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });

  console.log("[recreate] Clearing emulator...");
  await env.clearFirestore();

  console.log("[recreate] Seeding testdata...");
  await seedProjectA(env);

  console.log("[recreate] Running smoke tests...");
  await runSmokeTests(env);

  console.log("[recreate] Emulator wipe-and-recreate complete.");

  await env.cleanup();
}

main().catch((err) => {
  console.error("[recreate] Failed:", err);
  process.exit(1);
});
