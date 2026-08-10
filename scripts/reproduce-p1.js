#!/usr/bin/env node
/**
 * P1 root-cause reproduction script for US-004 Build 1.
 *
 * Validates two fixes:
 *   1. Project seed data must match the signed-in user's UID/email for projects to appear.
 *   2. Project-scoped checklists require projectId in checklist deep-link params.
 *
 * Usage with Firestore emulator:
 *   export FIRESTORE_EMULATOR_HOST=localhost:8080
 *   export GOOGLE_CLOUD_PROJECT=demo-no-project
 *   node scripts/reproduce-p1.js
 */

const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const OWNER_UID = process.env.SEED_OWNER_UID || "real_owner_uid";
const MEMBER_EMAIL = process.env.SEED_MEMBER_EMAIL || "real_member@example.com";
const PROJECT_A_ID = "projectA_p1_repro";
const PROJECT_B_ID = "projectB_p1_repro";
const CHECKLIST_ID = "checklistP1Repro";

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  expected: ${expected}\n  actual:   ${actual}`);
  }
}

async function seed(db) {
  const now = Timestamp.now();

  // Project A owned by "real" UID.
  const projectARef = db.collection("projects").doc(PROJECT_A_ID);
  await projectARef.set({
    name: "Projekt A — P1 repro",
    description: "P1 repro owned by real UID",
    ownerId: OWNER_UID,
    memberEmails: [MEMBER_EMAIL],
    roles: {},
    createdAt: now,
    updatedAt: now,
  });
  await projectARef.collection("members").doc(OWNER_UID).set({
    userId: OWNER_UID,
    email: "owner@example.com",
    role: "owner",
    joinedAt: now,
  });

  // Project B also owned by "real" UID, shared via email.
  const projectBRef = db.collection("projects").doc(PROJECT_B_ID);
  await projectBRef.set({
    name: "Projekt B — P1 repro",
    description: "P1 repro via email member",
    ownerId: OWNER_UID,
    memberEmails: [MEMBER_EMAIL],
    roles: {},
    createdAt: now,
    updatedAt: now,
  });
  await projectBRef.collection("members").doc(OWNER_UID).set({
    userId: OWNER_UID,
    email: "owner@example.com",
    role: "owner",
    joinedAt: now,
  });

  // Project-scoped checklist under Project A.
  await projectARef.collection("checklists").doc(CHECKLIST_ID).set({
    name: "Dynamisk P1 liste",
    ownerId: OWNER_UID,
    projectId: PROJECT_A_ID,
    isDynamic: true,
    searchQuery: { raw: "p1" },
    sourceFields: ["content"],
    sortBy: "alphabetical",
    sharedWith: {},
    hasNewMatches: false,
    deletedItemKeys: [],
    createdAt: now,
    updatedAt: now,
  });

  return { projectARef, projectBRef };
}

async function getProjectsForUser(db, userId, userEmail) {
  // Mirrors subscribeToProjects logic from services/projects.ts.
  const byOwner = await db
    .collection("projects")
    .where("ownerId", "==", userId)
    .get();
  const byEmail = await db
    .collection("projects")
    .where("memberEmails", "array-contains", userEmail)
    .get();

  const all = new Map();
  byOwner.docs.forEach((d) => all.set(d.id, d.data()));
  byEmail.docs.forEach((d) => all.set(d.id, d.data()));
  return Array.from(all.entries()).map(([id, data]) => ({ id, ...data }));
}

async function getChecklistById(db, checklistId, projectId, ownerId) {
  // Mirrors getChecklistById logic from services/checklists.ts.
  if (projectId) {
    const snap = await db
      .collection("projects")
      .doc(projectId)
      .collection("checklists")
      .doc(checklistId)
      .get();
    if (snap.exists) return { id: snap.id, ...snap.data() };
    return null;
  }
  if (ownerId) {
    const snap = await db
      .collection("users")
      .doc(ownerId)
      .collection("checklists")
      .doc(checklistId)
      .get();
    if (snap.exists) return { id: snap.id, ...snap.data() };
  }
  return null;
}

function buildChecklistUrl(checklistId, projectId) {
  // Mirrors updated services/deeplinks.ts.
  const query = new URLSearchParams();
  query.set("id", checklistId);
  if (projectId) query.set("projectId", projectId);
  return `datacapture://checklist?${query.toString()}`;
}

