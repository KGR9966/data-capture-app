# Flowagent Implementation Flow Plan — US-004 Items/Checkpoints/Comments Subcollection (Solution B)

**Branch:** `fix/us004-items-subcollection` (from `fix/us004-voice-redesign`)
**App:** Data Capture (`C:\Users\kimgr\data-capture-app`)
**Date:** 2026-07-15
**Flowagent:** Flowagent
**Status:** Draft — checklist subcollection migration added per Security Agent recommendation; pending updated design spec, Master Agent / PO review

---

## 1. Scope and build strategy

This plan executes **Solution B** from the RCA and implementation plan:

- Move `items`, `checkpoints` and `comments` to subcollections under `projects/{projectId}`.
- Move **project-scoped checklists** to `/projects/{projectId}/checklists/{checklistId}` with their item copies under `/projects/{projectId}/checklists/{checklistId}/items/{itemId}`. This is a core task, not a fallback, because a top-level `get`/`list` split cannot satisfy Firestore's list-query rule semantics.
- Keep **personal (non-project) checklists** top-level under `/checklists/{checklistId}` with their existing rules, shared-with logic and ownership checks. Personal checklists have no `projectId` field and are not affected by the project-scoped migration.
- Implement **B9 project deletion** as a Firebase Callable Cloud Function (`deleteProject`) instead of a client-side cascade.
- Update all service signatures, UI routes, offline pending-ops, reminders and deep links so every item lookup carries `projectId`.

### 1.1 Max 2 builds constraint

- **Build 1** is the first EAS build. It may only start after every code change, `typecheck`, `lint`, `pre-test-check`, Firestore-emulator rule tests and local Cloud Function tests are green.
- **Build 2** is reserved exclusively for fixes discovered during physical iOS E2E regression. No new features, data-model changes or security-rule redesigns may enter Build 2.
- A **3rd build** is treated as a process failure. It is only acceptable if an unforeseeable production blocker emerges that cannot be resolved by a Build 2 regression fix. The project-scoped checklist migration is completed before Build 1 and therefore cannot be a reason for a 3rd build.

---

## 2. Phase 0 — Entry gates (must close before Day 1)

These gates come from the audit assessment and governance rules. If any are open, coding must not start.

| Gate | Owner | Deliverable / criterion |
|---|---|---|
| G0.1 PO scope approval | PO | Solution B approved in writing; testdata wipe accepted. |
| G0.2 Solution design approved | Solution Design Agent + Compliance/Security Agent | Approved `design-us004-items-read-b.md` with paths, service signatures, checklist decision and Cloud Function spec. |
| G0.3 Testplan updated | Test Manager Agent | `memory/data-capture-test-baseline.md` extended with B-specific cases and negative security tests. |
| G0.4 Emulator harness ready | Security Agent / QA Agent | A runnable Firestore-rules test script exists (or is created in `scripts/test-rules.js`) and can be executed with `firebase emulators:exec --only firestore`. |
| G0.5 Feature branch created | Master Agent | `fix/us004-items-subcollection` branched from `fix/us004-voice-redesign`; CI baseline green. |

---

## 3. Day-by-day suggested timeline (5–8 workdays)

| Day | Theme | Primary agents | Key output |
|---|---|---|---|
| 1 | Foundation + service layer | Backend/UI Agent, Cloud Agent, Security Agent | Branch ready; `services/items.ts`, `services/checkpoints.ts`, `services/comments.ts` refactored; Cloud Function project skeleton ready; `firestore.rules` skeleton drafted. |
| 2 | Checklists, offline, UI routing, reminders, CF body | Backend/UI Agent, Offline Agent, UI/UX Agent, Cloud Agent | `services/checklists.ts`, `services/checklistsOffline.ts`, routing/deeplink changes, reminder `targetProjectId`, `deleteProject` callable implemented. |
| 3 | Rules, indexes, automated gates | Security Agent, QA Agent | `firestore.rules` finalized, `firestore.indexes.json` updated, emulator tests pass, `typecheck`/`lint`/`pre-test-check` green. |
| 4 | Integration + data wipe/recreate | QA Agent, Backend/UI Agent, UI/UX Agent | Testdata wiped and recreated; manual E2E scenarios E1–E9 executed in dev client/simulator. |
| 5 | Bugfix + re-gate | All dev agents, QA Agent | Regression fixes integrated; all automated gates re-run green. |
| 6 | Build 1 readiness + PO GO | Master Agent, Release Agent, PO | Final pre-build GO/NO-GO checklist signed off; Release Agent starts EAS Build 1. |
| 7 | Physical iOS E2E regression | PO, QA Agent | PO tests Build 1 on physical iOS device; bug list triaged. |
| 8 | Build 2 (only if needed) | Release Agent, QA Agent | Critical fixes merged, affected tests re-run, EAS Build 2 produced. |

