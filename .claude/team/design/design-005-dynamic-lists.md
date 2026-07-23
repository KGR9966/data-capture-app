# Design: US-005 — Dynamiske lister og søgeportal

**Dokument:** `design-005-dynamic-lists.md`  
**Status:** Klar til PO-review  
**Forudsætning:** PO har godkendt US-005 og alle 13 beslutninger (søgning først, portalplacering, scope, felter, deduplikering, sortering, nye matches, fjernelse, status-synkronisering, egne punkter, deling, offline/notifikationer).  
**Scope:** Fase 1 — grundlæggende dynamiske lister, søgeportal, deling og afkrydsning. Global lister, offline, notifikationer og PDF-eksport er bevidst ude af scope.

---

## 1. Overordnet mål

1. Gøre data søgbart med **substring/fuzzy** som standard og **smart syntaks** (`*ord*`, `"frase"`, `-negation`, `OR`, filtre) som supplement.
2. Omdanne en søgning til en **dynamisk arbejdsliste** med punkter fra sagers titel/beskrivelse/noter.
3. Vise lister på en ny **"Lister"-fane** med portal-kort, detaljevisning, afkrydsning, sortering og deling.
4. Holde listen dynamisk: nye matches tilføjes, forsvundne matches gråes ud.
5. Dele lister via native share-sheet og dybe links med rettighedstjek.

---

## 2. Søgearkitektur

### 2.1 Valg: Klient-side lokal søgeindex

Data Capture har allerede en klient-side søgemotor (`services/search.ts`). For fase 1 beholdes denne arkitektur med følgende begrundelse:

- **Ingen native full-text search i Firestore.** Server-side søgning kræver ekstern tjeneste (Algolia, Typesense, Elasticsearch) eller Cloud Functions, hvilket øger kompleksitet og omkostninger.
- **Projektspecifikt scope.** Dynamiske lister knyttes til ét projekt ad gangen. Søgning kører på de items, der allerede abonneres på for det aktive projekt.
- **Smart syntaks er klient-side parsing.** Den nuværende parser kan udvides uden backend-ændringer.
- **Offline-klar.** Selvom offline sync er ude af scope, er klient-side søgning forudsætningen for fremtidig offline-søgning.

### 2.2 Hybride forbedringer for performance

For at reducere Firestore-læsninger og hukommelsesforbrug:

- **Projekt-scoped søgning som default:** Når brugeren opretter en dynamisk liste, søges der kun i det aktive projekt. Søgefanen kan fortsat søge globalt, men begrænset til brugerens projekter.
- **Lazy load:** Hvis et projekt har mange sager, overvejes paginering (load første 100, så "Indlæs flere"). Dette er en fremtidig optimering, ikke en fase 1-blokker.
- **Index-cache:** Byg et normaliseret søgeindex i hukommelsen ved første søgning og genbrug det, indtil items-subscription opdaterer listen.

### 2.3 Søgbare felter

Følgende felter fra `CaptureItem` indgår i søgeindex:

- `title`
- `content`
- `category`
- `assignedToName`
- `createdByName`
- `createdByEmail`
- `tags`
- `type` (via dansk label)
- `status` (via dansk label)

**OCR-original tekst** er ikke lagret separat i dag; den gemmes kun i `content`, når brugeren trykker "Brug original/oversat". Derfor søges der indirekte i OCR via `content`.

---

## 3. Søgeparser

### 3.1 Mål

- **Default:** substring-søgning (case-insensitiv, normaliseret for æøå).
- **Supplement:** smart syntaks med `*ord*`, `"frase"`, `-negation`, `OR`, og `nøgle:værdi`-filtre.

### 3.2 Token-typer

| Syntaks | Betydning | Eksempel |
|---|---|---|
| `vand` | Substring-match i søgbare felter | matcher "vand", "vandhaner", "koldt vand" |
| `*vand*` | Exact word boundary (bevares fra nuværende parser) | matcher hele ordet "vand" |
| `"koldt vand"` | Præcis frase | matcher eksakt tekst |
| `-kande` | Negation | resultater må ikke indeholde "kande" |
| `vand OR flaske` | OR-gruppe | mindst ét af ordene |
| `type:fejl` | Filter på type | kun sager af type `bug` |
| `kategori:indkøb` | Filter på kategori | kun sager med kategori "indkøb" |
| `status:ny` | Filter på status | kun status `new` |
| `ansvarlig:kim` | Filter på ansvarlig navn/uid | sager tildelt Kim |
| `has:foto` | Filter på medie | kun sager med foto |

### 3.3 Normalisering

