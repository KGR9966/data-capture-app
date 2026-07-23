# QA-rapport — Build 2 (US-004 + US-005)

**Dato:** 2026-07-15
**QA Agent:** Claude
**Scope:** US-004 (Ensartet og robust optagelse/oprettelse af sager) + US-005 (Dynamiske lister og søgeportal)
**Build:** Build 2
**Miljø:** Expo SDK 57 / React Native 0.86 / New Architecture

---

## 1. Kørede automatiserede checks

| Check | Kommando | Resultat |
|---|---|---|
| Lint | `npm run lint` | 🟢 Bestået (`expo lint` — ingen fejl rapporteret) |
| TypeScript | `npm run typecheck` | 🟢 Bestået (`tsc --noEmit`) |
| Pre-test check | `npm run pre-test-check` | 🟡 Bestået med 1 warning: Pakkeversions-tjek kunne ikke gennemføres |

**Bemærkning:** Pre-test-check rapporterer "Kunne ikke tjekke pakker" som warning, men ellers er alle gate-checks (TypeScript, lint, native imports, dybe links, route-eksport) grønne. Warningen er ikke blocker for Build 2, men bør undersøges inden produktionsbuild.

---

## 2. Status per testkategori

### US-004 — Voice / Create Item

| Kategori | Status | Bemærkning |
|---|---|---|
| Ensartede felter og rækkefølge | 🟢 | Begge oprettelsesveje (`+ Tilføj` og `Optag`) bruger `CreateItemForm` og viser samme felter i samme rækkefølge. |
| Auto-gem / stilhedstimer | 🟡 | 5-sekunders stilhedstimer er implementeret og gemmer uden at lukke modalen. Timeout ved auto-gem fra er sat til 1 time, hvilket teknisk opfylder "fortsætter indtil bruger stopper", men er afhængig af OS-timeout. |
| OS-timeout håndtering | 🟡 | Kort afbrydelse (< 3 s) genstartes automatisk (op til 3 forsøg). Lang afbrydelse viser Alert med "Start ny optagelse" / "Luk", men tilbyder ikke direkte "Gem"-handling som acceptkriteriet beskriver. |
| Stemmekommandoer | 🟡 | "Gem", "slet alt", kategori-præfix og tegnsætning er implementeret. "Fortryd" behandles dog som "slet alt" (rydder hele teksten), hvilket afviger fra hjælpetekstens signal om en separat kommando. |
| AI-forslag til type/kategori | 🟡 | Kategori-forslag fra `suggestCategory` er implementeret. **Type-forslag fra tekstindhold er ikke implementeret** — type ændres kun via stemmekommando eller manuelt tryk. |
| Validering (tekst eller foto) | 🟢 | `canSave` i `CreateItemForm` og validering i `board.tsx` / `VoiceCaptureModal` kræver tekst, titel eller foto. |
| Reset af formular | 🟢 | Formularen resettes ved åbning af begge modalers. |
| Regression: OCR, oversættelse, Kopiér/Del, ansvarlig | 🟡 | OCR, oversættelse, kopiér/del og ansvarlig er bevaret. Type ændres til `photo` ved foto, men **efter brugeren manuelt har valgt en type, låses type-valget** (`userLockedTypeRef`), så foto ikke længere kan tvinge type til `photo`. Dette kræver PO-afklaring (åbent spørgsmål Q-001). |

### US-005 — Dynamiske lister og søgeportal

| Kategori | Status | Bemærkning |
|---|---|---|
| Substring/fuzzy som default | 🟢 | `search.ts` matcher substrings som default; hele ord kræver `*ord*`. |
| Smart syntaks supplement | 🟢 | Phrase (`"..."`), negation (`-`), `OR` og `type:/kategori:/status:/has:/ansvarlig:` filtre er implementeret. |
| Dynamisk liste-oprettelse med dialog | 🟢 | `search.tsx` viser konfigurationsdialog med navn, kildefelter, sortering og status-synk. |
| Punkt-parsing og deduplikering | 🟢 | Linjeskift og `- `/`* `-præfiks parses til punkter. Strenge dubletter fjernes; semantiske dubletter markeres med "Måske duplikat". |
| Sortering, afkrydsning, status-synk | 🟡 | Sortering og afkrydsning fungerer. Status-synk til kildesag virker, men **ved fjernelse af afkrydsning sættes kildesag altid til `in_progress`, ikke tilbage til forrige/`new`**. |
| Dynamisk opdatering | 🔴 | **`synchronizeDynamicChecklist` kaldes kun én gang pga. `hasSyncedRef.current`** i `app/checklist.tsx`. Nye matches efter første åbning opdateres ikke live. Dette bryder US-005 acceptkriterier 10 + 11. |
| Portalvisning | 🟢 | `app/(tabs)/checklists.tsx` viser kort med åbne/udførte, seneste opdatering, "Dynamisk"-badge og "Nyt"-badge. |
| Deling og dyb link | 🟡 | Share-sheet tekst og dyb link er implementeret; rettighedstjek ved dyb link er implementeret. `+native-intent.ts` ruter `/checklist`, men route-URL-formatet (`datacapture://checklist?id=...`) bør testes fysisk på både iOS og Android. |