---

## 4. Concrete, assignable task list

### Wave A — Branch and baseline

| # | Task | Role | Files / output | Dependencies | Acceptance |
|---|---|---|---|---|---|
| A.1 | Create feature branch and confirm baseline green. | Master Agent | Git branch `fix/us004-items-subcollection` | G0.5 | Branch exists; `npm run typecheck` and `npm run lint` pass before any feature code is added. |
| A.2 | Document data-wipe plan and obtain backup screenshots. | Master Agent / QA Agent | `docs/current-build.md`, backup evidence | G0.1 | PO has approved wipe; screenshots of Board, Search, Checklists and Projects captured. |

### Wave B — Service layer (Backend/UI Agent)

| # | Task | Role | Files / output | Dependencies | Acceptance |
|---|---|---|---|---|---|
| B.1 | Refactor `services/items.ts` to subcollection paths. | Backend/UI Agent | `services/items.ts` | A.1, G0.2 | Collection helper uses `projects/{projectId}/items`; all public functions take `projectId`; `subscribeToItems` no longer filters by `projectId` data field; `deleteItem` deletes comments first. Typecheck passes. |
| B.2 | Refactor `services/checkpoints.ts` to subcollection paths. | Backend/UI Agent | `services/checkpoints.ts` | A.1, G0.2 | Collection helper uses `projects/{projectId}/items/{itemId}/checkpoints`; all functions take `projectId` and `itemId`. |
| B.3 | Refactor `services/comments.ts` to subcollection paths. | Backend/UI Agent | `services/comments.ts` | A.1, G0.2 | Collection helper uses `projects/{projectId}/items/{itemId}/comments`; `deleteAllCommentsForItem` takes `projectId` and `itemId`. |
| B.4 | Migrate project-scoped checklists to subcollections and update checklist service helpers. | Backend/UI Agent | `services/checklists.ts` | B.1, B.2, G0.2 | Introduce `projectChecklistsCollection(projectId)` and `projectChecklistItemsCollection(projectId, checklistId)` helpers; project-scoped checklist create/read/update/delete/list use `/projects/{projectId}/checklists`; personal checklists continue to use top-level `/checklists`; `sourceItemPath` uses new item path; checkpoint/status sync uses `sourceProjectId`. |
| B.5 | Extend reminders with `targetProjectId`. | Backend/UI Agent | `services/reminders.ts`, `services/notifications.ts` | A.1, G0.2 | `Reminder` and `ReminderInput` carry optional `targetProjectId`; creation, update and notification data propagate it. |
| B.6 | Update deep-link builder. | Backend/UI Agent | `services/deeplinks.ts` | A.1, G0.2 | `buildItemUrl` requires `itemId` and `projectId`; all existing callers updated or flagged for UI wave. |

### Wave C — Offline layer (Offline Agent)

| # | Task | Role | Files / output | Dependencies | Acceptance |
|---|---|---|---|---|---|
| C.1 | Ensure offline pending checklist ops resolve new paths for both project-scoped and personal checklists. | Offline Agent | `services/checklistsOffline.ts` | B.4, G0.2 | `executePendingOp` distinguishes project-scoped checklists (stored under `projects/{projectId}/checklists`) from personal checklists (top-level) and uses `sourceProjectId` for checkpoint/item references; flush fails gracefully if the source item/checkpoint no longer exists. |
| C.2 | Clear or migrate old pending ops before wipe. | Offline Agent | `services/checklistsOffline.ts`, wipe runbook | A.2 | Any pending ops created under the old top-level paths are flushed or discarded before users open the updated app. |

### Wave D — UI layer (UI/UX Agent)

