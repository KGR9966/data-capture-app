# Team status: B+C redesign fase 2 — US-004, US-005, US-006

**Dato:** 2026-07-15  
**Planlagt af:** Flowagent  
**Forudsætning:** PO har godkendt user stories US-004, US-005 og US-006, samt governance-justeringerne i `collaboration-structure.md` pkt A.  
**Næste handling:** Fase 5 (Testplan) er i gang efter PO-godkendelse af fase 4.

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
- Governance-regler overholdt.
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
