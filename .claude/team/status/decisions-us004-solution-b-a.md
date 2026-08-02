# Beslutningslog — US-004 items/checkpoints/comments subcollection migration

**Doc ID:** decisions-us004-solution-b-a  
**App:** Data Capture (`C:\Users\kimgr\data-capture-app`)  
**Branch:** `fix/us004-items-subcollection` (fra `fix/us004-voice-redesign`)  
**Dato for denne opdatering:** 2026-08-02  
**PO:** Kim Grandal  
**Master Agent:** Data Capture Master Agent

---

## 1. Grundlæggende beslutninger

| # | Beslutning | Dato | Godkendt af | Begrundelse |
|---|---|---|---|---|
| 1 | **Solution B** for items/checkpoints/comments: flyt til `/projects/{projectId}/items/...` | 2026-07-15 | PO | Løser Firestore `list`-query `permission_denied` efter REG-001 deploy. Bevarer rollebaseret adgang. |
| 2 | **Wipe-and-recreate** af testdata (kun testdata, ingen produktionsdata) | 2026-07-15 | PO | Kun testdata i dev/prod; migration ikke økonomisk forsvarlig. |
| 3 | **Max 2 EAS builds** for hele migrationen | 2026-07-15 | PO | Build 1 = primary; Build 2 = rettelser efter fysisk iOS E2E. Build 3 = process failure. |
| 4 | **Solution A for personal/shared checklists**: flyt fra top-level `/checklists/{checklistId}` til `/users/{userId}/checklists/{checklistId}` | 2026-08-02 | PO | Sikkerhedsagent identificerede at `resource.data` i `list`-regel for top-level checklists er ugyldig. For at følge samme hierarkiske mønster som projekt-scopede checklists vælger vi user-scoped stier. |
| 5 | Fortsæt med **iOS-only builds** i denne runde | 2026-07-15 | PO | Android udskudt indtil videre; PO tester på iPhone/iPad. |

---

## 2. Hvad PO har godkendt eksplicit

- ✅ Solution B data-model-ændring (items/checkpoints/comments under projekt).
- ✅ Solution A data-model-ændring for personal/shared checklists (under bruger).
- ✅ Wipe af alle testdata i Firestore og Storage.
- ✅ Max 2 builds.
- ✅ Cloud Function `deleteProject` med `recursiveDelete` og Storage-cleanup.
- ✅ iOS-only `preview` build.

---

## 3. Hvad PO skal godkende fremadrettet

| # | Beslutningspunkt | Hvornår |
|---|---|---|
| 1 | Endelig go til Build 1 efter G1–G8 er grønne | Før EAS build |
| 2 | Data wipe konkret tidspunkt og backup | Før wipe |
| 3 | Go til Build 2, hvis fysisk iOS E2E afslører P1/P2 | Efter Build 1 test |
| 4 | Eventuel soft-delete/papirkurv ønske | Ikke i denne runde |

---

## 4. Status på gates (opdateret 2026-08-02)

| Gate | Beskrivelse | Status | Bemærkning |
|---|---|---|---|
| G1 | Typecheck | ✅ Grøn | `npm run typecheck` |
| G2 | Lint | ✅ Grøn | `npm run lint` |
| G3 | Pre-test-check | ✅ Grøn | 1 warning om pakkeversions-tjek |
| G4 | Firestore emulator regeltests | 🟡 Genkøres efter personal checklist-regelrettelse | 92 passed, 2 failed pga. top-level checklist `list`-regel. Løses ved at flytte personal checklists under `/users/{userId}`. |
| G5 | Cloud Function tests | ✅ Grøn | `deleteProject` testet OK; testscript oprettet. |
| G6 | Manuel E2E E1–E9 | ⏸️ Afventer wipe + recreate | Runbook klar. |
| G7 | QA-rapport | ⏸️ Afventer G4–G6 | |
| G8 | Data wipe + recreate | ⏸️ Afventer PO-go | |

---

## 5. Referencer

- `design-us004-items-subcollection-us004.md`
- `flow-us004-items-subcollection.md`
- `impl-plan-items-subcollection-us004.md`
- `security-approval-us004-items-subcollection.md`
- `qa-gate-us004-items-subcollection.md`
- `qa-testplan-us004-items-subcollection.md`
- `rca-items-read-us004.md`
- `audit-solution-b-us004.md`

---

*Denne fil skal opdateres hver gang PO træffer eller bekræfter en beslutning, så samtalen kan genetableres ved context-loss.*