| # | Task | Role | Files / output | Dependencies | Acceptance |
|---|---|---|---|---|---|
| D.1 | Update Board item creation and navigation. | UI/UX Agent | `app/(tabs)/board.tsx` | B.1, B.6 | `createItem` called with `activeProject.id`; item card push includes both `itemId` and `projectId`. |
| D.2 | Update Search item navigation. | UI/UX Agent | `app/(tabs)/search.tsx` | B.1, B.6 | Item result push includes `itemId` and `projectId`. |
| D.3 | Update item detail screen. | UI/UX Agent | `app/item.tsx` | B.1, B.3, B.5 | Reads `projectId` from route params; all reads, updates, deletes and comment operations pass `projectId`; reminders pass `targetProjectId`; graceful error if `projectId` is missing. |
| D.4 | Update checklist detail/source links. | UI/UX Agent | `app/checklist.tsx`, `app/open-list.tsx` | B.4, B.6 | Source-item push uses `sourceProjectId` and `sourceItemId`; checklist detail reads from project-scoped path when `checklist.projectId` is present. |
| D.5 | Update checklist list screen for project-scoped subcollection queries. | UI/UX Agent | `app/(tabs)/checklists.tsx` | B.4 | Project-scoped checklists are read from `/projects/{projectId}/checklists`; personal checklists continue to read from top-level `/checklists`; list UI clearly separates or labels the two scopes. |
| D.6 | Update notification response handler. | UI/UX Agent | `components/NotificationResponseHandler.tsx` | B.5 | Routes to `/item` with `targetProjectId`; alert fallback for old reminders lacking `targetProjectId`. |
| D.7 | Update item creation components. | UI/UX Agent | `components/CreateItemForm.tsx`, `components/VoiceCaptureModal.tsx` | B.1 | `createItem` called with `activeProject.id`; manual title behavior untouched. |
| D.8 | Update reminder modal. | UI/UX Agent | `components/ReminderModal.tsx` | B.5 | Reminder creation passes `targetProjectId` from the current item. |

### Wave E — Cloud Function (Cloud Agent)

| # | Task | Role | Files / output | Dependencies | Acceptance |
|---|---|---|---|---|---|
| E.1 | Initialize Firebase Functions project. | Cloud Agent | `functions/package.json`, `functions/tsconfig.json`, `functions/.gitignore`, `firebase.json` | A.1, G0.2 | Functions project builds; `firebase.json` points to `functions` source; no secrets committed. |
| E.2 | Implement `deleteProject` callable. | Cloud Agent | `functions/src/index.ts`, `functions/src/deleteProject.ts` | E.1, G0.2 | Authenticates caller, verifies owner/admin role, recursively deletes `projects/{projectId}` including `items`, `items/{itemId}/checkpoints`, `items/{itemId}/comments`, `members` and `checklists` subcollections, deletes Storage prefix `projects/{projectId}/items/`, logs warnings but returns success. |
| E.3 | Replace client-side cascade delete. | Cloud Agent / Backend/UI Agent | `services/projects.ts` | E.2 | `deleteProjectCascade` removed; app calls `deleteProject` callable; optional `getProjectDeletionStats` callable if the UI still needs an estimate. |
| E.4 | Local test of Cloud Function. | Cloud Agent / QA Agent | Emulator output | E.2, F.1 | `deleteProject` callable runs against Firestore emulator; role checks reject non-owner/admin; project + items + checkpoints + comments + checklists + storage prefix are removed. |

### Wave F — Security rules (Security Agent)

| # | Task | Role | Files / output | Dependencies | Acceptance |
|---|---|---|---|---|---|
| F.1 | Remove obsolete top-level rules. | Security Agent | `firestore.rules` | G0.2 | Top-level `match /items/{itemId}`, `match /items/{itemId}/checkpoints/{checkpointId}` and `match /items/{itemId}/comments/{commentId}` blocks removed. |
| F.2 | Add subcollection rules for items/checkpoints/comments. | Security Agent | `firestore.rules` | F.1, G0.2 | Rules use `projectId` path variable; `update` operator precedence is explicitly parenthesized; create rules validate required fields; viewer read-only; editor create/update own or assigned; owner/admin full access. |
| F.3 | Add rules for project-scoped checklists and keep personal checklist rules. | Security Agent | `firestore.rules` | G0.2 | `/projects/{projectId}/checklists/{checklistId}` and its `items` subcollection use `hasProjectRoleById(projectId, ...)` with owner/admin/editor write and viewer read; top-level `/checklists/{checklistId}` rules remain for personal checklists only (no `projectId` field). |
| F.4 | Update composite indexes. | Security Agent | `firestore.indexes.json` | B.1–B.3, B.4 | Any combined subcollection queries (assignedTo, title duplicate, etc.) have matching composite indexes; emulator and prod logs show no missing-index errors. |
| F.5 | Write and run emulator rule tests. | Security Agent / QA Agent | `scripts/test-rules.js` | F.1–F.3, G0.4 | Positive and negative cases pass for owner, admin, editor, viewer, email-member and non-member across items, checkpoints, comments and **project-scoped checklists**; personal checklist rules remain green for owner/share scenarios. |

