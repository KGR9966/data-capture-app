# TASK-B-C-REDO-010: Felt-for-felt flow-analyse af oprettelsesmodalen

## Baggrund

PO ønsker en dybere analyse af felterne i oprettelsesmodalen for Data Capture. Analysen skal vise, hvad hvert felt bruges til, hvordan det udfyldes, og hvordan felterne spiller sammen.

## Omfang

Analysen dækker følgende felter fra det foreløbige udkast til US-004:

1. Type-vælger (Idé, Fejl, Observation, Notat, Foto, Stemme, Andet)
2. Tekst / beskrivelse
3. Titel
4. Kategori
5. Foto (album/kamera + forhåndsvisning)
6. OCR-oversættelse
7. Ansvarlig
8. Gem / Annuller

Derudover skal analysen dække:
- Sammenhængen mellem Type og Kategori.
- Forskel på felter i "Optag" vs. "+ Tilføj".
- Hvordan stemmekommandoer påvirker felterne.
- Hvordan foto/OCR påvirker felterne.

## Output-format

For hvert felt skal der skrives:

| Punkt | Beskrivelse |
|---|---|
| **Navn** | Feltets navn |
| **Formål** | Hvad bruges feltet til? Hvilken værdi skaber det? |
| **Udfyldes af** | Bruger, stemme, foto/OCR, AI-forslag, arvet fra Type, andet |
| **Påvirker** | Hvilke andre felter påvirker dette felt? |
| **Påvirkes af** | Hvilke andre felter påvirker dette felt? |
| **Synlighed** | Altid, kun ved bestemt Type, kun ved foto, kun ved rettigheder |
| **Påkrævet / valgfrit** | Skal feltet have en værdi, før sagen kan gemmes? |
| **Validering** | Eventuelle regler for feltet |
| **Bemærkning** | Andet relevant |

Derudover skal der laves:
- Et **sekvensdiagram / flow** for oprettelse af en sag via Optag.
- Et **sekvensdiagram / flow** for oprettelse af en sag via +Tilføj.
- En **anbefaling af rækkefølge** af felterne i modalen.
- En **konkret anbefaling** af, hvordan Type og Kategori hænger sammen.

## Filer

Læs:
- C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-b-c-status.md
- C:\Users\kimgr\data-capture-app\.claude\team\design\us-004-voice-create-collab.md
- C:\Users\kimgr\data-capture-app\.claude\team\design\questions-for-po-004-005.md
- C:\Users\kimgr\data-capture-app\services\voiceCommands.ts
- C:\Users\kimgr\data-capture-app\components\VoiceCaptureModal.tsx
- C:\Users\kimgr\data-capture-app\app\(tabs)\board.tsx

Skriv resultatet til:
- C:\Users\kimgr\data-capture-app\.claude\team\design\us-004-field-flow-analysis.md

Returnér en kort opsummering med de vigtigste anbefalinger og eventuelle yderligere spørgsmål til PO.

## Begrænsninger

- Må ikke kode.
- Må ikke starte builds.
- Må ikke beslutte scope — kun analysere og anbefale.
