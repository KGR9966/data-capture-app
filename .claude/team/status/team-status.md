# Team status: US-004 Solution B + A — items/checkpoints/comments + checklists migration

**Dato:** 2026-08-02  
**Planlagt af:** Master Agent  
**Seneste opdatering:** Solution B kode committed; Solution A (user-scoped personal checklists) aktiveret pga. Security Agent NO-GO på top-level `list`-regel.  
**Forudsætning:** PO har bekræftet go til Solution B + Solution A + wipe af testdata + max 2 builds.  
**Genetablering ved context-loss:** Læs `decisions-us004-solution-b-a.md` og `working-state-us004.md`.

---

## Task #87 — Developer Agent: Søgning og lister (reduceret scope)

**Startet:** 2026-07-15  
**Forventet afslutning:** 2026-07-17 (maksimalt 3 dage)  
**Mandat:** PO-godkendt reduceret scope; tekniske beslutninger inden for scope træffes af Developer Agent. Stop-kriterier rapporteres til Master Agent.

### Dag 1 status (2026-07-15)
- [x] Læst design, testplan, compliance og eksisterende kode.
- [x] Rewrite search-parser (`services/search.ts`): bevarer `&`, `/`, `-`, tal, æøå; substring-match; `hasEnoughSearchLetters` ≥2 bogstaver.
- [x] Opret `components/HighlightedText.tsx`.
- [x] Checkpoint-model (`services/checkpoints.ts`) og `toggleChecklistPoint` adskiller listepunkt-status fra item-status.
- [x] Listeoprettelse fra søgning (`app/(tabs)/search.tsx`) med projektvalg, rollecheck og specifikke fejl.
- [x] UI-fixes: KeyboardAvoidingView i checklist-modal (`app/checklist.tsx`) og fast header i `app/item.tsx`.
- [x] Project-scoped visning af lister (`app/(tabs)/checklists.tsx` + `subscribeToProjectChecklists`).
- [x] Firestore-regler opdateret til project-scoped adgang for checklists og checkpoints.
- [x] Wipe-script (`scripts/wipe-checklists.js`) oprettet til at rydde gamle lister.
- [x] TypeScript og Expo lint fejlfri.

### Næste skridt
- [ ] Commit og daglig rapport til Master Agent.
- [ ] Dag 3 regressionstest på simulator/fysisk enhed.
- [ ] Markér Task #87 som færdig ved GO.

### Med i denne runde
1. **S2:** Search-parser skal håndtere `&` og andre specialtegn.
2. **S8:** Minimum 2 bogstaver før søgning.
3. **W1:** Highlight af matchende ord i søgeresultater og lister.
4. **S1:** Listeoprettelse fra søgning skal virke (projektvalg, rollecheck, specifikke fejl).
5. **S3/S4/S7:** Adskillelse af listepunkt-status og item-status via ny checkpoint-model.
6. **S5:** Tastatur må ikke dække felter i liste.
7. **S6:** Kommentar-layout i item.tsx så "Tilbage" altid er synlig.
8. **Firestore-regler:** Project-scoped adgang; alle projektmedlemmer må se lister.

### Ude af scope (udskydes)
- Migrering af gamle lister — **wipes** i stedet.
- Smart-søgeoperatorer (`*ord*`, `"frase"`, `-ord`, `OR`, filtre).

### Risici / stop-kriterier
- Hvis arbejdet vurderes til >3 dage → rapporter straks til Master Agent.
- Hvis S1 kræver større arkitekturændring end designet → stop og rapporter.
- Hvis Firestore-regelændringer påvirker andre dele af appen → stop og rapporter.

### Blokeringer
Ingen.

---

## 0. Kendte beslutninger

| # | Beslutning | Godkendt af |
|---|---|---|
| 1 | Build 2 frigives IKKE. Total NO-GO. | PO |
| 2 | US-004 redesignes med overskrift-punktum-model. | PO |
| 3 | US-005 dynamisk liste-oprettelse rettes før ny test. | PO |
| 4 | UX/UI Agent inddrages officielt i teamet. | PO |
| 5 | AI-kategori droppes; kategori = type-label. | PO |
| 6 | Punktum fjernes fra titler. | PO |
| 7 | Auto-gem lukker modal + toast + haptisk feedback. | PO |
| 8 | Stemme-låst type kan ikke overskrives af foto. | PO |
| 9 | Dynamisk liste kræver eksplicit projektvalg ved flere projekter. | PO |
| 10 | PO skal fremover kun godkende brugerflow, forretningsregler, release GO/NO-GO og scope. Interne status/docs opdateres automatisk. | PO |

## 0a. US-004 redesign — udviklingsbuilds

| Platform | Build-ID | Installationslink |
|---|---|---|
| iOS | `717e8a54-bae4-4b88-b700-bffb406dfd4a` | [Åbn iOS build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/717e8a54-bae4-4b88-b700-bffb406dfd4a) |
| Android | `8dbd20f7-1ec2-48cf-abd6-2842a8276779` | [Åbn Android build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/8dbd20f7-1ec2-48cf-abd6-2842a8276779) |