### Wave G — QA gates (QA Agent)

| # | Task | Role | Files / output | Dependencies | Acceptance |
|---|---|---|---|---|---|
| G.1 | Run TypeScript typecheck and lint. | QA Agent | Whole repo | B.1–B.6, C.1, D.1–D.8, E.3 | `npm run typecheck` and `npm run lint` pass with zero errors. |
| G.2 | Run pre-test-check. | QA Agent | Whole repo | G.1 | `npm run pre-test-check` passes. |
| G.3 | Run Firestore-emulator rule tests. | QA Agent | `scripts/test-rules.js` output | F.5 | All positive and negative rule cases pass. |
| G.4 | Run Cloud Function integration tests. | QA Agent | Emulator output | E.4 | `deleteProject` callable passes role and deletion tests. |
| G.5 | Execute data wipe and recreate. | QA Agent / Master Agent | Firebase Console log | A.2 | Testdata wiped; two projects recreated with owner + email-editor and owner + uid-editor; items, comments, checkpoints, checklists and reminders created. |
| G.6 | Execute manual E2E regression E1–E9. | QA Agent | Test result log | G.5 | Board, Search, Item detail, Comments, Checklists, Offline toggle, Reminder notification, Non-member denial and Project deletion all behave as specified in the implementation plan. |
| G.7 | Produce QA report. | QA Agent | `.claude/team/qa/qa-report-us004-items-subcollection.md` | G.1–G.6 | Traffic-light report; no P1/P2 blockers remaining; all gates listed as green or yellow with mitigation. |
| G.8 | Verify Build 2 fixes (if triggered). | QA Agent | Updated test result log | H.3 | Only affected manual tests and automated gates re-run; no new features slip in. |

### Wave H — Release (Release Agent)

| # | Task | Role | Files / output | Dependencies | Acceptance |
|---|---|---|---|---|---|
| H.1 | Verify EAS build profile. | Release Agent | `eas.json` | G.7 | Profile for PO device testing is `preview` or `production`; `developmentClient` is `false`. |
| H.2 | Start EAS Build 1. | Release Agent | EAS build output | Gate 5 GO | Build starts only after PO GO, QA green and Audit sign-off. |
| H.3 | Start EAS Build 2 (if needed). | Release Agent | EAS build output | Gate 6 GO | Build 2 only contains fixes from physical iOS E2E regression; re-tests green. |

---

## 5. Dependency map and parallelization

```text
A.1 (branch)
  ├─► B.1 items ──► B.4 checklists ──► C.1 offline
  ├─► B.2 checkpoints ──► B.4 checklists
  ├─► B.3 comments ──► B.1 items (deleteItem cleanup)
  ├─► B.5 reminders ──► D.6 notification handler, D.8 reminder modal
  ├─► B.6 deeplinks ──► D.1 board, D.2 search, D.4 checklist source
  ├─► E.1 functions skeleton ──► E.2 deleteProject ──► E.3 projects.ts
  └─► F.1–F.3 rules draft

Service API handoff (Gate 1) occurs when B.1–B.3 are typecheck-green and B.5/B.6
signatures are stable. Then D.1–D.8 and C.1 can run in parallel.

F.1–F.3 can be drafted in parallel with Wave B, but F.5 emulator tests require
B.1–B.3 path helpers to exist so the test script can construct correct references.

E.4 depends on F.2 because the callable must be tested against the new rules.

All waves converge at Gate 3 (automated quality gate) before any manual wipe/E2E.
```

---

## 6. Handoff points and gates between agents

