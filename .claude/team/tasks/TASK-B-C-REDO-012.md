# TASK-B-C-REDO-012: Flowagent — opstil arbejdsflow for US-004, US-005 og US-006

## Baggrund

PO har godkendt governance-justeringer (pkt A). US-004, US-005 og den nye US-006 skal nu omsættes til et konkret arbejdsflow med faser, afhængigheder, gates og agent-tildeling.

## Din opgave

### 1. Læs de godkendte user stories

Forventede inputfiler (når Userstoryagent har færdiggjort dem):
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-004-voice-create-collab.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-005-dynamic-lists-collab.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-006-project-creation-bug.md`

Læs også:
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\collaboration-structure.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-b-c-status.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-backlog.md`

### 2. Design arbejdsflowet

Opstil et samlet flow for de tre user stories med følgende elementer:

- **Faser** (f.eks. design, testplan, kode, QA, audit, PO-go, build, acceptance test).
- **Afhængigheder** mellem opgaver — hvad skal være færdigt før noget andet kan starte.
- **Agent-tildeling** — hvilken agent gør hvad.
- **Review-punkter** — hvornår skal Solution Design Agent, Compliance Agent eller QA Agent ind.
- **Go/no-go gates** — hvornår kræves PO-godkendelse, QA-godkendelse, audit-godkendelse.
- **Risici og mitigations** for det samlede forløb.

### 3. Vurder rækkefølge

Foreslå en rækkefølge for implementation:
- Bør US-006 (projektoprettelses-bug) fixes først, fordi den er kritisk og isoleret?
- Bør US-004 og US-005 implementeres i samme build eller adskilt?
- Hvad giver mest værdi og mindst risiko for PO's acceptance test?

### 4. Opgavefiler

Opret konkrete opgavefiler under `C:\Users\kimgr\data-capture-app\.claude\team\tasks\`:
- Én opgave per agent per fase, hvor det giver mening.
- Brug navne som `TASK-B-C-REDO-0XX.md`.
- Hver opgave skal have: formål, input, output, begrænsninger, kontakt.

## Output

1. Opdateret `C:\Users\kimgr\data-capture-app\.claude\team\status\team-status.md` med det samlede flow og næste trin.
2. Nye opgavefiler i `.claude\team\tasks\` for de agenter, der skal i gang.
3. Returnér en kort opsummering:
   - Foreslået rækkefølge.
   - Hvilke gates der kræver PO-go.
   - Hvilke opgaver der kan startes med det samme, når PO giver go.

## Begrænsninger

- Må ikke kode.
- Må ikke starte builds.
- Må ikke ændre scope eller rækkefølge uden PO-go.
- Output skal godkendes af PO, før Developer Agent går i gang.

## Kontakt

Rapporter direkte til Master Agent (Claude Code). Spørg PO ved tvivl eller uklarhed.
