# TASK-B-C-REDO-011: Userstoryagent — færdiggør US-004, US-005 og opret US-006 for projektoprettelses-bug

## Baggrund

PO har godkendt governance-justeringer (pkt A) og ønsker, at B+C-forløbet køres efter den nye fase-rytme. US-004 (voice capture / oprettelse af sager) og US-005 (dynamiske lister / søgeportal) er nu afklaret med PO. Derudover står vi med en kritisk, uløst fejl i projektoprettelse, der skal have sin egen user story.

## Din opgave

### 1. Gennemlæs og færdiggør US-004

Læs:
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-004-voice-create-collab.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-004-field-flow-analysis.md`

Sikr dig, at user storyen er:
- Konsistent og fri for interne uafklarede spørgsmål.
- Opdelt i logiske acceptkriterier med Gherkin-format.
- Klar til at blive sendt til PO-godkendelse (hvis den ikke allerede er det).

### 2. Færdiggør US-005

Læs:
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-005-dynamic-lists-collab.md`

PO har besluttet følgende (reflekteres i filen, men verificer):
- Søge-redesign er del af US-005 (substring/fuzzy standard, smart syntaks supplement).
- Ny "Lister"-fane.
- Projektspecifikke lister.
- Kun brugeroprettede lister i fase 1.
- Punkter fra titel/beskrivelse/noter, brugeren vælger ved oprettelse.
- Streng auto-deduplikering + semantisk "måske duplikat"-markering.
- Bruger vælger sortering per liste (alfabetisk, dato, prioritet); default alfabetisk med done i bunden.
- Nye matches markeres med badge.
- Punkter gråes ud, ikke fjernes, når kilden ikke længere matcher.
- Status-synkronisering valgfrit per liste.
- Egne punkter opretter automatisk en sag, der matcher listens søgning.
- Deling: tekst/SMS + dyb link.
- Offline og notifikationer udskydes (se `data-capture-backlog.md`).

Opdater US-005 så den er:
- Klar og præcis.
- Klar til PO-godkendelse.

### 3. Opret US-006: Projektoprettelses-bug og forhindring af dubletter

Læs:
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-b-c-status.md`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\board.tsx` (eller tilsvarende fil hvor oprettelse sker)

Skriv en ny user story:
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-006-project-creation-bug.md`

User storyen skal dække:
- Fejlmeddelelsen "Fejl. Kunne ikke oprette projektet." vises, selvom projektet faktisk oprettes.
- Brugeren kan ende med to identiske projekter.
- Der skal ikke kunne oprettes to projekter med samme navn for samme bruger.
- Acceptkriterier skal være målbare (Gherkin).
- Afhængigheder, risici og åbne spørgsmål til PO.

## Output

Tre filer klar til PO-godkendelse:
1. `us-004-voice-create-collab.md`
2. `us-005-dynamic-lists-collab.md`
3. `us-006-project-creation-bug.md`

Returnér en kort opsummering:
- Hvad er ændret i US-004 og US-005.
- Hvad US-006 dækker.
- Eventuelle tilbageværende uafklarede spørgsmål, hvor PO skal tage stilling.

## Begrænsninger

- Må ikke kode.
- Må ikke starte builds.
- Må ikke ændre scope uden PO-go.
- Output skal godkendes af PO, før Flowagent designer det fulde arbejdsflow.

## Kontakt

Rapporter direkte til Master Agent (Claude Code). Spørg PO ved tvivl eller uklarhed.
