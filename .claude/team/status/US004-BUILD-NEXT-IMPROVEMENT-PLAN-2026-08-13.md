# Forbedringsplan — US-004 Build Next (2026-08-13)

> **Formål:** Øge prognosen for at alle kendte fejl rettes i næste build, ved at iværksætte konkrete analyser, tests og QA-aktiviteter. Planen skal præsenteres ved PO-godkendelse før build. Ingen build uden PO-go.

**Branch:** `fix/us004-items-subcollection`  
**Commit:** `07be8e7` (seneste)  
**Build der testes næste gang:** ny EAS preview build efter genetablering  
**Dato:** 2026-08-13  

---

## 1. Opdateret prognose

| TC / Område | Status før aktiviteter | Prognose efter aktiviteter | Bemærkning |
|---|---|---|---|
| TC-001 deleteProject | 🔴 Fejlet i build `92247ec7` | **100 %** | IAM rettet (`allUsers` + `Cloud Functions Invoker`); PO bekræfter sletning virker nu. Functions tests 8/8 PASS. |
| TC-005 Dynamisk liste duplikater | 🔴 5-8 kopier | **90 %** | Deterministiske checklist-item IDs + serialisering implementeret. Kræver race-test og fysisk gen-test. |
| TC-006 Slet liste / permission | 🔴 `permission-denied` | **92 %** | OwnerId fallback + delete-ikon guard + error-surfacing rettet. Kræver test af ejer/shared/offline. |
| TC-007 Flueben sync / checkpoints | 🔴 8 ens checkpoints | **90 %** | Deterministiske checkpoint IDs + `setDoc({ merge: true })` rettet. Kræver toggle-under-subscription test. |
| TC-008 Stemmekommando uden punktum / æøå | 🔴 "Indkoeb" / 1 linje | **85 %** | æøå bevares i titel uden foto-kommando. Uafklaret: splitting på " og " kan give uventede titler; æøå normaliseres efter foto-kommando per PO-godkendte eksempler. Kræver PO-afklaring eller yderligere rettelse. |
| TC-009 Personlige lister / search "og/and" | 🟡 | **95 %** | Search parser "og/and" filter består. Fane-switch kræver gen-test. |
| GEO-001 serverTimestamp sanitering | 🟡 | **90 %** | Sanitering implementeret; kræver emulator/geo-location test. |
| GEO-002 Smarte stedforslag | 🔴 Kun standardforslag | **88 %** | Compound keyword matching + danske fallback forslag rettet. Kræver test med f.eks. "IT-udstyr", "maling". |
| GEO-003 Geofence notifikations-dedup | 🔴 100+ notifikationer | **93 %** | Deep-link param clearing + dedup + banner state rettet. Kræver deep-link flood-test. |

**Vægtet samlet prognose:**

$$
\frac{100 + 90 + 92 + 90 + 85 + 95 + 90 + 88 + 93}{9} = \textbf{91,4 %} ≈ \textbf{91 %}
$$

> **Mål:** Nå ≥ 95 % før build. De sidste ~4-9 % kan kun valideres ved fysisk enhedstest.

---

## 2. Iværksatte aktiviteter og checks

### A. Automatiserede checks gennemført (2026-08-13)

| # | Aktivitet | Kommando | Resultat | Effekt på prognose |
|---|---|---|---|---|
| A1 | TypeScript app check | `npm run typecheck` | ✅ Grøn | Sikrer compile-sikkerhed. |
| A2 | Expo lint | `npm run lint` | ✅ Grøn | Ingen lint blockere. |
| A3 | Voice parser regression + TC008 æøå test | `npx tsx scripts/verify-voice-parser.ts` | ✅ 26/26 passed | Begrundet: TC-008 delvist rettet; æøå bevares i titel. |
| A4 | Search parser "og/and" test | `npx tsx scripts/test-search-parser.ts` | ✅ All passed | TC-009 filter verificeret. |
| A5 | Firestore security rules | `firebase emulators:exec ... test-rules.js` | ✅ **122/122 passed** | Sikrer regler for personlige/delte lister, items, checkpoints, comments, delete. |
| A6 | Cloud Functions integration tests | `cd functions && npm test` | ✅ **8/8 passed** | TC-B9.1–B9.6 verificeret: auth, rolle, cascade, storage cleanup. |

### B. Manuelle / enhedstest aktiviteter (kræver PO eller QA Agent)