**Audit-gate:** GO med forbehold (se planfil og backlog).  
**Næste skridt:** PO-acceptance på fysisk enhed.  
**Forbehold at teste:** E7/E8 parser-output, duplikerede tegnsætningskommandoer, manglende gemt-lyd, sammensatte ord som type-nøgleord.
| 10 | PO skal fremover kun godkende brugerflow, forretningsregler, release GO/NO-GO og scope. Interne status/docs opdateres automatisk. | PO |

---

## 1. Baggrund og overblik

Efter B+C rc2-testen blev tre områder identificeret og efterfølgende beriget til godkendte user stories:

| ID | User story | Type | Kritikalitet | Primær agent i kodefasen |
|---|---|---|---|---|
| US-006 | Ret "Kunne ikke oprette projektet"-fejl og forhindr dubletter | Kritisk bugfix + forretningsregel | Høj | Developer Agent |
| US-004 | Ensartet og robust optagelse/oprettelse af sager | Core UX redesign | Høj | Developer Agent |
| US-005 | Dynamiske lister og søgeportal | Ny feature + søge-redesign | Høj | Developer Agent |

Da ændringerne berører kerne-flows (oprettelse, optagelse, søgning, deling), Firestore-regler og navigation, skal alle faser gennemløbes med sub-agenter, review og gates efter `collaboration-structure.md`.

### Foreslået overordnet rækkefølge

1. **US-006 først** — kritisk bug, isoleret, giver hurtig værdi og reducerer risiko for yderligere dubletter i produktion.
2. **US-004 derefter** — core create-experience; uafhængig af US-005, men stabiliserer input-kanalen før søgning/liste-logikken testes bredt.
3. **US-005 sidst** — størst og mest kompleks; kræver at søgearkitektur og data-model er fastlagt i designfasen.

Alternativt kan US-004 og US-005 bygges i samme release, hvis PO ønsker færre builds og accepterer den samlede testoverflade. US-006 bør have mulighed for at frigives isoleret.

---

## 2. Faseoversigt

| Fase | Task-ID | Navn | Primær agent | Output | PO-go kræves |
|---|---|---|---|---|---|
| 4 | TASK-B-C-REDO-013 | Design & compliance | Solution Design Agent + Compliance/Security Agent + Creative/AI Challenger Agent | Design-dokumenter, risikovurdering, compliance-godkendelse | **Ja** — design-godkendelse |
| 5 | TASK-B-C-REDO-014 | Testplan | Test Manager Agent | Struktureret testplan med cases, forventede/faktiske resultater | Nej (PO kan reviewe) |
| 6a | TASK-B-C-REDO-015 | Kode — US-006 projektoprettelse | Developer Agent | Kodeændringer, commits, selvtest | Nej |
| 6b | TASK-B-C-REDO-016 | Kode — US-004 voice/create item | Developer Agent | Kodeændringer, commits, selvtest | Nej |
| 6c | TASK-B-C-REDO-017 | Kode — US-005 dynamiske lister | Developer Agent | Kodeændringer, commits, selvtest | Nej |
| 7 | TASK-B-C-REDO-018 | QA-verifikation | QA Agent | QA-rapport med trafiklys | Nej |
| 8 | TASK-B-C-REDO-019 | Audit-gate | Audit Agent | Governance-check med go/no-go | Nej (anbefaling) |
| 9 | TASK-B-C-REDO-020 | Build & release-forberedelse | Release Engineer / Deploy Agent + Master Agent | Build-ID, QR, installationslink | **Ja** — PO-go til build |
| 10 | TASK-B-C-REDO-021 | PO acceptance test | PO + Test Manager Agent + Master Agent | Testresultater, bugliste, go/no-go | **Ja** — endelig godkendelse |

---

## 3. Detaljeret fasebeskrivelse

### Fase 4 — Design & compliance (TASK-B-C-REDO-013)
**Aktører:** Solution Design Agent (leder), Compliance/Security Agent, Creative/AI Challenger Agent.  
**Input:** Godkendte US-004, US-005 og US-006; nuværende kodebase; `collaboration-structure.md`; `SOP-PO-approvals.md`.  
**Output:**
- `.claude/team/design/design-006-project-creation.md`
- `.claude/team/design/design-004-voice-create.md`
- `.claude/team/design/design-005-dynamic-lists.md`
- `.claude/team/compliance/compliance-b-c-redo-v2.md`
- `.claude/team/design/risk-assessment-b-c-redo-v2.md`

**Afhængigheder:** Ingen — starter efter PO-godkendelse af denne opgaveplan.  
**Review-punkter:**
- US-006: præcis årsag til falsk fejlmeddelelse; unikhedsscope for projektnavne; håndtering af eksisterende dubletter; idempotens ved gentagne klik.
- US-004: fælles `CreateItemForm`-komponent; auto-gem/stilhedstimer; stemmekommandoer; Type/Kategori-interaktion.
- US-005: søgearkitektur (lokal/server-side/hybrid); parser for smart syntaks; data-model for lister og punkter; dynamisk opdatering; deling og dybe links; Firestore-regler.

**Go/no-go gate:**
- Design dokumenteret og reviewet internt.
- Compliance Agent godkender design og sikkerhed.
- **PO-go kræves** før testplan og kode.