```text
normalize(str):
  trim
  toLowerCase
  æ → ae
  ø → oe
  å → aa
  fjern accent-tegn og specialtegn (undtagen * og - som operatorer)
```

### 3.4 Match-funktion (fase 1)

- **Required words:** substring-match i normaliseret søgetekst. Bonus for match i `title`.
- **Phrases:** eksakt substring-match (ikke fuzzy).
- **OR groups:** mindst ét match.
- **Excluded terms:** hvis term findes, returneres score 0.
- **Filters:** eksakt match på de respektive felter (type, status, category, assignee, hasPhoto).

### 3.5 Fuzzy (fremtidig)

Fase 1 implementerer **substring** som "fuzzy-light". Ægte fuzzy (Levenshtein, fonetisk) markeres som backlog, da det kræver enten:

- En afgrænset ordbog til staveforslag.
- Ekstern søgetjeneste for store datasæt.

---

## 4. Data-model

### 4.1 Eksisterende model

Appen har allerede:

- `collection checklists` — manuelle/dynamiske lister.
- `subcollection checklists/{id}/items` — listepunkter.

### 4.2 Udvidelser for dynamiske lister

#### `Checklist` (opdateret)

```typescript
interface Checklist {
  id: string;
  name: string;                    // Listens navn
  ownerId: string;                 // Bruger der oprettede listen
  projectId: string;               // Projekt listen hører til
  isDynamic: boolean;              // true for dynamiske lister
  searchQueryRaw: string;          // Rå søgestreng
  searchQueryParsed: SearchQuery;  // Parseret JSON
  sourceFields: SourceField[];     // ["title", "content"] eller kombination
  sortOrder: SortOrder;            // "alphabetical" | "date" | "priority"
  syncStatusToSource: boolean;     // Afkrydsning opdaterer kildesag
  sharedWith: Record<string, ProjectRole>; // Dyb-link / eksplicit deling
  lastViewedAt?: Timestamp;
  newMatchCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type SourceField = "title" | "content";
type SortOrder = "alphabetical" | "date" | "priority";
```

#### `ChecklistItem` (opdateret)

```typescript
interface ChecklistItem {
  id: string;
  checklistId: string;
  sourceItemId: string;        // Ref til items/{id}
  sourceProjectId: string;
  sourceItemPath: string;      // "items/{id}"
  title: string;               // Listepunktets titel
  notes: string;               // Valgfri noter
  sourceField: SourceField;    // Hvilket felt der blev udledt fra
  isCompleted: boolean;
  completedAt?: Timestamp;
  completedBy?: string;
  orderIndex: number;
  isNew: boolean;              // Badge "nyt" indtil bruger har set listen
  isStale: boolean;            // Kilden matcher ikke længere
  staleNote?: string;          // "Kilden matcher ikke længere søgningen"
  isDuplicateHint?: boolean; // Semantisk dublet-markering
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4.3 Relation til `items`

- En dynamisk liste er knyttet til ét projekt (`projectId`).
- Hver listepunkt refererer til en `CaptureItem` via `sourceItemId`.
- Punkter genereres automatisk fra søgningen.
- Brugeren kan tilføje **egne punkter**, hvilket opretter en ny `CaptureItem` i projektet, der matcher listens søgning.
- Hvis kildesagen slettes, markeres punktet som `isStale` ved næste synk.

### 4.4 Manuale lister (eksisterende Aktionslister)

Manuale lister beholdes som i dag:

- `isDynamic = false`.
- `sourceFields` og `searchQueryRaw` er tomme/undefined.
- Punkter oprettes manuelt eller fra søgeresultater uden dynamisk opdatering.

---

## 5. Punkt-udledning

### 5.1 PO-beslutning

> Linjeskift og `- `/`* `-præfiks bliver separate punkter.

### 5.2 Parser

```text
function extractPoints(sourceText: string, sourceField: SourceField): string[]:
  if sourceField == "title":
    return [sourceText.trim()]

  text = sourceText.trim()
  if text is empty: return []

  // Split på linjeskift
  lines = text.split(/\r?\n/)

  points = []
  for line in lines:
    line = line.trim()
    if line is empty: continue

    // Fjern bullet-præfiks
    if line starts with "- " or "* ":
      line = line.slice(2).trim()

    if line is not empty:
      points.append(line)

  return points
```

### 5.3 Håndtering af flere felter

Hvis brugeren vælger både `title` og `content`:

- `title` genererer ét punkt per sag.
- `content` genererer ét eller flere punkter per sag.
- Alle punkter samles, deduplikeres og sorteres.

### 5.4 Stram deduplikering

```text
function strictDedup(points: string[]): string[]:
  seen = new Set()
  result = []
  for point in points:
    key = normalize(point)
    if key is empty or seen.has(key): continue
    seen.add(key)
    result.append(point)
  return result
