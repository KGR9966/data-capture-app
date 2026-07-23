# TASK-B-C-REDO-017: Kode — US-005 Dynamiske lister og søgeportal

## Formål

Implementér søge-redesignet (substring/fuzzy standard + smart syntaks supplement) og den nye "Lister"-portal, hvor brugeren kan oprette dynamiske lister fra søgninger, redigere og afkrydse punkter, samt dele lister via share-sheet og dybe links.

## Scope

- Søgning med substring/fuzzy som standard.
- Smart syntaks som supplement: `*ord*`, `"frase"`, `-negation`, `OR`, filtre (`type:`, `kategori:`, `status:`, `ansvarlig:`, `projekt:`, `has:photo`).
- Ny "Lister"-fane / portal.
- Projektspecifikke, brugeroprettede dynamiske lister.
- Generering af listepunkter fra valgte felter (titel, beskrivelse/noter, kategori).
- Streng auto-deduplikering og semantisk "måske duplikat"-markering.
- Sortering per liste (alfabetisk, dato, prioritet); default alfabetisk med done i bunden.
- Afkrydsning; valgfri status-synkronisering med kildesag.
- Dynamisk opdatering: nye matches markeres med badge; gråede punkter ved mismatch.
- Redigering, sletning og tilføjelse af egne punkter (opretter automatisk sag).
- Deling via native share-sheet og dyb link.

## Agent-tildeling

- **Developer Agent** — implementerer kodeændringer, commits og selvtest.
- **QA Agent** — peer review af koden.
- **Compliance/Security Agent** — reviewer Firestore-regler for lister og dybe links.

## Forudsætninger / afhængigheder

- Fase 4 (TASK-B-C-REDO-013) er godkendt for US-005-delen.
- Testplan-afsnit for US-005 foreligger (TASK-B-C-REDO-014).
- Søgearkitektur og data-model fra design-005 er låst.
- US-004 (TASK-B-C-REDO-016) behøver ikke være færdig, men søgedesign må ikke ændres efterfølgende uden PO-go.

## Input-filer (læs alle)

- `.claude/team/design/design-005-dynamic-lists.md`
- `.claude/team/design/us-005-dynamic-lists-collab.md`
- `.claude/team/test/testplan-b-c-redo-004-006.md`
- `C:\Users\kimgr\data-capture-app\services\search.ts`
- `C:\Users\kimgr\data-capture-app\services\checklists.ts` (hvis eksisterer)
- `C:\Users\kimgr\data-capture-app\services\items.ts`
- `C:\Users\kimgr\data-capture-app\services\share.ts` / `react-native-share`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\_layout.tsx`
- `C:\Users\kimgr\data-capture-app\app\+native-intent.ts` (hvis eksisterer)
- `C:\Users\kimgr\data-capture-app\app\(tabs)\search.tsx`
- Eksisterende Firestore-sikkerhedsregler.

## Arbejdsopgaver

### 1. Søgemotor
- Implementér substring/fuzzy-søgning som standardadfærd.
- Implementér smart syntaks-parser med de operatorer PO har godkendt.
- Definér søgbare felter (titel, beskrivelse, noter, evt. OCR/original tekst) efter design.
- Implementér debounce og performance-optimering.

### 2. Data-model
- Opret/opdatér `services/checklists.ts` og `services/checklistItems.ts`.
- Design Firestore-struktur: `projects/{projectId}/checklists/{checklistId}` og `projects/{projectId}/checklists/{checklistId}/items/{itemId}` (eller tilsvarende).
- Sikr at lister er projektspecifikke og brugeroprettede.
- Implementér valgfri status-synkronisering mellem listepunkt og kildesag.

### 3. Portal og listevisning
- Opret ny "Lister"-fane i `app/(tabs)/lists.tsx`.
- Vis kort med listenavn, antal åbne/udførte, seneste opdatering og "Dynamisk"-badge.
- Ved åbning af liste: vis alle punkter, nye matches markeret.
- Implementér sorteringsvælger og husk valget per liste.
- Udførte punkter gråes/gennemstreget og placeres i bunden.

### 4. Generering og håndtering af punkter
- Implementér generering af punkter fra valgte felter (titel, beskrivelse/noter, kategori).
- Aftalt parsingregel fra design-005 anvendes (linjeskift, `- `, `* `, sætninger, bruger-markeret).
- Streng deduplikering på normaliseret tekst.
- Semantiske dubletter markeres med "måske duplikat"-badge og kan slettes manuelt.
- Punkter gråes ud (fjernes ikke) når kildesag ikke længere matcher.

### 5. Redigering og egne punkter
- Brugeren kan redigere titel/noter og slette punkter.
- Brugeren kan tilføje egne punkter; der oprettes automatisk en sag, der matcher listens søgning.

### 6. Deling
- Implementér native share-sheet med tekstoversigt: navn, antal udførte/total og åbne punkter.
- Implementér dyb link, der åbner listen direkte i appen.
- Sikr rettighedstjek ved åbning af dyb link (modtager skal have adgang til projektet).

### 7. Sikkerhedsregler
- Opdatér Firestore-sikkerhedsregler for `checklists` og `checklistItems` efter compliance-godkendelse.
- Sikr at projektmedlemmer kun ser lister inden for deres projekt.

### 8. Selvtest
- Kør TypeScript og lint.
- Verificér manuelt i simulator/dev-client:
  - Substring/fuzzy-søgning.
  - Smart syntaks-operatorer.
  - Oprettelse af liste fra søgning.
  - Deduplikering og semantiske dubletter.
  - Sortering og afkrydsning.
  - Dynamisk opdatering (nye matches, gråede punkter).
  - Deling og dybe links.

## Review-punkter

- [ ] Søgning standard er substring/fuzzy; smart syntaks supplement.
- [ ] "Punkt"-udledning matcher PO-beslutning.
- [ ] Dynamisk opdatering, afkrydsning, done-i-bunden, deling og dybe links implementeret.
- [ ] Firestore-regler er reviewed af Compliance Agent.
- [ ] Performance er acceptable; læseomkostninger begrænset.
- [ ] Selvtest og peer review gennemført.

## Output / deliverables

- Commits med klare beskeder.
- Opdateret/ny `services/search.ts`.
- Ny/Opdateret `services/checklists.ts` og eventuel `services/checklistItems.ts`.
- Ny `app/(tabs)/lists.tsx`.
- Ny listevisningsskærm (f.eks. `app/checklist.tsx` eller tilsvarende).
- Opdateret deling/dyb link-håndtering.
- Opdaterede Firestore-sikkerhedsregler.
- `.claude/team/dev/dev-notes-b-c-redo-v2.md` med kendte begrænsninger.

## Go/no-go gate

**Go-kriterier:**
- Koden følger design-005.
- TypeScript og lint er grønne.
- Selvtest ok.
- Peer review gennemført.

**No-go-kriterier:**
- Søgning opfylder ikke design-005.
- Lister opdateres ikke dynamisk.
- Dyb link uden rettighedstjek.
- TypeScript/lint fejl.

## PO-go kræves

- **Nej** i denne fase, men PO-beslutninger forudsættes dokumenteret i designfasen.
- **PO-go kræves** før build (fase 9).

## Begrænsninger

- Må ikke ændre scope uden PO-go.
- Må ikke starte builds.
- Må ikke røre ved US-004 eller US-006 uden PO-go.
- Må ikke deploye til produktion.
- Offline redigering og push-notifikationer er bevidst ude af scope (se `data-capture-backlog.md`).

## Kontakt

Rapporter til Master Agent. Eskaler blocker og afklaringsbehov til PO.