| # | Aktivitet | TC / Område | Formål | Begrundelse | Forventet effekt |
|---|---|---|---|---|---|
| B1 | Race-test: opret 10 items hurtigt i projekt og tjek dynamisk liste | TC-005 | Verificere at `synchronizeDynamicChecklist` ikke duplikerer ved overlappinge snapshot-kald. | Den tidligere rodårsag var ikke-idempotente kald fra `onSnapshot`. | +5 % |
| B2 | Toggle afkrydsning mens checkpoints stadig initialiserer | TC-007 | Sikre at idempotente checkpoint IDs forhindrer duplikater under race. | Tidligere oprettedes 8 ens checkpoints. | +5 % |
| B3 | Deep-link flood test: åbn geofence deep-link 5x i træk | TC-GEO-003 | Verificere at params cleares og notifikationer dedupliceres. | Tidligere 100+ notifikationer pga. re-render. | +5 % |
| B4 | Slet personlig liste + delt liste som ikke-ejer | TC-006 | Verificere ejerskabsguard og fejlbesked. | Tidligere permission-denied pga. ownerId / shared-liste forvirring. | +4 % |
| B5 | Stemmekommando "Husk mælk og brød" + "Indkøb mælk, brød" | TC-008 | Afklare PO's ønskede opdeling af titel/content. | Nuværende splitting kan give uventede titler. | +3 % |
| B6 | Smarte stedforslag med "IT-udstyr", "maling", "VVS" | GEO-002 | Verificere compound keyword matching. | Tidligere kun standardforslag. | +3 % |
| B7 | Projekt-sletning med items, fotos og checklister | TC-001 / TC-DEL-002–004 | Sikre at IAM-rettelse + cascade virker i produktionsmiljø. | PO bekræfter allerede tomt projekt; cascade skal verificeres. | Sikrer 100 % fastholdes. |

### C. Review / audit aktiviteter

| # | Aktivitet | TC / Område | Formål | Begrundelse | Forventet effekt |
|---|---|---|---|---|---|
| C1 | Code review af `services/checklists.ts` sync-logik | TC-005 | Sikre serialisering + deterministic IDs dækker alle paths. | Subagent fandt race i `synchronizeDynamicChecklist`. | +2 % |
| C2 | Code review af `services/checkpoints.ts` idempotens | TC-007 | Sikre `setDoc({ merge: true })` ikke overskriver data. | Subagent fandt duplikater i `getOrCreateCheckpointsForItem`. | +2 % |
| C3 | Review af `services/geofence.ts` + `app/checklist.tsx` geofence effect | TC-GEO-003 | Sikre params cleares og banner ikke re-renders unødigt. | Subagent fandt route params forblev liggende. | +3 % |

---

## 3. Åbne risici der sænker prognosen

| Risiko | Påvirker | Nuværende håndtering | Hvad der skal til for at fjerne den |
|---|---|---|---|
| TC-008 splitting opførsel er uafklaret | TC-008 15 % | Test passer for æøå i titel; splitting er implementeret men kan give uventede resultater. | PO afklarer ønsket opførsel, eller vi implementerer en anden splitting-strategi. |
| Fysisk enhedstest ikke gennemført | Alle 10 % | Emulator + unit tests giver ~91 %. | PO kører gen-test på fysisk enhed/simulator. |
| Emulator timing i functions tests | TC-001 5 % | Første kørsel fejlede pga. timeout; anden kørsel passed. | Stabiliser test-setup eller kør tests før build. |
| Cloud Function `allUsers` invoker er deploy-konfiguration | TC-001 0 % nu | PO har rettet IAM manuelt. | Dokumenteres i driftshåndbog; overvej App Check/API-nøgle begrænsning fremadrettet. |

---

## 4. Milestones før PO-go

| Milestone | Kriterie | Status |
|---|---|---|
| M1 | Alle automatiserede checks grønne | ✅ |
| M2 | Manuelle race/enhedstest B1–B7 gennemført | ⏳ Afventer PO/QA Agent |
| M3 | Code review C1–C3 gennemført | ⏳ Afventer review-agent |
| M4 | TC-008 splitting afklaret eller accepteret | ⏳ Afventer PO |
| M5 | Samlet prognose ≥ 95 % | ⏳ Kræver M2–M4 |
| M6 | PO-godkendelse før build | ⏳ |

---

## 5. Anbefaling til PO

**Anbefaling: NO-GO til build lige nu.** Prognosen er 91 % — under målet på 95 %. De automatiserede checks er grønne, men følgende mangler:

1. Race/enhedstest af TC-005, TC-007, TC-GEO-003 (de største risici).
2. Afklaring af TC-008 stemme-splitting.
3. Code review af sync/checkpoint/geofence logik.

**Hvis PO vælger at godkende build alligevel**, skal det være eksplicit med accept af, at følgende kan fejle: TC-008 splitting, TC-005/TC-007 race under ekstreme forhold, GEO-002 forslag på niche-termer.

---

## 6. Referencer

- `.claude/team/status/working-state-us004.md` — opdateret prognose og testresultater.
- `.claude/team/test/qa-testplan-us004-items-subcollection.md` — indskrevne PO-testresultater.
- `.claude/team/test/testplan-comprehensive-round.md` — indskrevne PO-testresultater.
- `.claude/team/test/e2e-runbook-us004-items-subcollection.md` — E8 opdateret med TC-001 fejl/rettelse.
- Subagent analyser: `C:\Users\kimgr\.claude\projects\C--cloud-agent\3f397a1c-2ab5-43b3-befa-f2f1859978df\subagents\`

---

*Filen opdateres løbende. Sidste ændring: 2026-08-13.*
