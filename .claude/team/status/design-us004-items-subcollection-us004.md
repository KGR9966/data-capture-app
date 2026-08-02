# Design Specification — Items/Checkpoints/Comments under `projects/{projectId}` (US-004 / Items read fix)

**Doc ID:** `design-us004-items-subcollection-us004`  
**App:** Data Capture (`C:\Users\kimgr\data-capture-app`)  
**Branch:** `fix/us004-items-subcollection` (from `fix/us004-voice-redesign`)  
**Date:** 2026-07-15  
**Solution Design Agent:** Solution Design Agent  
**Status:** Awaiting PO / Master Agent / Security approval before Dev Agent start  
**Version:** 1.0

---

## 1. Executive summary

This design selects **Solution B** from `rca-items-read-us004.md`: move `items`, `checkpoints` and `comments` to subcollections under `projects/{projectId}`. This is the only design that preserves the existing role model (owner / admin / editor / viewer / email-member) and satisfies Firestore's list-query rule engine.

**Non-goals for this round:** D1/D3 voice-parser changes are out of scope beyond signature compatibility. No change to reminder ownership model or push notification scheduling logic.

**Key structural decisions already taken in this design:**
- Items/checkpoints/comments are subcollections under `projects/{projectId}`.
- Project-scoped checklists are moved to subcollections under `/projects/{projectId}/checklists/{checklistId}` because Firestore `list` rules cannot reference `resource.data`. Personal/shared checklists (no projectId) may remain top-level `/checklists/{checklistId}`.
- Project deletion becomes a single callable Cloud Function `deleteProject({ projectId })` using Admin SDK `recursiveDelete`.
- Migration is **wipe-and-recreate of test data only**; no production user data exists yet.
- Maximum two EAS builds: Build 1 is the primary build after all local gates are green; Build 2 is reserved for iOS E2E regression fixes only.

---

## 2. Final data model

### 2.1 New / changed paths

| Concept | Firestore path | Change |
|---|---|---|
| Item (sag) | `/projects/{projectId}/items/{itemId}` | New subcollection path. `projectId` remains a field inside the document for UI convenience. |
| Checkpoint | `/projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}` | New nested subcollection path. `itemId` and `projectId` remain fields inside the document. |
| Comment | `/projects/{projectId}/items/{itemId}/comments/{commentId}` | New nested subcollection path. `itemId` and `projectId` remain fields inside the document. |

### 2.2 Unchanged paths

| Concept | Firestore path | Rationale |
|---|---|---|
| Project | `/projects/{projectId}` | Already the role/ownership root. |
| Project members | `/projects/{projectId}/members/{memberId}` | Already a subcollection; no change. |
| User reminders | `/users/{userId}/reminders/{reminderId}` | Independent of item path; only a new optional field `targetProjectId` is added. |

### 2.3 Checklist paths

| Type | Firestore path | Rationale |
|---|---|---|
| Project-scoped checklist | `/projects/{projectId}/checklists/{checklistId}` | Required: Firestore `list` rules cannot reference `resource.data.projectId`, so project-scoped lists must be addressed via path variable. |
| Project-scoped checklist item | `/projects/{projectId}/checklists/{checklistId}/items/{itemId}` | Nested under project-scoped checklist; rules use `projectId` path variable. |
| Personal/shared checklist | `/checklists/{checklistId}` | Remains top-level; `list` rule uses `request.query.ownerId` or `request.query.sharedWith` only. |
| Personal/shared checklist item | `/checklists/{checklistId}/items/{itemId}` | Remains top-level; rules based on parent checklist `ownerId`/`sharedWith`. |

---

## 3. Exact TypeScript function signatures

The signatures below are the **contract** each service must expose after implementation. Internal helper functions may be added, but these exported signatures must match exactly.

### 3.1 `services/items.ts`

