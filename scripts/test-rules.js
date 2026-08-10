const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
} = require("firebase/firestore");
const { readFileSync } = require("fs");
const { resolve } = require("path");

const RULES_PATH = resolve(__dirname, "..", "firestore.rules");
const PROJECT_ID = "data-capture-us004";

let env;
const contexts = {};
const results = { pass: 0, fail: 0, errors: [] };

async function setup() {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, "utf8") },
  });

  contexts.owner = env.authenticatedContext("user_owner", { email: "owner@example.com" });
  contexts.admin = env.authenticatedContext("user_admin", { email: "admin@example.com" });
  contexts.editor = env.authenticatedContext("user_editor", { email: "editor@example.com" });
  contexts.viewer = env.authenticatedContext("user_viewer", { email: "viewer@example.com" });
  contexts.emailEditor = env.authenticatedContext("email_editor", { email: "email_editor@example.com" });
  contexts.emailAdmin = env.authenticatedContext("email_admin", { email: "email_admin@example.com" });
  contexts.nonMember = env.authenticatedContext("user_non_member", { email: "nonmember@example.com" });
  contexts.other = env.authenticatedContext("user_other", { email: "other@example.com" });
}

async function seedData() {
  await env.clearFirestore();
  const db = contexts.owner.firestore();

  // Project with all role variants (owner, admin, editor, viewer) and email member.
  await setDoc(doc(db, "projects", "projectA"), {
    ownerId: "user_owner",
    roles: {
      user_admin: "admin",
      user_editor: "editor",
      user_viewer: "viewer",
      email_admin: "admin",
      email_editor: "editor",
    },
    memberEmails: {
      "email_editor@example.com": true,
      "email_admin@example.com": true,
    },
    name: "Project A",
  });

  // Items
  await setDoc(doc(db, "projects", "projectA", "items", "item1"), {
    projectId: "projectA",
    createdBy: "user_owner",
    assignedTo: "user_editor",
    title: "Item 1",
    status: "open",
  });
  await setDoc(doc(db, "projects", "projectA", "items", "item2"), {
    projectId: "projectA",
    createdBy: "user_editor",
    assignedTo: "user_viewer",
    title: "Item 2",
    status: "open",
  });

  // Checkpoints
  await setDoc(doc(db, "projects", "projectA", "items", "item1", "checkpoints", "cp1"), {
    projectId: "projectA",
    itemId: "item1",
    title: "Checkpoint 1",
    completed: false,
  });

  // Comments
  await setDoc(doc(db, "projects", "projectA", "items", "item1", "comments", "com1"), {
    projectId: "projectA",
    itemId: "item1",
    authorId: "user_editor",
    text: "Comment by editor",
  });
  await setDoc(doc(db, "projects", "projectA", "items", "item1", "comments", "com2"), {
    projectId: "projectA",
    itemId: "item1",
    authorId: "user_owner",
    text: "Comment by owner",
  });

  // Project-scoped checklists
  await setDoc(doc(db, "projects", "projectA", "checklists", "checklist1"), {
    projectId: "projectA",
    ownerId: "user_owner",
    name: "Project Checklist 1",
  });
  await setDoc(doc(db, "projects", "projectA", "checklists", "checklist1", "items", "cli1"), {
    name: "Project checklist item 1",
  });

  // Personal/shared checklists under /users/{userId}/checklists
  await setDoc(doc(db, "users", "user_owner", "checklists", "checklist2"), {
    ownerId: "user_owner",
    name: "Shared Checklist",
    sharedWith: { user_editor: "editor" },
    projectId: null,
  });
  await setDoc(doc(db, "users", "user_owner", "checklists", "checklist2", "items", "cli1"), {
    name: "Shared checklist item 1",
  });

  const otherDb = contexts.other.firestore();
  await setDoc(doc(otherDb, "users", "user_other", "checklists", "checklist3"), {
    ownerId: "user_other",
    name: "Other Personal Checklist",
    sharedWith: {},
    projectId: null,
  });

  // Shared-with-me discovery index
  await setDoc(doc(db, "users", "user_editor", "sharedChecklists", "checklist2"), {
    ownerId: "user_owner",
    name: "Shared Checklist",
    checklistId: "checklist2",
    sharedAt: Date.now(),
  });
}