```

### 5.5 Semantiske dubletter

Fase 1 markerer semantisk lignende punkter med et "måske dublet"-badge. Algoritme:

- To punkter betragtes som semantisk dubletter, hvis deres normaliserede tekst har Levenshtein-ratio > 0,85 eller den ene er substring af den anden.
- Marker den nyeste eller korteste som `isDuplicateHint = true`.
- Brugeren kan slette manuelt.

---

## 6. Dynamisk opdateringslogik

### 6.1 Synkroniseringsflow

```text
Bruger åbner liste
        │
        ▼
Hent checklist + items
        │
        ▼
Hent aktuelle projectItems
        │
        ▼
Kør syncChecklistItems(checklist, projectItems)
        │
        ├─ Nye matches → tilføj punkter (isNew=true)
        ├─ Gamle matches stadig gyldige → opdater titel/noter
        ├─ Matches der ikke længere matcher → markér isStale
        └─ Bruger-slettede punkter → behold slettet (ikke gendan)
        │
        ▼
Gem opdateringer
        │
        ▼
Vis liste med badges
```

### 6.2 Algoritme: `syncChecklistItems`

Input: `checklist`, `currentItems: CaptureItem[]`, `existingChecklistItems: ChecklistItem[]`.

```text
1. Filtrér currentItems med checklist.searchQueryParsed → matchedItems.

2. For hver matchedItem:
   a. Udled punkter fra sourceFields.
   b. For hvert punkt:
      - Find eksisterende checklistItem med samme sourceItemId + sourceField + title (normaliseret).
      - Hvis fundet og uændret: behold.
      - Hvis fundet og ændret: opdater title/notes.
      - Hvis ikke fundet: opret nyt checklistItem med isNew=true.

3. For hvert eksisterende checklistItem:
   a. Hvis sourceItemId ikke længere findes i matchedItems: markér isStale=true.
   b. Hvis sourceItemId findes, men punktet ikke længere udledes: markér isStale=true.

4. Dedupliker nye punkter internt og mod eksisterende.

5. Genberegn orderIndex for alle ikke-slettede punkter.

