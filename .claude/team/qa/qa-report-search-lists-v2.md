# QA-rapport: Søgning og dynamiske lister — S1–S8 + W1 (v2)

**Dato:** 2026-07-15
**Reviewer:** QA Agent
**Input:** `testplan-search-lists-v2.md`, `design-search-lists-v2.md`, `compliance-search-lists-v2.md`
**Kodeændringer:** `services/search.ts`, `services/checkpoints.ts`, `services/checklists.ts`, `app/(tabs)/search.tsx`, `app/(tabs)/checklists.tsx`, `app/checklist.tsx`, `app/item.tsx`, `components/HighlightedText.tsx`, `firestore.rules`

---

## 1. Overblik

**Status: GO med forbehold.**

Kodeændringerne implementerer det PO-godkendte reducerede scope for søgning og lister (S1–S8 + W1) og opfylder design og testplan på de fleste punkter. TypeScript, Expo lint og pre-test-check er grønne. Der er dog tre forbehold, der bør lukkes før endelig build/PO-acceptance:

1. `HighlightedText`/`findHighlightSegments` beregner forkerte startpositioner for matches, der optræder efter æ/ø/å i teksten (normalisering skifter længde, men positionen bruges ujusteret).
2. `toggleChecklistPoint` kører tre separate Firestore-opkald uden transaktion/batch — risiko for inkonsistent tilstand ved netværksfejl eller samtidige opdateringer.
3. `mapCreateChecklistError` har stadig en fallback til den generiske tekst "Kunne ikke oprette den dynamiske liste." for ukendte fejl, hvilket testplanen kræver skal fjernes helt.

Når ovenstående er adresseret, anbefales GO til audit-gate og build.

---

## 2. Verificerede punkter

### S1 — Listeoprettelse fejler ikke

| Aspekt | Vurdering | Bemærkning |
|---|---|---|
| Koden implementeret | Ja | `createDynamicChecklistFromSearch` validerer `projectId`, `items.length` og filtrerer til valgt projekt. |
| Projektvalg i UI | Ja | `app/(tabs)/search.tsx` viser projektliste, deaktiverer projekter uden create-rettigheder og forvalter enkelt projekt. |
| Specifikke fejl | Delvist | Der vises specifikke fejl for manglende projekt, ingen resultater, rettigheder, netværk. Fallback til generisk tekst findes stadig for ukendte fejl. |
| Regression | Lav | Ny service + UI-flow; påvirker ikke andre flows direkte. |

### S2 — Specialtegn i søgning

| Aspekt | Vurdering | Bemærkning |
|---|---|---|
| Koden implementeret | Ja | `services/search.ts` tokenizer bevarer `&`, `/`, `-`, tal, æøå som word-tokens. |
| `&` håndteres som token | Ja | `Jem & Fix` → tokens `["Jem", "&", "Fix"]`; implicit AND mellem required tokens. |
| Normalisering | Ja | `normalizeForMatch` lowercaser og erstatter kun æ/ø/å; fjerner ikke specialtegn. |
| Listenavn | Ja | `searchQuery.raw` gemmes præcist; listName forudfyldes med rå søgestreng. |
| Regression | Lav | Parser-ændring kan påvirke tidligere søgeadfærd, men eksisterende operatorer parses stadig. |

### S3 — Afkrydsning af ét punkt påvirker kun det pågældende punkt i sagen

| Aspekt | Vurdering | Bemærkning |
|---|---|---|
| Koden implementeret | Ja | `toggleChecklistPoint` opdaterer kun det matchende checkpoint; item-status ændres ikke ved enkeltpunkts-afkrydsning. |
| Alle punkter færdige | Ja | Hvis alle checkpoints for item er `done`, sættes `items/{id}.status = done`. |
| Regression | Lav | Tidligere `toggleChecklistItemComplete` delegerer til ny funktion; interface bevaret. |

### S4 — Item `in_progress` spejles ikke automatisk til liste

| Aspekt | Vurdering | Bemærkning |
|---|---|---|
| Koden implementeret | Ja | `item.tsx` ændrer kun item-status; ingen kode spejler item-status tilbage til `checklists/{id}/items`. |
| Listepunkt-status uafhængig | Ja | `isCompleted` forbliver uændret ved manuel item-status-ændring. |
| Regression | Ingen | Adskillelse er ny adfærd, ingen gammel logik påvirket. |

