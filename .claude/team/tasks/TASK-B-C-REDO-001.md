# TASK-B-C-REDO-001: Genbesøg B+C med Userstoryagent og Flowagent

## Baggrund

Data Capture-appen er i gang med at implementere "B" (quick wins) og "C" (Context Lists). Det første forsøg (rc2, commit `f85bda8`) blev bygget uden tilstrækkelig designfase, review eller testplan. Resultatet var kritisk fejl og mismatch mellem PO's forventning og implementering.

Nye governance-regler er nu godkendt. Denne opgave skal derfor gennemløbe den nye fase-rytme:
- Fase 2: Userstoryagent beriger PO's input.
- Fase 3: Flowagent designer flow.

## Aktuel viden

Læs følgende filer for fuld kontekst:

- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-b-c-status.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\governance-adjustment-proposal.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\collaboration-structure.md`

## PO's input fra test og dialog

### 1. Projektoprettelse (kritisk bug)

Ved oprettelse af nyt projekt vises fejlmeddelelsen "Fejl. Kunne ikke oprette projektet."  
Projektet oprettes alligevel i baggrunden. Hvis brugeren trykker "Opret" igen og derefter "Annuller", ender man med to identiske projekter.

**PO's krav:**
- Fejlmeddelelsen må ikke vises, hvis projektet faktisk er oprettet.
- Der skal ikke kunne oprettes to enslydende projekter.

### 2. Søgning

PO ønsker:
- Standard søgning skal være **substring/fuzzy**, så "vand" finder både "vandkande" og "vandslange".
- **Smart-søgning** skal være supplement, ikke erstatning:
  - `*vand*` finder kun hele ordet "vand".
  - `"frase"` for nøjagtig sætning.
  - `-negation` for at ekskludere.
  - `OR` for alternativer.
  - Filtre som `type:`, `kategori:`, `status:`, `ansvarlig:`, `projekt:`, `has:photo`.

### 3. Genbesøg B+C

B+C skal startes forfra med Userstoryagent og Flowagent, så PO og team får et fælles billede, før der udvikles.

### 4. Scope/MVP

PO ejer forretningsbehov. Ingen agent må selv kalde noget MVP eller quick win. Opdeling i faser skal aftales eksplicit med PO.

### 5. Testplan

For hver godkendt user story skal der udarbejdes en struktureret testplan med testcases, forventede resultater og felter til faktisk resultat. Planen skal udfyldes under test.

### 6. Context Lists / dynamiske lister

PO's vision:
- Søgning skal kunne fremsøge sager.
- Der skal kunne genereres en liste med punkter fra beskrivelse/noter fra de valgte sager.
- Punkterne skal kunne afkrydses som done.
- Søgningerne/listerne skal være **dynamiske** — hvis nye sager matcher, opdateres listen automatisk.
- Lister skal kunne deles via SMS og andre kanaler.

## Output

### Userstoryagent

Lav en struktureret user story for hvert af følgende områder:
1. Rettelse af projektoprettelse og forhindring af dubletter.
2. Søgning med både fuzzy-substring og smart-søgning.
3. Dynamiske lister / Context Lists.

Hver user story skal indeholde:
- Baggrund / hvorfor
- Hvem der har gavn af det
- Acceptkriterier (målbare)
- Forslag til UI/UX
- Afhængigheder
- Risici
- Åbne spørgsmål til PO

Brug formatet `.claude/team/design/us-XXX.md`.

### Flowagent

Tag de godkendte user stories (når PO har godkendt dem) og lav en opgaveplan med:
- Faser
- Agent-tildeling
- Afhængigheder
- Review-punkter
- Go/no-go gates
- Hvor PO-go kræves

Brug formatet `.claude/team/status/team-status.md` og `.claude/team/tasks/TASK-XXX-*.md`.

## Begrænsninger

- Må ikke kode.
- Må ikke starte builds.
- Må ikke ændre scope uden PO-go.
- Output skal godkendes af PO, før næste fase.

## Kontakt

Rapporter direkte til Master Agent (Claude Code). Spørg PO ved tvivl eller uklarhed.
