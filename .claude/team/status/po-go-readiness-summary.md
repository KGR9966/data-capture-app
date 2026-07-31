# PO-go readiness summary — bug/backlog-runde

**Dato:** 2026-07-15  
**Master Agent:** Data Capture  
**Omfang:** B3, B4, B8, B9, D1, D3, US-005-wildcard, UI-001, ARCH-001, REG-001

---

## 1. Oversigt

Runden indeholder syv designfærdige use cases/bugs plus ét UI/UX-review og to tværgående oprydningsopgaver (use case-arkiv og Firestore-regelrettelse). Størstedelen er klar til kodefase med forbehold om Cloud Functions-setup og native rebuilds; to items kræver PO-afklaring eller deploy inden build.

---

## 2. Gennemgang use case for use case

### US-005-wildcard: Præcis / wildcard-søgning
- **Design:** Aktiverer `"..."` som whole-word/phrase-match og `*...*` som hele-ord wildcard; almindelig tekst forbliver substring. Ingen parserændring — kun matcher-/highlight-logik og et hint.
- **Vurdering:** Lavest kompleksitet i runden; ren client-side ændring i `services/search.ts` med unit tests. Tre små valg er truffet inden for mandat (wildcard = hele ord, permanent hint, prefix/suffix `*` tilladt).
- **Anbefaling:** **Go.** PO bør bekræfte at hintet skal vises permanent, da det påvirker søgefeltets layout.

### US-011 / B4: Push-påmindelser på sager og listepunkter
- **Design:** Lokale `expo-notifications`-påmindelser på sag/listepunkt med dato/tid, gentagelse (en gang/daglig/ugentlig), note, redigering/sletning og routing ved tryk. Data gemmes personligt i `/users/{userId}/reminders`.
- **Vurdering:** Scope er velafgrænset (lokale notifikationer, ikke server push/FCM). Afhænger af `expo-notifications`, som dog allerede er installeret. Risici omkring iOS-grænse for planlagte notifikationer og tidszoneændringer er dækket.
- **Anbefaling:** **Go med forbehold:** testplan skal dække fysisk iOS + Android, da push-adfærd varierer mellem OS. Web får ikke push i denne runde.

### US-005 / B3: Offline understøttelse af lister
- **Design:** Cache af checkliste-metadata og punkter i `AsyncStorage`; pending-operationer (toggle, update, add, delete, mark_viewed) synkroniseres ved online-tilstand. Kræver `@react-native-community/netinfo`.
- **Vurdering:** Største risiko i runden: ny native dependency medfører EAS-rebuild; konfliktløsning er last-write-wins (acceptabelt for enejer-brug, men skal dokumenteres); dynamisk re-match og ny liste-oprettelse er online-only.
- **Anbefaling:** **Go med forbehold:** native rebuild + manuel test i flymode før EAS build; vurder krypteret lagring senere hvis noter bliver følsomme.

### US-001 / B9: Slet projekt og tilhørende data
- **Design:** Kun ejer kan slette projekt; hard delete fjerner projekt, medlemmer, sager, checkpoints, kommentarer, checklister, fotos i Storage og lokale reminders. Cloud Function anbefalet; tekstbekræftelse med projektets navn.
- **Vurdering:** Højrisiko-handling, men godt forsvar i dybde (UI kun for ejere, tekstbekræftelse, Firestore rules, server-side ejerskabs-check, audit-log). Cloud Function centraliserer cascade-delete og undgår partielle sletninger.
- **Anbefaling:** **Go med forbehold:** kræver Cloud Functions-miljø; PO skal bekræfte hard delete (ikke soft delete/papirkurv) og at admin ikke må slette.

### US-006 / B8: Tomt projektnavn + server-side dubletter
- **Design:** Client-side trim + min-length; Cloud Function `createProject` revaliderer tomt navn og dubletter case-insensitivt for den aktuelle bruger; eksisterende dubletter lades være.
- **Vurdering:** Bugfix med klar root cause; server-side validering er nødvendig fordi Firestore rules ikke kan lave unikhedstjek. PO-aftaler er allerede dokumenteret (gamle dubletter lades være, unikhed kun egne projekter).
- **Anbefaling:** **Go med forbehold:** Cloud Function-setup; sikr at client-side og server-side normalisering (`trim().toLowerCase()`) holdes i sync.

### US-004 / D1: Fjern "Åben"/"åbn"-residu efter foto-kommando
- **Design:** Ny `stripPhotoCommand()` fjerner foto-kommando + foranstående aktionsord (`åbn`, `åben`, `åbne`, `tag`, `vælg`, `et`) før titel/content bygges. `VoiceCaptureModal` simplificeres så dobbelt parse-runde fjernes.
- **Vurdering:** Lokal bug med tydelig root cause; ændringer er koncentreret i `services/voiceCommands.ts` og `components/VoiceCaptureModal.tsx`. Risiko for utilsigtet trigger af `kamera`/`album` som almindelige ord bevares uændret.
- **Anbefaling:** **Go med forbehold:** PO skal bekræfte om `kamera`/`album` fortsat skal fungere som enkeltords-triggere, eller om de fremover skal kræve "åbn" foran. Kør `verify-voice-parser.ts` før/efter.

### US-004 / D3: Auto-titel må ikke overskrive manuelt redigeret titel
- **Design:** Allerede implementeret (commit `7ccdcb1`). `titleTouchedRef` stopper auto-udledning når brugeren selv har redigeret titlen; gem-fallback bevares.
- **Vurdering:** Lav risiko; fokus er verifikation og opdatering af baseline testplan. Eventuel visuel auto-vs-manuel indikator kan tilføjes separat.
- **Anbefaling:** **Go.** Kræver manuel acceptance-test af flowet "Due → Duer" og regressionstest af voice-flow/type/kategori.