### Tværgående / Regression

| Kategori | Status | Bemærkning |
|---|---|---|
| Lint / TypeScript | 🟢 | Ingen fejl. |
| UI-labels (Bug vs Fejl) | 🟡 | `CreateItemForm` viser `bug` som "Fejl", men `search.tsx` og `services/search.ts` viser stadig "Bug". Inkonsistent. |
| Rute-eksport / deeplink helpers | 🟢 | `pre-test-check` bekræfter alle routes har default exports. |

---

## 3. Fundne problemer rangeret efter alvorlighed

### 🔴 Kritisk

1. **Dynamisk opdatering kører kun én gang (`app/checklist.tsx`)**
   - **Fil:** `app/checklist.tsx`, linje ~112 + 168-175
   - **Problem:** `hasSyncedRef` sættes til `true` første gang `projectItems` modtages, hvorefter `synchronizeDynamicChecklist` aldrig kaldes igen. Nye matches opdateres ikke live; forsvundne matches markeres ikke som stale før brugeren lukker og genåbner listen.
   - **Impact:** Bryder US-005 acceptkriterie 10 (nye matches markeres med "nyt"-badge) og 11 (forsvundne matches gråes ud).
   - **Anbefalet rettelse:** Fjern `hasSyncedRef`-guarden, eller reset ref ved `checklistId`-skift og tillad re-sync når `projectItems` ændrer sig. Overvej en separat realtids- eller polling-strategi for store lister.

### 🟡 Høj / Medium

2. **AI-forslag til type fra tekstindhold mangler**
   - **Filer:** `components/CreateItemForm.tsx`, `components/VoiceCaptureModal.tsx`
   - **Problem:** Type ændres kun via stemmekommando eller manuelt chip-tryk. Der er ingen AI/logik der foreslår `bug`, `idé` osv. ud fra selve tekstindholdet.
   - **Impact:** Bryder US-004 acceptkriterie 9 delvist og PO-afklaring #2.
   - **Anbefalet rettelse:** Udvid `suggestCategory` (eller tilføj `suggestType`) til at analysere `title` + `content` og foreslå både type og kategori. Sørg for at brugerens manuelle valg altid vinder.

3. **Status-synkronisering ved fjernelse af afkrydsning sætter altid `in_progress`**
   - **Fil:** `services/checklists.ts`, `toggleChecklistItemComplete` linje 530
   - **Problem:** Ved afkrydsning sættes kildesag til `done`; ved fjernelse af afkrydsning sættes den altid til `in_progress`, ikke tilbage til forrige status (f.eks. `new`).
   - **Impact:** Bryder US-005 acceptkriterie 9 og er uforudsigeligt for brugeren.
   - **Anbefalet rettelse:** Gem forrige status på listepunktet (`sourceStatusBeforeSync`) og tilbagefør til den ved fjernelse af afkrydsning.

4. **Lang OS-timeout viser ikke "Gem"-mulighed**
   - **Fil:** `components/VoiceCaptureModal.tsx`, `onEnd` handler
   - **Problem:** Ved lang afbrydelse gives kun "Start ny optagelse" og "Luk". Der er ingen knap der gemmer det optagede.
   - **Impact:** Bryder US-004 acceptkriterie 4 og 17 delvist; brugeren kan miste optagelse hvis de trykker "Luk" i stedet for at finde Gem-knappen.
   - **Anbefalet rettelse:** Tilføj en "Gem"-knap i Alert'en, der kalder `handleSaveInternal(true)`.

5. **Type låses ved ethvert manuelt chip-valg, hvilket blokerer auto-skift til `photo`**
   - **Fil:** `components/CreateItemForm.tsx`, `handleSelectType` linje 201-203
   - **Problem:** `userLockedTypeRef.current = true` sættes ved ethvert tryk på en type-chip. Når brugeren derefter tilføjer et foto, skifter type ikke automatisk til `photo`.
   - **Impact:** TC-004.18 forventer type = `Foto` medmindre brugeren aktivt har låst. Nuværende adfard anser ethvert manuelt valg som låst (åbent spørgsmål Q-001).
   - **Anbefalet rettelse:** PO-afklaring nødvendig. Forslag: type er kun "låst" hvis brugeren eksplicit har trykket en type-chip EFTER foto er tilføjet, eller hvis type er sat via stemmekommando.

