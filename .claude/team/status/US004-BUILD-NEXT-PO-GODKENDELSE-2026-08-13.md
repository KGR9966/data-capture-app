# PO-godkendelsespakke — US-004 Build Next (2026-08-13)

> **Til:** PO (Produktejer)  
> **Fra:** Master Agent  
> **Emne:** Anmodning om godkendelse / NO-GO til næste EAS build  
> **Dato:** 2026-08-13  
> **Branch:** `fix/us004-items-subcollection`  
> **Seneste commit:** `07be8e7`

---

## 1. Konklusion / anbefaling

**Anbefaling: NO-GO til build lige nu.**

Samlet prognose for at alle kendte fejl rettes i næste build er **91 %**. Vores mål er ≥ 95 % før build. De automatiserede checks er grønne, men vi mangler stadig:

- Race/enhedstest af TC-005 (dynamisk liste duplikater), TC-007 (flueben sync) og TC-GEO-003 (geofence notifikationsflood).
- PO-afklaring af TC-008 stemme-splitting uden punktum.
- Uafhængig code review af sync/checkpoint/geofence logik.

**Hvis PO alligevel vælger GO**, skal det være eksplicit med accept af risiko for at TC-008, TC-005/TC-007 race eller GEO-002 kan fejle under visse forhold.

---

## 2. Status på kendte fejl

| TC / Område | Resultat i build `92247ec7` (2026-08-11/12) | Er rettet i kode? | Prognose | Status |
|---|---|---|---|---|
| TC-001 Projekt-sletning | 🔴 `UNAUTHENTICATED` | ✅ Ja — IAM `allUsers` + `Cloud Functions Invoker`; PO bekræfter det virker | **100 %** | Fixed |
| TC-005 Dynamisk liste duplikater | 🔴 5-8 kopier | ✅ Deterministiske IDs + serialisering | 90 % | Afventer race-test |
| TC-006 Slet liste / permission | 🔴 `permission-denied` | ✅ OwnerId fallback + delete-ikon guard + error-surfacing | 92 % | Afventer ejer/shared test |
| TC-007 Flueben sync / checkpoints | 🔴 8 ens checkpoints | ✅ Deterministiske checkpoint IDs + `setDoc({ merge: true })` | 90 % | Afventer race-test |
| TC-008 Stemmekommando uden punktum / æøå | 🔴 "Indkoeb" / 1 linje | 🟡 Delvist — æøå bevares i titel; splitting på " og " kan give uventede titler; æøå normaliseres efter foto-kommando | 85 % | Kræver PO-afklaring |
| TC-009 Personlige lister / search "og/and" | 🟡 | ✅ Search parser "og/and" filter | 95 % | Afventer fane-switch test |
| GEO-001 serverTimestamp sanitering | 🟡 | ✅ Sanitering implementeret | 90 % | Afventer geo-test |
| GEO-002 Smarte stedforslag | 🔴 Kun standardforslag | ✅ Compound keyword matching | 88 % | Afventer test med niche-termer |
| GEO-003 Geofence notifikations-dedup | 🔴 100+ notifikationer | ✅ Deep-link param clearing + dedup | 93 % | Afventer deep-link flood-test |

**Vægtet samlet prognose: 91 %**

---

## 3. Gennemførte aktiviteter (2026-08-13)

For at forbedre prognosen er følgende iværksat og dokumenteret i `.claude/team/status/US004-BUILD-NEXT-IMPROVEMENT-PLAN-2026-08-13.md`:

### Automatiserede checks — alle grønne

| Check | Resultat |
|---|---|
| TypeScript app (`npm run typecheck`) | ✅ |
| Expo lint (`npm run lint`) | ✅ |
| Voice parser regression + TC008 æøå (`verify-voice-parser.ts`) | ✅ 26/26 passed |
| Search parser "og/and" (`test-search-parser.ts`) | ✅ All passed |
| Firestore security rules emulator | ✅ **122/122 passed** |
| Cloud Functions integration (`deleteProject.test.js`) | ✅ **8/8 passed** |

### Manuelle testaktiviteter planlagt

