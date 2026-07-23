# TASK-B-C-REDO-003: Testplan for US-001, US-002, US-003

## Formål

Udarbejde en struktureret testplan med testcases, forventede resultater og felter til faktiske resultater for de tre godkendte user stories. Planen skal være klar før kode påbegyndes og ajourføres løbende.

## Scope

Dækker test af:
- **US-001:** Projektoprettelse og dubletkontrol.
- **US-002:** Fuzzy-substring-søgning og smart-søgning.
- **US-003:** Context Lists (oprettelse, opdatering, afkrydsning, deling, slet).
- Regressionstest af eksisterende baseline-funktionalitet.

## Agent-tildeling

- **Test Manager Agent** — ansvarlig for testplan, prioritering og ajourføring.
- **Test Agent** (i fase 8) — udfører tests efter planen.

## Forudsætninger / afhængigheder

- Fase 2 (Design & compliance) er godkendt af PO.
- Design-dokumenterne for US-001, US-002 og US-003 er tilgængelige.
- Denne opgave må påbegyndes, så snart designet er tilstrækkeligt stabilt, men skal være færdig før kode.

## Input-filer (læs alle)

- `.claude/team/design/design-001-project-creation.md`
- `.claude/team/design/design-002-search.md`
- `.claude/team/design/design-003-context-lists.md`
- `.claude/team/compliance/compliance-b-c-redo.md`
- `.claude/team/design/risk-assessment-b-c-redo.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.xlsx`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-b-c-status.md`

## Arbejdsopgaver

### 1. US-001 testcases
- TC-001: Unikt projektnavn oprettes uden fejlmeddelelse.
- TC-002: Dialog lukkes, og nyt projekt vises øjeblikkeligt i listen.
- TC-003: Dublet-navn afvises med korrekt besked.
- TC-004: Case-insensitive sammenligning (hvis PO har valgt det).
- TC-005: Trim af mellemrum (hvis PO har valgt det).
- TC-006: Gentagne klik på "Opret" opretter højst ét projekt.
- TC-007: Eksisterende dubletter i database påvirkes ikke uden PO-godkendelse.
- TC-008: Redigering af projektnavn inkluderes i regressionstest.

### 2. US-002 testcases
- TC-009: Substring-søgning `vand` finder "vandkande" og "vandslange".
- TC-010: Flerordsinput `vand slange` finder sager med begge ord.
- TC-011: Søgning er case-insensitive.
- TC-012: `*vand*` finder kun hele ordet "vand".
- TC-013: `"vand i kælderen"` finder præcis sætning.
- TC-014: `vand -kælder` ekskluderer sager med "kælder".
- TC-015: `vand OR varme` finder sager med enten ord.
- TC-016: Filtre `type:`, `kategori:`, `status:`, `ansvarlig:`, `projekt:`, `has:photo` virker.
- TC-017: Kombination af fritekst og filtre.
- TC-018: Syntakshjælp vises korrekt.
- TC-019: Tom søgning / ingen resultater håndteres.
- TC-020: Performance på større datasæt (hvis relevant).

### 3. US-003 testcases
- TC-021: Gem søgning som Context List.
- TC-022: Punkter udledes korrekt fra sagsbeskrivelse/noter.
- TC-023: Ny sag, der matcher søgning, tilføjer punkter automatisk.
- TC-024: Sag, der ikke længere matcher, fjerner/bevarer punkter (afhængigt af PO-beslutning).
- TC-025: Afkrydsning persistenteres og kan fjernes.
- TC-026: Listevisning viser navn, dato, antal punkter og færdige.
- TC-027: Underliggende sag kan åbnes fra et punkt.
- TC-028: Deling viser system share-sheet med listenavn og punkter.
- TC-029: Omdøb og slet virker; slet fjerner ikke sager.
- TC-030: Dynamisk vs. statisk deling (afhængigt af PO-beslutning).

### 4. Regressionstest
- Gennemgå `data-capture-test-baseline.md` og marker, hvilke tests der skal gentages efter B+C-ændringer.
- Særlig fokus på: projektoprettelse, navigation, sagsredigering, foto-upload, deling.

### 5. Dokumentation
- Opdater `memory/data-capture-test-baseline.md` med nye B+C-tests.
- Opdater `memory/data-capture-test-baseline.xlsx` med cases, dropdowns og statusfelter.
- Skriv `.claude/team/test/testplan-b-c-redo.md` med alle cases i et ensartet format.

## Review-punkter

- [ ] Alle acceptkriterier fra de tre user stories er dækket af mindst ét testcase.
- [ ] Hvert testcase har forventet resultat og felter til faktisk resultat, status og bemærkninger.
- [ ] Regressionstest er prioriteret.
- [ ] Testplan er gennemgået af Master Agent.

## Output / deliverables

- `.claude/team/test/testplan-b-c-redo.md`
- Opdateret `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.md`
- Opdateret `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.xlsx`

## Go/no-go gate

**Go-kriterier:**
- Testplan er komplet og godkendt af Master Agent.
- Ingen blokerende huller i dækningen.

**No-go-kriterier:**
- Manglende testcases for kritiske acceptkriterier.
- Designændringer undervejs gør testplan ugyldig (genbesøg fase 2).

## PO-go kræves

- **Nej** — PO kan reviewe, men testplan behøver ikke formelt PO-go før kode. PO-go kræves først ved acceptance test (fase 8).

## Begrænsninger

- Må ikke kode.
- Må ikke starte builds.
- Må ikke ændre testscope uden PO-go.

## Kontakt

Rapporter til Master Agent. Spørg PO ved tvivl om forretningsmæssige forventninger.