async function cleanup(db) {
  const batch = db.batch();
  const a = db.collection("projects").doc(PROJECT_A_ID);
  const b = db.collection("projects").doc(PROJECT_B_ID);
  batch.delete(a);
  batch.delete(b);
  // Members and subcollections will be removed via recursive delete below.
  await batch.commit();

  await a.collection("checklists").listDocuments().then((docs) =>
    Promise.all(docs.map((d) => d.delete()))
  );
  await a.collection("members").listDocuments().then((docs) =>
    Promise.all(docs.map((d) => d.delete()))
  );
  await b.collection("members").listDocuments().then((docs) =>
    Promise.all(docs.map((d) => d.delete()))
  );
}

async function main() {
  if (getApps().length === 0) {
    initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT || "demo-no-project" });
  }
  const db = getFirestore();

  console.log("[reproduce-p1] Cleaning up previous repro data...");
  await cleanup(db).catch(() => {});

  console.log("[reproduce-p1] Seeding with OWNER_UID =", OWNER_UID, "MEMBER_EMAIL =", MEMBER_EMAIL);
  await seed(db);

  console.log("[reproduce-p1] Test 1: Projects appear when ownerId matches UID");
  const projects = await getProjectsForUser(db, OWNER_UID, MEMBER_EMAIL);
  console.log("  projects found:", projects.map((p) => p.name).join(", "));
  assertEqual(projects.length, 2, "Expected 2 projects for owner UID");
  assertEqual(
    projects.some((p) => p.id === PROJECT_A_ID),
    true,
    "Expected Project A to be found"
  );
  assertEqual(
    projects.some((p) => p.id === PROJECT_B_ID),
    true,
    "Expected Project B to be found"
  );

  console.log("[reproduce-p1] Test 2: Project-scoped checklist found WITH projectId");
  const withProjectId = await getChecklistById(db, CHECKLIST_ID, PROJECT_A_ID, OWNER_UID);
  assertEqual(withProjectId !== null, true, "Expected checklist to be found with projectId");
  assertEqual(withProjectId?.projectId, PROJECT_A_ID, "Expected checklist.projectId to match");

  console.log("[reproduce-p1] Test 3: Project-scoped checklist NOT found WITHOUT projectId");
  const withoutProjectId = await getChecklistById(db, CHECKLIST_ID, undefined, OWNER_UID);
  assertEqual(withoutProjectId, null, "Expected checklist to be missing without projectId");

  console.log("[reproduce-p1] Test 4: Deep-link URL includes projectId");
  const url = buildChecklistUrl(CHECKLIST_ID, PROJECT_A_ID);
  assertEqual(
    url.includes(`projectId=${encodeURIComponent(PROJECT_A_ID)}`),
    true,
    "Expected URL to contain encoded projectId"
  );
  console.log("  deep-link:", url);

  console.log("[reproduce-p1] Test 5: Deep-link URL without projectId still works for personal lists");
  const personalUrl = buildChecklistUrl(CHECKLIST_ID);
  assertEqual(personalUrl.includes("projectId="), false, "Expected personal URL to omit projectId");
  console.log("  personal deep-link:", personalUrl);

  console.log("[reproduce-p1] ✅ All P1 assertions passed.");

  await cleanup(db);
  console.log("[reproduce-p1] Cleanup complete.");
}

main().catch((err) => {
  console.error("[reproduce-p1] ❌", err.message);
  process.exit(1);
});
