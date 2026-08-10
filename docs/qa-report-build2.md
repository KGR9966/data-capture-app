# Data Capture — US-004 Build 2 QA Report

**Build:** EAS iOS preview internal distribution
**Date:** 2026-08-02
**Scope:** P1 + P2 fixes
  - P1: project visibility + project-scoped checklist navigation/deeplinks
  - P2: voice parser no longer uses type keyword (Bug/Idé/Notat/Observation) as title
**Excluded from Build 2:** P3-1/P3-2 edge cases (see root cause summary).

---

## Build 2 changes included

| File | Change |
|------|--------|
| `scripts/seed-us004-testdata.js` | Env-based test user mapping (`SEED_OWNER_UID`, `SEED_MEMBER_EMAIL`, etc.) so production seed data matches the preview sign-in user. |
| `app/(tabs)/search.tsx` | Dynamic checklist creation now routes with `projectId` for project-scoped lists. |
| `app/(tabs)/checklists.tsx` | Project-scoped checklist cards now route with `projectId`. |
| `app/checklist.tsx` | Reads `projectId` from query params and passes it to `getChecklistById`. |
| `services/deeplinks.ts` | `buildChecklistUrl` / `buildOpenListUrl` support optional `projectId`. |
| `app/open-list.tsx` | Forwards `projectId` to `/checklist` route. |
| `components/NotificationResponseHandler.tsx` | Uses `targetProjectId` for checklist/checklistItem push notifications. |
| `.env.example` | Documented seed env variables for preview builds. |
| `services/voiceCommands.ts` | Strips leading standalone type keyword from title when followed by sentence terminator/paragraph break. |
| `scripts/verify-voice-parser.ts` | Added P2 regression cases. |

---

## Pre-build gates (run locally)

| Gate | Command | Expected | Status |
|------|---------|----------|--------|
| G1-G4 | `npm run pre-test-check` | OK, 0 failures | ✅ |
| G5 | `firebase emulators:exec --only firestore "node scripts/test-rules.js"` | 107/107 passed | ✅ |
| P1 repro | `npx firebase emulators:exec --only firestore "node scripts/reproduce-p1.js"` | 5/5 assertions passed | ✅ |
| P2 repro | `npx tsx scripts/reproduce-p2p3.js` | 6/6 assertions passed | ✅ |
| Voice parser regression | `npx tsx scripts/verify-voice-parser.ts` | All passed | ✅ |

---

## E2E test results — Build 2 (E1-E9)

Fill in after running on the iOS preview build.

| ID | Test step | Expected result | Status | Notes / blocker |
|----|-----------|-----------------|--------|---------------|
| E1 | Install preview build and sign in with test user | App opens, user signed in | ⬜ | |
| E2 | Open Projects tab | Project A and Project B visible | ⬜ | |
| E3 | Open Project A | Project details / board loads | ⬜ | |
| E4 | Go to Search tab, search "knap", create dynamic checklist | List created, routed to checklist screen | ⬜ | |
| E5 | Checklist screen loads | Title and items shown, no "Listen blev ikke fundet" | ⬜ | |
| E6 | Go to Checklists tab, tap project-scoped list | Checklist opens with correct items | ⬜ | |
| E7 | Go to Checklists tab, tap personal/shared list | Shared/personal checklist opens | ⬜ | |
| E8 | Open a checklist deep-link / push notification (if testable) | Checklist opens with projectId preserved | ⬜ | |
| E9 | Project B visible for email-based member | Sign in as member email, Project B visible | ⬜ | |

---

## Root cause summary

### P1
1. **Projects not showing:** Seed data used hardcoded fake UID (`user_owner`). In production preview builds the signed-in user's real Firebase Auth UID did not match, so `subscribeToProjects(ownerId == uid)` returned empty.
2. **"Listen blev ikke fundet":** `search.tsx` and `checklists.tsx` navigated to `/checklist?id=...` without `projectId`. `checklist.tsx` only read `id` and `userId`, so `getChecklistById` fell back to the personal path `/users/{uid}/checklists/{id}`, which does not exist for project-scoped lists.
3. **Deeplink/notification regression:** Same `projectId` omission existed in `open-list.tsx`, `deeplinks.ts`, and `NotificationResponseHandler.tsx`.

### P2/P3
4. **Type keyword became title:** `parseVoiceInput` split title/content before removing the explicit category prefix, so "Bug. Knappen..." produced title="Bug" instead of title="Knappen...".
5. **P3-1 (Æ → ae):** Not reproduced in parser output. Parser preserves Danish characters; if observed as "ae" the issue is in the iOS speech recognizer output or in UI display, not in `voiceCommands.ts`.
6. **P3-2 (line break lost):** Explicit "ny linje" after a sentence terminator gets normalised into plain content during title/content split. Parser behaviour is consistent; treating this as a bug is a separate UX decision.

---

## Decisions / deviations

- Build 2 contains **P1 + P2**. P2 fix is isolated to `services/voiceCommands.ts`, covered by regression tests, and verified against the reported cases.
- **P3-1 (Æ → ae) and P3-2 (line break normalisation) are excluded from Build 2** because they are either not reproduced in parser output or require a separate UX decision.

---

## Sign-off

| Role | Name | Status | Date |
|------|------|--------|------|
| PO | | ⬜ | |
| QA / Tester | | ⬜ | |
| Master Agent | Claude | ✅ Ready for Build 2 | 2026-08-02 |
