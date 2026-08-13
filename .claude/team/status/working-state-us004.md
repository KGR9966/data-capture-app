# Working state — US-004 Solution B + A (regenerérbar ved context-loss)

**Dato:** 2026-08-13  
**Branch:** `fix/us004-items-subcollection`  
**Seneste commit:** `4eca6ab docs(us004): opdater working-state med build-ready status og prognose`  
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
- [x] Genskabte PO-testresultater fra build `92247ec7` (commit `60542c1`, 2026-08-11/12) fra session transcript `3f397a1c-2ab5-43b3-befa-f2f1859978df.jsonl` — indskrevet i testplanerne.
- [x] Opdateret prognose: TC-001 = 100 % fixed; samlet prognose 91 %.
- [x] Iværksatte forbedringsaktiviteter og dokumenterede dem i `.claude/team/status/US004-BUILD-NEXT-IMPROVEMENT-PLAN-2026-08-13.md`.
- [ ] PO GO til Build 1 (iOS-only preview) — **anbefales NO-GO indtil prognose ≥ 95 %**.
- [ ] G6 manuel E2E E1–E9.
- [ ] G7 QA-rapport.

---

## Genskabte PO-testresultater fra 2026-08-11/12

> Kilden er session transcript `C:\Users\kimgr\.claude\projects\C--cloud-agent\3f397a1c-2ab5-43b3-befa-f2f1859978df.jsonl` — den tabte chat før genetableringen. Resultaterne er indskrevet i `.claude/team/test/qa-testplan-us004-items-subcollection.md`, `.claude/team/test/testplan-comprehensive-round.md` og `.claude/team/test/e2e-runbook-us004-items-subcollection.md`.

Build testet: `92247ec7` (commit `60542c1` — `fix(build-next): resolve TC-001/004/007/008/009 and GEO-001/002`).

| TC / Geo | Resultat | Observation / fejllog |
|---|---|---|
| TC-001 Projekt-sletning | 🔴 | `Diagnose: sletning fejlede. Sletning fejlede (unknown): deleteProject fejlede: httpsCallable(unauthenticated): UNAUTHENTICATED; directUrl(unknown): JSON Parse error: Unexpected character:` |
| TC-002 Foto-upload | 🟢 | Bestod. |
| TC-003 Oversættelse til engelsk | 🟢 | Bestod. |
| TC-004 Notifikation på projekt-liste | 🟢 | Bestod. |
| TC-005 Dynamisk liste opdaterer | 🔴 | Opretter 5-8 stk. af samme sag i listen. |
| TC-006 Slet liste | 🔴 | `Diagnose: kunne ikke oprette liste Fejl (firestore/permission-denied): [firestore/permission-denied] The caller does not have permission...` |
| TC-007 Flueben sync til sag | 🔴 | "Udført" blinker vildt; sag-status forbliver `new`; 8 ens checkpoints oprettet, kun første har flueben. |
| TC-008 Stemmekommando uden punktum | 🔴 | Tekst i én linje i sagen; to linjer i listen; "Indkøb" staves "Indkoeb". |
| TC-009 Personlige lister separat fane | 🟡 | Faner vises; oprettelse påvirket af TC-006. |
| TC-GEO-001 Tilføj sted | 🟢 | Bestod. |
| TC-GEO-002 Smarte stedforslag | 🔴 | Viser kun standardforslag (fx Silvan Hillerød). |
| TC-GEO-003 Kopier ankomst-link | 🔴 | Notifikationsfejl første gang; ved gentagelse 100+ ens notifikationer. |
| TC-GEO-004 Åbn guide | 🟢 | Bestod; PO ønsker danskere/præcis vejledning. |
| TC-GEO-005 Deeplink åbner liste | 🟡 | Delvis passed; hænger sammen med TC-GEO-003. |
| TC-GEO-006 Toggle sted til/fra | 🟢 | Bestod. |

**Opdatering 2026-08-13 (eftermiddag):** PO bekræfter, at efter `allUsers` + `Cloud Functions Invoker` blev sat på `deleteProject`, er projektsletning nu mulig i appen. TC-001 anses derfor for **rettet / confirmed fixed**. Dette er ikke et sikkerhedshul: Firebase callable function validerer `context.auth` og owner/admin rolle server-side.

---

## Opdateret prognose før forbedringsaktiviteter

| TC / Område | Prognose før aktiviteter | Prognose efter planlagte aktiviteter | Bemærkning |
|---|---|---|---|
| TC-001 deleteProject | 100 % (fixed) | 100 % | IAM rettet; PO bekræfter det virker. |
| TC-005 Dynamisk liste duplikater | 80 % | 90 % | Deterministiske IDs + serialisering + race-test + regression. |
| TC-006 Slet liste / permission | 85 % | 92 % | OwnerId fallback + delete-ikon guard + offline delete test + rules-test. |
| TC-007 Flueben sync / checkpoints | 80 % | 90 % | Deterministiske checkpoint IDs + allDone-logik test + race-test. |
| TC-008 Stemmekommando uden punktum / æøå | 90 % | 85 % | æøå bevares i titel; splitting på " og " kan give uventede titler; æøå normaliseres efter foto-kommando per PO-godkendte eksempler. Kræver PO-afklaring. |
| TC-009 Personlige lister / search "og/and" | 95 % | 95 % | Search parser test + fane-switch test. |
| GEO-001 serverTimestamp sanitering | 85 % | 90 % | Emulator + serialization test. |
| GEO-002 Smarte stedforslag | 80 % | 88 % | Compound keyword test + danske navneforslag. |
| GEO-003 Geofence notifikations-dedup | 85 % | 93 % | Deep-link param clearing + re-render test + dedup logik. |