---

### Fase 5 — Testplan (TASK-B-C-REDO-014)
**Aktører:** Test Manager Agent.  
**Input:** Godkendte design-dokumenter fra fase 4.  
**Output:**
- Opdateret `memory/data-capture-test-baseline.md`
- Opdateret `memory/data-capture-test-baseline.xlsx`
- `.claude/team/test/testplan-b-c-redo-004-006.md` med cases, forventede resultater, felter til faktisk resultat, status og bemærkninger

**Afhængigheder:** Fase 4 skal være godkendt af PO.  
**Review-punkter:**
- Dækning af alle tre US'ers acceptkriterier (især Gherkin-kriterierne).
- Regressionstest af eksisterende funktionalitet (optagelse, board, projektoprettelse, deling).
- Edge cases: eksisterende projektdubletter, OS-timeout ved optagelse, store datasæt i søgning, offline ved lister (bevidst ude af scope, men skal testes som "ikke understøttet").

**Go/no-go gate:**
- Testplan godkendt af Master Agent.
- Ingen blokerende huller i dækning.

---

### Fase 6 — Kode

#### 6a — US-006 Projektoprettelse (TASK-B-C-REDO-015)
**Aktører:** Developer Agent.  
**Input:** Godkendt design-006, testplan afsnit for US-006.  
**Output:** Commits, kodeændringer i `services/projects.ts`, `app/(tabs)/index.tsx`, Firestore-regler, evt. `useProject()`-context.  
**Afhængigheder:** Fase 4 godkendt for US-006-delen.  
**Review-punkter:**
- Fejlsøgning af falsk fejlmeddelelse er dokumenteret i `dev-notes-b-c-redo-v2.md`.
- Duplicate-tjek er trimmet og case-insensitivt, kun for brugerens egne projekter (medmindre PO beslutter andet).
- Eksisterende dubletter håndteres efter PO-beslutning.

#### 6b — US-004 Voice/Create Item (TASK-B-C-REDO-016)
**Aktører:** Developer Agent.  
**Input:** Godkendt design-004, testplan afsnit for US-004.  
**Output:** Commits, fælles `CreateItemForm`, opdateret `VoiceCaptureModal`, opdateret `app/(tabs)/board.tsx`, opdaterede hooks/services.  
**Afhængigheder:** US-006 kodefærdig eller stabil branch (kan parallelt i isoleret branch).  
**Review-punkter:**
- Fælles felter og rækkefølge matcher design-004.
- Auto-gem stopper ikke under aktiv indtaling.
- Formularen resettes korrekt.
- Regression: OCR, deling, oversættelse, fotoalbum/kamera fungerer stadig.

#### 6c — US-005 Dynamiske lister (TASK-B-C-REDO-017)
**Aktører:** Developer Agent.  
**Input:** Godkendt design-005, testplan afsnit for US-005.  
**Output:** Commits, ny `app/(tabs)/lists.tsx`, listevisning, søgeparser, `services/checklists.ts`/`items.ts`, deling/dyb link, Firestore-regler.  
**Afhængigheder:** Design-005 godkendt; US-004 behøver ikke være færdig, men søgearkitekturen skal være låst.  
**Review-punkter:**
- Søgning standard er substring/fuzzy; smart syntaks supplement.
- "Punkt"-udledning matcher PO-beslutning.
- Dynamisk opdatering, afkrydsning, done-i-bunden, deling og dybe links implementeret.
- Firestore læseomkostninger begrænses efter design.

**Intern rækkefølge i kodefasen:**
1. **US-006** (kan starte straks efter design-godkendelse).
2. **US-004** (kan parallelt i isoleret branch; ellers efter US-006).
3. **US-005** (må først kodes, når søgedesign og data-model er låst; kan køre parallelt med US-004, hvis ressourcer tillader det).

**Go/no-go gate (samlet for fase 6):**
- Selvtest ok for hver US.
- Ingen uncommittede ændringer med uklar oprindelse.
- Code review gennemført (QA Agent eller peer).

---

### Fase 7 — QA-verifikation (TASK-B-C-REDO-018)
**Aktører:** QA Agent.  
**Input:** Kode + testplan + design.  
**Output:** `.claude/team/qa/qa-report-b-c-redo-v2.md` med trafiklys.  
**Afhængigheder:** Fase 6 afsluttet.  
**Review-punkter:**
- TypeScript / lint grøn.
- Pre-test checks grønne.
- Release gate vurderet.
- Logikgennemgang af projektoprettelse, voice-recognition, auto-gem, søgning, lister, deling.

**Go/no-go gate:**
- QA-rapport viser grønt for release.
- Ingen kritiske eller høj-prioritetsfejl uden PO-godkendt afvigelse.

---

### Fase 8 — Audit-gate (TASK-B-C-REDO-019)
**Aktører:** Audit Agent.  
**Input:** Alle deliverables fra fase 4-7 + governance-dokumenter.  
**Output:** `.claude/team/audit/governance-check-b-c-redo-v2.md` med go/no-go og eventuelle læringspunkter.  
**Afhængigheder:** Fase 7 (QA) godkendt.  
**Review-punkter:**
- Governance-regler overholdes.
- Ingen solo-arbejde uden godkendelse.
- Build er ikke startet før PO-go.
- Scope ikke udvidet uden PO-go.
- US-006's åbne spørgsmål til PO er besvaret (se afsnit 7).

