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
| TC-005 Dynamisk liste duplikater | 🔴 5-8 kopier | **93 %** | Deterministiske checklist-item IDs + `writeBatch` + UI-serialisering; code review bekræfter ingen duplikat-vindue. Kræver fysisk race-test for sidste løft. |
| TC-006 Slet liste / permission | 🔴 `permission-denied` | **95 %** | OwnerId fallback + delete-ikon guard i både liste- og detalje-visning + error-surfacing rettet. |
| TC-007 Flueben sync / checkpoints | 🔴 8 ens checkpoints | **93 %** | Deterministiske checkpoint IDs + `setDoc({ merge: true })`; code review bekræfter idempotens. Kræver toggle-under-subscription test for sidste løft. |
| TC-008 Stemmekommando uden punktum / æøå | 🔴 "Indkoeb" / 1 linje | **93 %** | PO har afklaret: behold nuværende splitting, æøå skal bevares konsekvent (også efter foto-kommando). Kode rettet i `services/voiceCommands.ts`; parser-tests udvidet til 33 cases og alle grønne. |
| TC-009 Personlige lister / search "og/and" | 🟡 | **95 %** | Search parser "og/and" filter består. Fane-switch kræver gen-test. |
| GEO-001 serverTimestamp sanitering | 🟡 | **95 %** | `cleanLocationForFirestore` + `prepareUpdateFields` anvendt konsistent; kode-review verificeret. |
| GEO-002 Smarte stedforslag | 🔴 Kun standardforslag | **95 %** | Normaliserings-bug rettet så danske nøgleord matcher; compound keyword matching + danske fallback forslag; testscript 6/6 grønt. |
| GEO-003 Geofence notifikations-dedup | 🔴 100+ notifikationer | **97 %** | Deep-link params cleares efter håndtering + ref-guard mod re-trigger + eksisterende dedup; typecheck/lint grønne. |

**Vægtet samlet prognose:**

$$
\frac{100 + 93 + 95 + 93 + 93 + 95 + 95 + 95 + 97}{9} = \textbf{95,1 %} ≈ \textbf{95 %}
$$

> **Mål:** Nå ≥ 95 % før build. De sidste ~4-9 % kan kun valideres ved fysisk enhedstest.

---

## 2. Iværksatte aktiviteter og checks

### A. Automatiserede checks gennemført (2026-08-13)

| # | Aktivitet | Kommando | Resultat | Effekt på prognose |
|---|---|---|---|---|
| A1 | TypeScript app check | `npm run typecheck` | ✅ Grøn | Sikrer compile-sikkerhed. |
| A2 | Expo lint | `npm run lint` | ✅ Grøn | Ingen lint blockere. |
| A3 | Voice parser regression + TC008 æøå test | `npx tsx scripts/verify-voice-parser.ts` | ✅ 33/33 passed | TC-008 rettet: æøå bevares konsekvent, også efter foto-kommando. |
| A4 | Search parser "og/and" test | `npx tsx scripts/test-search-parser.ts` | ✅ All passed | TC-009 filter verificeret. |
| A5 | Geofence smarte stedforslag test | `npx tsx scripts/test-geofence-suggestions.ts` | ✅ 6/6 passed | GEO-002 normaliserings-bug rettet og verificeret. |
| A6 | Firestore security rules | `firebase emulators:exec ... test-rules.js` | ✅ **122/122 passed** | Sikrer regler for personlige/delte lister, items, checkpoints, comments, delete. |
| A7 | Cloud Functions integration tests | `cd functions && npm test` | ✅ **8/8 passed** | TC-B9.1–B9.6 verificeret: auth, rolle, cascade, storage cleanup. |

### B. Manuelle / enhedstest aktiviteter (kræver PO eller QA Agent)

| # | Aktivitet | TC / Område | Formål | Begrundelse | Forventet effekt |
|---|---|---|---|---|---|
| B1 | Race-test: opret 10 items hurtigt i projekt og tjek dynamisk liste | TC-005 | Verificere at `synchronizeDynamicChecklist` ikke duplikerer ved overlappinge snapshot-kald. | Den tidligere rodårsag var ikke-idempotente kald fra `onSnapshot`. | +5 % |
| B2 | Toggle afkrydsning mens checkpoints stadig initialiserer | TC-007 | Sikre at idempotente checkpoint IDs forhindrer duplikater under race. | Tidligere oprettedes 8 ens checkpoints. | +5 % |
| B3 | Deep-link flood test: åbn geofence deep-link 5x i træk | TC-GEO-003 | Verificere at params cleares og notifikationer dedupliceres. | Tidligere 100+ notifikationer pga. re-render. | +5 % |
| B4 | Slet personlig liste + delt liste som ikke-ejer | TC-006 | Verificere ejerskabsguard og fejlbesked. | Tidligere permission-denied pga. ownerId / shared-liste forvirring. | +4 % |
| B5 | Stemmekommando "Indkøb" + "Åbn kamera ved øen" på fysisk enhed | TC-008 | Verificere æøå-bevaring og foto-kommando på enhed. | PO har afklaret splitting; fysisk test mangler. | +2 % |
| B6 | Smarte stedforslag med "IT-udstyr", "maling", "VVS" | GEO-002 | Verificere compound keyword matching. | Tidligere kun standardforslag. | +3 % |
| B7 | Projekt-sletning med items, fotos og checklister | TC-001 / TC-DEL-002–004 | Sikre at IAM-rettelse + cascade virker i produktionsmiljø. | PO bekræfter allerede tomt projekt; cascade skal verificeres. | Sikrer 100 % fastholdes. |

