#!/usr/bin/env node
/**
 * Wipe testdata script for US-004 Solution B + A + A2.
 *
 * Requires Firebase Admin SDK credentials via GOOGLE_APPLICATION_CREDENTIALS
 * or default application credentials.
 *
 * Deletes:
 * - All /projects/{projectId} docs + recursive subcollections
 * - All obsolete top-level /items/{itemId} docs + recursive subcollections
 * - All obsolete top-level /checklists/{checklistId} docs + recursive subcollections
 * - Storage prefix projects/ (all project item photos)
 *
 * Leaves:
 * - /users/{userId} and /users/{userId}/reminders (handled gracefully by app fallback)
 * - New user-scoped personal checklists at /users/{userId}/checklists are NOT touched
 *   (this script targets the obsolete top-level collection only)
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

async function deleteCollectionRecursive(db, path) {
  const col = db.collection(path);
  let batch = db.batch();
  let count = 0;
  let deleted = 0;

  const snapshot = await col.get();
  for (const doc of snapshot.docs) {
    await db.recursiveDelete(doc.ref);
    deleted++;
    console.log(`[wipe] Deleted ${path}/${doc.id}`);
  }
  return deleted;
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
      "[wipe] Error: EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET is not set. " +
        "Load your .env or set it manually, e.g.:\n" +
        "  $env:EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET='data-capture-506bd.firebasestorage.app'"
    );
    process.exit(1);
  }
  const bucket = storage.bucket(bucketName);

  console.log("[wipe] Starting testdata wipe...");

  // 1. Delete all /projects/{projectId} documents (recursiveDelete handles subcollections).
  const projectsDeleted = await deleteCollectionRecursive(db, "projects");

  // 2. Delete obsolete top-level /items/{itemId} documents.
  const itemsDeleted = await deleteCollectionRecursive(db, "items");

  // 3. Delete obsolete top-level /checklists/{checklistId} documents (all of them).
  const checklistsDeleted = await deleteCollectionRecursive(db, "checklists");

  // 4. Delete Storage prefix projects/.
  console.log("[wipe] Deleting Storage objects under projects/...");
  const [files] = await bucket.getFiles({ prefix: "projects/" });
  for (const file of files) {
    await file.delete();
    console.log(`[wipe] Deleted storage object ${file.name}`);
  }

  console.log("[wipe] Done.");
  console.log(
    `Summary: ${projectsDeleted} projects, ${itemsDeleted} top-level items, ${checklistsDeleted} top-level checklists, ${files.length} storage objects deleted.`
  );
}

main().catch((err) => {
  console.error("[wipe] Failed:", err);
  process.exit(1);
});