**Go/no-go gate:**
- Audit Agent giver go.
- Hvis stop: redegørelse til PO og Master Agent.

---

### Fase 9 — Build & release-forberedelse (TASK-B-C-REDO-020)
**Aktører:** Release Engineer / Deploy Agent (eksekverer), Master Agent (anmoder PO-go).  
**Input:** QA-go + audit-go.  **Output:**
- Opdateret `docs/current-build.md` med build-ID, platforme, QR, link, ændringsoversigt.
- EAS-build (iOS + Android).
- Ældre builds markeret "Forældet".

**Afhængigheder:**
- Fase 7 (QA) grøn.
- Fase 8 (Audit) go.
- **PO-go til build** indhentet skriftligt.

**Go/no-go gate:**
- PO har givet udtrykkeligt go.
- Release Engineer har bekræftet, at byggeparametre er korrekte.

---

### Fase 10 — PO acceptance test (TASK-B-C-REDO-021)
**Aktører:** PO (leder), Test Manager Agent (forbereder og følger op), Master Agent (støtte).  
**Input:** Build-ID, installationslink, testplan.  
**Output:**
- Udfyldt testplan med faktiske resultater.
- `.claude/team/test/po-acceptance-b-c-redo-v2.md` med feedback, bugliste og go/no-go.

**Afhængigheder:** Fase 9 (build) færdig.  
**Review-punkter:**
- US-006: projektoprettelse uden falsk fejl, dubletter blokeret.
- US-004: robust optagelse, auto-gem, ensartede felter, stemmekommandoer.
- US-005: søgning, dynamiske lister, afkrydsning, deling, dybe links.
- Regressionstest af baseline-funktionalitet.

**Go/no-go gate:**
- PO godkender build til videre brug / produktion.
- Hvis afvisning: bugs registreres, og Master Agent planlægger rettelsesrunde.

---

## 4. Afhængigheder mellem opgaver

```text
TASK-B-C-REDO-013 (Design & compliance)
         │
         ▼
TASK-B-C-REDO-014 (Testplan)
         │
         ▼
         ┌─────────────────────────────────────────┐
         │           Fase 6 — Kode                 │
         │  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
         │  │ US-006  │ │ US-004  │ │ US-005  │    │
         │  │ projekt │ │ voice/  │ │ lister  │    │
         │  │ opret.  │ │create   │ │         │    │
         │  └────┬────┘ └────┬────┘ └────┬────┘    │
         │       │           │           │          │
         │       └───────────┴───────────┘          │
         │                   │                      │
         └───────────────────┼──────────────────────┘
                             ▼
              TASK-B-C-REDO-018 (QA)
                             │
                             ▼
              TASK-B-C-REDO-019 (Audit)
                             │
                             ▼
              TASK-B-C-REDO-020 (Build)  ← PO-go kræves
                             │
                             ▼
              TASK-B-C-REDO-021 (PO acceptance)  ← PO-go / afvisning
```

**Særlige afhængigheder:**
- US-005's kode må ikke påbegyndes før US-005's søgedesign og data-model er godkendt.
- US-004 er uafhængig af US-005, men begge bør testes sammen for at reducere build/test-overhead.
- US-006 kan isoleres og frigives hurtigere end de to andre, hvis PO ønsker det.
- Build må først starte efter audit-go og PO-go.

---

## 5. PO-go beslutningspunkter

| # | Beslutning | Hvornår | Konsekvens ved nej |
|---|---|---|---|
| 1 | Godkendelse af denne opgaveplan | Nu / før fase 4 | Plan revideres; ingen designstart |
| 2 | Besvarelse af US-006's åbne spørgsmål (se afsnit 7) | Før eller under fase 4 | Design blokeret; dubletpolitik uafklaret |
| 3 | Godkendelse af design & compliance | Efter fase 4 | Design rettes; ingen kode/testplan |
| 4 | Godkendelse af testplan (anbefalet) | Efter fase 5 | Testplan justeres før kode |
| 5 | Eventuel scope-ændring undervejs | Løbende | Ændring dokumenteres og vurderes |
| 6 | PO-go til build | Efter fase 8 | Intet build; intet test |
| 7 | Endelig godkendelse efter acceptance test | Efter fase 10 | Rettesrunde; ny build |
| 8 | Separat frigivelse af US-006 før US-004/US-005 | Efter QA af US-006 | US-006 må vente på samlet release |

---

## 6. Risici og mitigations (overordnet)

