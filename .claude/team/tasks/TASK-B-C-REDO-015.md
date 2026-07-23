# TASK-B-C-REDO-015: Kode — US-006 Ret projektoprettelsesfejl og forhindr dubletter

## Formål

Implementér rettelsen af den kritiske "Kunne ikke oprette projektet"-fejl og indfør validering, der forhindrer oprettelse af projekter med samme navn for den aktuelle bruger. Formålet er at give korrekt feedback og fjerne risikoen for utilsigtede dubletter.

## Scope

- Fejlsøgning og rettelse af falsk fejlmeddelelse i projektoprettelsesflowet.
- Idempotent oprettelsesflow med klar loading/success/fejl-tilstand.
- Duplicate-tjek af projektnavn (trimmet, case-insensitivt) for brugerens egne projekter.
- Håndtering af eksisterende dubletter efter PO-beslutning.
- Firestore-sikkerhedsregler opdateres efter compliance-godkendelse.

## Agent-tildeling

- **Developer Agent** — implementerer kodeændringer, commits og selvtest.
- **QA Agent** — peer review af koden.
- **Compliance/Security Agent** — reviewer Firestore-regelændringer.

## Forudsætninger / afhængigheder

- Fase 4 (TASK-B-C-REDO-013) er godkendt for US-006-delen.
- Testplan-afsnit for US-006 foreligger (TASK-B-C-REDO-014).
- PO har besluttet:
  - Unikhedsscope for projektnavne.
  - Håndtering af eksisterende dubletter.
  - Beskedtekst ved dublet.
  - Om beskrivelse medtages i duplicate-tjek.

## Input-filer (læs alle)

- `.claude/team/design/design-006-project-creation.md`
- `.claude/team/design/us-006-project-creation-bug.md`
- `.claude/team/test/testplan-b-c-redo-004-006.md`
- `C:\Users\kimgr\data-capture-app\services\projects.ts`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\index.tsx`
- `C:\Users\kimgr\data-capture-app\hooks\useProject.tsx` (eller tilsvarende context)
- Eksisterende Firestore-sikkerhedsregler.

## Arbejdsopgaver

### 1. Fejlsøgning
- Log hvert trin i `handleCreateProject` og `createProject` for at identificere, hvor den falske fejlmeddelelse opstår.
- Verificér rækkefølgen af operationer: Firestore-skrivning, members-subcollection, state-opdatering, navigation, rettighedstjek.
- Dokumentér årsagen i `.claude/team/dev/dev-notes-b-c-redo-v2.md`.

### 2. Ret oprettelsesflowet
- Sørg for, at `setActiveProject` og `router.push` kun kører efter bekræftet Firestore-skrivning.
- Implementér klar loading-tilstand; deaktivér "Opret"-knappen under oprettelse.
- Håndtér ukendte fejl med tilbageskridt (slet delvist oprettet projekt, hvis muligt) eller klar besked.
- Efter vellykket oprettelse: luk modal, nulstil navn/beskrivelse, sæt aktivt projekt og naviger til board.

### 3. Duplicate-tjek
- Implementér trimmet, case-insensitivt tjek mod brugerens egne projekter (scope efter PO-beslutning).
- Vis valideringsfejl direkte under projektnavn-feltet.
- Blokér oprettelse, hvis der findes et eksisterende projekt med samme navn.
- Håndtér scenariet med eksisterende dubletter (f.eks. merge, omdøb, eller blokér ny oprettelse indtil reduceret til ét).

### 4. Sikkerhedsregler
- Opdatér Firestore-sikkerhedsregler for `projects` og `members` efter compliance-godkendelse.
- Sikr at reglerne understøtter unikhedsreglen uden at åbne for nye sikkerhedshuller.

### 5. Selvtest
- Kør TypeScript og lint.
- Verificér manuelt i simulator/dev-client:
  - Gyldig oprettelse.
  - Faktisk fejl (simuleret netværksfejl).
  - Dublet-tjek med forskellig casing og mellemrum.
  - Gentagne klik på "Opret".

## Review-punkter

- [ ] Årsagen til falsk fejlmeddelelse er dokumenteret.
- [ ] Oprettelsesflowet er idempotentsikkert.
- [ ] Duplicate-tjek matcher PO-beslutning (scope, casing, trim).
- [ ] Firestore-regler er reviewed af Compliance Agent.
- [ ] Selvtest og peer review gennemført.

## Output / deliverables

- Commits med klare beskeder.
- Opdateret `services/projects.ts`.
- Opdateret `app/(tabs)/index.tsx`.
- Opdaterede Firestore-sikkerhedsregler (hvis relevant).
- `.claude/team/dev/dev-notes-b-c-redo-v2.md` med fejlsøgningsnoter og kendte begrænsninger.

## Go/no-go gate

**Go-kriterier:**
- Koden følger design-006.
- TypeScript og lint er grønne.
- Selvtest ok.
- Peer review gennemført.

**No-go-kriterier:**
- Fejlårsagen ikke identificeret.
- Unikhedsregel ikke afklaret med PO.
- TypeScript/lint fejl.

## PO-go kræves

- **Nej** i denne fase, men PO-beslutninger forudsættes dokumenteret i designfasen.
- **PO-go kræves** før build (fase 9).

## Begrænsninger

- Må ikke ændre scope uden PO-go.
- Må ikke starte builds.
- Må ikke røre ved US-004 eller US-005 uden PO-go.
- Må ikke deploye til produktion.

## Kontakt

Rapporter til Master Agent. Eskaler blocker og afklaringsbehov til PO.