| Gate | When | Owner | What must be true | Handoff to |
|---|---|---|---|---|
| **Gate 0 — Entry** | Before Day 1 | Master Agent + PO | G0.1–G0.5 all closed. | Backend/UI, Offline, UI/UX, Cloud, Security, QA Agents receive mandates. |
| **Gate 1 — Service API handoff** | End of Day 1 | Backend/UI Agent | `services/items.ts`, `services/checkpoints.ts`, `services/comments.ts` compile and their public signatures are stable; `services/reminders.ts` and `services/deeplinks.ts` signatures are stable. | UI/UX Agent starts D.1–D.8; Offline Agent starts C.1. |
| **Gate 2 — Rules/CF draft handoff** | End of Day 2 | Security Agent + Cloud Agent | Draft `firestore.rules` covers new subcollections and project-scoped checklist subcollections; `deleteProject` callable implemented locally. | QA Agent can start writing emulator tests; Cloud Agent starts E.4. |
| **Gate 3 — Local quality gate** | End of Day 3 | QA Agent | `typecheck`, `lint`, `pre-test-check`, emulator rule tests and CF local tests are green. | Manual integration and wipe can start on Day 4. |
| **Gate 4 — Simulator E2E gate** | End of Day 4 / Day 5 | QA Agent | Manual E1–E9 passed in dev client/simulator; regression bugs are fixed and re-tested. | Build readiness review. |
| **Gate 5 — Build 1 GO/NO-GO** | Start of Day 6 | Master Agent + PO + Audit Agent | Pre-build checklist fully green; no P1/P2 blockers; PO gives explicit GO. | Release Agent starts EAS Build 1. |
| **Gate 6 — Build 2 trigger** | After physical iOS regression | PO + Master Agent + QA Agent | Only P1/P2 bugs found on physical device; fixes are merged and re-tested; PO gives GO for Build 2. | Release Agent starts EAS Build 2. |

---

## 7. Risks that could force a 3rd build and how to avoid them

| Risk | Why it could force Build 3 | Mitigation in this plan |
|---|---|---|
| **Project-scoped checklist migration incomplete before Build 1** | The Security Agent has determined that a top-level `get`/`list` split is not valid for Firestore list queries, so project-scoped checklists must migrate before Build 1. | Treat migration as core Wave B/D/F work; design spec must define project-scoped vs. personal checklist separation; all emulator tests include project-scoped checklist cases before Gate 3. |
| **Old offline pending ops reference top-level paths** | App crashes or repeatedly fails to flush after update; may need a client-side migration/clear and another build. | Clear pending ops during A.2 wipe. Make `executePendingOp` graceful in C.1. Test offline toggle E2E in G.6. |
| **Reminders created before migration lack `targetProjectId`** | Notification tap crashes because route cannot resolve item; may need data migration and new build. | Wipe reminders as part of A.2. Implement fallback Alert in D.6. Do not migrate stale reminders. |
| **Cascade-delete Cloud Function times out or leaves orphan data** | May need retry logic, scheduled cleanup, or a different deletion strategy and a rebuild. | Use `recursiveDelete`; test with a large project in E.4; configure adequate memory/timeout; log Storage-cleanup failures instead of failing the call. |
| **Missing composite index for subcollection queries** | Runtime “missing index” errors on device that were not caught locally; requires index config + new build. | Audit all combined queries in B.1/B.4; update `firestore.indexes.json` in F.4; run queries in emulator and against a real Firestore project before Gate 3. |
| **UI code still navigates using only `itemId`** | Item detail or checklist source link fails; may need routing fixes and a new build. | Run an itemId+projectId audit of all navigation, share and deep-link code as part of D.1–D.6. Test every entry point in G.6. |
| **Security rule precedence bug in `update`** | Rule grants editors too much or too little access; discovered after Build 1. | Explicit parentheses in F.2; Security Agent review; negative editor cases in F.5. |
| **Cloud Function region / module mismatch on device** | Callable fails in production even though it works in emulator; may require config fixes and rebuild. | Verify `firebase.json` functions config and app-side functions module match; test callable from a dev-client build against the deployed/emulated function before Gate 5. |
| **Voice parser or auto-title paths accidentally broken** | Indirect impact from `createItem` signature change; may require parser fixes and a new build. | Keep D.1/D.7 focused on signature only; run existing parser verification script in G.2/G.6. |

---

## 8. Final pre-build checklist — GO/NO-GO for Build 1

### Scope and governance
- [ ] PO has explicitly approved Solution B and the testdata wipe.
- [ ] Solution Design document and this flow plan are approved and versioned.
- [ ] No scope-creep features have been added during implementation.
- [ ] Audit Agent confirms all governance gates are closed.

### Code completion
- [ ] All Wave A–F tasks are completed and committed on the feature branch.
- [ ] No TODO placeholders remain in `services/items.ts`, `services/checkpoints.ts`, `services/comments.ts`, `services/checklists.ts`, `services/projects.ts`, `firestore.rules` or Cloud Function source.
- [ ] Branch is clean: no uncommitted changes, no secrets, no debug-only code.