**Ny vægtet samlet prognose (efter aktiviteter):**

$$
\frac{100 + 90 + 92 + 90 + 85 + 95 + 90 + 88 + 93}{9} = \textbf{91,4 %} ≈ \textbf{91 %}
$$

> **Note:** Yderligere forbedring kræver fysisk enhedstest (iOS simulator/enhed) og PO-afklaring af TC-008. Mål: ≥ 95 % før build.

> **Automatiserede checks kørt 2026-08-13:**
> - `npm run typecheck` ✅
> - `npm run lint` ✅
> - `npx tsx scripts/verify-voice-parser.ts` ✅ 26/26 passed
> - `npx tsx scripts/test-search-parser.ts` ✅ All passed
> - Firestore emulator tests ✅ 122/122 passed
> - Cloud Functions integration tests ✅ 8/8 passed (anden kørsel; første kørsel fejlede pga. emulator timeout)

---

## Planlagte forbedringsaktiviteter (2026-08-13)

Aktiviteterne skal dokumenteres, begrundes og præsenteres ved PO-godkendelse før build. Ingen build uden PO-go.

### A. Unit / integration tests (kan køres nu)

| # | Aktivitet | TC / Område | Formål | Forventet effekt |
|---|---|---|---|---|
| A1 | Udvid `scripts/verify-voice-parser.ts` med "Husk mælk og brød" + "Indkøb" cases | TC-008 | Sikre at æøå bevares og "og"/"," splitter uden punktum. | +3 % |
| A2 | Kør `test-search-parser.ts` med "og/and" + danske specialtegn | TC-009 | Verificere filtrering af konjunktioner. | +2 % |
| A3 | Udvid functions tests med rolle-check cases for shared projects | TC-001 / TC-DEL-005 | Sikre at kun owner/admin kan slette. | +2 % |
| A4 | Emulator regeltest for `delete` på `users/{userId}/checklists` | TC-006 | Verificere ownership-regel for personlige lister. | +2 % |

### B. Race condition / stress tests (kræver emulator/enhed)

| # | Aktivitet | TC / Område | Formål | Forventet effekt |
|---|---|---|---|---|
| B1 | Opret 10 items hurtigt efter hinanden og tjek dynamisk liste for duplikater | TC-005 | Verificere serialisering + deterministiske IDs. | +5 % |
| B2 | Afkryds punkt mens subscription stadig initialiserer checkpoints | TC-007 | Sikre idempotent checkpoint-oprettelse. | +5 % |
| B3 | Åbn deep-link 5x i træk og tjek notifikations-tæller | TC-GEO-003 | Verificere dedup + route param clearing. | +5 % |

### C. Manuelle / simulator tests (kræver PO eller QA Agent)

| # | Aktivitet | TC / Område | Formål | Forventet effekt |
|---|---|---|---|---|
| C1 | TC-001: Slet tomt projekt, projekt med items, og projekt med fotos | TC-DEL-001–004 | Bekræfte IAM-rettelse + cascade. | Sikrer 100 % fastholdes. |
| C2 | TC-006: Slet personlig liste + delt liste som ikke-ejer | TC-006 | Verificere ejerskabsguard + fejlbesked. | +5 % |
| C3 | TC-008: Stemmekommandoer uden punktum på fysisk enhed | TC-008 | Fang platform-specifikke edge cases. | +3 % |
| C4 | TC-GEO-002/003: Test med danske stednavne og deep-link flood | GEO-002, GEO-003 | Verificere compound keywords og notifikationsdedup i praksis. | +5 % |

### D. Review / audit

| # | Aktivitet | TC / Område | Formål | Forventet effekt |
|---|---|---|---|---|
| D1 | Uafhængig code review af `services/checklists.ts` sync-logik | TC-005 | Sikre at serialisering dækker alle paths. | +3 % |
| D2 | Uafhængig code review af `services/checkpoints.ts` idempotens | TC-007 | Sikre at `setDoc({ merge: true })` + deterministiske IDs ikke overskriver data. | +3 % |
| D3 | Review af `services/geofence.ts` + `app/checklist.tsx` geofence effect | TC-GEO-003 | Sikre at params cleares og banner ikke re-renders unødigt. | +5 % |

---

*Filen opdateres løbende. Ved context-loss: genlæs denne fil + `decisions-us004-solution-b-a.md`.*
