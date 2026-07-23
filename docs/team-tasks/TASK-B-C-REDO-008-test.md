# TASK-B-C-REDO-008: PO acceptance test for US-001, US-002, US-003

## Formål

Gennemføre struktureret PO acceptance test på fysiske enheder for det nye build og afgøre go/no-go.

## Scope

- PO tester de tre user stories på fysiske enheder.
- Test Manager Agent støtter med testplan og opsamling af resultater.
- Master Agent hjælper med teknisk kontekst og koordinering.

## Agent-tildeling

- **PO** — leder acceptance test og træffer endelig go/no-go beslutning.
- **Test Manager Agent** — forbereder test, følger op og ajourfører testplan.
- **Master Agent** — støtter PO, samler feedback og planlægger eventuel rettelsesrunde.

## Forudsætninger / afhængigheder

- Fase 7 (Build) er succesfuldt.
- Build-ID og installationslink/QR er tilgængelige.
- `.claude/team/test/testplan-b-c-redo.md` er klar med cases og felter til faktiske resultater.

## Input-filer (læs alle)

- `.claude/team/test/testplan-b-c-redo.md`
- `docs/current-build.md`
- `.claude/team/design/design-001-project-creation.md`
- `.claude/team/design/design-002-search.md`
- `.claude/team/design/design-003-context-lists.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.xlsx`

## Arbejdsopgaver

### 1. Forberedelse
- Installer build på fysiske enheder (iOS + Android).
- Gennemgå testplan og sikr at testmiljø er klar.
- Verificér at testdata er til stede (projekter, sager, noter, billeder).

### 2. Test US-001
- Opret nyt projekt med unikt navn — verificér ingen falsk fejlmeddelelse.
- Forsøg at oprette dublet — verificér blokering og besked.
- Test case-sensitivity og trim (efter design).
- Test gentagne klik på "Opret" — verificér idempotens.
- Kontrollér at eksisterende projekter ikke er påvirket.

### 3. Test US-002
- Søg efter `vand` — verificér at "vandkande" og "vandslange" findes.
- Test flerordsinput.
- Test `*vand*`, `"frase"`, `-negation`, `OR`.
- Test filtre `type:`, `kategori:`, `status:`, `ansvarlig:`, `projekt:`, `has:photo`.
- Test syntakshjælp.
- Test tom søgning / ingen resultater.

### 4. Test US-003
- Gem en søgning som Context List.
- Verificér at punkter udledes korrekt.
- Opret/redigér en sag, så den matcher søgningen — verificér automatisk tilføjelse.
- Opret/redigér en sag, så den ikke længere matcher — verificér håndtering.
- Afkryds punkter og verificér persistering.
- Del listen og verificér indholdet.
- Omdøb og slet listen.

### 5. Regressionstest
- Gennemfør udvalgte tests fra `data-capture-test-baseline.md` for at sikre at eksisterende funktionalitet ikke er brudt.
- Særlig fokus på: projektliste, sagsredigering, foto-upload, deling af tekst/oversættelser.

### 6. Dokumentation af resultater
- Udfyld faktiske resultater, status og bemærkninger i testplan.
- Opdater `data-capture-test-baseline.xlsx`.
- Skriv `.claude/team/test/po-acceptance-b-c-redo.md` med:
  - Testmiljø (enheder, build-ID).
  - Opsummering af resultater.
  - Bugliste med prioritet.
  - PO's go/no-go beslutning.

## Review-punkter

- [ ] Alle testcases i testplan er udført eller begrundet undladt.
- [ ] Faktiske resultater er dokumenteret.
- [ ] Bugs er registreret med prioritet og repro-trin.
- [ ] Regressionstest er gennemført.
- [ ] PO har truffet endelig beslutning.

## Output / deliverables

- Udfyldt `.claude/team/test/testplan-b-c-redo.md`.
- `.claude/team/test/po-acceptance-b-c-redo.md`.
- Opdateret `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.xlsx`.

## Go/no-go gate

**Go-kriterier:**
- Alle kritiske acceptkriterier er opfyldt.
- Ingen kritiske bugs.
- Høj/mellem bugs er accepteret eller planlagt.
- PO giver skriftligt go.

**No-go-kriterier:**
- Kritisk fejl i en af de tre US.
- Regression i godkendt funktionalitet.
- PO ønsker rettelsesrunde.

## PO-go kræves

- **Ja** — PO skal give endelig godkendelse af buildet. Ved afvisning planlægges rettelsesrunde og ny build.

## Begrænsninger

- Må ikke kode eller rette bugs under acceptance test.
- Må ikke starte nyt build uden PO-go.
- Må ikke ændre scope under test.

## Kontakt

Master Agent og Test Manager Agent støtter PO. Bugs rapporteres til Master Agent, som planlægger rettelsesrunde.
