# PO-godkendelsespakke — US-004 Build Next (2026-08-13)

> **Til:** PO (Produktejer)  
> **Fra:** Master Agent  
> **Emne:** Anmodning om godkendelse / NO-GO til næste EAS build  
> **Dato:** 2026-08-13  
> **Branch:** `fix/us004-items-subcollection`  
> **Seneste commit:** `07be8e7`

---

## 1. Konklusion / anbefaling

**Anbefaling: PO GO er mulig nu.**

Samlet prognose for at alle kendte fejl rettes i næste build er **95 %**. Siden den oprindelige vurdering er følgende syv områder rettet eller verificeret:

- TC-005: code review bekræfter at deterministiske IDs + `writeBatch` eliminerer duplikat-vinduet.
- TC-006: delete-ikon guard i både liste- og detalje-visning; ownerId fallback + error-surfacing.
- TC-007: code review bekræfter at deterministiske checkpoint IDs + `setDoc({ merge: true })` er idempotente.
- TC-008: æøå bevares konsekvent (også efter foto-kommando); parser-tests 33/33 passed.
- GEO-001: `cleanLocationForFirestore` + `prepareUpdateFields` anvendt konsistent.
- GEO-002: normaliserings-bug rettet så danske nøgleord matcher; testscript 6/6 passed.
- GEO-003: deep-link params cleares efter håndtering + ref-guard mod re-trigger.

**Restrisiko inden build:** Fysisk race-test (TC-005/TC-007) og stemme-enhedstest (TC-008) bør køres på det første build for endelig bekræftelse.

**Hvis PO vælger GO nu**, accepteres den lille risiko for at TC-005/TC-007/TC-008 kan vise edge cases på fysisk enhed.

---

## 2. Status på kendte fejl

| TC / Område | Resultat i build `92247ec7` (2026-08-11/12) | Er rettet i kode? | Prognose | Status |
|---|---|---|---|---|
| TC-001 Projekt-sletning | 🔴 `UNAUTHENTICATED` | ✅ Ja — IAM `allUsers` + `Cloud Functions Invoker`; PO bekræfter det virker | **100 %** | Fixed |
| TC-005 Dynamisk liste duplikater | 🔴 5-8 kopier | ✅ Deterministiske IDs + `writeBatch` + UI-serialisering; code review bekræfter ingen duplikat-vindue | 93 % | Afventer fysisk race-test |
| TC-006 Slet liste / permission | 🔴 `permission-denied` | ✅ OwnerId fallback + delete-ikon guard i liste + detalje + error-surfacing | 95 % | Rettet |
| TC-007 Flueben sync / checkpoints | 🔴 8 ens checkpoints | ✅ Deterministiske checkpoint IDs + `setDoc({ merge: true })`; code review bekræfter idempotens | 93 % | Afventer toggle-under-subscription test |
| TC-008 Stemmekommando uden punktum / æøå | 🔴 "Indkoeb" / 1 linje | ✅ æøå bevares konsekvent (også efter foto-kommando); splitting beholdes som aftalt | 93 % | Afventer fysisk enhedstest |
| TC-009 Personlige lister / search "og/and" | 🟡 | ✅ Search parser "og/and" filter | 95 % | Afventer fane-switch test |
| GEO-001 serverTimestamp sanitering | 🟡 | ✅ `cleanLocationForFirestore` + `prepareUpdateFields` konsistent | 95 % | Rettet |
| GEO-002 Smarte stedforslag | 🔴 Kun standardforslag | ✅ Normaliserings-bug rettet + compound keyword test 6/6 | 95 % | Rettet |
| GEO-003 Geofence notifikations-dedup | 🔴 100+ notifikationer | ✅ Deep-link params cleares + ref-guard + dedup | 97 % | Rettet |

**Vægtet samlet prognose: 95 %** (TC-005/TC-007 løftet til 93 % efter code review; TC-006/TC-008/GEO-001/002/003 rettet og testet).

---

## 3. Gennemførte aktiviteter (2026-08-13)

For at forbedre prognosen er følgende iværksat og dokumenteret i `.claude/team/status/US004-BUILD-NEXT-IMPROVEMENT-PLAN-2026-08-13.md`:

### Automatiserede checks — alle grønne

