# TASK-B-C-REDO-014: Testplan for US-004, US-005 og US-006

## Formål

Udarbejd en struktureret testplan, der dækker alle acceptkriterier i US-004, US-005 og US-006, samt regressionstest af eksisterende baseline-funktionalitet. Planen skal have klare forventede resultater og plads til faktiske resultater, så den kan bruges under både QA-verifikation og PO acceptance test.

## Scope

- Testcases for US-006 (projektoprettelse og dubletter).
- Testcases for US-004 (voice capture, auto-gem, ensartet oprettelse af sager).
- Testcases for US-005 (søgning, dynamiske lister, deling, dybe links).
- Regressionstest af eksisterende baseline-funktionalitet.
- Opdatering af dynamisk testplan og Excel-skabelon.

## Agent-tildeling

- **Test Manager Agent** — ansvarlig for testplan, prioritering og regressionsskabelon.
- **QA Agent** — reviewer testplan for dækning og gennemførlighed før kodefasen.

## Forudsætninger / afhængigheder

- Fase 4 (TASK-B-C-REDO-013) er godkendt af PO.
- Design-dokumenter for US-004, US-005 og US-006 findes.
- Compliance-godkendelse foreligger.

## Input-filer (læs alle)

- `.claude/team/design/design-006-project-creation.md`
- `.claude/team/design/design-004-voice-create.md`
- `.claude/team/design/design-005-dynamic-lists.md`
- `.claude/team/design/us-006-project-creation-bug.md`
- `.claude/team/design/us-004-voice-create-collab.md`
- `.claude/team/design/us-005-dynamic-lists-collab.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.xlsx`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-b-c-status.md`

## Arbejdsopgaver

### 1. US-006 — Projektoprettelse
- Testcases for:
  - Gyldig unik projektoprettelse: ingen fejl, dialog lukker, aktivt projekt sættes, navigation til board.
  - Faktisk Firestore-fejl (netværk/tilladelse): fejlmeddelelse, intet projekt oprettet.
  - Gentagne klik på "Opret": idempotens — højst ét projekt.
  - Annuller efter fejlmeddelelse: højst ét projekt med navnet.
  - Dublet-tjek: samme navn, forskellig casing, leading/trailing spaces.
  - Dublet-tjek: anden brugers projekt med samme navn skal tillades (hvis det er PO's beslutning).
  - Eksisterende dubletter: adfærd når brugeren har to projekter med samme navn.

### 2. US-004 — Voice / Create Item
- Testcases for:
  - Auto-gem efter 5 sekunders stilhed; modal forblive åben.
  - Auto-gem slået fra: optagelse fortsætter under stilhed.
  - Kontinuerlig tale: optagelse stopper ikke.
  - OS-timeout: kort afbrydelse genoptages; lang afbrydelse informerer brugeren.
  - Ensartethed: samme felter og rækkefølge i "Optag" og "+ Tilføj".
  - Formularen resettes ved åbning.
  - AI-forslag til Type og Kategori; bruger kan overskrive.
  - Stemmekommandoer: gem, slet alt, kategori.
  - Titel auto-udledes; gem kun hvis tekst eller foto er udfyldt.
  - Regression: OCR, oversættelse, deling, fotoalbum/kamera.

### 3. US-005 — Dynamiske lister
- Testcases for:
  - Substring/fuzzy-søgning som standard.
  - Smart syntaks (`*ord*`, `"frase"`, `-`, `OR`, filtre) som supplement.
  - Oprettelse af liste fra søgeresultater; valg af felter.
  - Generering af punkter; strenge og semantiske dubletter.
  - Sortering: alfabetisk, dato, prioritet; done i bunden.
  - Afkrydsning; valgfri status-synkronisering.
  - Dynamisk opdatering: nye matches tilføjes med badge; kildesag gråes ud ved mismatch.
  - Portal: "Lister"-fane med kort, antal, seneste opdatering.
  - Redigering og sletning af punkter; tilføjelse af egne punkter opretter sag.
  - Deling: share-sheet tekst + dyb link med rettighedstjek.

### 4. Regressionstest
- Opdatér baseline-testplanen med fokus på områder, der berøres af de tre US'er:
  - Projektoprettelse og projektskift.
  - Optagelse og manuel oprettelse af sager.
  - Board-listevisning.
  - Søgning (gammel adfærd erstattes).
  - Deling/kopiér.
  - Fotoalbum/kamera.

### 5. Dokumentation
- Skriv `.claude/team/test/testplan-b-c-redo-004-006.md` med cases, forventede resultater, faktiske resultat-felter, status og bemærkninger.
- Opdatér `memory/data-capture-test-baseline.md` og `memory/data-capture-test-baseline.xlsx`.

## Review-punkter

- [ ] Alle Gherkin-acceptkriterier i de tre US'er er dækket.
- [ ] Regressionstest fokuserer på risikoområder.
- [ ] Edge cases er beskrevet (eksisterende dubletter, OS-timeout, store datasæt, dyb link uden rettigheder).
- [ ] Testplan er gennemførlig på både simulator/dev-client og fysiske enheder.

## Output / deliverables

- `.claude/team/test/testplan-b-c-redo-004-006.md`
- Opdateret `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.md`
- Opdateret `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.xlsx`

## Go/no-go gate

**Go-kriterier:**
- Testplan godkendt af Master Agent og reviewet af QA Agent.
- Ingen blokerende huller i dækning.

**No-go-kriterier:**
- Manglende testdækning af kritiske acceptkriterier.
- Urealistisk testscope givet tidsramme.

## PO-go kræves

- **Nej** — PO kan reviewe, men go kræves først ved build (fase 9). Master Agent afgør, om testplan skal justeres før kode.

## Begrænsninger

- Må ikke skrive produktionskode.
- Må ikke starte builds.
- Må ikke ændre scope uden PO-go.
- Testplan må ikke antage implementation; den skal baseres på godkendt design.

## Kontakt

Rapporter til Master Agent. Spørg PO ved uklarhed om forretningskritiske testcases.