```ts
export function itemsCollection(projectId: string): CollectionReference<CaptureItem>;

export async function createItem(
  projectId: string,
  item: Omit<CaptureItem, "id" | "projectId" | "createdAt" | "updatedAt">
): Promise<CaptureItem>;

export function subscribeToItems(
  projectId: string,
  callback: (items: CaptureItem[]) => void
): Unsubscribe;

export async function getItemsForProject(projectId: string): Promise<CaptureItem[]>;

export async function getItemById(
  projectId: string,
  itemId: string
): Promise<CaptureItem | null>;

export async function updateItem(
  projectId: string,
  itemId: string,
  updates: Partial<Omit<CaptureItem, "id" | "projectId" | "createdAt" | "updatedAt">>
): Promise<void>;

export async function deleteItem(
  projectId: string,
  itemId: string
): Promise<void>;

export async function getItemsByAssignee(
  projectId: string,
  assigneeId: string
): Promise<CaptureItem[]>;

export async function isTitleDuplicate(
  projectId: string,
  title: string,
  excludeItemId?: string
): Promise<boolean>;

export async function unassignItemsFromMember(
  projectId: string,
  assigneeId: string
): Promise<void>;
```

**Rules:**
- `itemsCollection` returns `collection(db, "projects", projectId, "items")`.
- `subscribeToItems` must query the subcollection directly and **must not** use `where("projectId", "==", projectId)`.
- `deleteItem` must delete all comments via `deleteAllCommentsForItem(projectId, itemId)` before deleting the item document. Checkpoints are deleted by `deleteProject` Cloud Function or explicitly if decided during implementation.
- `CaptureItem` interface retains `projectId: string`.

### 3.2 `services/checkpoints.ts`

```ts
export function checkpointsCollection(
  projectId: string,
  itemId: string
): CollectionReference<Checkpoint>;

export async function getCheckpointsForItem(
  projectId: string,
  itemId: string
): Promise<Checkpoint[]>;

export async function getOrCreateCheckpointsForItem(
  projectId: string,
  item: CaptureItem,
  sourceFields: SourceField[]
): Promise<Checkpoint[]>;

export async function updateCheckpoint(
  projectId: string,
  itemId: string,
  checkpointId: string,
  updates: Partial<Omit<Checkpoint, "id" | "itemId" | "projectId" | "createdAt" | "updatedAt">>
): Promise<void>;

export async function createCheckpoint(
  projectId: string,
  itemId: string,
  point: Omit<Checkpoint, "id" | "itemId" | "projectId" | "createdAt" | "updatedAt">
): Promise<Checkpoint>;
```

**Rules:**
- `checkpointsCollection` returns `collection(db, "projects", projectId, "items", itemId, "checkpoints")`.
- `Checkpoint` interface retains `itemId: string` and `projectId: string`.

### 3.3 `services/comments.ts`

```ts
export function commentsCollection(
  projectId: string,
  itemId: string
): CollectionReference<Comment>;

export async function createComment(
  projectId: string,
  itemId: string,
  text: string
): Promise<Comment>;

export function subscribeToComments(
  projectId: string,
  itemId: string,
  callback: (comments: Comment[]) => void
): Unsubscribe;

export async function deleteComment(
  projectId: string,
  itemId: string,
  commentId: string
): Promise<void>;

export async function deleteAllCommentsForItem(
  projectId: string,
  itemId: string
): Promise<void>;
```

**Rules:**
- `commentsCollection` returns `collection(db, "projects", projectId, "items", itemId, "comments")`.
- `Comment` interface retains `itemId: string` and `projectId: string`.
- `createComment` must write both `projectId` and `itemId` into the document so the security rule can validate path consistency.

### 3.4 `services/checklists.ts`

```ts
export function projectChecklistsCollection(
  projectId: string
): CollectionReference<Checklist>;

export function personalChecklistsCollection(): CollectionReference<Checklist>;

export function projectChecklistItemsCollection(
  projectId: string,
  checklistId: string
): CollectionReference<ChecklistItem>;

export function personalChecklistItemsCollection(
  checklistId: string
): CollectionReference<ChecklistItem>;

export async function setChecklistPointCompleted(
  checklist: Checklist,
  point: ChecklistItem,
  completed: boolean,
  userId: string
): Promise<void>;

export async function createChecklistFromItems(
  name: string,
  items: CaptureItem[],
  ownerId: string,
  projectId?: string
): Promise<Checklist>;

export async function createDynamicChecklistFromSearch(
  name: string,
  searchQuery: string,
  projectId: string,
  ownerId: string
): Promise<Checklist>;

export async function synchronizeDynamicChecklist(
  checklist: Checklist,
  userId: string
): Promise<void>;

export async function addManualItemToChecklist(
  checklist: Checklist,
  item: CaptureItem,
  userId: string
): Promise<void>;

export function subscribeToProjectChecklists(
  projectId: string,
  callback: (checklists: Checklist[]) => void
): Unsubscribe;

export function subscribeToPersonalChecklists(
  userId: string,
  callback: (checklists: Checklist[]) => void
): Unsubscribe;

export function subscribeToProjectChecklistItems(
  projectId: string,
  checklistId: string,
  callback: (items: ChecklistItem[]) => void
): Unsubscribe;

export function subscribeToPersonalChecklistItems(
  checklistId: string,
  callback: (items: ChecklistItem[]) => void
): Unsubscribe;
```