| Risiko | Sandsynlighed | Konsekvens | Mitigation |
|---|---|---|---|
| US-006's fejl skyldes efterfølgende operation (members/rettigheder/navigation), ikke selve Firestore-skrivningen | Høj | Rettes lappen ikke den reelle årsag | Fejlsøg hele flowet i designfasen; log hvert trin |
| US-004's fælles formular-komponent ødelægger OCR, oversættelse, deling eller tildeling | Mellem | Regression i godkendt funktionalitet | Hold UI-sammensætning adskilt fra servicekald; stærk regressionstest |
| `expo-speech-recognition` har hård OS-timeout, som appen ikke kan omgå | Mellem | Optagelse stopper stadig uventet | Dokumentér platformbegrænsninger; genoptag/sammenkæd optagelser |
| Søgning på store datasæt bliver langsom | Høj | Dårlig brugeroplevelse | Aftal max datasæt og arkitektur i designfasen |
| Smart-søgning bliver for kompleks | Mellem | Fejl i parser, forkerte resultater | Start med substring + få operatorer; udvid efter PO-go |
| "Punkter" i dynamiske lister parses forkert | Høj | Liste matcher ikke PO's forventning | Aftal parsingregel med PO før design |
| Eksisterende projektdubletter gør unikhedsregel inkonsistent | Mellem | Bruger undrer sig over gamle dubletter | Ryd op eller marker gamle dubletter efter PO-beslutning |
| Scope-creep mellem de tre US'er (AI, notifikationer, offline, global lister) | Mellem | Forlænget tidslinje | Hold faseplan fast; alle scope-ændringer kræver PO-go |
| Dynamiske lister skaber høj Firestore læseomkostning | Mellem | Regning eller dårlig performance | Begræns antal lister; synkronisér kun ved åbning; overvåg queries |

---

## 7. PO-beslutninger — afklaret

| # | Spørgsmål | PO-valg |
|---|---|---|
| 1 | Release-strategi | To builds: US-006 isoleret, US-004 + US-005 samlet. |
| 2 | Eksisterende dubletter | A — gamle dubletter lades være; fremtidige dubletter forhindres. |
| 3 | Scope af duplicate-tjek | Kun projekter brugeren ejer. |
| 4 | Beskedtekst | "Der findes allerede et projekt med dette navn." |
| 5 | Beskrivelsesfelt i duplicate-tjek | Kun projektnavn medtages. |
| 6 | Punkt-udledning i lister | Linjeskift og `- `/`* `-præfiks bliver separate punkter. |
| 7 | Build-strategi | To builds: US-006 isoleret, US-004 + US-005 samlet. |

Alle åbne spørgsmål er besvaret. Planen er klar til PO-godkendelse.

---

## 8. Næste skridt

- [x] Master Agent gennemgik planen med PO.
- [x] PO besvarede alle åbne spørgsmål.
- [x] PO gav go til fase 4 (Design & compliance).
- [x] Fase 4 gennemført og design godkendt af PO.
- [x] Master Agent aktiverer TASK-B-C-REDO-014 (Testplan).
- [x] Testplan færdig og reviewet.
- [x] PO besvarede 5 åbne spørgsmål fra testplan-fasen (foto/type, OS-timeout 2s, status altid ny, email-invitationer, spring rc3 over).
- [x] Fase 6 (Kode) påbegyndt. PO-go til build (fase 9) kræves før EAS-build, jf. TASK-B-C-REDO-015.
- [x] US-006 kode færdig.
- [x] QA-verifikation (TASK-B-C-REDO-018) gennemført med GO.
- [x] Audit-gate (TASK-B-C-REDO-019) gennemført med GO.
- [x] PO-go til Build 1 givet.
- [x] Build 1 færdig: Android `7490b239-74d7-4feb-af44-a25d9281e856`, iOS `6fc715f8-d442-4f23-a5ea-5742c29fbf3d`.
- [x] Firestore-regler deployet til Firebase Console.
- [x] PO acceptance test / smoke-test af Build 1.
- [x] Build 1 accepteret med bemærkninger: stemmeoptagelse kendt udfordring (rettes i US-004/Build 2), slet-projekt lagt i backlog.
- [x] PO-go givet til Build 2 (US-004 + US-005 samlet).
- [x] Kodefase US-004 færdig.
- [x] Kodefase US-005 færdig.
- [x] QA-verifikation Build 2 — rettelser efter første NO-GO, ny QA review giver **GO**.
- [x] Audit-gate Build 2 — **GO with conditions**.
- [x] PO-go til Build 2 EAS-build givet.
- [x] Build 2 EAS-build færdig:
  - Android: `ef4584ac-51ed-4ab6-b01a-250decf2eecf` — https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/ef4584ac-51ed-4ab6-b01a-250decf2eecf
  - iOS: `93baa590-75e4-4166-b560-d65d526fbbb4` — https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/93baa590-75e4-4166-b560-d65d526fbbb4
- [x] Build 2-rettelser commit'et og pushet til GitHub på branch `v2026.07.15-build2-us004-us005` (commit `3bb094c`):
  https://github.com/KGR9966/data-capture-app/tree/v2026.07.15-build2-us004-us005
- [x] PO acceptance test Build 2 → **TOTAL NO-GO** pga. US-004 voice/create oplevelse.

## 8a. Build 2 NO-GO + US-004 hotfix-runde

