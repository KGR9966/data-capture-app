# TASK-B-C-REDO-021: PO acceptance test for US-004, US-005 og US-006

## Formål

Forbered og understøt PO's acceptance test af buildet med ændringerne fra US-004, US-005 og US-006. Testplanen skal udfyldes med faktiske resultater, og der skal leveres en klar go/no-go anbefaling til PO.

## Scope

- Forberedelse af testmiljø, build-link og testplan.
- Gennemførelse af PO acceptance test på fysiske enheder.
- Registrering af faktiske resultater, bugs og bemærkninger.
- Go/no-go anbefaling.

## Agent-tildeling

- **PO** — leder acceptance testen og træffer endelig go/no-go beslutning.
- **Test Manager Agent** — forbereder test, følger op og dokumenterer resultater.
- **Master Agent** — støtter PO, besvarer spørgsmål og eskalerer blocker.
- **Developer Agent** — tilgængelig til at forklare kode og rette kritiske bugs i en eventuel rettelsesrunde.

## Forudsætninger / afhængigheder

- Fase 9 (TASK-B-C-REDO-020) er færdig med build og smoke-test ok.
- `docs/current-build.md` er opdateret med build-ID, link og QR.
- Testplan (TASK-B-C-REDO-014) foreligger.

## Input-filer (læs alle)

- `docs/current-build.md`
- `.claude/team/test/testplan-b-c-redo-004-006.md`
- `memory/data-capture-test-baseline.md`
- `memory/data-capture-test-baseline.xlsx`
- `.claude/team/design/design-006-project-creation.md`
- `.claude/team/design/design-004-voice-create.md`
- `.claude/team/design/design-005-dynamic-lists.md`
- `.claude/team/qa/qa-report-b-c-redo-v2.md`

## Arbejdsopgaver

### 1. Forberedelse
- Sikr at build-link / QR er tilgængelige og delt med PO.
- Sikr at testplan er klar med plads til faktiske resultater.
- Forbered kort instruktion til PO om hvilke områder, der testes, og hvordan bugs rapporteres.

### 2. PO acceptance test
- Gennemfør testcases for US-006:
  - Projektoprettelse uden falsk fejl.
  - Dubletter blokeres.
  - Gentagne klik / annuller håndteres korrekt.
- Gennemfør testcases for US-004:
  - Robust optagelse og auto-gem.
  - Ensartede felter i "Optag" og "+ Tilføj".
  - Stemmekommandoer.
  - AI-forslag til Type/Kategori.
  - Regression: OCR, oversættelse, deling, foto, tildeling.
- Gennemfør testcases for US-005:
  - Substring/fuzzy-søgning og smart syntaks.
  - Oprettelse af dynamiske lister.
  - Afkrydsning, sortering, redigering.
  - Dynamisk opdatering.
  - Deling og dybe links.

### 3. Dokumentation
- Udfyld `.claude/team/test/po-acceptance-b-c-redo-v2.md` med:
  - Dato, build-ID, platform.
  - Faktiske resultater pr. testcase.
  - Bugliste med prioritet og status.
  - Bemærkninger og læringspunkter.
  - PO's go/no-go beslutning.
- Opdatér `memory/data-capture-test-baseline.md` og `.xlsx` med faktiske resultater.

### 4. Opfølgning
- Hvis PO godkender: notér godkendelsen og afslut forløbet.
- Hvis PO afviser: registrér bugs, og Master Agent planlægger rettelsesrunde med nyt task-sæt.

## Review-punkter

- [ ] Alle tre US'ers acceptkriterier er testet.
- [ ] Regressionstest af baseline gennemført.
- [ ] Faktiske resultater dokumenteret.
- [ ] PO har truffet go/no-go beslutning.

## Output / deliverables

- `.claude/team/test/po-acceptance-b-c-redo-v2.md`
- Opdateret `memory/data-capture-test-baseline.md`
- Opdateret `memory/data-capture-test-baseline.xlsx`
- PO's skriftlige go/no-go.

## Go/no-go gate

**Go-kriterier:**
- PO godkender build til videre brug / produktion.
- Ingen kritiske blocker uden PO-godkendt afvigelse.

**No-go-kriterier:**
- Kritiske fejl, der forhindrer godkendelse.
- PO ønsker ændringer / rettelsesrunde.

## PO-go kræves

- **Ja** — PO skal give endelig godkendelse efter acceptance test.

## Begrænsninger

- Må ikke starte ny build uden PO-go.
- Må ikke ændre scope uden PO-go.
- Må ikke ignorere eller nedprioritere PO's feedback uden PO's accept.

## Kontakt

Rapporter til Master Agent. Master Agent samler resultaterne og præsenterer go/no-go for PO.