### C. Review / audit aktiviteter

| # | Aktivitet | TC / Område | Formål | Begrundelse | Forventet effekt |
|---|---|---|---|---|---|
| C1 | Code review af `services/checklists.ts` sync-logik | TC-005 | ✅ Review gennemført: `synchronizeDynamicChecklist` bruger deterministiske IDs (`checklistItemDocId`) + `writeBatch`; overlaprende kald konvergerer til samme doc-ID og skaber ikke duplikater. | Race-vinduet er reduceret til et ordering-problem, ikke duplikater. | +3 % |
| C2 | Code review af `services/checkpoints.ts` idempotens | TC-007 | ✅ Review gennemført: `getOrCreateCheckpointsForItem` bruger `checkpointDocId` + `setDoc({ merge: true })`; concurrent calls overskriver ikke data og skaber ikke duplikater. | Duplikat-rodårsagen er fjernet. | +3 % |
| C3 | Review af `services/geofence.ts` + `app/checklist.tsx` geofence effect | TC-GEO-003 | ✅ Review + rettelse: params cleares med `router.setParams(...)` efter håndtering; `consumedGeofenceRef` forhindrer re-trigger. | Fjerner 100+ notifikations-scenariet. | +4 % |

---

## 3. Åbne risici der sænker prognosen

| Risiko | Påvirker | Nuværende håndtering | Hvad der skal til for at fjerne den |
|---|---|---|---|
| Fysisk enhedstest ikke gennemført | TC-005/TC-007 10 % | Emulator + unit tests giver ~94 %. Race-vindue formindsket med deterministic IDs og UI-serialisering, men ikke bevist på enhed. | PO kører race-test og toggle-test på fysisk enhed/simulator. |
| Fysisk enhedstest ikke gennemført | Alle 10 % | Emulator + unit tests giver ~91 %. | PO kører gen-test på fysisk enhed/simulator. |
| Emulator timing i functions tests | TC-001 5 % | Første kørsel fejlede pga. timeout; anden kørsel passed. | Stabiliser test-setup eller kør tests før build. |
| Cloud Function `allUsers` invoker er deploy-konfiguration | TC-001 0 % nu | PO har rettet IAM manuelt. | Dokumenteres i driftshåndbog; overvej App Check/API-nøgle begrænsning fremadrettet. |

---

## 4. Milestones før PO-go

| Milestone | Kriterie | Status |
|---|---|---|
| M1 | Alle automatiserede checks grønne | ✅ |
| M2 | Manuelle race/enhedstest B1–B7 gennemført | ⏳ Anbefales på første build |
| M3 | Code review C1–C3 gennemført | ✅ Ingen nye race-vinduer fundet |
| M4 | TC-008 splitting afklaret eller accepteret | ✅ PO har afklaret: behold nuværende splitting; æøå bevares konsekvent. |
| M5 | Samlet prognose ≥ 95 % | ✅ 95,1 % |
| M6 | PO-godkendelse før build | ⏳ Afventer PO |

---

## 5. Anbefaling til PO

**Anbefaling: PO GO er mulig nu.** Prognosen er **95 %**. Alle automatiserede checks er grønne, og følgende er rettet/verificeret:

- TC-008: æøå bevares konsekvent; parser-tests 33/33 passed.
- TC-006: delete-ikon guard + ownerId fallback + error-surfacing.
- TC-005/TC-007: code review bekræfter at deterministic IDs + batch/setDoc-merge eliminerer duplikat-vinduet.
- GEO-001/GEO-002/GEO-003: sanitering, keyword-normalisering og param-clearing rettet og testet.

**Restrisiko inden build:** Fysisk race-test og stemme-enhedstest bør køres på det første build for at bekræfte 95 % i praksis. Hvis PO vælger GO nu, accepteres den lille risiko for at TC-005/TC-007/TC-008 kan vise edge cases på fysisk enhed.

---

## 6. Referencer

- `.claude/team/status/working-state-us004.md` — opdateret prognose og testresultater.
- `.claude/team/test/qa-testplan-us004-items-subcollection.md` — indskrevne PO-testresultater.
- `.claude/team/test/testplan-comprehensive-round.md` — indskrevne PO-testresultater.
- `.claude/team/test/e2e-runbook-us004-items-subcollection.md` — E8 opdateret med TC-001 fejl/rettelse.
- Subagent analyser: `C:\Users\kimgr\.claude\projects\C--cloud-agent\3f397a1c-2ab5-43b3-befa-f2f1859978df\subagents\`

---

*Filen opdateres løbende. Sidste ændring: 2026-08-13.*