| # | Hændelse | Status |
|---|---|---|
| 1 | Build 2 PO-acceptance: **TOTAL NO-GO**. Post-mortem skrevet; governance opdateret med Rule 23: *agent må ikke love uden at handle*. | ✅ Afgjert |
| 2 | Stemme-parser redesignet: 11 PO-godkendte eksempler (E1–E11) + E12 (linjeskift/tegnsætning). | ✅ Done |
| 3 | Voice-kommandoer "Åbn album" / "Åbn kamera" tilføjet med synonymer, så foto kan tilføjes under optagelse. | ✅ Done |
| 4 | Type-lås i voice-mode: foto ændrer ikke længere type fra voice til photo. | ✅ Done |
| 5 | Auto-gem efter 5 sek. stilhed: vibration + toast + modal lukker. "Gem"-ord fjernes fra endelig tekst. | ✅ Done |
| 6 | Manuel foto-knap bug (freeze/race med auto-gem) rettet via `runWithRecordingPaused`. | ✅ Done |
| 7 | Titlen overskrives ikke længere efter foto; senere input appenderes som content. | ✅ Done |
| 8 | Firestore-regler rettet: `subscribeToProjectMembers` læser nu med `get()` i stedet for `getAfter()`. | ✅ Deployet |
| 9 | Parser-test `scripts/verify-voice-parser.ts` E1–E12: **alle 12 passed**. | ✅ Grøn |
| 10 | Pre-test-check `scripts/pre-test-check.js`: **OK** (én advarsel: pakkeversions-tjek). | ✅ Grøn |
| 11 | Ændringer klar til commit og ny hotfix-build. | ✅ PO-go givet |
| 12 | EAS Update holdes ude af dette hotfix; lagt i backlog som separat P1-opgave efter acceptance. | ✅ Afgjort |
| 13 | EAS hotfix-build startet: iOS + Android. | ❌ Forkert: modalen duplicated content |
| 14 | Ny rettelse: `VoiceCaptureModal` erstatter content i stedet for append. | ✅ Commit'et + pushet |
| 15 | Lokal verifikation: TypeScript, lint, pre-test-check, E1–E12 parser — alt grønt. | ✅ Grøn |
| 16 | Nye EAS builds startet efter rettelse. | ❌ Forkert: parser håndterede ikke klistrede kommandoer |
| 17 | Parser rettet: splitter klistrede kommandoer som "oliepunktum" og "husgem". | ✅ Commit'et + pushet |
| 18 | Voice foto-kommando: længere delay + fejlhåndtering ved genstart. | ✅ Commit'et + pushet |
| 19 | Lokal verifikation: TypeScript, lint, pre-test-check, E1–E13 parser — grønt. | ✅ Grøn |
| 20 | Nye EAS builds startet efter parser-rettelse. | ❌ Forældet |
| 21 | Titel opdateres nu løbende under optagelse, så delvise transkriberinger erstattes. | ✅ Commit'et + pushet |
| 22 | Board-layout rettet: projekt-navn afkortes, knapper bliver synlige på telefon. | ✅ Commit'et + pushet |
| 23 | Testcases opdateret med rettet E2, TC-011 step-by-step, layout-case. | ✅ Done |
| 24 | CLEAN-001 bulk-slet / slet flere sager lagt i backlog. | ✅ Done |
| 25 | Lokal verifikation: TypeScript, lint, parser E1–E13, pre-test-check grønt. | ✅ Grøn |
| 26 | Nye EAS builds startet efter titel- og layout-rettelser. | ❌ Forældet |
| 27 | E11 rettet: titel fryses, så ny tekst efter foto går til content. | ✅ Commit'et + pushet |
| 28 | Lokal verifikation: TypeScript, lint, parser E1–E13, pre-test-check grønt. | ✅ Grøn |
| 29 | Nye EAS builds startet efter E11-rettelse. | ✅ Færdige |
| 30 | Firestore ryddet: 457 items + 59 projects slettet (inkl. subcollections). | ✅ Done |
| 31 | Voice-modal redesign: content erstattes i stedet for delta-appending. | ✅ Commit'et + pushet |
| 32 | Lokal simulation af delvise transkriberinger, foto-flow og komplet flow. | ✅ Grøn |
| 33 | Nye preview builds færdige (iOS + Android preview v2). | ✅ Færdige |
| 34 | PO-test på fysisk enhed: hovedrettelser godkendt. | ✅ Godkendt |
| 35 | Små restpunkter registreret til næste pulje: "Åben"-tekst, Board projektnavn, knap-størrelser, Tilføj auto-title bug. | ✅ Dokumenteret |

