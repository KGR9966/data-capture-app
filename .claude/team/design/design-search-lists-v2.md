# Design: Søgning og dynamiske lister (v2)

**Status:** PO-godkendt med reduceret scope (Task #86 completed).  
**Dato:** 2026-07-15  
**Forudsætning:** Godkendte user stories `us-002-search-v2.md`, `us-005-dynamic-lists-v2.md`, `us-005-context-lists-v2.md` og flow-dokument `flow-search-lists-v2.md`.  
**Mål:** 5 dage til testbar build (3 dage udvikling + 1 dag QA/Audit + 1 dag build).  
**Reducerelser:** Gamle lister wipes (ingen migrering); smart-søgeoperatorer udskydes; alle projektmedlemmer må se lister.

---

## 1. Oversigt og formål

Dette dokument beskriver den tekniske løsning for rettelsen af søgning og dynamiske lister i Data Capture. Designet dækker fejlene S1–S8 og forbedringen W1, som PO har godkendt i én runde.

Områder:

- **Søgemotor** (`services/search.ts`): robust parsing af specialtegn (`&`, `/`, `-`, tal, æøå), minimumslængde (S8) og highlight (W1).
- **Listeoprettelse** (`app/(tabs)/search.tsx`, `services/checklists.ts`): hvorfor oprettelse fejler, og hvordan den gøres stabil (S1).
- **Data-model for listepunkter og item-punkter**: adskillelse af listepunkt-status, item-status og item-punkt/checkpoint (S3, S4, S7).
- **Context lists**: hvordan søgestreng + filtre gemmes, så listen forbliver dynamisk.
- **UI-fixes**: tastatur/scroll ved tilføj/rediger punkt (S5) og kommentar-layout der ikke fjerner "Tilbage" (S6).
- **Firestore-regler**: projektbaseret adgang til lister og item-punkter.

---

## 2. Data-model

### 2.1 Items / sager (`items/{itemId}`)

Eksisterende felter bevares:

| Felt | Type | Bemærkning |
|------|------|------------|
| `id` | string | Firestore document id |
| `projectId` | string | Reference til projekt |
| `createdBy` | string | Bruger-id |
| `createdByName` | string? | Display name |
| `createdByEmail` | string? | E-mail |
| `type` | ItemType | `idea`, `observation`, `bug`, `note`, `photo`, `voice`, `other` |
| `title` | string | Sags-titel |
| `content` | string? | Beskrivelse / noter |
| `category` | string? | Kategori/label |
| `status` | ItemStatus | `new`, `in_progress`, `done`, `archived` |
| `mediaUrl` | string? | Foto/voice media |
| `tags` | string[]? | Tags |
| `assignedTo` | string? | Bruger-id |
| `assignedToName` | string? | Display name |
| `createdAt` | Timestamp | Oprettet |
| `updatedAt` | Timestamp | Senest opdateret |

**Nyt underfelt:** `items/{itemId}/checkpoints/{checkpointId}` (subcollection). Et checkpoint repræsenterer en enkelt opgave/punkt inden for en sag.

### 2.2 Checkpoints (`items/{itemId}/checkpoints/{checkpointId}`)

| Felt | Type | Bemærkning |
|------|------|------------|
| `id` | string | Firestore document id |
| `itemId` | string | Parent item id |
| `projectId` | string | Projekt-id (denormaliseret for regler) |
| `sourceField` | `"title" \| "content" \| "category"` | Hvilket item-felt punktet stammer fra |
| `lineIndex` | number? | Linje-nummer i `content` (0-baseret); `null` for title/category |
| `text` | string | Checkpoint-tekst (kopieret fra item) |
| `status` | `"new" \| "done"` | Punkt-status inden for sagen |
| `createdAt` | Timestamp | Oprettet |
| `updatedAt` | Timestamp | Senest opdateret |

**Rationale:**  
Items har i dag kun `status` på hele sagen. PO-beslutning B kræver, at afkrydsning af ét listepunkt opdaterer "det pågældende punkt i kildesagen". Derfor indføres checkpoints som første klasse i item-domænet. Hvis en sag kun har ét checkpoint, kan afkrydsning sætte hele item til `done`.

### 2.3 Checklists (`checklists/{checklistId}`)

| Felt | Type | Bemærkning |
|------|------|------------|
| `id` | string | Firestore document id |
| `name` | string | Listens navn |
| `ownerId` | string | Oprettet af |
| `projectId` | string? | Projekt scope (PO-beslutning #3) |
| `isDynamic` | boolean | `true` for dynamisk / context liste |
| `searchQuery` | object | Se afsnit 2.5 |
| `sourceFields` | `SourceField[]` | Hvilke item-felter der genererer punkter |
| `sortBy` | `ChecklistSortBy` | `alphabetical`, `date`, `priority` |
| `sharedWith` | Record<string, role> | Explicit deling (uændret) |
| `hasNewMatches` | boolean | Badge i portal |
| `lastViewedAt` | Timestamp? | Sidste åbning |
| `deletedItemKeys` | string[] | Normaliserede nøgler for bruger-slettede punkter |
| `createdAt` | Timestamp | Oprettet |
| `updatedAt` | Timestamp | Opdateret |

**Fjerner:** `syncStatusToSource` (boolean). Efter PO-beslutning A/B skal afkrydsning altid opdatere det matchende checkpoint, og item-status kun opdateres når alle checkpoints er done. Der er ikke længere brug for en global toggle.

### 2.4 Checklist points (`checklists/{checklistId}/items/{pointId}`)

| Felt | Type | Bemærkning |
|------|------|------------|
| `id` | string | Firestore document id |
| `checklistId` | string | Parent checklist id |
| `sourceItemId` | string | Reference til item |
| `sourceProjectId` | string | Projekt-id (denormaliseret) |
| `sourceCheckpointId` | string? | Reference til checkpoint i item. `null` for fritekst-punkter. |
| `sourceField` | `"title" \| "content" \| "category" \| "manual"` | Hvilket felt punktet stammer fra |
| `lineIndex` | number? | Linje-nummer hvis `content` |
| `title` | string | Punktets tekst |
| `notes` | string? | Ekstra note / kilde-metadata |
| `isCompleted` | boolean | Listepunkt-status |
| `completedAt` | Timestamp? | Hvornår afkrydset |
| `completedBy` | string? | Bruger-id |
| `orderIndex` | number | Sorteringsrækkefølge |
| `priority` | number? | Afledt af item-status eller default |
| `isNewMatch` | boolean | Badge "Nyt match" |
| `isStale` | boolean | Kilden matcher ikke længere |
| `staleNote` | string? | Note til grået punkt |
| `isDuplicate` | boolean? | Semantisk dublet-badge |
| `duplicateOf` | string? | Reference til repræsentant |
| `createdAt` | Timestamp | Oprettet |
| `updatedAt` | Timestamp | Opdateret |

### 2.5 Adskillelse af status

| Begreb | Placering | Adfærd |
|--------|-----------|--------|
| **Listepunkt-status** | `checklists/{id}/items/{point}.isCompleted` | Uafhængig af item. Bruger afkrydser/fravælger. |
| **Item-status** | `items/{id}.status` | Ændres kun manuelt i item-detalje, eller automatisk når alle item-checkpoints er `done`. |
| **Item-punkt / checkpoint** | `items/{id}/checkpoints/{cp}.status` | Opdateres når det matchende listepunkt afkrydses. |

**Regler:**

1. Afkrydsning af ét listepunkt opdaterer **kun** det matchende checkpoint (`items/{id}/checkpoints/{cp}.status = done`). Hele item-status ændres ikke.
2. Hvis **alle** checkpoints for et item er `done`, sættes `items/{id}.status = done` (PO-beslutning B).
3. Hvis brugeren fjerner afkrydsning, sættes checkpoint tilbage til `new` og item-status til `in_progress` (hvis den var `done`).
4. Hvis brugeren manuelt ændrer item-status, spejles det **ikke** til listepunkter (PO-beslutning A, S4/S7).
5. Der findes **ingen** overordnet liste-status.

### 2.6 Reference fra listepunkt til item/checkpoint

Et listepunkt refererer til sit ophav på tre niveauer:

- `sourceItemId`: hvilen sag.
- `sourceCheckpointId`: hvilket punkt i sagen (eller `null` hvis fritekst).
- `sourceField` + `lineIndex`: hvilket felt og evt. linje, så checkpoint kan genskabes hvis det mangler.

Når en liste oprettes fra søgning:

1. For hvert matchende item parses de valgte felter til checkpoints.
2. Checkpoints gemmes i `items/{id}/checkpoints`.
3. For hvert checkpoint oprettes et listepunkt med reference til checkpointet.

### 2.7 Hvordan gemmes søgestreng + filtre i en context list?

`checklists.searchQuery` gemmes som et objekt:

```ts
interface ChecklistSearchQuery {
  raw: string;           // Præcis søgestreng som brugeren indtastede den
  parsed?: SearchQuery; // Valgfrit: cache af parser-output (kan genberegnes)
  filters?: SearchFilters;
}
```

- `raw` gemmes **uden** normalisering. Specialtegn (`&`, `/`, `-`, æøå, tal) bevares byte-for-byte.
- `parsed` må ikke være den eneste kilde til sandhed. Ved genåbning køres `parseSearchQuery(raw)` frisk.
- Filtre (`type:`, `status:`, etc.) er en del af `raw`, men kan også uddrages i `parsed.filters` for visning.
- `sourceFields` og `sortBy` gemmes på selve checklist-dokumentet.

### 2.8 Migrering af eksisterende lister

Eksisterende `checklists/{id}/items` har ikke `sourceCheckpointId` og `sourceField`. Migrering sker **lazy** når en liste åbnes efter deploy:

1. For hvert listepunkt uden `sourceCheckpointId`:
   - Hvis `sourceItemId` er `"manual"` → marker som `sourceField: "manual"`, `sourceCheckpointId: null`.
   - Ellers: slå item op, opret checkpoints ud fra punktets tekst, og sæt `sourceCheckpointId`.
2. Sæt `sourceField` baseret på `notes`:
   - Hvis notes starter med `"Fra: "` → `content` (linje 0).
   - Hvis title matcher item.title eksakt → `title`.
   - Hvis title matcher item.category → `category`.
   - Ellers → `content`, linje 0.
3. Bevar `isCompleted`. Hvis et punkt er afkrydset, sættes det nye checkpoint til `done`.
4. `syncStatusToSource` fjernes fra eksisterende dokumenter med en batch-migrering ved første åbning. Default adfærd efter migrering: checkpoint-sync altid aktiv.

**Backwards compatibility:**  
`sourceCheckpointId?: string` skal være optional i TypeScript-grænsefladen, så gammel kode der læser lister ikke fejler. UI skal håndtere punkter uden checkpoint-reference som "fritekst eller ældre punkt".

---

## 3. Search-parser

### 3.1 Vurdering: rewrite vs. patch af `services/search.ts`

**Anbefaling: struktureret rewrite af tokenizer + matcher, behold filter/operator-håndtering.**

Begrundelse:

- Nuværende `normalize()` i `services/search.ts` erstatter **alle** specialtegn med mellemrum (`replace(/[^a-z0-9\s]/g, " ")`). Dette er den direkte årsag til S2: `"Jem & Fix"` bliver til `"jem fix"`, og listenavnet trunkeres ved `&`.
- Tokenizeren splitter ved whitespace uden at forstå quoted phrases med specialtegn.
- Matcheren `containsTerm` kører normalisering på både needle og haystack, hvilket gør det svært at bevare præcise specialtegn.
- En "patch ovenpå" vil skabe special-cases for `&`, `/`, `-`, tal, æøå og risikerer at bryde eksisterende operatorer (`*ord*`, `"frase"`, `-ord`, `OR`, `key:value`).

**Scope for rewrite:**

- Ny tokenizer der bevarer specialtegn som en del af tokens.
- Ny matcher der bruger normalisering **kun** til case-insensitive/æøå-sammenligning, ikke til at fjerne tegn.
- Behold parsing af `*ord*`, `"frase"`, `-ord`, `OR`, `key:value`.
- Behold `SearchFilters` og `SearchQuery` interfaces, så resten af appen ikke bryder.
- Klient-side only (se arkitektur nedenfor).

### 3.2 Tokenisering og normalisering

**Tokenizer:**

1. Trim input.
2. Gennemløb strengen tegn for tegn:
   - Hvis `"` → læs phrase indtil næste `"` (eller EOL).
   - Hvis `-` efterfulgt af `"` → læs ekskluderet phrase.
   - Hvis `-` efterfulgt af ikke-whitespace → læs ekskluderet ord/token indtil whitespace.
   - Hvis `key:value` mønster → filter-token.
   - Hvis `OR` (helt ord, case-insensitive) → OR-token.
   - Ellers: læs "word-token" indtil whitespace. Et word-token kan indeholde `&`, `/`, `-`, tal, æøå, punktum, komma, etc.

**Word-token afgrænsning:**  
Et word-token slutter ved første whitespace (space, tab, newline). Det kan starte med og/eller slutte med `*` (whole-word marker).

**Eksempler:**

| Input | Tokens |
|-------|--------|
| `Jem & Fix` | `[word: "Jem"], [word: "&"], [word: "Fix"]` |
| `Jem &` | `[word: "Jem"], [word: "&"]` |
| `50 mm rør` | `[word: "50"], [word: "mm"], [word: "rør"]` |
| `"vand i kælderen"` | `[phrase: "vand i kælderen"]` |
| `*vand*` | `[word: "vand", exact: true]` |
| `vand -kælder` | `[word: "vand"], [exclude: "kælder"]` |
| `vand OR varme` | `[word: "vand"], [or], [word: "varme"]` |
| `type:note` | `[filter: key="type", value="note"]` |

**Normalisering (til sammenligning, ikke til tokenisering):**

```ts
function normalizeForMatch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // fjern accenter (valgfrit)
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa");
}
```

**Vigtigt:** Specialtegn fjernes **ikke** i normaliseringen. De bevares, så `"Jem & Fix"` kan matches præcist.

### 3.3 Håndtering af `&`

- `&` behandles **ikke** som AND-operator.
- `&` er et almindeligt word-token.
- Søgning `Jem & Fix` giver tokens `["Jem", "&", "Fix"]`.
- Matcher kræver at **alle** required tokens findes i haystack (implicit AND).
- Haystack er `title + " " + content + " " + notes + ...` lowercased.
- For `Jem & Fix` kræves at haystack indeholder `"jem"`, `"&"` og `"fix"`.

### 3.4 S8-validering (min. 2 bogstaver)

Validering skal ske **før** parser og **før** søgning:

```ts
function hasEnoughLetters(query: string): boolean {
  // Tæl antal [a-zæøå] i strengen (case-insensitive).
  const letters = query.toLowerCase().match(/[a-zæøåé]/g) || [];
  return letters.length >= 2;
}
```

- Ét tal, ét specialtegn eller ét bogstav tæller ikke.
- `50` → ikke nok.
- `&` → ikke nok.
- `v` → ikke nok.
- `va` → søgning udføres.
- `50 mm rør` → 3 bogstaver (mmr) → søgning udføres.
- UI viser prompt: "Skriv mindst 2 tegn for at søge."

### 3.5 W1-highlight

**Strategi: token-baseret highlight.**

1. Parser `rawQuery` til tokens.
2. For hver token, find alle matches i teksten.
3. Byg et sæt af `[start, end]`-intervaller.
4. Render tekst som sekvens af `<Text>`-segmenter; marker segmenter inden for intervaller med highlight-style.

**Regler for highlight:**

- For word-tokens: marker substring-match (case-insensitive, normaliseret).
- For phrase-tokens: marker hele phrase.
- For excluded tokens: markeres **ikke**.
- For OR-grupper: marker de tokens der faktisk matchede.
- For `Jem & Fix`: marker "Jem", "&" og "Fix" hver for sig.
- For `"vand i kælderen"`: marker hele sætningen.

**Komponent:**

```tsx
<HighlightedText
  text={item.title}
  query={rawQuery}
  highlightStyle={{ backgroundColor: "#fde047" }}
/>
```

**Sikkerhed:** Brug kun `Text`-komponenter, ingen HTML/markup. Håndter specialtegn som almindelige tegn.

### 3.6 Arkitektur: klient-side only vs. hybrid

**Anbefaling: klient-side only i fase 1.**

Begrundelse:

- Eksisterende kode henter allerede alle items for brugerens projekter ind i appen (`subscribeToItems` per projekt i `search.tsx`).
- Firestore queries kan ikke understøtte fuzzy/substring-søgning robust uden komplekse indeks eller Algolia/Typesense.
- Klient-side søgning giver offline-understøttelse af søgeresultater, når items er cached.
- Performance risiko accepteres af PO; max datasæt skal testes (se risici).

**Begrænsning:** Når antallet af items i et projekt bliver meget stort, skal der overvejes hybrid/server-side i fremtiden. Dette lægges i backlog.

---

## 4. Listeoprettelse (S1)

### 4.1 Root-cause analyse

S1: "Kunne ikke oprette den dynamiske liste" ved alle forsøg. Baseret på gennemgang af `services/checklists.ts` og `app/(tabs)/search.tsx` er de mest sandsynlige årsager:

1. **Manglende projektvalg.**  
   `createDynamicChecklistFromSearch` bruger `options.projectId || items[0].projectId`. Hvis brugeren har flere projekter, og `items[0]` tilhører et projekt hvor brugeren kun har viewer-rolle, fejler Firestore-reglerne ved skrivning af checkpoints.

2. **Rettigheder.**  
   Firestore-regler for `checklists` kræver `ownerId == uid` ved oprettelse. Dette er OK. Men checkpoints i `items/{id}/checkpoints` kræver skriverettighed til item; hvis brugeren kun er viewer i projektet, fejler oprettelse.

3. **For langt listenavn.**  
   Listenavn sættes til `Søgning: ${query}`. Ingen validering af længde. En meget lang søgestreng kan potentielt skabe problemer.

4. **Generisk fejlmeddelelse.**  
   `search.tsx` fanger alle fejl og viser `Alert.alert("Fejl", "Kunne ikke oprette den dynamiske liste.")`. Dette skjuler den reelle årsag.

5. **`syncStatusToSource` default.**  
   Nuværende kode sætter `syncStatusToSource: true` som default. Dette er ikke længere gyldigt efter status-adskillelsen, men bør ikke i sig selv forårsage oprettelsesfejl.

### 4.2 Flow

1. Bruger søger og får resultater.
2. Bruger trykker "Opret liste".
3. Dialog åbnes:
   - **Listens navn:** forudfyldt med søgestrengen (præcis, inkl. specialtegn). Max 100 tegn; afkort visning, gem fuld streng.
   - **Felter til punkter:** default `content`. Bruger kan vælge `title`, `content`, `category`.
   - **Projektvalg:** hvis brugeren er medlem af flere projekter, vises dropdown med nuværende projekt forvalgt. Bruger skal vælge ét projekt.
4. Bruger bekræfter.
5. System:
   - Validerer at `projectId` er valgt og at brugeren har editor/admin/owner rolle.
   - Parser søgestrengen.
   - Filtrerer resultater til det valgte projekt.
   - Opretter checkpoints i hver item.
   - Opretter checklist og checklist points i én batch.
   - Gemmer `searchQuery.raw` præcist.
6. Navigation til listen.

### 4.3 Fejlscenarier og håndtering

| Scenarie | Fejlmeddelelse | Handling |
|----------|----------------|----------|
| Ingen projekt valgt | "Vælg et projekt for listen." | Bliv i dialog, markér felt. |
| Bruger har ikke rettigheder i projektet | "Du har ikke rettigheder til at oprette liste i dette projekt." | Bliv i dialog. |
| Søgningen gav ingen resultater | "Søgningen gav ingen resultater at oprette en liste af." | Deaktiver "Opret liste"-knap. |
| Netværksfejl / Firestore timeout | "Tjek netværket og prøv igen." | Bliv i dialog, behold input. |
| Ukendt fejl | Specifik fejlkode + "Prøv igen." | Log, bliv i dialog. |

**Ingen generisk "Kunne ikke oprette den dynamiske liste"-besked.**

---

## 5. Status-adskillelse (S3, S4, S7)

### 5.1 Logik for afkrydsning → item-punkt-opdatering

```ts
export async function toggleChecklistPoint(
  checklist: Checklist,
  point: ChecklistItem,
  userId: string
): Promise<void> {
  const nextCompleted = !point.isCompleted;

  // 1. Opdater listepunkt
  await updateChecklistItem(checklist.id, point.id, {
    isCompleted: nextCompleted,
    completedAt: nextCompleted ? serverTimestamp() : undefined,
    completedBy: nextCompleted ? userId : undefined,
  });

  // 2. Hvis punktet har et checkpoint, opdater checkpoint-status
  if (point.sourceItemId && point.sourceItemId !== "manual" && point.sourceCheckpointId) {
    await updateCheckpoint(point.sourceItemId, point.sourceCheckpointId, {
      status: nextCompleted ? "done" : "new",
      updatedAt: serverTimestamp(),
    });
  }

  // 3. Tjek om alle checkpoints for item er done
  if (point.sourceItemId && point.sourceItemId !== "manual") {
    const checkpoints = await getCheckpointsForItem(point.sourceItemId);
    const allDone = checkpoints.length > 0 && checkpoints.every((cp) => cp.status === "done");
    const anyOpen = checkpoints.some((cp) => cp.status !== "done");

    if (allDone) {
      await updateItem(point.sourceItemId, { status: "done", updatedAt: serverTimestamp() });
    } else if (anyOpen && !nextCompleted) {
      // Hvis brugeren fjernede afkrydsning, og item var done, sæt til in_progress
      const item = await getItemById(point.sourceItemId);
      if (item?.status === "done") {
        await updateItem(point.sourceItemId, { status: "in_progress", updatedAt: serverTimestamp() });
      }
    }
  }
}
```

### 5.2 Item-status ændres IKKE automatisk ved enkeltpunkts-afkrydsning

- Kun når **alle** checkpoints for et item er `done`, opdateres item-status.
- Hvis item ikke har nogen checkpoints (f.eks. ældre sag), sker der intet med item-status.
- Brugeren kan stadig manuelt ændre item-status i item-detalje.

### 5.3 Listepunkt-status ændres IKKE automatisk ved item-status-ændring

- Når brugeren i item-detalje sætter `status = done`, spejles det **ikke** til listepunkter.
- Listepunktets `isCompleted` forbliver uændret.
- Dette er PO-beslutning A.

### 5.4 Checkpoint-udledning fra item ved listeoprettelse

For hvert valgt felt:

- **`title`:** ét checkpoint med `sourceField: "title"`, `lineIndex: null`, `text: item.title`.
- **`category`:** ét checkpoint med `sourceField: "category"`, `lineIndex: null`, `text: item.category`.
- **`content`:** split `content` på `\r?\n` og på `- ` / `* `-præfiks (PO-beslutning #6). Hver ikke-tom linje bliver et checkpoint med `sourceField: "content"` og stigende `lineIndex`.

### 5.5 Undtagelser

- **Alle punkter fra samme sag færdige:** item-status sættes automatisk til `done`.
- **Afkrydsning fjernes:** item-status sættes til `in_progress` hvis den var `done`.
- **Item slettet:** listepunkt gråes ud (`isStale: true`, `staleNote: "Kildesag ikke længere tilgængelig"`).
- **Checkpoint slettet fra item:** listepunkt gråes ud ved næste synk.

---

## 6. UI-løsninger (S5, S6, W1)

### 6.1 S5: Tastatur dækker felter

**Problem:** I `app/checklist.tsx` åbnes "Tilføj punkt" og "Rediger punkt" som modals. Når tastaturet åbnes, kan inputfeltet rulle ud af syne.

**Løsning:**

1. Behold `KeyboardAvoidingView` som allerede er indført i `app/checklist.tsx`.
2. Indeni hver modal: wrap modal-indholdet i `ScrollView` med `keyboardShouldPersistTaps="handled"`.
3. Sæt `scrollEnabled={true}` på modal-`ScrollView`.
4. Brug `onFocus` på inputfelterne til at måle feltets position og kalde `scrollViewRef.current?.scrollTo({ y: position, animated: true })`.
5. Alternativt: brug `KeyboardAvoidingView` **inden i** modalen med `behavior="padding"` og passende `keyboardVerticalOffset` (test på iOS og Android).

**På Android:** `android:windowSoftInputMode="adjustResize"` skal være sat i `app.json` / AndroidManifest. Test at modal højde justeres.

### 6.2 S6: Kommentar-modal/layout

**Problem:** Når brugeren skriver kommentar i `app/item.tsx`, forsvinder "Tilbage" og appen kan låse sig.

**Root-cause:**

- "Tilbage"-knap er placeret **inden i** `ScrollView`.
- `KeyboardAvoidingView` rykker hele indholdet opad, inklusive header, når tastaturet åbnes.
- Kommentar-inputbaren er placeret **uden for** `ScrollView` og er fixed i bunden. Dette kan føre til at header ruller ud af syne og at fokus ikke scroller korrekt.

**Løsning:**

1. **Fixed header:** Flyt "Tilbage"-knap og titel ud af `ScrollView` og placer dem i en fast `View` øverst på skærmen.
2. **ScrollView kun til indhold:** `ScrollView` indeholder kun item-detalje og kommentar-liste, ikke header.
3. **Kommentar-inputbaren forbliver fixed** i bunden, synlig over tastaturet.
4. **Slet-kommentar:** Hver kommentar får et "Slet"-link (allerede implementeret), men sikr at knappen altid er tilgængelig og ikke dækkes af tastatur.
5. **Tilbage-knap altid synlig:** Header må ikke scrolles væk.
6. **Undgå deadlock:** Sørg for at `onRequestClose` på eventuelle modals altid kalder en abort-handler der rydder state.

**Foreslået struktur:**

```tsx
<KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
  <View style={{ flex: 1 }}>
    {/* Fixed header med Tilbage */}
    <View style={styles.headerRow}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backText}>← Tilbage</Text>
      </TouchableOpacity>
    </View>

    {/* Scrollable content */}
    <ScrollView style={{ flex: 1 }}>
      {editing ? renderEdit() : renderView()}
    </ScrollView>

    {/* Fixed comment input bar */}
    {!editing && canComment(projectRole) ? (
      <View style={styles.commentInputBar}>
        <TextInput ... />
        <TouchableOpacity ...>Send</TouchableOpacity>
      </View>
    ) : null}
  </View>
</KeyboardAvoidingView>
```

### 6.3 W1: Highlight-komponent

**Komponent:** `components/HighlightedText.tsx`

**Props:**

```ts
interface HighlightedTextProps {
  text: string;
  query: string;
  style?: TextStyle;
  highlightStyle?: TextStyle;
  numberOfLines?: number;
}
```

**Implementation:**

1. Kald `parseSearchQuery(query)` for at få tokens.
2. Find alle match-intervaller i `text`.
3. Merge overlappende intervaller.
4. Render som array af `Text`-segmenter.

**Eksempel:**

```tsx
<Text style={style} numberOfLines={numberOfLines}>
  {segments.map((segment, index) => (
    <Text
      key={index}
      style={segment.highlight ? highlightStyle : undefined}
    >
      {segment.text}
    </Text>
  ))}
</Text>
```

**Brug:**

- `app/(tabs)/search.tsx`: titel og content-udsnit.
- `app/checklist.tsx`: punkt-titel og notes.

---

## 7. Firestore-regler og sikkerhed

### 7.1 Rettigheder for lister og punkter

**Checklists (`checklists/{checklistId}`):**

| Operation | Krav |
|-----------|------|
| read | Bruger er ejer (`ownerId == uid`) ELLER bruger er medlem af projektet (`projectId` matcher og bruger har rolle i `projects/{projectId}`) ELLER bruger er i `sharedWith`. |
| create | Bruger er logget ind, `ownerId == uid`, og hvis `projectId` er sat: bruger har `owner`, `admin` eller `editor` rolle i projektet. |
| update | Bruger er ejer ELLER bruger er i `sharedWith` med `owner`/`admin`/`editor` ELLER bruger har `admin`/`owner` rolle i projektet. |
| delete | Bruger er ejer ELLER bruger har `owner`/`admin` rolle i projektet. |

**Checklist points (`checklists/{checklistId}/items/{pointId}`):**

| Operation | Krav |
|-----------|------|
| read | Bruger har read-adgang til parent checklist. |
| create | Bruger har update-adgang til parent checklist. |
| update | Bruger har update-adgang til parent checklist. |
| delete | Bruger har update-adgang til parent checklist. |

**Item checkpoints (`items/{itemId}/checkpoints/{checkpointId}`):**

| Operation | Krav |
|-----------|------|
| read | Bruger har read-adgang til parent item. |
| create | Bruger har update-adgang til parent item. |
| update | Bruger har update-adgang til parent item. |
| delete | Bruger har update-adgang til parent item. |

### 7.2 Sikkerhed for søgestrenge

- Søgestrenge logges **ikke** med persondata.
- `searchQuery.raw` gemmes i Firestore. Regler sikrer at kun autoriserede brugere kan læse/skrive.
- Der er **ingen** server-side evaluering af bruger-input; parser kører klient-side og kan ikke påvirke Firestore-regler.

### 7.3 Project-scoped lister

Da lister er projektspecifikke (PO-beslutning #3), skal reglerne for `checklists` slå op i `projects/{projectId}` for at verificere medlemskab. Brug `get()` og tjek både `ownerId`, `roles` og `memberEmails`.

---

## 8. API-kontrakter og funktioner

### 8.1 `services/search.ts`

**Ændres / rewrite:**

```ts
export interface SearchTerm {
  value: string;      // raw token, specialtegn bevaret
  exact: boolean;     // whole-word marker (*ord*)
}

export interface SearchQuery {
  required: SearchTerm[];
  phrases: string[];
  excluded: SearchTerm[];
  orGroups: OrTerm[][];
  filters: SearchFilters;
  raw: string;
}

export interface OrTerm extends SearchTerm {
  isPhrase: boolean;
}

export function parseSearchQuery(raw: string): SearchQuery;
export function searchItems(items: CaptureItem[], rawQuery: string): CaptureItem[];
export function hasEnoughSearchLetters(query: string): boolean;
export function findHighlightSegments(text: string, query: string): HighlightSegment[];
```

**Nyt:**

- `hasEnoughSearchLetters(query)` — S8-validering.
- `findHighlightSegments(text, query)` — W1.
- Tokenizer bevarer specialtegn.

### 8.2 `services/checklists.ts`

**Ændres:**

```ts
export interface Checklist {
  // ... eksisterende felter minus syncStatusToSource
}

export interface ChecklistItem {
  // tilføj:
  sourceCheckpointId?: string;
  sourceField: "title" | "content" | "category" | "manual";
  lineIndex?: number;
}

export async function createDynamicChecklistFromSearch(
  name: string,
  rawQuery: string,
  items: CaptureItem[],
  options: {
    projectId: string;         // påkrævet
    sourceFields?: SourceField[];
    sortBy?: ChecklistSortBy;
  }
): Promise<{ checklist: Checklist; items: ChecklistItem[] }>;

export async function toggleChecklistPoint(
  checklist: Checklist,
  point: ChecklistItem,
  userId: string
): Promise<void>;

export async function synchronizeDynamicChecklist(
  checklist: Checklist,
  currentItems: CaptureItem[]
): Promise<void>;

export async function migrateChecklistItem(
  checklistId: string,
  point: ChecklistItem
): Promise<ChecklistItem>;
```

**Fjerner:** `syncStatusToSource` parameter i `createChecklist` og `createDynamicChecklistFromSearch`.

**Nyt service:** `services/checkpoints.ts`:

```ts
export interface Checkpoint {
  id: string;
  itemId: string;
  projectId: string;
  sourceField: "title" | "content" | "category";
  lineIndex?: number;
  text: string;
  status: "new" | "done";
}

export async function getOrCreateCheckpointsForItem(
  item: CaptureItem,
  sourceFields: SourceField[]
): Promise<Checkpoint[]>;

export async function updateCheckpoint(
  itemId: string,
  checkpointId: string,
  updates: Partial<Checkpoint>
): Promise<void>;

export async function getCheckpointsForItem(itemId: string): Promise<Checkpoint[]>;
```

### 8.3 UI-komponenter

**`app/(tabs)/search.tsx`:**

- Tilføj `hasEnoughSearchLetters` validering før søgning.
- Vis prompt når <2 bogstaver.
- Tilføj "syntakshjælp"-ikon og modal/accordion.
- Tilføj projekt-vælger i oprettelses-dialog.
- Fjern generisk fejlmeddelelse; vis specifikke fejl.
- Brug `HighlightedText` i søgeresultater.

**`app/(tabs)/checklists.tsx`:**

- Uændret funktionalitet; opdater kun import af ændrede typer.

**`app/checklist.tsx`:**

- Brug `toggleChecklistPoint` i stedet for `toggleChecklistItemComplete`.
- Brug `HighlightedText` i punkt-titel og notes.
- Ret tastatur/scroll i "Tilføj punkt" / "Rediger punkt" modals.
- Fjern `syncStatusToSource` tekst fra subtitle.

**`app/item.tsx`:**

- Fixed header med "Tilbage".
- Sørg for at kommentar-inputbaren altid er synlig.
- Slet-kommentar tilgængelig.

**`components/HighlightedText.tsx`:**

- Ny komponent.

---

## 9. Åbne spørgsmål / afhængigheder

Spørgsmål der skal besvares af PO eller dækkes af Test Manager:

1. **Maks. datasæt for klient-side søgning:** Hvor mange items skal søgning kunne håndtere uden at føles langsom? (Performance-test)
2. **OCR-søgning:** Skal søgning dække OCR-tekst fra foto? (Pt. ude af scope; bekræft.)
3. **Checkpoint-auto-oprettelse for ældre items:** Skal appen automatisk oprette checkpoints for alle eksisterende items, eller kun lazy ved listeåbning?
4. **Projektvalg i listeoprettelse:** Hvis brugeren har flere projekter, skal projektvalg være påkrævet eller kan systemet defaulte til projektet med flest søgeresultater?
5. **Item-status ved fjernelse af afkrydsning:** Skal item altid sættes til `in_progress` når et checkpoint åbnes, eller kun hvis status var `done`?
6. **Kommentar-bug (S6):** Hvis analyse viser at buggen er uafhængig af søg/lister, skal den så opdeles i separat task? (Pt. med i runden ifølge PO-beslutning.)
7. **Smart-søgeoperatorer:** Skal alle operatorer (`*ord*`, `"frase"`, `-ord`, `OR`, filtre) implementeres i én omgang, eller starte med substring + `&`-håndtering?
8. **Global vs. projektspecifik liste:** PO har valgt projektspecifik. Bekræft at deling af dyb link stadig kræver projektmedlemskab.

Afhængigheder:

- `services/items.ts` skal importere/eksportere `Checkpoint`-relaterede funktioner.
- Firestore-regler deployes før kode-test.
- Eksisterende lister migreres lazy; regressionstest med gamle lister.

---

## 10. Estimat og risici

### 10.1 Estimat

| Område | Estimat (udviklerdage) | Bemærkning |
|--------|------------------------|------------|
| Search-parser rewrite + S8 | 2-3 | Største tekniske risiko. |
| Checkpoint-service + data-model | 2 | Oprettelse, opdatering, migrering. |
| Listeoprettelse (S1) + projektvalg | 1-2 | UI-dialog + validering. |
| Status-adskillelse (S3/S4/S7) | 1-2 | Ændring af toggle-logik, fjern sync toggle. |
| Highlight (W1) | 1 | Komponent + integration to steder. |
| Keyboard/scroll (S5) | 0.5-1 | Test på iOS + Android. |
| Kommentar-layout (S6) | 0.5-1 | Header fixed + regressionstest. |
| Firestore-regler | 0.5 | Project-scoped adgang. |
| Regressionstest + bugfix | 1-2 | Gamle lister, deling, dyb link. |
| **I alt** | **9-14** | Afhængigt af parser-kompleksitet. |

### 10.2 Største risici

| Risiko | Sandsynlighed | Konsekvens | Mitigation |
|--------|---------------|------------|------------|
| Search-parser rewrite introducerer regressioner i filtre/operators | Mellem | Forkerte søgeresultater | Skriv parser-tests med alle edge cases; behold eksisterende filter- og operator-logik. |
| Data-model med checkpoints kræver migrering og kan bryde gamle lister | Høj | Tab af afkrydsningsstatus eller brudte referencer | Lazy migration; backup/rollback-strategi; regressionstest med ældre lister. |
| Firestore-regler for projekt-scoped lister bliver komplekse | Mellem | Læseadgang fejler eller bliver for slap | Review af Compliance/Security Agent; deploy til emulator først. |
| Keyboard/scroll-fix påvirker andre modals (S5/S6) | Mellem | Regression i create-item eller andre forms | Isoler ændringer; test alle modal-flows. |
| Performance ved mange items | Høj | Langsom søgning | Aftal max datasæt med PO; overvej debounce og benchmark. |

---

## Relaterede filer

- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-002-search-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-005-dynamic-lists-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-005-context-lists-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\flow-search-lists-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\plans\plan-search-lists-redesign.md`
- `C:\Users\kimgr\data-capture-app\services\search.ts`
- `C:\Users\kimgr\data-capture-app\services\checklists.ts`
- `C:\Users\kimgr\data-capture-app\services\items.ts`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\search.tsx`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\checklists.tsx`
- `C:\Users\kimgr\data-capture-app\app\checklist.tsx`
- `C:\Users\kimgr\data-capture-app\app\item.tsx`
- `C:\Users\kimgr\data-capture-app\components\CreateItemForm.tsx`
- `C:\Users\kimgr\data-capture-app\firestore.rules`