- Race-test: oprette 10 items hurtigt og tjekke dynamisk liste (TC-005).
- Toggle afkrydsning under checkpoint-initialisering (TC-007).
- Deep-link flood test for geofence notifikationer (TC-GEO-003).
- Slet personlig/delt liste med forskellige ejerforhold (TC-006).
- Afklaring af TC-008 stemme-splitting med PO.
- Test af smarte stedforslag med "IT-udstyr", "maling", "VVS" (GEO-002).
- Projekt-sletning med items, fotos og checklister (TC-001 cascade).

### Review aktiviteter planlagt

- Code review af `services/checklists.ts` sync-logik (TC-005).
- Code review af `services/checkpoints.ts` idempotens (TC-007).
- Review af `services/geofence.ts` + `app/checklist.tsx` geofence effect (TC-GEO-003).

---

## 4. Åbne risici før build

| Risiko | Påvirker | Håndtering | Kræver PO-beslutning? |
|---|---|---|---|
| TC-008 splitting uafklaret | 15 % af TC-008 | PO skal afklare ønsket opførsel | **Ja** |
| Race-test ikke kørt | TC-005, TC-007 | QA/PO kører test | Nej, men kræver tid |
| Fysisk enhedstest mangler | Alle | PO tester på iPhone/iPad | **Ja** |
| Emulator timing i functions tests | TC-001 stabilitet | Første kørsel fejlede pga. timeout; anden passed | Nej |
| GEO-002 compound keywords på dansk | 12 % af GEO-002 | Test med PO's eksempler | **Ja** |

---

## 5. Hvad der sker ved GO vs. NO-GO

### Hvis PO siger NO-GO (anbefalet)

1. QA Agent / PO gennemfører manuelle race/enhedstest B1–B7.
2. Review-agent gennemfører C1–C3.
3. TC-008 afklares med PO.
4. Prognose genberegnes; mål: ≥ 95 %.
5. Ny PO-godkendelsespakke præsenteres.
6. Først derefter EAS build.

### Hvis PO siger GO alligevel

1. EAS build startes (iOS preview først, derefter Android hvis PO ønsker).
2. Build testes på fysisk enhed.
3. Hvis TC-005/TC-007/TC-008/GEO-002/GEO-003 fejler, dokumenteres det og ny rettelsesrunde startes.
4. Accept af, at 9 % risiko for fejl kan materialisere.

---

## 6. Handlinger PO skal tage stilling til

| # | Spørgsmål / beslutning | PO svar |
|---|---|---|
| 1 | **Godkender du NO-GO indtil prognose ≥ 95 %?** | ☐ Ja ☐ Nej |
| 2 | Hvis Nej: accepterer du 9 % risiko for fejl i TC-005/007/008/GEO-002/003? | ☐ Ja ☐ Nej |
| 3 | TC-008: Skal "Husk mælk og brød" give titel="Husk mælk og brød" + content="", eller titel="Husk mælk" + content="brød"? | ___________________ |
| 4 | TC-008: Skal æøå bevares efter foto-kommandoer (f.eks. "Åbn kamera ved øen" → "ved øen" ikke "ved oeen")? | ☐ Ja ☐ Nej |
| 5 | Vil du køre race/enhedstest B1–B7 selv, eller skal QA Agent gøre det? | ☐ PO ☐ QA Agent |
| 6 | Hvilke danske sted-/varenicher skal GEO-002 forslag testes med? | ___________________ |

---

## 7. Referencer

- `.claude/team/status/US004-BUILD-NEXT-IMPROVEMENT-PLAN-2026-08-13.md` — detaljeret plan.
- `.claude/team/status/working-state-us004.md` — opdateret prognose og testresultater.
- `.claude/team/test/qa-testplan-us004-items-subcollection.md` — testplan med PO-resultater.
- `.claude/team/test/testplan-comprehensive-round.md` — testplan med PO-resultater.
- `.claude/team/test/e2e-runbook-us004-items-subcollection.md` — E2E runbook.

---

*Dokumentet er klar til PO-godkendelse / præsentation. Sidste ændring: 2026-08-13.*
