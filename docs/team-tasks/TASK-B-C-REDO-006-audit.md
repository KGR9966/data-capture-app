# TASK-B-C-REDO-006: Audit-gate for US-001, US-002, US-003

## Formål

Kontrollere at hele forløbet for B+C-redesign har overholdt governance, samarbejdsregler og procedure, før PO-go til build.

## Scope

- Gennemgang af fase 2-5: design, testplan, kode, QA.
- Kontrol af at PO-go er indhentet der hvor det kræves.
- Kontrol af at sub-agenter er anvendt korrekt.
- Kontrol af at scope ikke er udvidet uden PO-godkendelse.
- Kontrol af at intet build er startet før audit-go.

## Agent-tildeling

- **Audit Agent** — uafhængig reviewer, rapporterer til PO og Master Agent.

## Forudsætninger / afhængigheder

- Fase 5 (QA) er grøn.
- Alle deliverables fra fase 2-5 findes.

## Input-filer (læs alle)

- `.claude/team/status/team-status.md`
- `.claude/team/tasks/TASK-B-C-REDO-002-design.md`
- `.claude/team/tasks/TASK-B-C-REDO-003-testplan.md`
- `.claude/team/tasks/TASK-B-C-REDO-004-kode.md`
- `.claude/team/tasks/TASK-B-C-REDO-005-qa.md`
- `.claude/team/design/design-001-project-creation.md`
- `.claude/team/design/design-002-search.md`
- `.claude/team/design/design-003-context-lists.md`
- `.claude/team/compliance/compliance-b-c-redo.md`
- `.claude/team/qa/qa-report-b-c-redo.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\collaboration-structure.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\SOP-PO-approvals.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\governance-adjustment-proposal.md`

## Arbejdsopgaver

### 1. Governance-check
- Verificér at Userstoryagent og Flowagent er anvendt (denne opgaveplan + user stories).
- Verificér at Solution Design Agent har produceret design.
- Verificér at Test Manager Agent har produceret testplan.
- Verificér at Developer Agent har skrevet kode.
- Verificér at QA Agent har verificeret kode.

### 2. PO-go kontrol
- Verificér at PO har godkendt user stories.
- Verificér at PO har godkendt opgaveplan (denne plan).
- Verificér at PO har godkendt design.
- Verificér at der endnu ikke er anmodet om PO-go til build (det sker i fase 7).

### 3. Scope-kontrol
- Verificér at ingen agent har udvidet scope uden PO-go.
- Verificér at begreberne MVP/quick win/fast track ikke er anvendt uden PO-godkendelse.

### 4. Solo-arbejde kontrol
- Verificér at Master Agent ikke har skrevet produktionskode eller startet build.
- Hvis Master Agent har været nødt til at bidrage til kode/build, verificér at Audit Agent gav forhåndsgodkendelse.

### 5. Sikkerhed og compliance
- Verificér at ingen secrets/API-nøgler er kommet ind i koden.
- Verificér at Firestore-regler er gennemgået af Compliance Agent.

## Review-punkter

- [ ] Alle faser er gennemført efter plan.
- [ ] Alle nødvendige PO-go'er er dokumenteret.
- [ ] Scope er uændret eller PO-godkendt ændret.
- [ ] Ingen kritisk fejl er sprunget over.
- [ ] QA-gate er grøn.

## Output / deliverables

- `.claude/team/audit/governance-check-b-c-redo.md` med:
  - Gennemgang af hver kontrolpunkt.
  - Go eller no-go konklusion.
  - Eventuelle læringspunkter eller eskaleringer til PO.

## Go/no-go gate

**Go-kriterier:**
- Alle governance-regler overholdt.
- Alle required PO-go'er dokumenteret.
- QA-gate grøn.
- Ingen blocker.

**No-go-kriterier:**
- Brud på governance (f.eks. build startet uden PO-go, scope udvidet uden PO-go).
- Manglende dokumentation for kritisk beslutning.
- Audit Agent vurderer, at processen skal genkøres.

## PO-go kræves

- **Nej** — Audit Agent giver go/no-go som anbefaling til PO og Master Agent. PO-go til build indhentes i fase 7.

## Begrænsninger

- Må ikke rette kode eller processer selv.
- Må ikke starte builds.
- Kan stoppe processen ved brud på governance.

## Kontakt

Rapporter direkte til PO og til Master Agent. Ved stop: skriftlig begrundelse.