### S5 — Tastatur dækker ikke inputfelter

| Aspekt | Vurdering | Bemærkning |
|---|---|---|
| Koden implementeret | Ja | `app/checklist.tsx"` bruger `KeyboardAvoidingView` omkring modals med `ScrollView` og `keyboardShouldPersistTaps="handled"`. |
| Tilføj/rediger punkt | Ja | Begge modals har samme opbygning. |
| Regression | Lav | Kan påvirke andre modals, men ændringerne er isoleret til checklist-skærmen. |

### S6 — Kommentar låser ikke appen

| Aspekt | Vurdering | Bemærkning |
|---|---|---|
| Koden implementeret | Ja | `app/item.tsx"` har fast header med Tilbage-knap uden for `ScrollView`; kommentar-inputbaren er fixed i bunden. |
| Slet-kommentar | Ja | Slet-knap vises pr. kommentar; håndterer rettigheder. |
| Regression | Lav | Layout-ændring kun i `item.tsx`; andre skærme berøres ikke. |

### S7 — Item `done` spejles ikke automatisk til liste

| Aspekt | Vurdering | Bemærkning |
|---|---|---|
| Koden implementeret | Ja | Ingen spejling fra item-status til listepunkter. |
| Listepunkt-status uafhængig | Ja | `isCompleted` styres kun af brugerens afkrydsning. |
| Regression | Ingen | Ny adfærd per PO-beslutning. |

### S8 — Minimum 2 bogstaver før søgning

| Aspekt | Vurdering | Bemærkning |
|---|---|---|
| Koden implementeret | Ja | `hasEnoughSearchLetters` tæller `[a-zæøåé]` og kræver ≥2. |
| UI-tilstand | Ja | `app/(tabs)/search.tsx` viser "Skriv mindst 2 bogstaver" og udfører ikke søgning før validering. |
| Regression | Ingen | Ingen gammel funktionalitet berørt. |

### W1 — Highlight af matchende ord/sætninger

| Aspekt | Vurdering | Bemærkning |
|---|---|---|
| Koden implementeret | Ja | `components/HighlightedText.tsx"` og `findHighlightSegments` i `services/search.ts`. |
| Brugt i søgeresultater | Ja | `HighlightedText` bruges til titel og content i `search.tsx`. |
| Brugt i listepunkter | Ja | `HighlightedText` bruges til punkt-titel og notes i `checklist.tsx`. |
| Bug ved æøå | Ja — bug | `findHighlightSegments` normaliserer teksten til søgning, men beregner interval-positioner i den originale tekst. Efter æ/ø/å (som ekspanderer til 2 tegn i normalisering) bliver startpositionerne forskudt. |
| Regression | Lav | Kun highlight-visning; søgeresultaterne er korrekte. |

---

## 3. Tekniske checks

| Check | Kommando | Resultat | Detaljer |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ OK | Ingen fejl. |
| Expo lint | `npx expo lint` | ✅ OK | Kun env-output, ingen errors/warnings. |
| Pre-test check | `node scripts/pre-test-check.js` | ✅ OK med 1 warning | TypeScript, lint, native imports, deep links, voice parser, route exports: OK. Warning: `npx expo install --check` kunne ikke køre (pakkeversions-tjek). |

---

## 4. Findings