**Rules:**
- `projectChecklistsCollection(projectId)` returns `collection(db, "projects", projectId, "checklists")`.
- `personalChecklistsCollection()` returns `collection(db, "checklists")` for checklists where `projectId` is null.
- `projectChecklistItemsCollection(projectId, checklistId)` returns `collection(db, "projects", projectId, "checklists", checklistId, "items")`.
- `personalChecklistItemsCollection(checklistId)` returns `collection(db, "checklists", checklistId, "items")`.
- `setChecklistPointCompleted` must resolve checkpoint and source item using `point.sourceProjectId` (or `checklist.projectId` as fallback), `point.sourceItemId`, and `point.sourceCheckpointId`. It must call:
  - `getCheckpointsForItem(sourceProjectId, sourceItemId)`
  - `getItemById(sourceProjectId, sourceItemId)`
  - `updateItem(sourceProjectId, sourceItemId, { status: ... })`
- `extractPointsFromItem`, `parseSourceTextIntoPoints` and `addManualItemToChecklist` must set `sourceItemPath` to `projects/${item.projectId}/items/${item.id}`.
- `createChecklistFromItems` and `createDynamicChecklistFromSearch` must write project-scoped checklists to `projectChecklistsCollection(projectId)` and project-scoped items to `projectChecklistItemsCollection(projectId, checklistId)`. Personal checklists use `personalChecklistsCollection()`.
- `Checklist` and `ChecklistItem` interfaces are unchanged; `sourceProjectId` is already present on `ChecklistItem`.

### 3.5 `services/checklistsOffline.ts`

```ts
// No new exported signatures. Internal executePendingOp behavior changes.
```

**Rules:**
- `executePendingOp` for `toggleChecklistItem` must call `toggleChecklistPoint(checklist, item, userId)` and let `setChecklistPointCompleted` resolve paths from `point.sourceProjectId` and `point.sourceItemId`.
- Before data wipe, any pending ops referencing old top-level `/items/{itemId}` or `/checkpoints/{checkpointId}` paths must be discarded or flushed. The updated app must not crash on stale pending ops.
- `ChecklistItem` already carries `sourceProjectId`, so no payload schema change is required.

### 3.6 `services/projects.ts`

```ts
// Legacy client-side cascade delete is removed.

export async function deleteProject(projectId: string): Promise<void>;

export async function getProjectDeletionStats(
  projectId: string
): Promise<{ items: number; checkpoints: number; comments: number; checklists: number; photos: number }>;
```

**Rules:**
- `deleteProject` must call the callable Cloud Function `deleteProject({ projectId })` and must not perform client-side recursive deletion.
- `getProjectDeletionStats` must use the new subcollection paths (`projects/{projectId}/items` and nested `checkpoints`/`comments`) for its estimation, or call a matching callable if implemented.
- If the Cloud Function is unavailable (offline / emulator not configured), the app may surface an error rather than falling back to client-side cascade delete.

### 3.7 `services/reminders.ts`

```ts
export interface Reminder {
  id: string;
  userId: string;
  targetType: "item";
  targetId: string;
  targetProjectId?: string;      // NEW optional field
  title: string;
  body?: string;
  scheduledAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReminderInput {
  userId: string;
  targetType: "item";
  targetId: string;
  targetProjectId?: string;      // NEW optional field
  title: string;
  body?: string;
  scheduledAt: Timestamp;
}

export async function createReminder(input: ReminderInput): Promise<Reminder>;

export async function updateReminder(
  reminderId: string,
  userId: string,
  updates: Partial<Omit<ReminderInput, "userId" | "targetType" | "targetId">>
): Promise<Reminder>;
```

**Rules:**
- `createReminder` must copy `targetProjectId` from input to the Firestore document and to the local notification data payload.
- `updateReminder` must preserve `targetProjectId` when rescheduling.
- `deleteRemindersForItem(itemId: string)` signature is unchanged but continues to be called by `deleteItem`.