### 🟢 Lav

6. **"Fortryd"-kommando rydder hele teksten**
   - **Fil:** `services/voiceCommands.ts`
   - **Problem:** `fortryd` er i `CLEAR_COMMANDS` og behandles som "slet alt". Hjælpeteksten signalerer dog "slet sidste ord, fortryd, slet alt" som tre forskellige kommandoer.
   - **Anbefalet rettelse:** Skil "fortryd" fra "slet alt"; "fortryd" kunne implementeres som undo af sidste tekstændring (f.eks. gendan `clearedOriginalText`).

7. **Inkonsekvent label for `bug` — "Bug" vs "Fejl"**
   - **Filer:** `app/(tabs)/search.tsx`, `services/search.ts`
   - **Problem:** UI viser `bug` som "Bug" i søgeresultater, mens resten af appen bruger "Fejl".
   - **Anbefalet rettelse:** Genbrug `ITEM_TYPE_LABELS` fra `CreateItemForm` eller opdater labels i `search.tsx` / `search.ts`.

8. **Pre-test-check warning: Pakkeversions-tjek kunne ikke gennemføres**
   - **Fil:** `scripts/pre-test-check.js`
   - **Problem:** Ukendt årsag; kan være netværks- eller miljørelateret.
   - **Anbefalet rettelse:** Kør check igen med verbose output; verificér at `expo-doctor` / `npx expo install --check` kører OK.

---

## 4. Konklusion: GO / NO-GO

**Anbefaling: NO-GO**

**Begrundelse:**
Build 2 kan ikke gives GO pga. den kritiske fejl i dynamisk opdatering af lister (`hasSyncedRef` forhindrer live synkronisering). Dette bryder kerneacceptkriterier i US-005 og vil give brugeren en liste der ikke opdaterer sig, selvom den er markert som "Dynamisk". Derudover er der flere høj/medium-prioritetsafvigelser:

- AI-forslag til type fra tekst (US-004)
- Status-synkronisering ved fjernelse af afkrydsning (US-005)
- Lang OS-timeout håndtering (US-004)
- Auto-skift til `photo`-type efter manuelt typevalg (kræver PO-afklaring)

De automatiserede checks (lint, typecheck, pre-test-check) er bestået, og meget af US-004/US-005 er visuelt og strukturelt korrekt, men de funktionelle fejl ovenfor skal rettes før PO-acceptance test og frigivelse.

---

## 5. Anbefalede rettelser før build

1. **Kritisk:** Fjern eller omskriv `hasSyncedRef` i `app/checklist.tsx` så `synchronizeDynamicChecklist` kaldes hver gang `projectItems` opdateres for dynamiske lister.
2. **Høj:** Implementér AI/logik-baseret type-forslag fra tekst (udvid `services/categories.ts` eller tilføj `services/typeSuggestion.ts`).
3. **Høj:** Gem og genanvend forrige kildesagsstatus ved fjernelse af afkrydsning i `toggleChecklistItemComplete`.
4. **Medium:** Tilføj "Gem"-knap i Alert ved lang OS-timeout i `VoiceCaptureModal`.
5. **Medium:** Afklar PO-intention for type-vs-foto og implementér entydig låselogik i `CreateItemForm`.
6. **Lav:** Adskil "fortryd" fra "slet alt" i stemmekommandoer.
7. **Lav:** Ensret `bug`-label til "Fejl" i søgning.
8. **Lav:** Efterforsk og ret pre-test-check warning om pakkeversions-tjek.

---

## 6. Referencer

- Design: `.claude/team/design/us-004-voice-create-collab.md`
- Design: `.claude/team/design/us-005-dynamic-lists-collab.md`
- Testplan: `.claude/team/test/testplan-b-c-redo-004-006.md`
- Baseline: `C:/Users/kimgr/.claude/projects/C--cloud-agent/memory/data-capture-test-baseline.md`
- Kode gennemgået: `components/CreateItemForm.tsx`, `components/VoiceCaptureModal.tsx`, `app/(tabs)/board.tsx`, `hooks/useVoiceRecognition.ts`, `services/voiceCommands.ts`, `services/search.ts`, `services/checklists.ts`, `app/(tabs)/search.tsx`, `app/(tabs)/checklists.tsx`, `app/checklist.tsx`, `app/+native-intent.ts`, `services/deeplinks.ts`