### UI-001: UI/UX-polish (Board-knapper, ansvarlig i liste, kommentar-bug)
- **Design:** Tre hurtige fixes: fast `width` på Board-knapper; vis `assignedTo` i checklist-item-card; adskil header fra `KeyboardAvoidingView` i `item.tsx` så "Tilbage" ikke forsvinder ved kommentar.
- **Vurdering:** Kommentar-buggen er kritisk UX-blokering og nem at rette. Ansvarlig-visning kræver enten data-berigelse i synkronisering eller opslag i `projectItems`-state. Knapper er rent style-arbejde.
- **Anbefaling:** **Go med forbehold:** testcases er endnu TBD; kommentar-bug bør prioriteres højest.

### ARCH-001: Usecase-arkivering
- **Design:** Centralt arkiv over godkendte user stories med krydsreferencer, datoer og vigtige PO-beslutninger. D1/D3 referencer rettet.
- **Vurdering:** Ren dokumentationsopgave; ingen kodepåvirkning.
- **Anbefaling:** **Go.**

### REG-001: Firestore-regelrettelse — checkpoints accepterer email-medlemmer
- **Status:** Rettet i kode, men **ikke deployet**.
- **Vurdering:** Blokerer build indtil manuelt deploy i Firebase Console.
- **Anbefaling:** **Deploy før PO-go til build.** Udgør ikke selvstændig udviklingsopgave, men en gate-forudsætning.

---

## 3. Tværgående risici

| Risiko | Berørte use cases | Betydning |
|---|---|---|
| **Cloud Functions-setup** | B8 (createProject), B9 (deleteProject) | Hvis functions-miljøet ikke er initialiseret, skal det sættes op, deployes og testes. Påvirker tidsplan og Firebase-billing. |
| **Native rebuild / EAS** | B3 (netinfo), B4 (push notifikationer eksisterer) | B3 kræver ny native dependency; B4 bruger eksisterende `expo-notifications`, men skal testes på fysisk enhed. Begge kræver ny EAS build. |
| **Firestore rules deploy** | B8, B9, REG-001 | B8 justerer `projects` create-regel; REG-001 er rettet men ikke deployet. Kræver koordineret deploy og regressionstest. |
| **Voice-flow regression** | D1, D3 | Begge berører `CreateItemForm` / `VoiceCaptureModal`. Kør `verify-voice-parser.ts` og baseline voice-tests før merge. |
| **Projektoprettelse / sletning ejerskab** | B8, B9 | Kombinationen af ny create- og delete-logik skal testes sammen; særligt aktivt projekt nulstilles korrekt ved sletning. |
| **UI-koordination i `item.tsx`** | D3, UI-001 (kommentar-bug) | Hvis begge ændrer `item.tsx`, skal de merges uden konflikt; kommentar-fix bør lande først. |
| **Scope creep: soft delete, server push, fælles reminders** | B9, B4 | Holdes ude af scope, men PO bør eksplicit bekræfte for at undgå senere diskussion. |

---

## 4. Samlet anbefaling

Runden er **klar til PO-go til kodefase og testplan** under følgende forudsætninger:

1. REG-001 deployes manuelt i Firebase Console **inden** kodefasen afsluttes.
2. Cloud Functions-miljøet verificeres/initialiseres til B8 og B9.
3. UI-001 får TBD-testcases skrevet i testplan-fasen.
4. `@react-native-community/netinfo` installeres tidligt i kodefasen pga. native rebuild.

Alle design-dokumenter er færdige, og de nødvendige PO-afklaringer er truffet. Der er ingen reelt åbne spørgsmål tilbage.

---

## 5. Beslutninger truffet / bekræftet af PO

| # | Emne | Valg | Hvem besluttede |
|---|---|---|---|
| 1 | **US-005-wildcard:** søgehint under søgefeltet | Permanent hint | Master Agent inden for mandat |
| 2 | **US-001 / B9:** slet-projekt | Hard delete + Cloud Function + tekstbekræftelse + kun owner | PO godkendte Cloud Function; øvrige detaljer følger designets anbefaling |
| 3 | **US-004 / D1:** `kamera`/`album` trigger | Beholdes uændret som enkeltord-trigger | Master Agent inden for mandat (scope er kun fjernelse af residu, ikke ændring af trigger-logik) |
| 4 | **B3 / offline lister:** netværksdetektion | Native rebuild med `@react-native-community/netinfo` | PO godkendt 2026-07-15 |
| 5 | **B8 / US-006:** createProject unikhed | Cloud Function med server-side revalidering | PO godkendt 2026-07-15 |

## 6. Ægte forudsætninger før build-go

| # | Forudsætning | Handling | Ansvarlig |
|---|---|---|---|
| 1 | Deploy opdaterede Firestore Rules (REG-001) | Kopier `firestore.rules` til Firebase Console og publish | PO / Firebase Console |
| 2 | Initialiser/verificer Cloud Functions-miljø | Sørg for at `functions/` kan deployes til Firebase | Developer Agent / PO |
| 3 | UI-001 testcases skrives | Test Manager indarbejder de tre UI-fixes i testplan | Test Manager Agent |
| 4 | Native rebuild for `@react-native-community/netinfo` (B3) | `npx expo install @react-native-community/netinfo` og ny EAS build | Developer Agent / EAS |