| ID | Finding | Kritikalitet | Fil(er) | Bemærkning / anbefaling |
|---|---|---|---|---|
| F1 | Highlight-positioner er forkerte efter æ/ø/å | **Høj** | `services/search.ts` (`findHighlightSegments`) | `normalizeForMatch` udvider æ→ae, ø→oe, å→aa. Søgningen sker i normaliseret tekst, men intervaller mappes tilbage til originalteksten uden at justere for længdeforskellen. Ret ved at søge i originaltekst med case-insensitiv match eller ved at beregne positioner i normaliseret tekst og mappe omhyggeligt tilbage. Påvirker TC-W1.4 og brug med danske tegn. |
| F2 | `toggleChecklistPoint` er ikke atomisk | **Medium** | `services/checklists.ts` | Tre separate Firestore-opkald (listepunkt, checkpoint, item-status). Ved netværksfejl eller race conditions kan tilstand blive inkonsistent. Compliance anbefalede batch/transaction. Ret med `writeBatch` eller `runTransaction`. Påvirker TC-S3.2 og EC-006. |
| F3 | Generisk fejlmeddelelse stadig mulig | **Medium** | `app/(tabs)/search.tsx` (`mapCreateChecklistError`) | Fallback: `error instanceof Error ? error.message : "Kunne ikke oprette den dynamiske liste."`. Testplanen kræver at den generiske tekst aldrig vises. Ret så alle kendte fejl mappes, og fallback viser en specifik neutral tekst f.eks. "Kunne ikke oprette listen. Prøv igen." Påvirker TC-S1.1 og TC-S1.3. |
| F4 | Søgning med kun ekskluderede termer returnerer alle items | **Medium** | `services/search.ts` (`searchItems`) | Hvis query kun indeholder `-ord`, returneres hele item-listen fordi `excluded` ikke tjekkes i den tidlige guard. Smart operatorer er ude af scope, men dette er en logisk sprække. Enten luk eller dokumentér eksplicit. Påvirker edge cases med `-ord`. |
| F5 | Tom forkert mappe i repo-roden | **Lav** | `C:Userskimgrdata-capture-app.claudeteamaudit` (root) | Mappen ser ud til at være oprettet ved en fejl hvor en sti blev fortolket som relativ. Påvirker ikke appen, men bør ryddes for at holde repoet rent. |
| F6 | `exact`-flag påvirker ikke matching | **Lav** | `services/search.ts` (`termMatches`) | Kommentaren siger at `*ord*` er ude af scope. Acceptabelt for fase 1, men bør dokumenteres så test ikke forventer whole-word adfærd. |
| F7 | `createDynamicChecklistFromSearch` opretter checkpoints uden for batch | **Lav** | `services/checklists.ts` | Checkpoints oprettes i et loop før batch commit. Hvis batch fejler efter partial checkpoint-oprettelse, efterlades checkpoints uden liste. Overvej at rulle checkpoints med i samme batch eller håndtere fejl. Acceptabelt for fase 1. |

---

## 5. Regression

| Område | Status | Bemærkning |
|---|---|---|
| Voice-oprettelse | ✅ Sandsynligvis OK | `services/search.ts` ændrer ikke voice/create-item flows. Pre-test check bekræfter voice parser. Ingen ændringer i voice-relaterede filer i dette review. |
| Projektoprettelse | ✅ Sandsynligvis OK | Ingen ændringer i `services/projects.ts` eller projektoprettelsesflow. |
| Board-visning | ✅ Sandsynligvis OK | `app/(tabs)/checklists.tsx` skifter til projekt-scoped subscription, men board.tsx er uændret. `subscribeToItems` bruges også i `search.tsx` uden at ændre API. |
| Foto/album | ✅ Sandsynligvis OK | `app/item.tsx` layout ændret, men foto-handlinger (kopiér, del, fjern) er uændrede. Ingen berøring af album/kamera flows. |
| Deling i lister | ✅ OK | `shareChecklistText` og `buildChecklistUrl` bruges uændret; dyb link-adgang tjekkes i `checklist.tsx`. |
| Kommentarer | ✅ Forbedret | `app/item.tsx"` har nu fixed header og fixed kommentar-inputbar. Slet-knap tilgængelig. Forventes at løse S6. |

---

## 6. Anbefaling til Master Agent

1. **Lad Developer Agent rette F1–F3 før build** (highlight-positioner, atomisk toggle, generisk fejl). Dette er direkte testplan-brud og compliance-forbehold.
2. **Vurder F4 og F7** som scope-afklaring: smart operatorer/ekskludering er ude af scope, men dokumentér hvis adfærden bevares.
3. **Ryd F5** (forkert mappe i repo-root) som renhousekeeping.
4. Når rettelserne er på plads og checks stadig er grønne, kan Task #88 markeres completed og Task #89 (Audit) sættes in_progress.

---

## 7. Godkendelse

- [x] Kode gennemlæst mod testplan, design og compliance.
- [x] Tekniske checks kørt (TypeScript, lint, pre-test).
- [x] Findings dokumenteret med kritikalitet.
- [x] Regression vurderet.
- [ ] Afventer rettelse af F1–F3 før endelig GO.
