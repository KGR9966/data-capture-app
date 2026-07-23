# TASK-B-C-REDO-016: Kode — US-004 Ensartet og robust optagelse/oprettelse af sager

## Formål

Implementér en robust auto-gem-funktion i Optag, sikr at optagelsen ikke stopper under aktiv indtaling, og gør de to oprettelsesveje ("Optag" og "+ Tilføj") ensartede og forudsigelige via en fælles formular-komponent.

## Scope

- Genetablering af auto-gem i `VoiceCaptureModal` med konfigurerbar stilhedstimer.
- Robust håndtering af optagelse og OS-timeout.
- Fælles `CreateItemForm`-komponent brugt af både "Optag" og "+ Tilføj".
- Ensartede felter: Type, Tekst/beskrivelse, Titel, Kategori, Foto, OCR-oversættelse, Ansvarlig, Gem/Annuller.
- AI-forslag til Type og Kategori med brugeroverride.
- Stemmekommandoer (gem, slet alt, kategori, punktum/komma/ny linje).
- Regression: OCR, oversættelse, deling, fotoalbum/kamera, tildeling.

## Agent-tildeling

- **Developer Agent** — implementerer kodeændringer, commits og selvtest.
- **QA Agent** — peer review af koden.
- **Compliance/Security Agent** — reviewer hvis AI/data-flow ændres væsentligt.

## Forudsætninger / afhængigheder

- Fase 4 (TASK-B-C-REDO-013) er godkendt for US-004-delen.
- Testplan-afsnit for US-004 foreligger (TASK-B-C-REDO-014).
- US-006 (TASK-B-C-REDO-015) er kodefærdig eller kører i en stabil, isoleret branch.

## Input-filer (læs alle)

- `.claude/team/design/design-004-voice-create.md`
- `.claude/team/design/us-004-voice-create-collab.md`
- `.claude/team/test/testplan-b-c-redo-004-006.md`
- `C:\Users\kimgr\data-capture-app\hooks\useVoiceRecognition.ts`
- `C:\Users\kimgr\data-capture-app\components\VoiceCaptureModal.tsx`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\board.tsx`
- `C:\Users\kimgr\data-capture-app\services\items.ts`
- `C:\Users\kimgr\data-capture-app\services\categories.ts`
- `C:\Users\kimgr\data-capture-app\services\media.ts`
- `C:\Users\kimgr\data-capture-app\services\ocr.ts`
- `C:\Users\kimgr\data-capture-app\services\translation.ts`
- `C:\Users\kimgr\data-capture-app\services\roles.ts`
- `C:\Users\kimgr\data-capture-app\services\voiceCommands.ts` (hvis eksisterer)

## Arbejdsopgaver

### 1. Fælles formular-komponent
- Opret `CreateItemForm`-komponent med alle fælles felter i PO-godkendt rækkefølge.
- Sikr at komponenten accepterer props, der styrer: header-titel, visning af optageknap, auto-gem toggle, hjælpetekst, onSubmit, onCancel.
- Hold UI-sammensætning adskilt fra servicekald for at minimere regressionsrisiko.

### 2. Auto-gem og robust optagelse
- Genetabler auto-gem: gem efter 5 sekunders stilhed, når `isFinal`-resultater er modtaget.
- Sørg for, at optagelsen ikke stopper under aktiv indtaling.
- Implementér levende timer med optagelsens varighed.
- Håndtér OS-timeout: kort afbrydelse genoptages automatisk; lang afbrydelse informerer brugeren og tilbyder ny optagelse med bevaret tekst.
- Efter auto-gem: modal forbliver åben klar til næste optagelse.

### 3. Type og Kategori
- Implementér Type-vælger med chips: Idé, Fejl, Observation, Notat, Foto, Stemme, Andet.
- `Fejl` vises i stedet for `Bug`.
- Implementér Kategori-autocomplete med projekt-historik og AI-forslag.
- Type sætter kun default-kategori; bruger kan altid overskrive.

### 4. Titel og validering
- Auto-udled titel fra første linje / første 6 ord.
- Titelfelt er valgfrit og kan redigeres eksplicit.
- Gem-knap aktiveres, når der er tekstindhold eller foto.
- Formularen resettes ved åbning.

### 5. Stemmekommandoer
- "gem": gem sagen, stop optagelse, luk modal.
- "slet alt": ryd tekstfelt; original tekst gemmes og kan kopieres/deles.
- Kategori fra stemme: første ord/udsagn bruges som kategori og fjernes fra tekstfeltet.
- Stemme-kategori vinder over AI-forslag.
- Punktum, komma, ny linje, skift, slet sidste ord, fortryd understøttes.

### 6. Regressionssikring
- Sikr at OCR-oversættelse, Kopiér/Del, fotoalbum/kamera, ansvarlig-tildeling fungerer i den fælles formular.
- Efter gem: sag vises øjeblikkeligt i board med alle felter bevaret.

### 7. Selvtest
- Kør TypeScript og lint.
- Verificér manuelt i simulator/dev-client:
  - Auto-gem med og uden toggle.
  - Kontinuerlig tale.
  - OS-timeout-simulering (hvor muligt).
  - Ensartethed mellem "Optag" og "+ Tilføj".
  - Stemmekommandoer.
  - AI-forslag til Type/Kategori.
  - Regression: OCR, oversættelse, deling, foto, tildeling.

## Review-punkter

- [ ] Fælles felter og rækkefølge matcher design-004.
- [ ] Auto-gem stopper ikke under aktiv indtaling.
- [ ] Formularen resettes korrekt.
- [ ] Stemmekommandoer implementeret efter PO-afklaringer.
- [ ] AI-forslag er ikke-tvingende.
- [ ] Regressionstestet: OCR, oversættelse, deling, foto, tildeling.

## Output / deliverables

- Commits med klare beskeder.
- Ny/Opdateret fælles formular-komponent (f.eks. `components/CreateItemForm.tsx`).
- Opdateret `components/VoiceCaptureModal.tsx`.
- Opdateret `app/(tabs)/board.tsx`.
- Opdaterede hooks/services efter behov.
- `.claude/team/dev/dev-notes-b-c-redo-v2.md` med kendte begrænsninger (f.eks. OS-timeout-grænser).

## Go/no-go gate

**Go-kriterier:**
- Koden følger design-004.
- TypeScript og lint er grønne.
- Selvtest ok.
- Peer review gennemført.

**No-go-kriterier:**
- Optagelse stopper stadig uventet.
- Fælles formular mangler felter eller rækkefølge.
- Regressionsfejl i OCR, oversættelse, deling eller foto.
- TypeScript/lint fejl.

## PO-go kræves

- **Nej** i denne fase, men PO-afklaringer forudsættes dokumenteret i designfasen.
- **PO-go kræves** før build (fase 9).

## Begrænsninger

- Må ikke ændre scope uden PO-go.
- Må ikke starte builds.
- Må ikke røre ved US-005 uden PO-go.
- Må ikke ændre godkendt funktionalitet uden PO-go (princippet om "godkendt funktionalitet må ikke ændres").
- Må ikke deploye til produktion.

## Kontakt

Rapporter til Master Agent. Eskaler blocker og afklaringsbehov til PO.
