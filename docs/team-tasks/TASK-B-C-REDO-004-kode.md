# TASK-B-C-REDO-004: Kode for US-001, US-002, US-003

## Formål

Implementere de tre godkendte user stories i kode i overensstemmelse med godkendt design og testplan.

## Scope

- **US-001:** Rettelse af projektoprettelse og dubletkontrol.
- **US-002:** Søgning med fuzzy-substring og smart-søgning.
- **US-003:** Dynamiske lister / Context Lists.

## Agent-tildeling

- **Developer Agent** — skriver kode, commits og selvtest.
- **Solution Design Agent** — konsulteres ved afvigelser fra design.
- **Master Agent** — koordinerer og eskalerer til PO ved behov.

## Forudsætninger / afhængigheder

- Fase 2 (Design & compliance) er godkendt af PO.
- Fase 3 (Testplan) er klar.
- `docs/backlog.md` er opdateret med features/bugs.

## Input-filer (læs alle)

- `.claude/team/design/design-001-project-creation.md`
- `.claude/team/design/design-002-search.md`
- `.claude/team/design/design-003-context-lists.md`
- `.claude/team/compliance/compliance-b-c-redo.md`
- `.claude/team/test/testplan-b-c-redo.md`
- `.claude/team/tasks/TASK-B-C-REDO-002-design.md`
- `.claude/team/tasks/TASK-B-C-REDO-003-testplan.md`

## Arbejdsopgaver

### 1. US-001 — Projektoprettelse
- Ret den underliggende årsag til den falske fejlmeddelelse.
- Implementér unikhedskontrol for projektnavne efter design.
- Tilføj loading-tilstand og idempotens på "Opret"-knap.
- Opdater UI-feedback: ingen generisk toast ved succes, inline fejl ved dublet.
- Sikr at nyt projekt vises øjeblikkeligt i listen uden pull-to-refresh.

### 2. US-002 — Søgning
- Implementér søgefelt med debounce.
- Implementér substring/fuzzy-søgning som standard.
- Implementér smart-søgning som supplement (minimum: `*ord*`, `"frase"`, `-negation`, `OR`, filtre).
- Implementér syntakshjælp.
- Sikr case-insensitiv matching og håndtering af specialtegn.
- Overvej og implementér performance-optimering efter design.

### 3. US-003 — Context Lists
- Implementér data-model for Context Lists.
- Implementér "Gem som Context List" fra søgeresultater.
- Implementér parsing af punkter fra sagsbeskrivelse/noter efter design.
- Implementér automatisk opdatering, når sager matcher/ikke matcher søgning.
- Implementér afkrydsning, persistering og afmarkering.
- Implementér listevisning med progress og link til underliggende sag.
- Implementér deling via system share-sheet.
- Implementér omdøb og slet.

### 4. Fælles
- Opdater Firestore-sikkerhedsregler i henhold til compliance-design.
- Sikr TypeScript-typer og fejlhåndtering.
- Skriv korte selvtests for hver US.
- Commit med klare beskeder.

## Intern rækkefølge

```text
US-001 ──► QA-snapshot (valgfrit) ──► US-002 ──► US-003
```

- US-001 prioriteres først pga. kritisk fejl.
- US-002 kan påbegyndes, når US-001 er stabil, eller parallelt i isoleret branch.
- US-003 må først påbegyndes, når US-002's søgedata-model og syntaks er implementeret.

## Review-punkter

- [ ] Kode følger godkendt design.
- [ ] Alle ændringer er committed med beskrivende beskeder.
- [ ] US-001's falske fejlmeddelelse er rettet.
- [ ] Dubletkontrol valideret med testdata.
- [ ] Søgeparser håndterer edge cases.
- [ ] Context List opdateringslogik testet.
- [ ] Ingen scope-creep uden PO-go.

## Output / deliverables

- Commit-log i git.
- `.claude/team/dev/dev-notes-b-c-redo.md` med selvtest og kendte begrænsninger.
- Eventuelle opdateringer af `docs/backlog.md` og `memory/data-capture-b-c-status.md`.

## Go/no-go gate

**Go-kriterier:**
- Selvtest for alle tre US er ok.
- Ingen uncommittede ændringer med uklar oprindelse.
- Kode gennemgået (peer review eller QA Agent forhåndstjek).

**No-go-kriterier:**
- Kritiske fejl i selvtest.
- Designændringer undervejs, der kræver PO-godkendelse.

## PO-go kræves

- **Nej** — men enhver scope-ændring under kodefasen skal godkendes af PO.

## Begrænsninger

- Må ikke starte EAS-build.
- Må ikke ændre scope uden PO-go.
- Må ikke tilføje nye features uden for de tre godkendte US.
- Må ikke ændre eksisterende godkendt funktionalitet uden PO-go.

## Kontakt

Rapporter til Master Agent. Eskaler afvigelser fra design og blocker til PO.
