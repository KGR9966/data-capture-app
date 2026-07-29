# Opgaveplan: Søgning og lister — redesign (US-002 + US-005)

**Dato:** 2026-07-15  
**Planlagt af:** Master Agent  
**Status:** Klar til PO-godkendelse (Task #80)  
**Forudsætning:** PO har godkendt helhedsanalyse af søge- og listeflowet og besvaret 5 åbne spørgsmål (se afsnit 9.5 i `team-status.md`).

---

## 1. Formål og scope

### 1.1 Formål
Rette de konstaterede fejl i søgning og dynamiske lister, så hele flowet fra søgning → listeoprettelse → listevisning → afkrydsning → status-synk fungerer ensartet og forudsigeligt.

### 1.2 Scope — én runde

| ID | Fejl / ønske | Kritikalitet | Primær agent |
|---|---|---|---|
| S1 | "Kunne ikke oprette den dynamiske liste" ved alle forsøg | **Høj** | Solution Design + Developer |
| S2 | `&` og andre specialtegn kan ikke indgå i søgning | **Høj** | Solution Design + Developer |
| S3 | Afkrydsning af ét listepunkt ændrer hele kildesagens status | **Høj** | Solution Design + Developer |
| S4 | Kildesag sat til `in_progress` vises stadig som gennemstreget Done i listen | **Høj** | Solution Design + Developer |
| S5 | Tastatur dækker felter ved "+ Tilføj Punkt" og redigering i liste | Mellem | UX/UI + Developer |
| S6 | Kommentar-bug: "Tilbage" forsvinder, app låser sig | Mellem | Developer (testes efter søg/lister-analyse) |
| S7 | Kildesag sat til Done opdaterer ikke listepunktet | Mellem | Solution Design + Developer |
| S8 | Minimum 2 bogstaver ved søgning håndhæves ikke | Lav | Developer |
| W1 | Vis hit/highlight for det ord, der har skabt match | Lav–Mellem | UX/UI + Developer |

### 1.3 Ude af scope (bevarer nuværende adfærd)
- OCR-søgning ( beholdes indtil PO eksplicit beder om det)
- Offline-synkronisering af lister
- Deling af lister (fungerer allerede)
- Nye smart-søgeoperatorer udover det, der kræves for at løse S1/S2

---

## 2. PO-beslutninger der låser designet

| # | Spørgsmål | PO-valg |
|---|---|---|
| 1 | Scope | S1–S8 + W1 i én runde, med dybdegående helhedsanalyse af hele søge- og listeflowet |
| 2 | Afkrydsning → sag-status (S3) | **B** — listepunkt opdaterer kun det pågældende punkt i kildesagen; hele sagen påvirkes ikke, medmindre alle punkter er færdige |
| 3 | Sags-status → liste (S4/S7) | **A** — listen har ikke status, men afkrydsning pr. punkt. Punkt-status er adskilt fra sags-status |
| 4 | Kommentar-bug (S6) | Med i runden, men rettes først efter analyse og test af søge/lister-flowet |
| 5 | Prioritet | Helhedsanalyse først; derefter prioritering baseret på tekniske fund |
| 6 | Search-parser | Full rewrite af `services/search.ts` vurderes som en del af helhedsanalysen pga. S2 (`&`-håndtering) |

---

## 3. Faseoversigt

| Fase | Navn | Primær agent | Output | PO-go kræves |
|---|---|---|---|---|
| 1 | Userstoryagent — berig US-002 og US-005 | Userstoryagent | Opdaterede user stories med S1–S8 + W1 | Nej |
| 2 | Flowagent — workflow-design | Flowagent | Flowdiagram + skærm-for-skærm adfærd | Nej |
| 3 | Solution Design — arkitektur | Solution Design Agent | Design-dokument, data-model, API-kontrakter | **Ja** |
| 4 | Compliance / Security review | Compliance/Security Agent | Risikovurdering + sikkerhedsgodkendelse | Nej (review) |
| 5 | Testplan | Test Manager Agent | Struktureret testplan med cases | Nej (PO kan reviewe) |
| 6 | PO-godkendelse af design + testplan | Master Agent | Godkendelsesdokument | **Ja** |
| 7 | Kode | Developer Agent | Commits, rettelser i søgning/lister/kommentar | Nej |
| 8 | QA-verifikation | QA Agent | QA-rapport med trafiklys | Nej |
| 9 | Audit-gate | Audit Agent | Governance-go/no-go | Nej |
| 10 | Build & release-forberedelse | Release Engineer / Deploy Agent | Build-ID, QR, link | **Ja** |
| 11 | PO acceptance test | PO + Test Manager Agent | Testresultater, go/no-go | **Ja** |

---

## 4. Detaljeret fasebeskrivelse

### Fase 1 — Userstoryagent (TASK-SEARCH-LISTS-001)
**Aktør:** Userstoryagent  
**Input:** Nuværende `us-002-search.md`, `us-005-dynamic-lists-collab.md`, afsnit 9.1–9.5 i `team-status.md`.  
**Output:**
- `.claude/team/design/us-002-search-v2.md`
- `.claude/team/design/us-005-dynamic-lists-v2.md`
- `.claude/team/design/us-005-context-lists-v2.md`

**Fokus:**
- Søgning skal håndtere specialtegn (`&`, `/`, `-`, tal, æøå) robust.
- Listepunkt er en separat enhed med egen afkrydsning; punkt kan pege på ét item eller være fritekst.
- Afkrydsning opdaterer kun det matchende punkt i source-item, ikke hele item-status.
- Highlight af match-ord i søgeresultater.
- Kommentar-bug (S6) beskrives som selvstændigt acceptkriterie.

### Fase 2 — Flowagent (TASK-SEARCH-LISTS-002)
**Aktør:** Flowagent  
**Input:** User stories fra fase 1.  
**Output:**
- `.claude/team/design/flow-search-lists-v2.md`
- Flowdiagram for: søg → opret liste → åbn liste → afkryds → se item → ret status → returner til liste.

**Fokus:**
- Hvordan håndteres det, når søgning giver 0 resultater?
- Hvordan vises highlight i resultater og liste?
- Hvordan afkrydses punkter uden at påvirke item-status?
- Hvordan håndteres tastatur og scroll ved "+ Tilføj Punkt" / redigering?

### Fase 3 — Solution Design (TASK-SEARCH-LISTS-003)
**Aktør:** Solution Design Agent  
**Input:** User stories + flowdokument.  
**Output:**
- `.claude/team/design/design-search-lists-v2.md`
- Data-model for lister, punkter, item-reference og status.
- Beslutning om search-parser: rewrite eller patch.
- Firestore-regler og sikkerhedsmodel.

**Fokus:**
- S1 root-cause: hvorfor fejler oprettelse? (data-model, rettigheder, parser, navigation)
- S2: normalisering af specialtegn; tokenizer vs. regex.
- S3/S4/S7: adskillelse af listepunkt-status og item-status.
- S5/S6: UI-løsninger (KeyboardAvoidingView, ScrollView, modal-layout).
- S8: klient- eller server-side validering af minimumslængde.
- W1: highlight-strategi i liste og søgeresultater.

**Go/no-go:**
- Design dokumenteret og reviewet internt.
- **PO-go kræves** før testplan og kode.

### Fase 4 — Compliance / Security (TASK-SEARCH-LISTS-004)
**Aktør:** Compliance/Security Agent  
**Input:** Design-dokument.  
**Output:**
- `.claude/team/compliance/compliance-search-lists-v2.md`

**Fokus:**
- Firestore-regler: læseadgang til lister og item-punkter.
- Sikker håndtering af søgestrenge (ingen injection, ingen logning af persondata).
- Data-model: ingen reference til slettede items uden håndtering.

### Fase 5 — Testplan (TASK-SEARCH-LISTS-005)
**Aktør:** Test Manager Agent  
**Input:** Godkendt design.  
**Output:**
- `.claude/team/test/testplan-search-lists-v2.md`
- Opdateret `memory/data-capture-test-baseline.md`
- Opdateret `memory/data-capture-test-baseline.xlsx`

**Fokus:**
- Testcases for S1–S8 + W1 med trin, forventet resultat og faktisk resultat.
- Edge cases: specialtegn, store lister, afkrydsning uden netværk, item slettet efter listeoprettelse.
- Regressionstest: deling, slet, kopiér, voice-oprettelse, projekter.

### Fase 6 — PO-godkendelse af design + testplan (TASK-SEARCH-LISTS-006)
**Aktør:** Master Agent + PO  
**Input:** Design + testplan + compliance.  
**Output:**
- `.claude/team/status/approval-search-lists-v2.md`

**Beslutninger PO skal tage:**
1. Godkender du design-dokumentet?
2. Godkender du testplanen?
3. Godkender du prioritering af S1–S8 baseret på udviklingens anbefaling?
4. Godkender du at S6 (kommentar-bug) rettes i samme runde?
5. Giver du go til at Developer Agent påbegynder kodefasen?

### Fase 7 — Kode (TASK-SEARCH-LISTS-007)
**Aktør:** Developer Agent  
**Input:** Godkendt design + testplan.  
**Output:** Commits, kodeændringer, selvtest.

**Forventede berørte filer:**
- `services/search.ts` (rewrite eller større refactor)
- `services/checklists.ts`
- `app/(tabs)/search.tsx`
- `app/(tabs)/checklists.tsx`
- `app/checklist.tsx`
- `components/CreateItemForm.tsx` (kommentar/S6)
- Firestore-regler

**Intern rækkefølge:**
1. Søgeparser + S2/S8.
2. Listeoprettelse + S1.
3. Listepunkt-status + S3/S4/S7.
4. UI-fixes + S5/W1.
5. Kommentar-bug + S6.

**Go/no-go:**
- Selvtest grøn.
- TypeScript og lint grønne.
- Ingen uncommittede ændringer.

### Fase 8 — QA-verifikation (TASK-SEARCH-LISTS-008)
**Aktør:** QA Agent  
**Input:** Kode + testplan.  
**Output:** `.claude/team/qa/qa-report-search-lists-v2.md`

**Go/no-go:**
- Ingen kritiske eller høj-prioritetsfejl.
- Regressionstest grøn.

### Fase 9 — Audit-gate (TASK-SEARCH-LISTS-009)
**Aktør:** Audit Agent  
**Input:** Alle deliverables.  
**Output:** `.claude/team/audit/governance-check-search-lists-v2.md`

**Fokus:**
- Governance-regler overholdt.
- Build ikke startet før PO-go.
- Scope ikke udvidet.

### Fase 10 — Build & release-forberedelse (TASK-SEARCH-LISTS-010)
**Aktør:** Release Engineer / Deploy Agent  
**Input:** QA-go + audit-go.  
**Output:**
- `docs/current-build.md` opdateret.
- EAS preview builds (iOS + Android).

**Husk:** `developmentClient: false` — preview eller production profile.

### Fase 11 — PO acceptance test (TASK-SEARCH-LISTS-011)
**Aktør:** PO + Test Manager Agent + Master Agent  
**Input:** Build-ID, link, testplan.  
**Output:** `.claude/team/test/po-acceptance-search-lists-v2.md`

---

## 5. Afhængigheder

```text
TASK-SEARCH-LISTS-001 (Userstoryagent)
         │
         ▼
TASK-SEARCH-LISTS-002 (Flowagent)
         │
         ▼
TASK-SEARCH-LISTS-003 (Solution Design)  ← PO-go
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
TASK-SEARCH-LISTS-004  TASK-SEARCH-LISTS-005
(Compliance)             (Testplan)
         │              │
         └──────────────┘
                        │
                        ▼
         TASK-SEARCH-LISTS-006 (PO-godkendelse)  ← PO-go
                        │
                        ▼
         TASK-SEARCH-LISTS-007 (Kode)
                        │
                        ▼
         TASK-SEARCH-LISTS-008 (QA)
                        │
                        ▼
         TASK-SEARCH-LISTS-009 (Audit)
                        │
                        ▼
         TASK-SEARCH-LISTS-010 (Build)  ← PO-go
                        │
                        ▼
         TASK-SEARCH-LISTS-011 (PO acceptance)  ← PO-go / no-go
```

---

## 6. Risici og mitigations

| Risiko | Sandsynlighed | Konsekvens | Mitigation |
|---|---|---|---|
| Full rewrite af search-parser trækker ud | Mellem | Forsinkelse af hele runden | Overvej patch først; rewrite kun hvis nødvendigt |
| S1 skyldes dybere data-model-problem | Mellem | Løsning bliver større end forventet | Root-cause analyse i designfasen før kode |
| S3/S4/S7 kræver ny data-model for punkter | Høj | Brud på eksisterende lister | Migreringsstrategi; test med gamle lister |
| S5/S6 UI-fixes påvirker andre skærme | Mellem | Regression i kommentar/modal | Isoler ændringer; stærk regressionstest |
| Kommentar-bug (S6) har sammenhæng med søg/lister | Lav | Separat rodårsag kræver egen runde | Analyse først; hvis uafhængig, opdel task |

---

## 7. Næste skridt

- [x] PO-beslutninger registreret.
- [x] Opgaveplan skrevet.
- [ ] **PO godkender denne plan (Task #80).**
- [ ] Master Agent aktiverer Fase 1: Userstoryagent.

---

## Relaterede filer

- `.claude/team/status/team-status.md` (afsnit 9)
- `.claude/team/design/us-002-search.md`
- `.claude/team/design/us-005-dynamic-lists-collab.md`
- `services/search.ts`
- `services/checklists.ts`
- `app/(tabs)/search.tsx`
- `app/(tabs)/checklists.tsx`
- `app/checklist.tsx`