function db(role) {
  return contexts[role].firestore();
}

async function expectAllow(promise) {
  await assertSucceeds(promise);
}

async function expectDeny(promise) {
  await assertFails(promise);
}

async function runCase(id, fn) {
  try {
    await seedData();
    await fn();
    results.pass++;
    console.log(`PASS ${id}`);
  } catch (err) {
    results.fail++;
    results.errors.push({ id, error: err.message });
    console.log(`FAIL ${id}: ${err.message}`);
  }
}

async function main() {
  await setup();

  // ─────────────────────────────────────────────────────────────
  // Projects: /projects/{projectId}
  // ─────────────────────────────────────────────────────────────

  await runCase("P-L-1", async () => {
    await expectAllow(getDoc(doc(db("owner"), "projects", "projectA")));
  });
  await runCase("P-L-2", async () => {
    await expectAllow(getDoc(doc(db("admin"), "projects", "projectA")));
  });
  await runCase("P-L-3", async () => {
    await expectDeny(getDoc(doc(db("nonMember"), "projects", "projectA")));
  });

  await runCase("P-UP-1", async () => {
    await expectAllow(
      updateDoc(doc(db("owner"), "projects", "projectA"), { name: "Renamed by owner" })
    );
  });
  await runCase("P-UP-2", async () => {
    await expectAllow(
      updateDoc(doc(db("admin"), "projects", "projectA"), { name: "Renamed by admin" })
    );
  });
  await runCase("P-UP-3", async () => {
    await expectDeny(
      updateDoc(doc(db("editor"), "projects", "projectA"), { name: "Hacked" })
    );
  });
  await runCase("P-UP-4", async () => {
    // Admin må ikke ændre ownerId.
    await expectDeny(
      updateDoc(doc(db("admin"), "projects", "projectA"), { ownerId: "user_admin" })
    );
  });
  await runCase("P-UP-5", async () => {
    // Owner må ikke ændre ownerId (kun for at forhindre utilsigtet overdragelse).
    await expectDeny(
      updateDoc(doc(db("owner"), "projects", "projectA"), { ownerId: "user_admin" })
    );
  });
  await runCase("P-UP-6", async () => {
    // Admin må ikke tildele sig selv owner-rolle.
    await expectDeny(
      updateDoc(doc(db("admin"), "projects", "projectA"), {
        roles: { user_admin: "owner" },
      })
    );
  });
  await runCase("P-UP-7", async () => {
    // Owner må tildele admin-rolle til andre.
    await expectAllow(
      updateDoc(doc(db("owner"), "projects", "projectA"), {
        roles: { user_editor: "admin" },
      })
    );
  });
  await runCase("P-UP-8", async () => {
    // Admin må ændre andres rolle til editor (nedgradering).
    await expectAllow(
      updateDoc(doc(db("admin"), "projects", "projectA"), {
        roles: { user_editor: "viewer" },
      })
    );
  });
  await runCase("P-D-1", async () => {
    await expectAllow(deleteDoc(doc(db("owner"), "projects", "projectA")));
  });
  await runCase("P-D-2", async () => {
    await expectDeny(deleteDoc(doc(db("admin"), "projects", "projectA")));
  });
  await runCase("P-D-3", async () => {
    // Email-invited admin må ikke slette projekt-dokumentet (kun CF-stien).
    await expectDeny(deleteDoc(doc(db("emailAdmin"), "projects", "projectA")));
  });
  await runCase("P-ROLE-1", async () => {
    // Email-invited admin får admin-rettigheder på projekt-scoped checklist.
    await expectAllow(
      updateDoc(doc(db("emailAdmin"), "projects", "projectA", "checklists", "checklist1"), { name: "Updated by email admin" })
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Items: /projects/{projectId}/items/{itemId}
  // ─────────────────────────────────────────────────────────────

  await runCase("I-L-1", async () => {
    await expectAllow(getDocs(query(collection(db("owner"), "projects", "projectA", "items"))));
  });
  await runCase("I-L-2", async () => {
    await expectAllow(getDocs(query(collection(db("admin"), "projects", "projectA", "items"))));
  });
  await runCase("I-L-3", async () => {
    await expectAllow(getDocs(query(collection(db("editor"), "projects", "projectA", "items"))));
  });
  await runCase("I-L-4", async () => {
    await expectAllow(getDocs(query(collection(db("viewer"), "projects", "projectA", "items"))));
  });
  await runCase("I-L-5", async () => {
    await expectAllow(getDocs(query(collection(db("emailEditor"), "projects", "projectA", "items"))));
  });
  await runCase("I-L-6", async () => {
    await expectDeny(getDocs(query(collection(db("nonMember"), "projects", "projectA", "items"))));
  });

  await runCase("I-G-1", async () => {
    await expectAllow(getDoc(doc(db("editor"), "projects", "projectA", "items", "item1")));
  });
  await runCase("I-G-2", async () => {
    await expectDeny(getDoc(doc(db("nonMember"), "projects", "projectA", "items", "item1")));
  });

  await runCase("I-C-1", async () => {
    await expectAllow(
      addDoc(collection(db("owner"), "projects", "projectA", "items"), {
        projectId: "projectA",
        createdBy: "user_owner",
        title: "New item by owner",
        status: "open",
      })
    );
  });
  await runCase("I-C-2", async () => {
    await expectAllow(
      addDoc(collection(db("editor"), "projects", "projectA", "items"), {
        projectId: "projectA",
        createdBy: "user_editor",
        title: "New item by editor",
        status: "open",
      })
    );
  });
  await runCase("I-C-3", async () => {
    await expectDeny(
      addDoc(collection(db("viewer"), "projects", "projectA", "items"), {
        projectId: "projectA",
        createdBy: "user_viewer",
        title: "New item by viewer",
        status: "open",
      })
    );
  });
  await runCase("I-C-4", async () => {
    await expectDeny(
      addDoc(collection(db("nonMember"), "projects", "projectA", "items"), {
        projectId: "projectA",
        createdBy: "user_non_member",
        title: "New item by non-member",
        status: "open",
      })
    );
  });
  await runCase("I-C-5", async () => {
    await expectDeny(
      addDoc(collection(db("editor"), "projects", "projectA", "items"), {
        projectId: "projectB",
        createdBy: "user_editor",
        title: "Item with wrong projectId",
        status: "open",
      })
    );
  });

  await runCase("I-UP-1", async () => {
    await expectAllow(
      updateDoc(doc(db("owner"), "projects", "projectA", "items", "item1"), { title: "Updated by owner" })
    );
  });
  await runCase("I-UP-2", async () => {
    await expectAllow(
      updateDoc(doc(db("editor"), "projects", "projectA", "items", "item2"), { title: "Updated by editor creator" })
    );
  });
  await runCase("I-UP-3", async () => {
    await expectAllow(
      updateDoc(doc(db("editor"), "projects", "projectA", "items", "item1"), { title: "Updated by assignee" })
    );
  });
  await runCase("I-UP-4", async () => {
    // Create a fresh doc where neither creator nor assignee is user_editor.
    await setDoc(doc(db("owner"), "projects", "projectA", "items", "item3"), {
      projectId: "projectA",
      createdBy: "user_owner",
      assignedTo: "user_viewer",
      title: "Third item",
      status: "open",
    });
    await expectDeny(
      updateDoc(doc(db("editor"), "projects", "projectA", "items", "item3"), { title: "Hacked" })
    );
  });
  await runCase("I-UP-5", async () => {
    await expectDeny(
      updateDoc(doc(db("viewer"), "projects", "projectA", "items", "item1"), { title: "Hacked" })
    );
  });
  await runCase("I-UP-6", async () => {
    await expectDeny(
      updateDoc(doc(db("nonMember"), "projects", "projectA", "items", "item1"), { title: "Hacked" })
    );
  });

  await runCase("I-D-1", async () => {
    await expectAllow(deleteDoc(doc(db("owner"), "projects", "projectA", "items", "item1")));
  });
  await runCase("I-D-2", async () => {
    await expectAllow(deleteDoc(doc(db("editor"), "projects", "projectA", "items", "item2")));
  });
  await runCase("I-D-3", async () => {
    await expectDeny(deleteDoc(doc(db("editor"), "projects", "projectA", "items", "item1")));
  });
  await runCase("I-D-4", async () => {
    await expectDeny(deleteDoc(doc(db("viewer"), "projects", "projectA", "items", "item1")));
  });
  await runCase("I-D-5", async () => {
    await expectDeny(deleteDoc(doc(db("nonMember"), "projects", "projectA", "items", "item1")));
  });

  // ─────────────────────────────────────────────────────────────
  // Checkpoints: /projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}
  // ─────────────────────────────────────────────────────────────

  await runCase("CP-L-1", async () => {
    await expectAllow(
      getDocs(query(collection(db("viewer"), "projects", "projectA", "items", "item1", "checkpoints")))
    );
  });
  await runCase("CP-L-2", async () => {
    await expectDeny(
      getDocs(query(collection(db("nonMember"), "projects", "projectA", "items", "item1", "checkpoints")))
    );
  });

  await runCase("CP-G-1", async () => {
    await expectAllow(
      getDoc(doc(db("editor"), "projects", "projectA", "items", "item1", "checkpoints", "cp1"))
    );
  });

  await runCase("CP-C-1", async () => {
    await expectAllow(
      addDoc(collection(db("editor"), "projects", "projectA", "items", "item1", "checkpoints"), {
        projectId: "projectA",
        itemId: "item1",
        title: "New checkpoint",
        completed: false,
      })
    );
  });
  await runCase("CP-C-2", async () => {
    await expectDeny(
      addDoc(collection(db("viewer"), "projects", "projectA", "items", "item1", "checkpoints"), {
        projectId: "projectA",
        itemId: "item1",
        title: "Viewer checkpoint",
        completed: false,
      })
    );
  });

  await runCase("CP-UP-1", async () => {
    await expectAllow(
      updateDoc(doc(db("editor"), "projects", "projectA", "items", "item1", "checkpoints", "cp1"), {
        title: "Updated checkpoint",
      })
    );
  });
  await runCase("CP-UP-2", async () => {
    await expectDeny(
      updateDoc(doc(db("viewer"), "projects", "projectA", "items", "item1", "checkpoints", "cp1"), {
        title: "Hacked",
      })
    );
  });

  await runCase("CP-D-1", async () => {
    await expectAllow(
      deleteDoc(doc(db("admin"), "projects", "projectA", "items", "item1", "checkpoints", "cp1"))
    );
  });
  await runCase("CP-D-2", async () => {
    await expectDeny(
      deleteDoc(doc(db("viewer"), "projects", "projectA", "items", "item1", "checkpoints", "cp1"))
    );
  });
  await runCase("CP-D-3", async () => {
    await expectDeny(
      deleteDoc(doc(db("nonMember"), "projects", "projectA", "items", "item1", "checkpoints", "cp1"))
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Comments: /projects/{projectId}/items/{itemId}/comments/{commentId}
  // ─────────────────────────────────────────────────────────────

  await runCase("CM-L-1", async () => {
    await expectAllow(
      getDocs(query(collection(db("viewer"), "projects", "projectA", "items", "item1", "comments")))
    );
  });
  await runCase("CM-L-2", async () => {
    await expectDeny(
      getDocs(query(collection(db("nonMember"), "projects", "projectA", "items", "item1", "comments")))
    );
  });

  await runCase("CM-G-1", async () => {
    await expectAllow(getDoc(doc(db("editor"), "projects", "projectA", "items", "item1", "comments", "com1")));
  });

  await runCase("CM-C-1", async () => {
    await expectAllow(
      addDoc(collection(db("editor"), "projects", "projectA", "items", "item1", "comments"), {
        projectId: "projectA",
        itemId: "item1",
        authorId: "user_editor",
        text: "New comment",
      })
    );
  });
  await runCase("CM-C-2", async () => {
    await expectDeny(
      addDoc(collection(db("viewer"), "projects", "projectA", "items", "item1", "comments"), {
        projectId: "projectA",
        itemId: "item1",
        authorId: "user_viewer",
        text: "Viewer comment",
      })
    );
  });
  await runCase("CM-C-3", async () => {
    await expectDeny(
      addDoc(collection(db("editor"), "projects", "projectA", "items", "item1", "comments"), {
        projectId: "projectB",
        itemId: "item1",
        authorId: "user_editor",
        text: "Wrong project",
      })
    );
  });
  await runCase("CM-C-4", async () => {
    await expectDeny(
      addDoc(collection(db("editor"), "projects", "projectA", "items", "item1", "comments"), {
        projectId: "projectA",
        itemId: "item2",
        authorId: "user_editor",
        text: "Wrong item",
      })
    );
  });

  await runCase("CM-UP-1", async () => {
    await expectAllow(
      updateDoc(doc(db("editor"), "projects", "projectA", "items", "item1", "comments", "com1"), {
        text: "Updated by author",
      })
    );
  });
  await runCase("CM-UP-2", async () => {
    await expectDeny(
      updateDoc(doc(db("editor"), "projects", "projectA", "items", "item1", "comments", "com2"), {
        text: "Hacked",
      })
    );
  });
  await runCase("CM-UP-3", async () => {
    await expectAllow(
      updateDoc(doc(db("owner"), "projects", "projectA", "items", "item1", "comments", "com1"), {
        text: "Updated by owner",
      })
    );
  });

  await runCase("CM-D-1", async () => {
    await expectAllow(deleteDoc(doc(db("editor"), "projects", "projectA", "items", "item1", "comments", "com1")));
  });
  await runCase("CM-D-2", async () => {
    // com1 was deleted in CM-D-1; seedData is called per test so com1 exists again.
    await expectDeny(deleteDoc(doc(db("editor"), "projects", "projectA", "items", "item1", "comments", "com2")));
  });
  await runCase("CM-D-3", async () => {
    await expectAllow(deleteDoc(doc(db("owner"), "projects", "projectA", "items", "item1", "comments", "com1")));
  });
  await runCase("CM-D-4", async () => {
    await expectDeny(deleteDoc(doc(db("nonMember"), "projects", "projectA", "items", "item1", "comments", "com1")));
  });

  // ─────────────────────────────────────────────────────────────
  // Project-scoped checklists: /projects/{projectId}/checklists/{checklistId}
  // ─────────────────────────────────────────────────────────────

  await runCase("PCH-L-1", async () => {
    await expectAllow(getDocs(query(collection(db("owner"), "projects", "projectA", "checklists"))));
  });
  await runCase("PCH-L-2", async () => {
    await expectAllow(getDocs(query(collection(db("admin"), "projects", "projectA", "checklists"))));
  });
  await runCase("PCH-L-3", async () => {
    await expectAllow(getDocs(query(collection(db("editor"), "projects", "projectA", "checklists"))));
  });
  await runCase("PCH-L-4", async () => {
    await expectAllow(getDocs(query(collection(db("viewer"), "projects", "projectA", "checklists"))));
  });
  await runCase("PCH-L-5", async () => {
    await expectAllow(getDocs(query(collection(db("emailEditor"), "projects", "projectA", "checklists"))));
  });
  await runCase("PCH-L-6", async () => {
    await expectDeny(getDocs(query(collection(db("nonMember"), "projects", "projectA", "checklists"))));
  });

  await runCase("PCH-G-1", async () => {
    await expectAllow(getDoc(doc(db("editor"), "projects", "projectA", "checklists", "checklist1")));
  });
  await runCase("PCH-G-2", async () => {
    await expectDeny(getDoc(doc(db("nonMember"), "projects", "projectA", "checklists", "checklist1")));
  });

  await runCase("PCH-C-1", async () => {
    await expectAllow(
      addDoc(collection(db("editor"), "projects", "projectA", "checklists"), {
        projectId: "projectA",
        ownerId: "user_editor",
        name: "Editor checklist",
      })
    );
  });
  await runCase("PCH-C-2", async () => {
    await expectDeny(
      addDoc(collection(db("viewer"), "projects", "projectA", "checklists"), {
        projectId: "projectA",
        ownerId: "user_viewer",
        name: "Viewer checklist",
      })
    );
  });
  await runCase("PCH-C-3", async () => {
    await expectDeny(
      addDoc(collection(db("nonMember"), "projects", "projectA", "checklists"), {
        projectId: "projectA",
        ownerId: "user_non_member",
        name: "Non-member checklist",
      })
    );
  });

  await runCase("PCH-UP-1", async () => {
    await expectAllow(
      updateDoc(doc(db("editor"), "projects", "projectA", "checklists", "checklist1"), { name: "Updated by editor" })
    );
  });
  await runCase("PCH-UP-2", async () => {
    await expectDeny(
      updateDoc(doc(db("viewer"), "projects", "projectA", "checklists", "checklist1"), { name: "Hacked" })
    );
  });

  await runCase("PCH-D-1", async () => {
    await expectAllow(deleteDoc(doc(db("owner"), "projects", "projectA", "checklists", "checklist1")));
  });
  await runCase("PCH-D-2", async () => {
    await expectDeny(deleteDoc(doc(db("editor"), "projects", "projectA", "checklists", "checklist1")));
  });
  await runCase("PCH-D-3", async () => {
    await expectDeny(deleteDoc(doc(db("nonMember"), "projects", "projectA", "checklists", "checklist1")));
  });

  // ─────────────────────────────────────────────────────────────
  // Project-scoped checklist items: /projects/{projectId}/checklists/{checklistId}/items/{itemId}
  // ─────────────────────────────────────────────────────────────

  await runCase("PCLI-L-1", async () => {
    await expectAllow(
      getDocs(query(collection(db("editor"), "projects", "projectA", "checklists", "checklist1", "items")))
    );
  });
  await runCase("PCLI-L-2", async () => {
    await expectDeny(
      getDocs(query(collection(db("nonMember"), "projects", "projectA", "checklists", "checklist1", "items")))
    );
  });

  await runCase("PCLI-G-1", async () => {
    await expectAllow(
      getDoc(doc(db("editor"), "projects", "projectA", "checklists", "checklist1", "items", "cli1"))
    );
  });

  await runCase("PCLI-C-1", async () => {
    await expectAllow(
      addDoc(collection(db("editor"), "projects", "projectA", "checklists", "checklist1", "items"), {
        name: "New project checklist item",
      })
    );
  });
  await runCase("PCLI-C-2", async () => {
    await expectDeny(
      addDoc(collection(db("viewer"), "projects", "projectA", "checklists", "checklist1", "items"), {
        name: "Viewer checklist item",
      })
    );
  });

  await runCase("PCLI-UP-1", async () => {
    await expectAllow(
      updateDoc(doc(db("editor"), "projects", "projectA", "checklists", "checklist1", "items", "cli1"), {
        name: "Updated item",
      })
    );
  });

  await runCase("PCLI-D-1", async () => {
    await expectAllow(
      deleteDoc(doc(db("admin"), "projects", "projectA", "checklists", "checklist1", "items", "cli1"))
    );
  });
  await runCase("PCLI-D-2", async () => {
    await expectDeny(
      deleteDoc(doc(db("viewer"), "projects", "projectA", "checklists", "checklist1", "items", "cli1"))
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Personal/shared checklists: /users/{userId}/checklists/{checklistId}
  // ─────────────────────────────────────────────────────────────

  await runCase("UCH-L-1", async () => {
    await expectAllow(getDocs(query(collection(db("owner"), "users", "user_owner", "checklists"))));
  });
  await runCase("UCH-L-2", async () => {
    await expectDeny(getDocs(query(collection(db("nonMember"), "users", "user_owner", "checklists"))));
  });

  await runCase("UCH-G-1", async () => {
    await expectAllow(getDoc(doc(db("owner"), "users", "user_owner", "checklists", "checklist2")));
  });
  await runCase("UCH-G-2", async () => {
    await expectAllow(getDoc(doc(db("editor"), "users", "user_owner", "checklists", "checklist2")));
  });
  await runCase("UCH-G-3", async () => {
    await expectDeny(getDoc(doc(db("nonMember"), "users", "user_owner", "checklists", "checklist2")));
  });

  await runCase("UCH-C-1", async () => {
    await expectAllow(
      setDoc(doc(db("owner"), "users", "user_owner", "checklists", "newChecklist"), {
        name: "New personal checklist",
        ownerId: "user_owner",
        projectId: null,
      })
    );
  });
  await runCase("UCH-C-2", async () => {
    await expectDeny(
      setDoc(doc(db("owner"), "users", "user_owner", "checklists", "badChecklist"), {
        name: "Bad checklist",
        ownerId: "user_owner",
        projectId: "projectA",
      })
    );
  });

  await runCase("UCH-UP-1", async () => {
    await expectAllow(
      updateDoc(doc(db("owner"), "users", "user_owner", "checklists", "checklist2"), { name: "Renamed by owner" })
    );
  });
  await runCase("UCH-UP-2", async () => {
    await expectAllow(
      updateDoc(doc(db("owner"), "users", "user_owner", "checklists", "checklist2"), {
        sharedWith: { user_editor: "editor", user_viewer: "viewer" },
      })
    );
  });
  await runCase("UCH-UP-3", async () => {
    await expectDeny(
      updateDoc(doc(db("owner"), "users", "user_owner", "checklists", "checklist2"), { ownerId: "user_other" })
    );
  });
  await runCase("UCH-UP-4", async () => {
    await expectDeny(
      updateDoc(doc(db("editor"), "users", "user_owner", "checklists", "checklist2"), {
        sharedWith: { user_editor: "editor", user_non_member: "viewer" },
      })
    );
  });

  await runCase("UCH-D-1", async () => {
    await expectAllow(deleteDoc(doc(db("owner"), "users", "user_owner", "checklists", "checklist2")));
  });
  await runCase("UCH-D-2", async () => {
    await expectDeny(deleteDoc(doc(db("editor"), "users", "user_owner", "checklists", "checklist2")));
  });

  // ─────────────────────────────────────────────────────────────
  // Personal/shared checklist items: /users/{userId}/checklists/{checklistId}/items/{itemId}
  // ─────────────────────────────────────────────────────────────

  await runCase("UCLI-L-1", async () => {
    await expectAllow(
      getDocs(query(collection(db("owner"), "users", "user_owner", "checklists", "checklist2", "items")))
    );
  });
  await runCase("UCLI-L-2", async () => {
    await expectAllow(
      getDocs(query(collection(db("editor"), "users", "user_owner", "checklists", "checklist2", "items")))
    );
  });
  await runCase("UCLI-L-3", async () => {
    await expectDeny(
      getDocs(query(collection(db("nonMember"), "users", "user_owner", "checklists", "checklist2", "items")))
    );
  });

  await runCase("UCLI-G-1", async () => {
    await expectAllow(getDoc(doc(db("editor"), "users", "user_owner", "checklists", "checklist2", "items", "cli1")));
  });
  await runCase("UCLI-G-2", async () => {
    await expectDeny(getDoc(doc(db("nonMember"), "users", "user_owner", "checklists", "checklist2", "items", "cli1")));
  });

  await runCase("UCLI-C-1", async () => {
    await expectAllow(
      addDoc(collection(db("editor"), "users", "user_owner", "checklists", "checklist2", "items"), {
        name: "New item by shared editor",
      })
    );
  });
  await runCase("UCLI-C-2", async () => {
    await expectDeny(
      addDoc(collection(db("nonMember"), "users", "user_owner", "checklists", "checklist2", "items"), {
        name: "Hacked item",
      })
    );
  });

  await runCase("UCLI-UP-1", async () => {
    await expectAllow(
      updateDoc(doc(db("editor"), "users", "user_owner", "checklists", "checklist2", "items", "cli1"), {
        name: "Updated by shared editor",
      })
    );
  });
  await runCase("UCLI-UP-2", async () => {
    await expectDeny(
      updateDoc(doc(db("nonMember"), "users", "user_owner", "checklists", "checklist2", "items", "cli1"), {
        name: "Hacked",
      })
    );
  });

  await runCase("UCLI-D-1", async () => {
    await expectAllow(deleteDoc(doc(db("editor"), "users", "user_owner", "checklists", "checklist2", "items", "cli1")));
  });
  await runCase("UCLI-D-2", async () => {
    await expectDeny(deleteDoc(doc(db("nonMember"), "users", "user_owner", "checklists", "checklist2", "items", "cli1")));
  });

  // ─────────────────────────────────────────────────────────────
  // Shared-with-me discovery index: /users/{userId}/sharedChecklists/{checklistId}
  // ─────────────────────────────────────────────────────────────

  await runCase("SCD-L-1", async () => {
    await expectAllow(getDocs(query(collection(db("editor"), "users", "user_editor", "sharedChecklists"))));
  });
  await runCase("SCD-L-2", async () => {
    await expectDeny(getDocs(query(collection(db("nonMember"), "users", "user_editor", "sharedChecklists"))));
  });

  await runCase("SCD-C-1", async () => {
    await expectAllow(
      setDoc(doc(db("owner"), "users", "user_viewer", "sharedChecklists", "checklist2"), {
        ownerId: "user_owner",
        name: "Shared Checklist",
        checklistId: "checklist2",
      })
    );
  });
  await runCase("SCD-C-2", async () => {
    await expectAllow(
      setDoc(doc(db("editor"), "users", "user_editor", "sharedChecklists", "checklist2"), {
        ownerId: "user_owner",
        name: "Shared Checklist",
        checklistId: "checklist2",
        sharedAt: Date.now(),
      })
    );
  });
  await runCase("SCD-C-3", async () => {
    await expectDeny(
      setDoc(doc(db("nonMember"), "users", "user_non_member", "sharedChecklists", "checklist2"), {
        ownerId: "user_owner",
        name: "Shared Checklist",
        checklistId: "checklist2",
      })
    );
  });
  await runCase("SCD-C-4", async () => {
    await expectDeny(
      setDoc(doc(db("owner"), "users", "user_viewer", "sharedChecklists", "checklist2"), {
        ownerId: "user_owner",
        name: "Shared Checklist",
        checklistId: "checklist2",
        extra: "not allowed",
      })
    );
  });
  await runCase("SCD-C-5", async () => {
    await expectDeny(
      setDoc(doc(db("owner"), "users", "user_viewer", "sharedChecklists", "checklist2"), {
        ownerId: "user_owner",
        name: "Shared Checklist",
        checklistId: "wrong-checklist-id",
      })
    );
  });
  await runCase("SCD-C-6", async () => {
    await expectDeny(
      setDoc(doc(db("owner"), "users", "user_viewer", "sharedChecklists", "checklist2"), {
        ownerId: "user_owner",
        name: "Shared Checklist",
      })
    );
  });

  await runCase("SCD-UP-1", async () => {
    await expectAllow(
      updateDoc(doc(db("owner"), "users", "user_editor", "sharedChecklists", "checklist2"), {
        ownerId: "user_owner",
        name: "Renamed by owner",
        checklistId: "checklist2",
      })
    );
  });

  await runCase("SCD-D-1", async () => {
    await expectAllow(deleteDoc(doc(db("editor"), "users", "user_editor", "sharedChecklists", "checklist2")));
  });
  await runCase("SCD-D-2", async () => {
    await expectDeny(deleteDoc(doc(db("nonMember"), "users", "user_editor", "sharedChecklists", "checklist2")));
  });

  // ─────────────────────────────────────────────────────────────
  // Cleanup and summary
  // ─────────────────────────────────────────────────────────────
  await env.cleanup();

  console.log("\n────────────────────────────────────────");
  console.log(`Total:  ${results.pass + results.fail}`);
  console.log(`Passed: ${results.pass}`);
  console.log(`Failed: ${results.fail}`);

  if (results.fail > 0) {
    console.log("\nFailed cases:");
    for (const { id, error } of results.errors) {
      console.log(`  ${id}: ${error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