### Automated gates (must all be green)
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run pre-test-check` passes.
- [ ] Firestore emulator rule tests pass for owner, admin, editor, viewer, email-member and non-member across items, checkpoints, comments and checklists.
- [ ] Cloud Function `deleteProject` passes local emulator tests including role rejection and recursive deletion.

### Security and rules
- [ ] `firestore.rules` removes all top-level items/checkpoints/comments rules.
- [ ] Subcollection rules explicitly parenthesize the editor `update` condition.
- [ ] Project-scoped checklist subcollection rules are validated in emulator; personal checklist top-level rules remain green and unchanged.
- [ ] `firestore.indexes.json` covers all combined subcollection queries for items and project-scoped checklists.

### Offline and data
- [ ] Old pending ops are cleared or gracefully handled.
- [ ] Offline checklist toggle flush is tested end-to-end.
- [ ] Testdata wipe is completed and backup/screenshots exist.
- [ ] Two test projects are recreated with owner + email-editor and owner + uid-editor.

### Manual E2E (simulator / dev client)
- [ ] E1 — Create item via Board (manual + voice) succeeds and item appears for editor.
- [ ] E2 — Search shows items and navigation to item detail works.
- [ ] E3 — Comments create and delete correctly in real time.
- [ ] E4 — Dynamic checklist from search toggles source-item status.
- [ ] E5 — Offline checklist toggle flushes correctly when reconnecting.
- [ ] E6 — Reminder notification tap opens correct item detail.
- [ ] E7 — Non-member cannot read project items.
- [ ] E8 — Project deletion callable removes all data, checklists and storage files.
- [ ] E9 — Email editor can create items and comments and list project items.

### QA and release readiness
- [ ] QA report is produced with no P1/P2 blockers.
- [ ] EAS build profile for Build 1 is `preview` or `production`, not `developmentClient`.
- [ ] PO has given explicit GO for Build 1.

### NO-GO triggers
Any of the following blocks Build 1:
- A red automated gate.
- An unresolved P1 or P2 bug.
- A pending security or compliance review item.
- Missing PO GO.
- Uncommitted or unexplained changes on the branch.
- Data wipe performed without backup/approval.

---

## 9. Build 2 criteria

Build 2 is only triggered if:

1. PO finds P1/P2 regressions during physical iOS E2E regression of Build 1.
2. Fixes are limited to the specific regression issues — no new features, no data-model changes, no rule redesign.
3. Affected automated gates and manual tests are re-run and green.
4. PO gives explicit GO for Build 2.

If a structural issue is found that was not resolved before Build 1, the team must pause, update the design doc and this flow plan, and treat it as a new implementation cycle rather than a Build 2 fix.

---

## 10. References

- `C:\Users\kimgr\data-capture-app\.claude\team\status\rca-items-read-us004.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\status\impl-plan-items-subcollection-us004.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\status\audit-solution-b-us004.md`
- `C:\Users\kimgr\data-capture-app\firestore.rules`
- `C:\Users\kimgr\data-capture-app\firestore.indexes.json`
- `C:\Users\kimgr\data-capture-app\services\items.ts`
- `C:\Users\kimgr\data-capture-app\services\checkpoints.ts`
- `C:\Users\kimgr\data-capture-app\services\comments.ts`
- `C:\Users\kimgr\data-capture-app\services\checklists.ts`
- `C:\Users\kimgr\data-capture-app\services\checklistsOffline.ts`
- `C:\Users\kimgr\data-capture-app\services\projects.ts`
- `C:\Users\kimgr\data-capture-app\services\reminders.ts`
- `C:\Users\kimgr\data-capture-app\services\notifications.ts`
- `C:\Users\kimgr\data-capture-app\services\deeplinks.ts`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\board.tsx`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\search.tsx`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\checklists.tsx`
- `C:\Users\kimgr\data-capture-app\app\item.tsx`
- `C:\Users\kimgr\data-capture-app\app\checklist.tsx`
- `C:\Users\kimgr\data-capture-app\components\NotificationResponseHandler.tsx`
- `C:\Users\kimgr\data-capture-app\components\CreateItemForm.tsx`
- `C:\Users\kimgr\data-capture-app\components\VoiceCaptureModal.tsx`
- `C:\Users\kimgr\data-capture-app\components\ReminderModal.tsx`