**Næste skridt:**
- [x] Commit + push af hotfix-ændringer.
- [x] PO-go til ny EAS hotfix-build.
- [x] EAS Update holdes ude; opgave i backlog.
- [x] Nye iOS/Android builds færdige.
- [x] PO installerer hotfix-build på fysisk enhed.
- [x] PO acceptance test af hotfix-build med `po-acceptance-us004-hotfix.md`.
- [x] PO formelt godkender hotfix-runden som GO.
- [x] PO har valgt at gå videre med søgning og lister (valg B: planlæg først).
- [x] PO-godkendelse af opgaveplan for søg/lister redesign.
- [x] Task #81 — Userstoryagent beriger user stories.
- [x] Task #82 — Flowagent designer workflow.
- [x] Task #83 — Solution Design arkitektur. **Completed**
- [x] Task #84 — Compliance/Security review. **Completed**
- [x] Task #85 — Testplan. **Completed**
- [x] Task #86 — PO-godkendelse af design + testplan. **Completed**
- [x] Task #87 — Developer Agent kode. **Completed**
- [x] Task #88 — QA-verifikation. **Completed — GO**
- [x] Task #89 — Audit-gate. **Completed — GO med forbehold**
- [x] Task #90 — Build og release: builds startet, men **stoppede** pga. konstaterede bugs i PO-test.
- [x] Task #90 — Genstart builds efter bugfixes: **iOS-build startet, Android udskudt** pga. PO kun tester på iPhone/iPad.
- [ ] Task #91 — PO acceptance test.

---

## 9. Søgning og lister — PO-feedback og næste fase

PO har aflagt test på søgning og lister. Følgende er registreret som fundament for næste fase. Ingen kode startes før PO har godkendt opgaveplan og scope.

### 9.1 Konstaterede fejl (kræver rettelse)

| # | Fejl | Kritikalitet |
|---|---|---|
| S1 | "Kunne ikke oprette den dynamiske liste" ved alle forsøg på at oprette liste fra søgning | **Høj** |
| S2 | `&` kan ikke indgå i søgning. "Jem & Fix" finder ikke match, mens "Jem Fix" virker. Listenavn bliver "Jem" når søgestrengen er "Jem & Fix" | Høj |
| S3 | Afkrydsning af ét listepunkt ændrer hele kildesagens status til Done, selvom sagen indeholder andre punkter | Høj |
| S4 | Hvis kildesagen sættes til `in_progress`, vises listepunktet stadig som gennemstreget Done i listen | Høj |
| S5 | Tastatur dækker felter ved "+ Tilføj Punkt" og redigering i liste | Mellem |
| S6 | Når man skriver kommentar i en sag, forsvinder "Tilbage" og man kan ikke komme ud. Kommentar kan ikke slettes for at låse op | Mellem |
| S7 | Når en sag sættes til Done, opdateres den dynamiske liste ikke for det pågældende punkt | Mellem |
| S8 | Minimum 2 bogstaver ved søgning ser ikke ud til at være håndhævet | Lav |

### 9.2 Ønsker / forbedringer

| # | Ønske |
|---|---|
| W1 | Vis hit/highlight for det ord, der har skabt match |

### 9.3 Fungerende

- Del, Kopiér, Slet i liste virker.

### 9.4 Åbne PO-beslutninger før design

Før teamet kan designe rettelserne, skal PO tage stilling til:

1. **Scope:** Skal vi tage alle S1–S8 + W1 i én runde, eller dele op?
2. **Afkrydsning → sag-status (S3):** Hvad skal der ske, når ét listepunkt afkrydses?
   - A) Punktets egen status ændres; kildesagen påvirkes ikke.
   - B) Kildesagens status ændres kun, hvis alle punkter fra den sag er færdige.
   - C) Andet — beskriv.
3. **Sags-status → liste (S4/S7):** Hvis kildesagens status ændres manuelt, skal listen så:
   - A) altid spejle sagsstatus (gennemstreget hvis Done, flueben hvis Done)?
   - B) adskille punkt-status og sags-status helt?
4. **Kommentar (S6):** Skal kommentar-bugen rettes i denne runde, eller lægges i separat task?
5. **Prioritet:** Hvilken af S1–S8 skal rettes først?

### 9.5 PO-beslutninger taget — søgning og lister

| # | Spørgsmål | PO-valg |
|---|---|---|
| 1 | Scope | Alle S1–S8 + W1 i én runde, med dybdegående helhedsanalyse af hele søge- og listeflowet |
| 2 | Afkrydsning → sag-status (S3) | **B** — listepunkt opdaterer kun det pågældende punkt i kildesagen; hele sagen påvirkes ikke, medmindre alle punkter er færdige |
| 3 | Sags-status → liste (S4/S7) | **A** — listen har ikke status; den har afkrydsning pr. punkt. Punkt-status er adskilt fra sags-status |
| 4 | Kommentar-bug (S6) | Med i runden, men rettes først efter analyse og test af søge/lister-flowet |
| 5 | Prioritet | Helhedsanalyse først; derefter prioritering baseret på tekniske fund og afhængigheder |
| 6 | Search-parser | Full rewrite af `services/search.ts` vurderes som en del af helhedsanalysen pga. S2 (`&`-håndtering) |

