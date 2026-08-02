# Cloud Function Test Report: deleteProject (US-004)

**Branch:** `fix/us004-items-subcollection`  
**Function:** `functions/src/deleteProject.ts`  
**Test file:** `functions/src/deleteProject.test.ts`  
**Date:** 2026-08-02  
**Tester:** Cloud Agent

---

## 1. Objective

Verify that the callable Cloud Function `deleteProject({ projectId })`:

- Only allows project **owners** and **admins** to delete a project.
- Rejects **editors** with `permission-denied`.
- Rejects **unauthenticated** callers with `unauthenticated`.
- Uses `recursiveDelete` to remove the project document and all nested subcollections.
- Cleans up Storage files under `projects/{projectId}/items/`.

---

## 2. Changes Made to Enable Testing

### 2.1 Emulator configuration (`firebase.json`)

Added `auth`, `storage`, and `functions` emulator ports so the integration test can exercise authentication, Firestore, Cloud Storage, and the callable function in a single emulator run.

```json
{
  "firestore": { "port": 8080 },
  "auth": { "port": 9099 },
  "storage": { "port": 9199 },
  "functions": { "port": 5001 },
  "ui": { "enabled": true, "port": 4000 },
  "singleProjectMode": true
}
```

### 2.2 Test script (`functions/src/deleteProject.test.ts`)

Created a TypeScript integration test that:

1. Connects `firebase-admin` to the local emulators (`demo-test` project).
2. Seeds a project with:
   - Project document with `ownerId` and `roles` map.
   - `members` subcollection (owner, admin, editor).
   - `items/{itemId}` with nested `checkpoints` and `comments`.
   - `checklists/{checklistId}` with nested `items`.
   - A Storage object at `projects/{projectId}/items/test-photo.jpg`.
3. Exchanges custom auth tokens for ID tokens via the Auth emulator.
4. Calls `deleteProject` over the callable-functions HTTP protocol.
5. Verifies deletion of all Firestore paths and the Storage prefix.

### 2.3 Test command (`functions/package.json`)

Added an `npm test` script that builds the function and runs the integration test inside the emulator:

```json
"test": "cd .. && npx firebase emulators:exec --project demo-test --only functions,firestore,auth,storage \"cd functions && npm run build && node lib/deleteProject.test.js\""
```

### 2.4 Local environment prerequisite

The machine did not have Java installed, and Firebase Emulator Suite requires JDK 21+. A portable Microsoft Build of OpenJDK 21 was downloaded and extracted to `C:\tools\jdk-21.0.12+8`. Tests were run with:

```bash
export JAVA_HOME=/c/tools/jdk-21.0.12+8
export PATH=$JAVA_HOME/bin:$PATH
```

---

## 3. Test Procedure

```bash
cd C:/Users/kimgr/data-capture-app/functions
export JAVA_HOME=/c/tools/jdk-21.0.12+8
export PATH=$JAVA_HOME/bin:$PATH
npm test
```

---

## 4. Test Results

All four test cases passed.

```text
Running deleteProject integration tests...

  PASS: owner can delete project
  PASS: admin can delete project
  PASS: editor cannot delete project
  PASS: unauthenticated call is rejected

All tests passed.
```

### 4.1 Verified Firestore cleanup

After a successful `deleteProject` call, the following documents no longer exist:

- `projects/{projectId}`
- `projects/{projectId}/members/{uid}`
- `projects/{projectId}/items/{itemId}`
- `projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}`
- `projects/{projectId}/items/{itemId}/comments/{commentId}`
- `projects/{projectId}/checklists/{checklistId}`
- `projects/{projectId}/checklists/{checklistId}/items/{checklistItemId}`

This confirms that `admin.firestore().recursiveDelete(projectRef)` removes the project document and all nested subcollections.

### 4.2 Verified Storage cleanup

A file seeded at `projects/{projectId}/items/test-photo.jpg` is removed after a successful deletion. A post-call `getFiles({ prefix: 'projects/{projectId}/items/' })` returns zero objects.

### 4.3 Verified authorization matrix

| Caller        | Expected result   | Actual result |
|---------------|-------------------|---------------|
| Owner         | Success           | Success       |
| Admin         | Success           | Success       |
| Editor        | permission-denied | permission-denied |
| Unauthenticated | unauthenticated | unauthenticated |

---

## 5. Observations / Warnings

The emulator emitted two non-blocking warnings during the run:

1. **Outdated `firebase-functions` dependency**  
   `package.json indicates an outdated version of firebase-functions. Please upgrade using npm install --save firebase-functions@latest`  
   This is a maintenance note, not a test failure.

2. **Node version mismatch**  
   `Your requested "node" version "22" doesn't match your global version "24". Using node@24 from host.`  
   The function ran successfully under Node 24; this is an engine-field warning only.

Neither warning blocked the test execution or affected the test outcome.

---

## 6. Decision

**GO**

`deleteProject({ projectId })` behaves as specified:

- Authorization checks correctly restrict deletion to owners and admins.
- Editors and unauthenticated callers are rejected.
- `recursiveDelete` removes the project and all required nested subcollections.
- Storage cleanup removes objects under `projects/{projectId}/items/`.

The function is ready to proceed on branch `fix/us004-items-subcollection`.

---

## 7. Relevant Files

- `C:\Users\kimgr\data-capture-app\functions\src\deleteProject.ts`
- `C:\Users\kimgr\data-capture-app\functions\src\deleteProject.test.ts`
- `C:\Users\kimgr\data-capture-app\functions\package.json`
- `C:\Users\kimgr\data-capture-app\firebase.json`