6. Opdater checklist.updatedAt og newMatchCount.
```

### 6.3 Nye matches

- Punkter med `isNew=true` vises med badge "Nyt".
- Når brugeren har set listen (eller efter 3 sekunder synlighed), sættes `isNew=false` for alle punkter, og `newMatchCount` nulstilles.
- `lastViewedAt` opdateres.

### 6.4 Forsvundne matches

- Punkter med `isStale=true` gråes ud.
- Der vises en note: "Kilden matcher ikke længere søgningen."
- De fjernes **ikke** automatisk.
- Brugeren kan slette dem manuelt.

### 6.5 Afkrydsning og status-synkronisering

- `syncStatusToSource` bestemmer, om afkrydsning påvirker kildesagen.
- Hvis `true`:
  - Afkrydsning → `updateItem(sourceItemId, { status: "done" })`.
  - Fjern afkrydsning → `updateItem(sourceItemId, { status: "new" })` (PO-besluttet: altid tilbage til "new" i fase 1).
- Hvis `false`: kun listepunktets egen status ændres.

### 6.6 Sortering

| SortOrder | Beskrivelse | Done-håndtering |
|---|---|---|
| `alphabetical` | Alfabetisk på title | Udførte punkter i bunden |
| `date` | Efter kildesag oprettet/ændret tidspunkt | Udførte punkter i bunden |
| `priority` | Efter status: new → in_progress → done → archived, derefter dato | Udførte stadig i bunden |

Sorteringsvalget gemmes på listen (`sortOrder`).

---

## 7. UI-design

### 7.1 Fane-struktur

PO har valgt en ny **"Lister"-fane**. Den eksisterende fane med titlen **"Lister"** og header **"Aktionslister"** beholdes som manuel liste-funktion. For at undgå forvirring:

- Eksisterende fane omdøbes til **"Aktionslister"** (tab title + header).
- Ny fane tilføjes med titlen **"Lister"** og fungerer som portal for dynamiske lister.

Dette er en minimal UI-ændring, der bevarer eksisterende funktionalitet og opfylder PO's ønske om en ny "Lister"-fane.

### 7.2 Lister-portal (`app/(tabs)/lists.tsx`)

- Header: **Lister** + "+"-knap til at oprette ny liste fra søgning.
- Tom tilstand: "Ingen dynamiske lister endnu. Søg efter noget og tryk 'Opret liste'."
- Liste-kort:
  - Listens navn.
  - Antal åbne / udførte punkter.
  - Seneste opdatering.
  - Badge: "Dynamisk".
  - Badge: "Nye matches" hvis `newMatchCount > 0`.
- Tryk på kort åbner liste-detaljen.

### 7.3 Opret liste fra søgning

- I **Søg**-fanen vises knap **"Opret liste"**, når der er resultater.
- Bruger trykker → modal/dialog:
  - Angiv listenavn (default: søgestreng eller "Liste fra søgning").
  - Vælg kildefelter: `Titel`, `Beskrivelse/noter` (checkboxes; default: beskrivelse/noter).
  - Vælg sortering (default: alfabetisk).
  - Vælg status-synkronisering (default: slået til).
- Efter oprettelse navigeres til listen.

### 7.4 Liste-detalje (`app/list.tsx` eller `app/checklist.tsx`)

- Header:
  - Tilbage-knap.
  - Listens navn.
  - "Del"-knap.
  - Sorteringsvælger (dropdown/chips).
- Progress: "X af Y udført".
- Liste med punkter:
  - Checkbox foran.
  - Titel + valgfri noter.
  - Badges: "Nyt", "Måske dublet", "Kilden matcher ikke".
  - "Åbn sag"-link.
  - Rediger/slet via swipe eller lang-tryk.
- "Tilføj punkt"-knap nederst: opretter ny sag, der matcher listens søgning.
- Udførte punkter grået ud, gennemstreget og i bunden.

### 7.5 Redigering af punkter

- Bruger kan redigere `title` og `notes`.
- Redigering påvirker **kun** listepunktet, ikke kildesagen.
- Hvis brugeren sletter et listepunkt, fjernes det fra listen. Kildesagen berøres ikke.

### 7.6 Egne punkter

- "Tilføj punkt" åbner en letvægtig oprettelsesdialog.
- Der oprettes en ny `CaptureItem` i projektet.
- Søgestrengen indsættes i item's `content` eller `tags`, så den matcher listen (f.eks. tag med listenavn eller søgeord).
- Der oprettes et tilhørende `ChecklistItem` med `sourceItemId` = ny sag.

---

## 8. Deling

### 8.1 Native share-sheet

- Tekstoversigt genereres i `services/checklists.ts` eller en ny `services/share.ts`.
- Format:

```text
{listenavn}

{completed} af {total} punkter udført

1. {åbent punkt 1}
2. {åbent punkt 2}
...

Delt fra Data Capture
```

- Ingen personlige data sendes automatisk ud over det brugeren allerede har valgt at dele (listeindhold).

### 8.2 Dyb link

- Format: `datacapture://checklist?id={checklistId}&projectId={projectId}`.
- Link genereres ved deling og kan kopieres.
- Modtager trykker link:
  1. Appen åbnes.
  2. Der tjekkes, at brugeren er logget ind.
  3. Der tjekkes, at brugeren har læseadgang til `projectId` (owner, memberEmails eller roles).
  4. Hvis adgang: listen åbnes.
  5. Hvis ikke adgang: vises fejlmeddelelse: "Du har ikke adgang til det projekt, denne liste hører til."

### 8.3 Rettigheder ved deling

- Dyb link giver **kun læseadgang** til listen.
- Hvis modtageren skal kunne redigere, kræver det enten en invitation til projektet med editor-rolle eller en fremtidig "share with editor"-funktion (backlog).

---

## 9. Firestore-regler for dynamiske lister

Nuværende `checklists`-regler er owner/sharedWith-baserede. For projektspecifikke dynamiske lister skal reglerne knyttes til projektmedlemskab for at undgå informationslækage:

```firestore
function isProjectMember(projectId) {
  return isAuthenticated()
         && exists(/databases/$(database)/documents/projects/$(projectId))
         && (
              get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId == getUserId()
              || getUserId() in get(/databases/$(database)/documents/projects/$(projectId)).data.memberEmails
              || getUserId() in get(/databases/$(database)/documents/projects/$(projectId)).data.roles
            );
}

function hasProjectRole(projectId, allowedRoles) {
  let project = get(/databases/$(database)/documents/projects/$(projectId)).data;
  return isAuthenticated()
         && (project.ownerId == getUserId()
             || (getUserId() in project.roles
                 && project.roles.get(getUserId(), null) in allowedRoles));
}

match /checklists/{checklistId} {
  allow read: if isAuthenticated()
               && (
                   resource.data.ownerId == getUserId()
                   || isProjectMember(resource.data.projectId)
               );

  allow create: if isAuthenticated()
                 && request.resource.data.keys().hasAll(["name", "ownerId", "projectId"])
                 && request.resource.data.ownerId == getUserId()
                 && hasProjectRole(request.resource.data.projectId, ["owner", "admin", "editor"]);

  allow update: if isAuthenticated()
                 && (
                     resource.data.ownerId == getUserId()
                     || hasProjectRole(resource.data.projectId, ["owner", "admin", "editor"])
                 );

  allow delete: if isAuthenticated()
                 && resource.data.ownerId == getUserId();
}

match /checklists/{checklistId}/items/{itemId} {
  function parentChecklist() {
    return get(/databases/$(database)/documents/checklists/$(checklistId)).data;
  }

  allow read: if isAuthenticated()
               && (
                   parentChecklist().ownerId == getUserId()
                   || isProjectMember(parentChecklist().projectId)
               );

  allow create, update, delete: if isAuthenticated()
                                 && (
                                     parentChecklist().ownerId == getUserId()
                                     || hasProjectRole(parentChecklist().projectId, ["owner", "admin", "editor"])
                                 );
}
```

**Bemærkning:** Eksisterende manuelle Aktionslister, der ikke har `projectId`, skal enten migreres eller fortsætte under en fallback-regel (owner-only). Compliance-dokumentet behandler dette.

---

## 10. Firestore-læseomkostninger

### 10.1 Nuværende omkostninger

- `SearchScreen` abonnerer på alle projekter og alle deres items. Dette giver O(projekter × sager) læsninger ved appstart og ved enhver ændring.

### 10.2 Fase 1-begrænsninger

For at holde omkostningerne kontrollerbare:

1. **Maks. antal dynamiske lister per bruger:** 50 (håndhæves i app-logik, ikke i regler).
2. **Synkronisér kun ved åbning:** `syncChecklistItems` køres kun, når brugeren åbner listen. Portalen viser kun metadata (antal punkter, last updated), ikke alle punkter.
3. **Unsubscribe når skjult:** Når brugeren forlader liste-detaljen, afmeldes items-subscription.
4. **Ingen global dynamisk liste:** PO har udskudt global scope til backlog.
5. **Begræns smart-søgning:** Parseren kører lokalt; ingen ekstra Firestore-læsninger.

### 10.3 Overvågning

- Log antal læste dokumenter under udvikling (ikke i produktion).
- Overvej Firebase-console overvågning efter lancering.

---

## 11. Afhængigheder

- `services/search.ts` — parser og match-funktion opdateres.
- `services/checklists.ts` — udvidet med dynamisk synk, sourceFields, sortering, deling.
- `services/items.ts` — `createItem` genbruges til egne punkter.
- `services/deeplinks.ts` — udvidet med `buildChecklistUrl`.
- `services/share.ts` — `shareText` genbruges.
- `app/(tabs)/search.tsx` — "Opret liste"-knap og kildefelt-valg.
- `app/(tabs)/lists.tsx` — ny portal.
- `app/list.tsx` eller `app/checklist.tsx` — liste-detalje.
- `app/(tabs)/_layout.tsx` — ny "Lister"-fane, omdøb eksisterende til "Aktionslister".
- `firestore.rules` — opdaterede regler for projektspecifikke lister.

---

## 12. Acceptkriteriedækning

| US-005 kriterie | Designafsnit |
|---|---|
| 1–3 Opret liste fra søgning, felter, deduplikering | 5, 7.3 |
| 4 Semantiske dubletter | 5.5 |
| 5–6 Sortering | 6.6 |
| 7–9 Afkrydsning og status-synk | 6.5 |
| 10–11 Dynamisk opdatering | 6 |
| 12–13 Portal | 7.2 |
| 14 Redigering | 7.5 |
| 15 Egne punkter | 7.6 |
| 16–17 Deling og dyb link | 8 |

---

## 13. Åbne spørgsmål til PO

Ingen. Alle PO-beslutninger fra US-005 er indarbejdet.

**Design-afklaring vedr. fane:** PO har valgt "Ny 'Lister'-fane. Eksisterende 'Aktionslister' forstyrres ikke." Den eksisterende fane med tab-title "Lister" omdøbes til "Aktionslister", og en ny "Lister"-fane tilføjes. Dette bevarer funktionaliteten i eksisterende Aktionslister.

---

## 14. Backlog (ikke i fase 1)

- Global dynamisk liste.
- Foruddefinerede portal-søgninger.
- Offline redigering og synkronisering.
- Push-notifikationer.
- AI-genereret opdeling af beskrivelse/OCR.
- PDF-eksport.
- Ægte fuzzy søgning.
