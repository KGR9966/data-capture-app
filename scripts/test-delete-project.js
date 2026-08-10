#!/usr/bin/env node
/**
 * Isoleret test af deleteProject Cloud Function mod emulator.
 *
 * Forudsætninger:
 *   1. firebase emulators:start --only functions,firestore,storage kører.
 *   2. GOOGLE_APPLICATION_CREDENTIALS eller emulator er sat.
 *   3. FUNCTIONS_EMULATOR og FIRESTORE_EMULATOR_HOST peger på emulator.
 *
 * Testplan:
 *   - Opret projekt med ejer.
 *   - Opret items, checkpoints, comments, checklists.
 *   - Kalder deleteProject callable.
 *   - Verificerer at projekt-doc og subcollections er væk.
 */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getFunctions } = require("firebase-admin/functions");

const PROJECT_ID = "test_delete_project_" + Date.now();
const OWNER_UID = process.env.SEED_OWNER_UID || "test_owner";

async function main() {
  if (getApps().length === 0) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      initializeApp({ credential: cert(require(credPath)) });
    } else {
      initializeApp();
    }
  }

  const db = getFirestore();

  const projectRef = db.collection("projects").doc(PROJECT_ID);
  await projectRef.set({
    name: "Test Delete Project",
    ownerId: OWNER_UID,
    memberEmails: [],
    roles: { [OWNER_UID]: "owner" },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const itemRef = projectRef.collection("items").doc("item1");
  await itemRef.set({
    title: "Test item",
    projectId: PROJECT_ID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  await itemRef.collection("checkpoints").doc("cp1").set({ text: "CP", status: "new" });
  await itemRef.collection("comments").doc("com1").set({ text: "Comment" });
  await projectRef.collection("checklists").doc("cl1").set({ name: "CL" });

  const functions = getFunctions();
  const deleteProject = functions.httpsCallable("deleteProject");
  await deleteProject({ projectId: PROJECT_ID });

  const after = await projectRef.get();
  if (after.exists) {
    console.error("[test-delete-project] FAILED: project still exists");
    process.exit(1);
  }

  const subcollections = ["items", "checklists", "members"];
  for (const sub of subcollections) {
    const snap = await projectRef.collection(sub).limit(1).get();
    if (!snap.empty) {
      console.error(`[test-delete-project] FAILED: subcollection ${sub} not empty`);
      process.exit(1);
    }
  }

  console.log("[test-delete-project] SUCCESS: project and subcollections deleted.");
}

main().catch((err) => {
  console.error("[test-delete-project] ERROR:", err);
  process.exit(1);
});