---

## 4. Route and deeplink parameter changes

### 4.1 `/item` route

**New required query parameters:**

```
/item?itemId={itemId}&projectId={projectId}
```

**Changed call sites:**
- `app/(tabs)/board.tsx`: `router.push(\`/item?itemId=${item.id}&projectId=${activeProject.id}\`)`
- `app/(tabs)/search.tsx`: `router.push(\`/item?itemId=${item.id}&projectId=${item.projectId}\`)`
- `app/checklist.tsx` source link: `router.push(\`/item?itemId=${item.sourceItemId}&projectId=${item.sourceProjectId}\`)`

**Route handling in `app/item.tsx`:**
- Read both parameters: `const { itemId, projectId } = useLocalSearchParams();`
- Validate that both are non-empty strings.
- If `projectId` is missing (legacy deeplink), show an error/Alert: "Påmindelsen peger på en sag uden projekt-id." Do not crash or silently fail.

### 4.2 `/checklist` route

**The checklist route itself is unchanged:**

```
/checklist?checklistId={checklistId}
```

No new parameters are required at the route level. Internal source-item links inside the checklist screen use the new `/item?itemId=...&projectId=...` format (see 4.1).

### 4.3 Deeplinks

```ts
export function buildItemUrl(itemId: string, projectId: string): string {
  return `${APP_SCHEME}://item?itemId=${encodeURIComponent(itemId)}&projectId=${encodeURIComponent(projectId)}`;
}
```

`services/deeplinks.ts` must update `buildItemUrl` to require both arguments. All call sites must supply `projectId`.

### 4.4 Notification routing

In `components/NotificationResponseHandler.tsx`:

```ts
const targetProjectId = data.targetProjectId as string | undefined;
if (targetType === "item") {
  if (!targetProjectId) {
    Alert.alert("Påmindelsen peger på en sag uden projekt-id.");
    return;
  }
  router.push(\`/item?itemId=${targetId}&projectId=${targetProjectId}\`);
}
```

---

## 5. `firestore.rules` snippets

### 5.1 Remove old top-level blocks

Delete entirely:
- `match /items/{itemId}` (existing lines ~101-131)
- `match /items/{itemId}/checkpoints/{checkpointId}` (existing lines ~134-161)
- `match /items/{itemId}/comments/{commentId}` (existing lines ~164-192)

### 5.2 New subcollection rules for items/checkpoints/comments

Insert after `match /projects/{projectId}/members/{memberId}` block:

```firestore
    // Items under project
    match /projects/{projectId}/items/{itemId} {
      allow read: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);

      allow create: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor"])
                     && request.resource.data.keys().hasAll(["projectId", "createdBy"])
                     && request.resource.data.projectId == projectId;

      allow update: if isAuthenticated()
                     && (
                          hasProjectRoleById(projectId, ["owner", "admin"])
                          || (
                               hasProjectRoleById(projectId, ["editor"])
                               && (
                                    resource.data.createdBy == getUserId()
                                    || resource.data.assignedTo == getUserId()
                                  )
                             )
                        );

      allow delete: if isAuthenticated()
                     && (
                          hasProjectRoleById(projectId, ["owner", "admin"])
                          || (
                               hasProjectRoleById(projectId, ["editor"])
                               && resource.data.createdBy == getUserId()
                             )
                        );
    }

    // Checkpoints under items
    match /projects/{projectId}/items/{itemId}/checkpoints/{checkpointId} {
      allow read: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);

      allow create, update: if isAuthenticated()
                               && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);

      allow delete: if isAuthenticated()
                      && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);
    }

    // Comments under items
    match /projects/{projectId}/items/{itemId}/comments/{commentId} {
      allow read: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);

      allow create: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor"])
                     && request.resource.data.keys().hasAll(["projectId", "itemId", "text"])
                     && request.resource.data.projectId == projectId
                     && request.resource.data.itemId == itemId;

      allow update, delete: if isAuthenticated()
                               && (
                                    resource.data.authorId == getUserId()
                                    || hasProjectRoleById(projectId, ["owner", "admin"])
                                  );
    }
```

**Security notes:**
- `hasProjectRoleById(projectId, ...)` does a `get()` on `/projects/{projectId}`. Because `projectId` is now a path variable, the `get()` is deterministic for the entire query and Firestore can prove the list safe.
- Email members continue to receive `editor` via the existing `getProjectMemberRole` / `memberEmails` fallback.
- `viewer` receives read-only access.
- Item `update` rule uses explicit parentheses to remove operator-precedence ambiguity identified in the audit.

### 5.3 Project-scoped checklists under project

Project-scoped checklists are stored under the project subcollection. This avoids the Firestore limitation that `list` rules cannot reference `resource.data` per document.

```firestore
    match /projects/{projectId}/checklists/{checklistId} {
      allow read: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);

      allow create, update: if isAuthenticated()
                               && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);

      allow delete: if isAuthenticated()
                      && hasProjectRoleById(projectId, ["owner", "admin"]);
    }

    match /projects/{projectId}/checklists/{checklistId}/items/{itemId} {
      allow read: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);

      allow create, update, delete: if isAuthenticated()
                                       && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);
    }
```

### 5.4 Personal/shared checklists (top-level)

Personal or shared checklists where `projectId` is null remain at the top level. Their `list` rule must use only `request.query` filters, never `resource.data`.

```firestore
    match /checklists/{checklistId} {
      function canReadPersonalChecklist() {
        return isAuthenticated()
               && (
                    resource.data.ownerId == getUserId()
                    || getUserId() in resource.data.sharedWith
                  );
      }

      function canWritePersonalChecklist() {
        return isAuthenticated()
               && (
                    resource.data.ownerId == getUserId()
                    || getUserId() in resource.data.sharedWith
                  );
      }

      allow get: if canReadPersonalChecklist();

      allow list: if isAuthenticated()
                    && (
                         request.query.ownerId == getUserId()
                         || (request.query.sharedWith != null
                             && request.query.sharedWith.hasAny([getUserId()]))
                       );

      allow create: if isAuthenticated()
                     && request.resource.data.keys().hasAll(["name", "ownerId"])
                     && request.resource.data.ownerId == getUserId()
                     && request.resource.data.projectId == null;

      allow update: if canWritePersonalChecklist();

      allow delete: if resource.data.ownerId == getUserId();
    }

    match /checklists/{checklistId}/items/{itemId} {
      function parentPersonalChecklistData() {
        return get(/databases/$(database)/documents/checklists/$(checklistId)).data;
      }

      allow read: if isAuthenticated()
                     && (parentPersonalChecklistData().ownerId == getUserId()
                         || getUserId() in parentPersonalChecklistData().sharedWith);

      allow create, update, delete: if isAuthenticated()
                                       && (parentPersonalChecklistData().ownerId == getUserId()
                                           || getUserId() in parentPersonalChecklistData().sharedWith);
    }
```

**Why this works:** `checklistId` is a path variable, so `get(/checklists/$(checklistId))` is deterministic for the entire subcollection query. Firestore can prove the `list` safe without reading result documents.

**Emulator validation required before approval:**
The following query shapes must be proven to work in the Firestore emulator:
1. `query(collection(db, "projects", projectId, "checklists"))` — project checklists.
2. `query(collection(db, "checklists"), where("ownerId", "==", uid))` — personal checklists.
3. `query(collection(db, "checklists"), where("sharedWith", "array-contains", uid))` — shared checklists.
4. Negative case: a non-member running query #1 is denied.

---

## 6. Cloud Function `deleteProject` specification

### 6.1 Function contract

| Attribute | Value |
|---|---|
| Name | `deleteProject` |
| Type | HTTPS Callable Function |
| Location | `functions/src/deleteProject.ts` |
| Deploy target | Firebase Functions (same project as app) |

### 6.2 Input

```ts
interface DeleteProjectRequest {
  projectId: string;   // non-empty, matches Firestore document ID
}
```

Validation: throw `invalid-argument` if `projectId` is missing or not a string.

### 6.3 Authentication

- Reject unauthenticated callers with `unauthenticated`.
- Read `context.auth.uid` and `context.auth.token.email`.

### 6.4 Role check

Caller must be `owner` or `admin` of the project. The `roles` map on the project document is keyed by UID, not email.

Check in order:
1. `projectData.ownerId === uid`
2. `projectData.roles[uid] === "owner"`
3. `projectData.roles[uid] === "admin"`
4. If none matched, read `/projects/{projectId}/members/{uid}`; accept if role is `"owner"` or `"admin"`.

If none pass, throw `permission-denied`.

**Note:** Email-invited members without an explicit owner/admin role are editors via the `memberEmails` fallback in `firestore.rules`. Editors may **not** delete projects.

### 6.5 Deletion sequence

1. Verify `/projects/{projectId}` exists; if not, throw `not-found`.
2. Call `db.recursiveDelete(projectRef)` to remove `/projects/{projectId}` and all nested subcollections (`members`, `items`, `items/{itemId}/checkpoints`, `items/{itemId}/comments`, `checklists`, `checklists/{checklistId}/items`).
3. Attempt Storage cleanup: delete all files under `projects/{projectId}/items/`. Log a warning on failure but do **not** roll back the Firestore deletion.
4. Return `{ success: true }`.

### 6.6 Return value

```ts
interface DeleteProjectResponse {
  success: true;
}
```

### 6.7 Runtime configuration

```json
{
  "runWith": {
    "memory": "512MB",
    "timeoutSeconds": 300
  }
}
```

### 6.8 App-side integration

```ts
export async function deleteProject(projectId: string): Promise<void> {
  const fn = httpsCallable<{ projectId: string }, { success: boolean }>(
    getFunctions(),
    "deleteProject"
  );
  await fn({ projectId });
}
```

Client-side `deleteProjectCascade` is removed entirely.

---

## 7. Checklists path decision (final)

### 7.1 Project-scoped checklists

All checklists that have a non-null `projectId` are stored under the project's subcollection:

```
/projects/{projectId}/checklists/{checklistId}
/projects/{projectId}/checklists/{checklistId}/items/{itemId}
```

Rationale: Firestore `list` rules cannot reference `resource.data`. The only way to enforce role-based access on project-scoped checklist list-queries is to use the `projectId` path variable.

### 7.2 Personal/shared checklists

Checklists with `projectId == null` remain top-level:

```
/checklists/{checklistId}
/checklists/{checklistId}/items/{itemId}
```

Their `list` rules rely on `request.query` filters for `ownerId`/`sharedWith` on the parent checklist collection. Their item subcollection rules use `get(/checklists/$(checklistId))` where `checklistId` is a path variable, which Firestore can evaluate deterministically for the query.

### 7.3 No fallback

There is no fallback. Both path models are core requirements of this design and must be implemented before Build 1.

---

## 8. Migration strategy

### 8.1 Scope

**Test data only.** No production user data exists. Migration is **wipe-and-recreate**, not a scripted data migration.

### 8.2 Pre-wipe checklist

- [ ] PO/Master Agent explicitly approves wipe of dev/prod test data.
- [ ] Screenshots of Board, Search, Checklists, Project members captured.
- [ ] Backup of current `firestore.rules` committed.
- [ ] Branch `fix/us004-items-subcollection` created from `fix/us004-voice-redesign`.

### 8.3 Wipe operations

In Firebase Console or via a one-off admin script:
1. Delete all `/projects/{projectId}` documents and subcollections (`members`, `items`, `items/{itemId}/checkpoints`, `items/{itemId}/comments`, `checklists`, `checklists/{checklistId}/items`).
2. Delete all remaining `/checklists/{checklistId}` documents and subcollections (`items`) that are **personal/shared** (not project-scoped).
3. Delete any orphaned top-level `/items/{itemId}` documents and subcollections.
4. Delete Storage prefix `projects/`.
5. Optionally retain `/users/{userId}/reminders`; old reminders will lack `targetProjectId` and must be handled by the fallback Alert in `NotificationResponseHandler.tsx`.

### 8.4 Recreate operations

1. Create 2+ test projects via the app.
2. Invite one email-member and one UID-member (different projects).
3. Create items manually and via voice.
4. Add comments and checkpoints.
5. Create dynamic checklists from search.
6. Create reminders on items.
7. Run regression scenarios E1-E9 (see `impl-plan-items-subcollection-us004.md` section 6.3).

---

## 9. Build strategy

### 9.1 Maximum builds

**Maximum 2 EAS builds.** No Build 3 is planned.

### 9.2 Build 1

Trigger: all of the following are green locally:
- `npm run typecheck`
- `npm run lint`
- `npm run pre-test-check`
- Firestore emulator rule tests for items/checkpoints/comments, project-scoped checklists, and personal/shared checklists
- Cloud Function `deleteProject` unit/integration tests in emulator

Build 1 is the primary build. It is submitted to EAS only after these gates pass.

### 9.3 Build 2

Build 2 is reserved **only** for issues discovered during iOS E2E regression testing of Build 1. It is not used for scope expansion, additional features, or emulator-only fixes. If emulator testing reveals rule or function issues, they are fixed before Build 1.

### 9.4 Emulator gate before Build 1

All rule sets in sections 5.2–5.4 (items, checkpoints, comments, project-scoped checklists, personal/shared checklists) must pass Firestore emulator tests before Build 1 is ordered. There is no fallback strategy; both checklist path models are required.

---

## 10. Stop criteria before Dev Agent may start

The Dev Agent must not write any code touching items, checkpoints, comments, checklists, project deletion, reminders or deeplinks until all of the following are true:

1. PO has approved this design document, the data-model change, and the test-data wipe.
2. Master Agent has approved the 2-build strategy and the branch plan.
3. Compliance/Security Agent has approved the `firestore.rules` snippets in sections 5.2-5.4 and the Cloud Function security model in section 6.
4. Flowagent has delivered an implementation plan with tasks, file order, dependencies and estimates for this design.
5. Test Manager Agent has updated the baseline test plan with migration and security test cases for the new paths.
6. All exact service signatures in section 3 are final and signed off.
7. Emulator rule tests (sections 5.2–5.4) are green locally for items, checkpoints, comments, project-scoped checklists, and personal/shared checklists.
8. No active feature coding is in progress on the affected files.

---

## 11. References

### 11.1 Source files to be modified

- `C:\Users\kimgr\data-capture-app\services\items.ts`
- `C:\Users\kimgr\data-capture-app\services\checkpoints.ts`
- `C:\Users\kimgr\data-capture-app\services\comments.ts`
- `C:\Users\kimgr\data-capture-app\services\checklists.ts`
- `C:\Users\kimgr\data-capture-app\services\checklistsOffline.ts`
- `C:\Users\kimgr\data-capture-app\services\projects.ts`
- `C:\Users\kimgr\data-capture-app\services\reminders.ts`
- `C:\Users\kimgr\data-capture-app\services\deeplinks.ts`
- `C:\Users\kimgr\data-capture-app\services\roles.ts` (referenced by rules, no signature change)

### 11.2 UI / route files to be modified

- `C:\Users\kimgr\data-capture-app\app\(tabs)\board.tsx`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\search.tsx`
- `C:\Users\kimgr\data-capture-app\app\item.tsx`
- `C:\Users\kimgr\data-capture-app\app\checklist.tsx`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\checklists.tsx` (subscribe to both project-scoped and personal checklists)
- `C:\Users\kimgr\data-capture-app\components\NotificationResponseHandler.tsx`

### 11.3 Infrastructure files to be modified

- `C:\Users\kimgr\data-capture-app\firestore.rules`
- `C:\Users\kimgr\data-capture-app\firestore.indexes.json` (only if new composite indexes are required)
- `C:\Users\kimgr\data-capture-app\firebase.json` (add functions source)
- `C:\Users\kimgr\data-capture-app\functions\` (new directory)
- `C:\Users\kimgr\data-capture-app\functions\src\deleteProject.ts`
- `C:\Users\kimgr\data-capture-app\functions\src\index.ts`
- `C:\Users\kimgr\data-capture-app\functions\package.json`
- `C:\Users\kimgr\data-capture-app\functions\tsconfig.json`

### 11.4 Background documents

- `C:\Users\kimgr\data-capture-app\.claude\team\status\rca-items-read-us004.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\status\impl-plan-items-subcollection-us004.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\status\audit-solution-b-us004.md`
- `C:\Users\kimgr\data-capture-app\memory\data-capture-test-baseline.md`
- `C:\Users\kimgr\data-capture-app\memory\collaboration-structure.md`
- `C:\Users\kimgr\data-capture-app\memory\master-agent-verification-checklist.md`

---

## 12. Approval log

| Role | Name / Agent | Decision | Date |
|---|---|---|---|
| Product Owner | | Approve / Reject / Comment | |
| Master Agent | | Approve / Reject / Comment | |
| Compliance/Security Agent | | Approve / Reject / Comment | |
| Solution Design Agent | | Approved for review | 2026-07-15 |

**Instruction:** Do not edit signatures, paths or build strategy after approval without a Change Request approved by PO and Master Agent.
