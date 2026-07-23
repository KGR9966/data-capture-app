# TASK-B-C-REDO-019: Audit-gate for US-004, US-005 og US-006

## Formål

Kontrollér at governance-regler, samarbejdsstruktur og stop-kriterier er overholdt igennem fase 4-7 for US-004, US-005 og US-006, før processen går videre til build og PO acceptance test.

## Scope

- Gennemgang af alle deliverables fra fase 4 (design), 5 (testplan), 6 (kode) og 7 (QA).
- Kontrol af, at ingen build er startet før PO-go.
- Kontrol af, at scope ikke er udvidet uden PO-go.
- Kontrol af, at godkendt funktionalitet ikke er ændret uden PO-go.
- Kontrol af, at agenter har arbejdet inden for deres mandat.
- Governance-check med go/no-go.

## Agent-tildeling

- **Audit Agent** — uafhængig kontrol, go/no-go og eskalering til PO.
- **Master Agent** — stiller dokumentation til rådighed og korrigerer eventuelle brud.

## Forudsætninger / afhængigheder

- Fase 7 (TASK-B-C-REDO-018) er afsluttet med QA-go.
- Alle deliverables fra fase 4-7 findes.

## Input-filer (læs alle)

- `.claude/team/status/team-status.md`
- `.claude/team/tasks/TASK-B-C-REDO-013.md` til 018
- `.claude/team/design/design-006-project-creation.md`
- `.claude/team/design/design-004-voice-create.md`
- `.claude/team/design/design-005-dynamic-lists.md`
- `.claude/team/compliance/compliance-b-c-redo-v2.md`
- `.claude/team/design/risk-assessment-b-c-redo-v2.md`
- `.claude/team/test/testplan-b-c-redo-004-006.md`
- `.claude/team/qa/qa-report-b-c-redo-v2.md`
- `.claude/team/dev/dev-notes-b-c-redo-v2.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\collaboration-structure.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\SOP-PO-approvals.md`
- Git log og status for ucommittede ændringer.

## Arbejdsopgaver

### 1. Governance-check
- Verificér at user stories var godkendt før designstart.
- Verificér at design var godkendt af PO før kode.
- Verificér at testplan lå klar før kode (eller at afvigelse er begrundet og dokumenteret).
- Verificér at QA-gate er gennemført før audit.

### 2. Scope-kontrol
- Kontrollér at implementeringen ikke indeholder funktionalitet uden for US-004, US-005 og US-006, medmindre PO har givet go.
- Kontrollér at bevidst udsatte emner (offline, notifikationer, global lister, semantisk deduplikering, PDF-eksport) ikke er sneget ind.

### 3. Ændringskontrol
- Kontrollér at godkendt funktionalitet (OCR, deling, oversættelse, fotoalbum/kamera, tildeling) ikke er ændret uden PO-go.
- Kontrollér at data-model, auth eller sikkerhedsregler kun er ændret efter compliance-godkendelse.

### 4. Habilitet og mandat
- Kontrollér at Master Agent ikke har skrevet produktionskode eller startet builds.
- Kontrollér at Developer Agent ikke har ændret scope.
- Kontrollér at agenter har rapporteret til Master Agent og eskaleret tvivl til PO.

### 5. Dokumentation og git-hygiejne
- Tjek git-status for uncommittede ændringer med uklar oprindelse.
- Tjek at commits har klare beskeder.
- Tjek at dev-notes, QA-rapport og testplan er opdateret.

## Review-punkter

- [ ] Alle gates før audit er overholdt.
- [ ] Ingen scope-creep.
- [ ] Ingen ændring af godkendt funktionalitet uden PO-go.
- [ ] Ingen uautoriserede builds.
- [ ] Git-hygiejne i orden.

## Output / deliverables

- `.claude/team/audit/governance-check-b-c-redo-v2.md` indeholdende:
  - Gennemgang af hver kontrolpunkt.
  - Fund og eventuelle afvigelser.
  - Go/no-go konklusion.
  - Eventuelle læringspunkter.
  - Eskaleringer til PO, hvis relevant.

## Go/no-go gate

**Go-kriterier:**
- Audit Agent giver skriftligt go.
- Eventuelle fund er rettet eller eskaleret til PO.

**No-go-kriterier:**
- Brud på governance, der ikke er rettet.
- Build startet uden PO-go.
- Scope-creep uden PO-go.
- Ucommittede ændringer med uklar oprindelse.

## PO-go kræves

- **Nej** for selve audit-gaten, men Audit Agent kan eskalere til PO ved brud.
- **PO-go kræves** før build (fase 9).

## Begrænsninger

- Må ikke selv rette kode eller ændre governance.
- Må ikke starte builds.
- Må ikke undlade at rapportere brud til PO.

## Kontakt

Rapporter primært til PO ved brud på governance; kommuniker også til Master Agent, så processen kan korrigeres.