**Status:** Beslutningerne gør planen klar til formalisering og PO-godkendelse (Task #80).  
**Planfil:** `.claude/team/plans/plan-search-lists-redesign.md`

### 9.7 Ny samlet runde godkendt — comprehensive bug/backlog round

**PO har godkendt plan:** `.claude/plans/comprehensive-bug-backlog-round.md`

**Scope for denne runde:**
- Alle tilbageværende kendte bugs + B3 (offline lister), B4 (push-reminders), B8 (US-006 tomt-navn + server-side dubletter), B9 (slet projekt), D1 (photo "Åben" residue), D3 (auto-title bug).
- UI/UX-polish: Tilføj-knap i Board skal have samme størrelse som Optag; vis ansvarlig i liste.
- Governance: Arkiver usecase-dokumenter, UI/UX-agent review, testplan, QA, audit.

**Metode:** Test før build. Samle alle rettelser i ét build. Ingen build uden PO-go.

**Build-status:**
- iOS: ✅ **Klar til test af A1-rettelse** — Build `b6e985e2-5228-4eed-878a-9703e7986e16` — [Åbn iOS build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/b6e985e2-5228-4eed-878a-9703e7986e16)
  - Bemærk: Firestore-regler er netop deployet manuelt. Dette build kan nu testes for listeoprettelse.
- Android: **udskudt** indtil videre.

### Hotfix-build links (forældede — nye kommer)

### Hotfix-build links (forældede — nye kommer)

| Platform | Build-ID | Status | Link |
|---|---|---|---|
| iOS (gammel) | `f73688c5-39fb-4526-bce0-76323e393ab2` | ❌ Forældet | — |
| Android (gammel) | `a0f03466-8962-408b-860f-b1f173491ef7` | ❌ Forældet | — |
| iOS (ny) | `882f86a4-9512-4d56-9ed4-02ce7ac2075c` | ❌ Forældet | — |
| Android (ny) | `8cb7cff2-6bb0-4c37-8724-f954658b791f` | ❌ Forældet | — |
| iOS (nyeste) | `c4208e43-e3b5-402d-9819-451aa70d6ddf` | ❌ Forældet | — |
| Android (nyeste) | `27ff65e4-b46d-4806-a873-88206de8b4fb` | ❌ Forældet | — |
| iOS (super-nuværende) | `539fa596-63a4-4fdb-bb3f-5b6c3c814eb1` | ❌ Forældet | — |
| Android (super-nuværende) | `4d7ded64-6118-46c7-98bb-0d137fc8ab8f` | ❌ Forældet | — |
| iOS (preview v3) | `759b6e99-ff98-470c-885c-b9e8fd503f21` | ✅ Færdig | [Åbn iOS build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/759b6e99-ff98-470c-885c-b9e8fd503f21) |
| Android (preview v3) | `af2f73c5-4b91-4326-ab53-3e2cf71087eb` | ✅ Færdig | [Åbn Android build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/af2f73c5-4b91-4326-ab53-3e2cf71087eb) |

## 9.8 Samlet bug/backlog-runde — status

**Plan:** `.claude/plans/comprehensive-bug-backlog-round.md` (PO-godkendt).  
**Metode:** Test før build. Ét samlet build. Ingen build uden PO-go.

### Agent-output modtaget og reviewet

| # | Opgave | Dokument | Status | Bemærkning |
|---|---|---|---|---|
| 1 | Wildcard/præcis søgning | `.claude/team/design/us-005-wildcard-search.md` | ✅ Reviewet | Design indeholder 3 små beslutningspunkter, der træffes inden for mandat: `*...*` = whole-word wildcard; permanent hint under søgefelt; `*ord` / `ord*` tillades som prefix/suffix. Ingen PO-godkendelse nødvendig. |
| 2 | UI/UX review Board + liste + kommentar | `.claude/team/ux/ui-review-board-checklist.md` | ✅ Reviewet | Konkrete fix er identificeret; afventer kodefase. |
| 3 | Push-reminders | `.claude/team/design/us-011-push-reminders.md` | ❌ Tom / ikke leveret | Skal rykkedes / genskrives. |
| 4 | Offline lister | (mangler fil) | ❌ Mangler | Agent har ikke leveret. |
| 5 | Slet projekt (B9) | (mangler fil) | ❌ Mangler | Agent har ikke leveret. |

### Næste trin
1. Ryd op i manglende design-output (push-reminders, offline lister, slet projekt).
2. Når design er komplet: opdater testplan og start kodefase.
3. Ingen kode uden komplet design + testplan.
4. Status næste gang: når de 3 manglende design-dokumenter er på plads eller afvist.
| iOS (preview v2) | `36614917-4d57-467e-9b13-219d2f5d5346` | ❌ Forældet | — |
| Android (preview v2) | `9ce2e19b-1c3d-4b97-95eb-12d992b70e6b` | ❌ Forældet | — |
| iOS (preview v1) | `f60352d4-bb68-4136-824c-23b11055a308` | ❌ Forældet | — |
| Android (preview v1) | `5a068110-3978-4315-b416-5e067029d7ac` | ❌ Forældet | — |
| iOS (final v2) | `15cdb9cf-efe6-4ec7-bd65-9c33b58cfb44` | ❌ Forældet (development client) | — |
| iOS (final v1) | `ba760c35-a98e-4ef3-bdfd-f01e75f7ca7e` | ❌ Forældet | — |
| Android (final) | `64dff434-7baa-4794-b151-24fdcdad2ff8` | ❌ Forældet | — |

---

## Relaterede filer

- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-012.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-013.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-014.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-015.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-016.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-017.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-018.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-019.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-020.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-021.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-004-voice-create-collab.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-005-dynamic-lists-collab.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-006-project-creation-bug.md`