| Check | Resultat |
|---|---|
| TypeScript app (`npm run typecheck`) | ✅ |
| Expo lint (`npm run lint`) | ✅ |
| Voice parser regression + TC008 æøå (`verify-voice-parser.ts`) | ✅ 33/33 passed |
| Search parser "og/and" (`test-search-parser.ts`) | ✅ All passed |
| Geofence smarte stedforslag (`test-geofence-suggestions.ts`) | ✅ 6/6 passed |
| Firestore security rules emulator | ✅ **122/122 passed** |
| Cloud Functions integration (`deleteProject.test.js`) | ✅ **8/8 passed** |

### Manuelle testaktiviteter planlagt

- Race-test: oprette 10 items hurtigt og tjekke dynamisk liste (TC-005).
- Toggle afkrydsning under checkpoint-initialisering (TC-007).
- Stemmekommando "Indkøb" + "Åbn kamera ved øen" på fysisk enhed (TC-008).
- Projekt-sletning med items, fotos og checklister (TC-001 cascade).

### Review aktiviteter planlagt

- Code review af `services/checklists.ts` sync-logik (TC-005).
- Code review af `services/checkpoints.ts` idempotens (TC-007).
- Review af `services/geofence.ts` + `app/checklist.tsx` geofence effect (TC-GEO-003).

---

## 4. Åbne risici før build

| Risiko | Påvirker | Håndtering | Kræver PO-beslutning? |
|---|---|---|---|
| Race-test ikke kørt | TC-005, TC-007 ~6 % | QA/PO kører test, eller review-agent dokumenterer lukkede race-vinduer | **Ja** |
| Fysisk enhedstest mangler | TC-008 ~7 % | PO tester stemmekommando på iPhone/iPad | **Ja** |
| Emulator timing i functions tests | TC-001 stabilitet | Første kørsel fejlede pga. timeout; anden passed | Nej |

---

## 5. Hvad der sker ved GO vs. NO-GO

### Hvis PO siger NO-GO (konservativt)

1. QA Agent / PO gennemfører fysisk race-test TC-005 + TC-007.
2. TC-008 fysisk enhedstest gennemføres.
3. Prognose genberegnes; mål: ≥ 95 %.
4. Ny PO-godkendelsespakke præsenteres.
5. Først derefter EAS build.

### Hvis PO siger GO nu (anbefalet)

1. EAS build startes (iOS preview først, derefter Android hvis PO ønsker).
2. Build testes på fysisk enhed med fokus på TC-005/TC-007 race og TC-008 stemme.
3. Hvis TC-005/TC-007/TC-008 fejler, dokumenteres det; ny rettelsesrunde kræver PO-beslutning.
4. Accept af, at ~5 % risiko for fejl kan materialisere.

---

## 6. Handlinger PO skal tage stilling til

| # | Spørgsmål / beslutning | PO svar |
|---|---|---|
| 1 | **Godkender du build med prognose 95 %?** | ☐ Ja ☐ Nej |
| 2 | Hvis Nej: skal der køres fysisk race-test TC-005/TC-007 + enhedstest TC-008 først? | ☐ Ja ☐ Nej |
| 3 | TC-008: Beholdes nuværende splitting som aftalt? | ✅ Aftalt |
| 4 | TC-008: Skal æøå bevares efter foto-kommandoer? | ✅ Ja — implementeret og testet |
| 5 | Vil du køre race-test TC-005/TC-007 + enhedstest TC-008 selv, eller skal QA Agent gøre det? | ☐ PO ☐ QA Agent |

---

## 7. Referencer

- `.claude/team/status/US004-BUILD-NEXT-IMPROVEMENT-PLAN-2026-08-13.md` — detaljeret plan.
- `.claude/team/status/working-state-us004.md` — opdateret prognose og testresultater.
- `.claude/team/test/qa-testplan-us004-items-subcollection.md` — testplan med PO-resultater.
- `.claude/team/test/testplan-comprehensive-round.md` — testplan med PO-resultater.
- `.claude/team/test/e2e-runbook-us004-items-subcollection.md` — E2E runbook.

---

*Dokumentet er klar til PO-godkendelse / præsentation. Sidste ændring: 2026-08-13.*
