# TASK-B-C-REDO-009: Samarbejde mellem Creative/AI Challenger og Userstoryagent

## Baggrund

Data Capture-appen skal genbesøge to core-områder:

1. **US-004: Optag / + Tilføj oprettelse af sager**
   - Auto gem skal genetableres i Optag.
   - Optagelse må ikke stoppe under aktiv indtaling.
   - "Optag" og "+ Tilføj" skal have ensartede felter.
   - PO er i tvivl om, hvilke felter der skal være i oprettelsesmodalen, og i hvilken rækkefølge.
   - Der skal klarhed om sammenhængen mellem Type-knapper (Idé, Fejl, Observation, Notat, Foto, Stemme, Andet) og Kategori.

2. **US-005: Dynamiske lister og søgeportal**
   - DC skal kunne indsamle informationer relativt ustruktureret.
   - AI/kategorisering gør data søgbart og struktureret.
   - Søgninger skal kunne generere lister med punkter fra sagers beskrivelse/noter.
   - Lister skal:
     - Sorteres alfabetisk.
     - Have rediger/slet mulighed for punkter.
     - Fjerne dubletter.
     - Kunne afkrydses som done.
     - Flytte done-punkter til bunden.
     - Være dynamiske — opdateres, når nye sager matcher søgningen.
     - Vises på en portal/side med faste dynamiske søgninger.
     - Kunne deles via SMS/share-sheet.

## Samarbejdsopgave

**Creative/AI Challenger Agent** og **Userstoryagent** skal samarbejde om at producere det bedst mulige grundlag for PO-gennemgang.

### Trin 1: Afklarende spørgsmål

Lav en fælles liste med afklarende spørgsmål til PO for begge områder. Spørgsmålene skal hjælpe PO med at træffe de nødvendige valg.

### Trin 2: Udkast til user stories

Lav ét udkast per område:
- **US-004:** Ensartet og robust optagelse/oprettelse af sager
- **US-005:** Dynamiske lister og søgeportal

Hver user story skal indeholde:
- Baggrund / hvorfor
- Hvem der har gavn af det
- Acceptkriterier (målbare, gerne Gherkin-format)
- Forslag til UI/UX
- Afhængigheder
- Risici
- Åbne spørgsmål til PO

### Trin 3: Anbefaling af felter og rækkefølge

For oprettelsesmodalen skal I komme med en konkret anbefaling:
- Hvilke felter skal vises.
- I hvilken rækkefølge.
- Hvordan Type-vælger og Kategori hænger sammen.
- Hvilke felter er fælles for "Optag" og "+ Tilføj".
- Hvilke felter kun findes i den ene vej.

## Input fra PO

Læs følgende filer for kontekst:
- C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-b-c-status.md
- C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\governance-adjustment-proposal.md
- C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\collaboration-structure.md
- C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-001.md
- C:\Users\kimgr\data-capture-app\us-004-voice-create.md (foreløbig udkast til US-004)

## Output

Skriv følgende filer:
- C:\Users\kimgr\data-capture-app\.claude\team\design\us-004-voice-create-collab.md
- C:\Users\kimgr\data-capture-app\.claude\team\design\us-005-dynamic-lists-collab.md
- C:\Users\kimgr\data-capture-app\.claude\team\design\questions-for-po-004-005.md

Returnér en kort opsummering med de vigtigste anbefalinger og spørgsmål til PO.

## Begrænsninger

- Må ikke kode.
- Må ikke starte builds.
- Må ikke beslutte scope — kun anbefale og stille spørgsmål.
- Output skal godkendes af PO, før næste fase.
