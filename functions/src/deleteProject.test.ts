/**
 * Integration tests for deleteProject callable Cloud Function.
 *
 * Run inside the Firebase emulator suite:
 *   npx firebase emulators:exec --project demo-test --only functions,firestore,auth,storage \
 *     "cd functions && npm run build && node lib/deleteProject.test.js"
 *
 * Assumes the emulators expose the following hosts (default ports):
 *   Functions: localhost:5001
 *   Firestore: localhost:8080
 *   Auth:      localhost:9099
 *   Storage:   localhost:9199
 */

import * as admin from "firebase-admin";

interface TestContext {
  projectId: string;
  ownerUid: string;
  adminUid: string;
  editorUid: string;
  itemId: string;
  checkpointId: string;
  commentId: string;
  checklistId: string;
  checklistItemId: string;
}

const PROJECT_ID = process.env.GCLOUD_PROJECT || "demo-test";
const FUNCTIONS_HOST = process.env.FUNCTIONS_EMULATOR_HOST || "localhost:5001";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";

admin.initializeApp({
  projectId: PROJECT_ID,
  storageBucket: `${PROJECT_ID}.appspot.com`,
});

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value: boolean, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

async function getIdToken(uid: string): Promise<string> {
  const customToken = await auth.createCustomToken(uid);
  const url = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to exchange custom token for ${uid}: ${response.status} ${body}`);
  }
  const data = await response.json() as { idToken: string };
  return data.idToken;
}

async function callDeleteProject(projectId: string, idToken?: string): Promise<{ ok: true; result: unknown } | { ok: false; code: string; message: string }> {
  const url = `http://${FUNCTIONS_HOST}/${PROJECT_ID}/us-central1/deleteProject`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: { projectId } }),
  });

  const text = await response.text();
  let body: { result?: unknown; error?: { status?: string; message?: string; code?: number } } = {};
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from function: ${response.status} ${text}`);
  }

  if (!response.ok || body.error) {
    const code = (body.error?.status || `http-${response.status}`).toLowerCase().replace(/_/g, "-");
    const message = body.error?.message || text;
    return { ok: false, code, message };
  }

  return { ok: true, result: body.result };
}

async function seedProject(): Promise<TestContext> {
  const projectId = `test-project-${Date.now()}`;
  const ownerUid = `owner-${Date.now()}`;
  const adminUid = `admin-${Date.now()}`;
  const editorUid = `editor-${Date.now()}`;
  const itemId = `item-1`;
  const checkpointId = `checkpoint-1`;
  const commentId = `comment-1`;
  const checklistId = `checklist-1`;
  const checklistItemId = `checklist-item-1`;

  const batch = db.batch();
  const projectRef = db.collection("projects").doc(projectId);

  batch.set(projectRef, {
    name: "Test project",
    ownerId: ownerUid,
    roles: {
      [adminUid]: "admin",
      [editorUid]: "editor",
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // members subcollection
  batch.set(projectRef.collection("members").doc(ownerUid), { role: "owner", joinedAt: admin.firestore.FieldValue.serverTimestamp() });
  batch.set(projectRef.collection("members").doc(adminUid), { role: "admin", joinedAt: admin.firestore.FieldValue.serverTimestamp() });
  batch.set(projectRef.collection("members").doc(editorUid), { role: "editor", joinedAt: admin.firestore.FieldValue.serverTimestamp() });

  // items + nested checkpoints + comments
  batch.set(projectRef.collection("items").doc(itemId), { title: "Item 1", createdAt: admin.firestore.FieldValue.serverTimestamp() });
  batch.set(projectRef.collection("items").doc(itemId).collection("checkpoints").doc(checkpointId), { name: "CP 1", createdAt: admin.firestore.FieldValue.serverTimestamp() });
  batch.set(projectRef.collection("items").doc(itemId).collection("comments").doc(commentId), { text: "Note", createdAt: admin.firestore.FieldValue.serverTimestamp() });

  // checklists + nested items
  batch.set(projectRef.collection("checklists").doc(checklistId), { title: "Checklist 1", createdAt: admin.firestore.FieldValue.serverTimestamp() });
  batch.set(projectRef.collection("checklists").doc(checklistId).collection("items").doc(checklistItemId), { text: "Todo", createdAt: admin.firestore.FieldValue.serverTimestamp() });

  await batch.commit();

  // Seed Storage object
  const bucket = storage.bucket();
  const filePath = `projects/${projectId}/items/test-photo.jpg`;
  await bucket.file(filePath).save(Buffer.from("fake-image-data"), {
    contentType: "image/jpeg",
  });

  return {
    projectId,
    ownerUid,
    adminUid,
    editorUid,
    itemId,
    checkpointId,
    commentId,
    checklistId,
    checklistItemId,
  };
}

async function verifyDeleted(ctx: TestContext): Promise<void> {
  const projectRef = db.collection("projects").doc(ctx.projectId);

  const paths = [
    projectRef,
    projectRef.collection("members").doc(ctx.ownerUid),
    projectRef.collection("items").doc(ctx.itemId),
    projectRef.collection("items").doc(ctx.itemId).collection("checkpoints").doc(ctx.checkpointId),
    projectRef.collection("items").doc(ctx.itemId).collection("comments").doc(ctx.commentId),
    projectRef.collection("checklists").doc(ctx.checklistId),
    projectRef.collection("checklists").doc(ctx.checklistId).collection("items").doc(ctx.checklistItemId),
  ];

  const snapshots = await Promise.all(paths.map((ref) => ref.get()));
  snapshots.forEach((snap, index) => {
    if (snap.exists) {
      throw new Error(`Expected document ${paths[index].path} to be deleted, but it still exists`);
    }
  });

  // Verify Storage cleanup
  const [files] = await storage.bucket().getFiles({ prefix: `projects/${ctx.projectId}/items/` });
  if (files.length > 0) {
    throw new Error(`Expected Storage prefix projects/${ctx.projectId}/items/ to be empty, found ${files.length} file(s)`);
  }
}

async function verifyStillExists(ctx: TestContext): Promise<void> {
  const projectSnap = await db.collection("projects").doc(ctx.projectId).get();
  assertTrue(projectSnap.exists, `Project ${ctx.projectId} should still exist`);

  const [files] = await storage.bucket().getFiles({ prefix: `projects/${ctx.projectId}/items/` });
  assertTrue(files.length > 0, `Storage files for project ${ctx.projectId} should still exist`);
}

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
  } catch (error) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function main(): Promise<void> {
  console.log("Running deleteProject integration tests...\n");

  await runTest("owner can delete project", async () => {
    const ctx = await seedProject();
    const ownerToken = await getIdToken(ctx.ownerUid);
    const result = await callDeleteProject(ctx.projectId, ownerToken);
    assertTrue(result.ok, `Expected success but got: ${JSON.stringify(result)}`);
    assertEqual((result as { ok: true; result: { success: true } }).result.success, true, "Result success flag");
    await verifyDeleted(ctx);
  });

  await runTest("admin can delete project", async () => {
    const ctx = await seedProject();
    const adminToken = await getIdToken(ctx.adminUid);
    const result = await callDeleteProject(ctx.projectId, adminToken);
    assertTrue(result.ok, `Expected success but got: ${JSON.stringify(result)}`);
    assertEqual((result as { ok: true; result: { success: true } }).result.success, true, "Result success flag");
    await verifyDeleted(ctx);
  });

  await runTest("editor cannot delete project", async () => {
    const ctx = await seedProject();
    const editorToken = await getIdToken(ctx.editorUid);
    const result = await callDeleteProject(ctx.projectId, editorToken);
    assertTrue(!result.ok, "Expected permission-denied");
    assertEqual((result as { ok: false; code: string; message: string }).code, "permission-denied", "Error code");
    await verifyStillExists(ctx);
  });

  await runTest("unauthenticated call is rejected", async () => {
    const ctx = await seedProject();
    const result = await callDeleteProject(ctx.projectId);
    assertTrue(!result.ok, "Expected unauthenticated error");
    assertEqual((result as { ok: false; code: string; message: string }).code, "unauthenticated", "Error code");
    await verifyStillExists(ctx);
  });

  console.log("\nAll tests passed.");
}

main().catch((error) => {
  console.error("\nTest suite failed.");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
