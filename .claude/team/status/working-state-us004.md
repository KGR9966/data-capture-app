# Working state — US-004 Solution B + A (regenerérbar ved context-loss)

**Dato:** 2026-08-13  
**Branch:** `fix/us004-items-subcollection`  
**Seneste commit:** `9cae5e3 docs(us004): opdater working-state med genetableringsresultater`  
**Working tree:** clean  
**Java:** Temurin 21.0.12 installeret under `C:\tools\jdk-21.0.12+8` og `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot`

---

## Færdigt

- [x] Java 21 installeret (to lokationer).
- [x] Solution B implementeret i commit `2f98cc9`:
  - items/checkpoints/comments under `/projects/{projectId}`
  - project-scoped checklists under `/projects/{projectId}/checklists`
  - `deleteProject` Cloud Function med `recursiveDelete`
  - UI routing med `projectId+itemId`
  - offline pending-ops opdateret
- [x] 92 emulator-regeltests i `scripts/test-rules.js`
- [x] Cloud Agent: `functions/src/deleteProject.test.ts` + emulator-opsætning.
- [x] Security Agent: identificerede blocker i top-level personal checklist `list`-regel.
- [x] QA Agent: E2E-runbook E1–E9 oprettet.

---

## Igang / blocker

- [x] **Top-level personal/shared checklists regel erstattet** med `/users/{userId}/checklists/{checklistId}` + `/users/{recipientUserId}/sharedChecklists/{checklistId}`.
- [ ] **services/checklists.ts + UI opdateres** af Backend/UI Agent (baggrund).
- [ ] **scripts/test-rules.js opdateres** af QA/Security Agent (baggrund).
- [x] **G4 emulator-tests:** 107/107 passed.
- [x] **G5 Cloud Function-tests:** All tests passed.
- [x] **services/checklists.ts + UI opdateret** af Backend/UI Agent; typecheck + lint grønne.
- [x] Commit `6be800a` med deploy-fixes, seed-script og opdateret wipe-script.
- [x] **PO GO til data wipe + recreate** givet 2026-08-02.
- [x] W1: Pre-wipe screenshots — sprunget over; PO bekræfter vi starter på ny.
- [x] W2–W4: Wipe dev/test Firestore + Storage (9 projekter, 46 items, 5 checklists, 175 storage objects).
- [x] Genskab testdata (`scripts/seed-us004-testdata.js`).
- [x] Deploy `firestore.rules` + `deleteProject` Cloud Function.
- [x] Share/unshare UI for personal checklists implementeret og committed (`54f8508`).
- [ ] PO GO til Build 1 (iOS-only preview).
- [ ] G6 manuel E2E E1–E9.
- [ ] G7 QA-rapport.

---

## Planlagt rækkefølge

1. Aktiver Solution Design Agent til at opdatere design-spec for `/users/{userId}/checklists`.
2. Master Agent opdaterer `firestore.rules` + `services/checklists.ts` + UI ifølge spec.
3. Genkør G4 emulator-tests (forventet 92/92 grønne).
4. Genkør G5 Cloud Function-tests (bør stadig være grønne).
5. Commit alle ændringer.
6. PO-go til data wipe + recreate.
7. Kør G6 manuel E2E E1–E9.
8. QA-rapport.
9. PO-go til Build 1 (iOS-only `preview`).
10. Fysisk iOS E2E.
11. Hvis P1/P2: PO-go til Build 2.

---

## Uncommitted changes (2026-08-02)

- `M firestore.rules` — rettet top-level checklist list-regel, men den virkede ikke; skal omskrives til user-scoped.
- `M firebase.json` — emulator-porte tilføjet af Cloud Agent.
- `M functions/package.json` — test-script tilføjet.
- `?? functions/src/deleteProject.test.ts` — Cloud Function tests.
- `?? .claude/team/status/cloud-function-test-report-us004.md`
- `?? .claude/team/status/security-g4-signoff-us004.md`
- `?? .claude/team/test/e2e-runbook-us004-items-subcollection.md`
- `?? .claude/team/status/decisions-us004-solution-b-a.md` (denne fil)
- `?? .claude/team/status/working-state-us004.md` (denne fil)
- `?? firestore-debug.log` — kan slettes.

---

## Kommandoer til at genoptage

```powershell
cd C:\Users\kimgr\data-capture-app
$env:Path += ";C:\tools\jdk-21.0.12+8\bin"
npx firebase emulators:exec --only firestore --project data-capture-us004 "node scripts/test-rules.js"
```

Cloud Function tests:
```powershell
cd functions
npm test
```

---

## Genetablering efter context-loss 2026-08-13

- [x] Genlæst `decisions-us004-solution-b-a.md`, `working-state-us004.md` samt øvrige statusfiler.
- [x] Verificeret git-status: 9 uncommitted ændringer på branch `fix/us004-items-subcollection`.
- [x] Kørt `npm run typecheck` ✅ grøn.
- [x] Kørt `npm run lint` ✅ grøn.
- [x] Kørt `npm run pre-test-check` ❌ 8 voice-parser fejl (D1.3–D1.8) + debug-tekst i liste-sletning.
- [x] Rettet `services/voiceCommands.ts`: `stripPhotoCommand` reverteret til PO-godkendt normalized output.
- [x] Rettet `app/(tabs)/checklists.tsx`: fjernet "Diagnose:" debug-label fra sletning-alert.
- [x] Genkørt `verify-voice-parser.ts` ✅ E1–E13 + D1.1–D1.8 + P2.1–P2.4 alle passed.
- [x] Genkørt `pre-test-check` ✅ OK (1 kendt warning om pakkeversions-tjek).
- [x] Genkørt G4 Firestore emulator regeltests ✅ 122/122 passed.
- [x] Genkørt G5 Cloud Function tests ✅ all passed.
- [x] Genkørt `test-search-parser.ts` ✅ all passed.
- [x] Review/audit af 9 uncommitted ændringer gennemført; ingen yderligere blockere identificeret.
- [x] Commit + push af rettelser — `f4b1231` + oprydning `3ef2954`.
- [ ] PO GO til Build 1 (iOS-only preview).
- [ ] G6 manuel E2E E1–E9.
- [ ] G7 QA-rapport.

---

*Filen opdateres løbende. Ved context-loss: genlæs denne fil + `decisions-us004-solution-b-a.md`.*
