#!/usr/bin/env node
/**
 * Wipe testdata script for US-004 Solution B.
 *
 * Requires Firebase Admin SDK credentials via GOOGLE_APPLICATION_CREDENTIALS
 * or default application credentials.
 *
 * Deletes:
 * - All /projects/{projectId} docs + recursive subcollections
 * - All obsolete top-level /items/{itemId} docs + recursive subcollections
 * - All /checklists/{checklistId} docs that have projectId != null (project-scoped)
 * - Storage prefix projects/ (all project item photos)
 *
 * Leaves:
 * - /users/{userId} and /users/{userId}/reminders (handled gracefully by app fallback)
 * - Top-level /checklists/{checklistId} where projectId == null (personal/shared)
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *   node scripts/wipe-testdata.js
 */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

function requireEnvOrCred() {
  const key = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (key) return key;
  // Allow running inside GCP/App Engine/Cloud Functions where default creds exist.
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
  const bucket = storage.bucket();

  console.log("[wipe] Starting testdata wipe...");

  // 1. Delete all /projects/{projectId} documents (recursiveDelete handles subcollections).
  const projectsSnap = await db.collection("projects").get();
  console.log(`[wipe] Found ${projectsSnap.size} projects to delete.`);
  for (const doc of projectsSnap.docs) {
    await db.recursiveDelete(doc.ref);
    console.log(`[wipe] Deleted project ${doc.id}`);
  }

  // 2. Delete obsolete top-level /items/{itemId} documents.
  const itemsSnap = await db.collection("items").get();
  console.log(`[wipe] Found ${itemsSnap.size} top-level items to delete.`);
  for (const doc of itemsSnap.docs) {
    await db.recursiveDelete(doc.ref);
    console.log(`[wipe] Deleted top-level item ${doc.id}`);
  }

  // 3. Delete project-scoped top-level checklists (projectId != null).
  const checklistsSnap = await db.collection("checklists").get();
  console.log(`[wipe] Found ${checklistsSnap.size} top-level checklists.`);
  let deletedChecklists = 0;
  for (const doc of checklistsSnap.docs) {
    const data = doc.data();
    if (data.projectId != null) {
      await db.recursiveDelete(doc.ref);
      deletedChecklists++;
      console.log(`[wipe] Deleted project-scoped checklist ${doc.id}`);
    } else {
      console.log(`[wipe] Kept personal/shared checklist ${doc.id}`);
    }
  }

  // 4. Delete Storage prefix projects/.
  console.log("[wipe] Deleting Storage objects under projects/...");
  const [files] = await bucket.getFiles({ prefix: "projects/" });
  for (const file of files) {
    await file.delete();
    console.log(`[wipe] Deleted storage object ${file.name}`);
  }

  console.log("[wipe] Done.");
  console.log(
    `Summary: ${projectsSnap.size} projects, ${itemsSnap.size} top-level items, ${deletedChecklists} project-scoped checklists, ${files.length} storage objects deleted.`
  );
}

main().catch((err) => {
  console.error("[wipe] Failed:", err);
  process.exit(1);
});
