# Root Cause Analysis — Items read fejler efter REG-001 / email-medlemmer

**Branch:** `fix/us004-voice-redesign`  
**App:** Data Capture (`C:\Users\kimgr\data-capture-app`)  
**Dato:** 2026-07-15  
**RCA Agent:** Root Cause Analysis Agent  
**Status:** Klar til review før kodning  

---

## 1. Problemopsummering

Efter deploy af opdaterede `firestore.rules` (REG-001 / email-medlemmer) kan brugeren fortsat **oprette sager** i et projekt, men de **vises ikke i Board/Søg**.  
Board-fanen kalder `subscribeToItems(activeProject.id, ...)` (`services/items.ts:68`), som igen laver en Firestore-liste-query:

```ts
const q = query(itemsCollection, where("projectId", "==", projectId));
return onSnapshot(q, ...);
```

`onSnapshot` fejler stille (error-handler kalder `callback([])`), så brugeren ser blot en tom liste.  
Det samme mønster rammer checkpoints, kommentarer og projekt-scopede checklister.

---

## 2. Teknisk root cause

### 2.1 Hvorfor `subscribeToItems` fejler

Den nuværende regel for `/items/{itemId}` (`firestore.rules:101-131`) kræver, at et `read` kun tillades, hvis brugeren har en rolle i det **projekt, som item'et tilhører**.  For at finde projektet laver reglen et **cross-document `get()`**:

```firestore
function project() {
  return get(/databases/$(database)/documents/projects/$(resource.data.projectId));
}
allow read: if isAuthenticated()
             && exists(project().path)
             && hasAnyProjectRole(projectData(), ["owner", "admin", "editor", "viewer"]);
```

**Dette virker for `getDoc()` / single-document reads**, fordi Firestore der evaluerer reglen på det enkelte dokument, der er blevet bedt om, og må lave et ekstra `get()` på projektet.

**Det virker IKKE for liste-queries**, fordi Firestore **ikke kan evaluere et `get()` eller `exists()` per dokument i en liste-query**. En liste-query skal kunne valideres ud fra **query-parametrene og matchede stier alene**, inden databasen kender det konkrete resultatsæt.  
Når reglen henter et andet dokument (`projects/{projectId}`) baseret på `resource.data.projectId`, kan Firestore ikke gennemskue, om alle dokumenter, som query'en *kunne* returnere, opfylder reglen. Derfor afvises hele query'en med `permission-denied`, som appen logger og derefter viser som tom liste.

### 2.2 Firestore regel-semantik — `get` vs `list` vs `allow read`

| Begreb | Betydning | Begrænsning relevant for denne sag |
|---|---|---|
| `allow read` | Dækker både **get** (enkelt dokument) og **list** (collection-query). | Et `allow read` med cross-document `get()` virker kun for `get`, ikke for `list`. |
| `allow get` / `allow list` | Kan skilles ad. `get` = enkelt doc; `list` = query. | Hvis vi vil beholde cross-document auth for enkelt-dokumenter, kan vi give `list` en selvstændig, query-venlig regel. |
| `get()` / `exists()` i regler | Må læse andre dokumenter ud fra sti eller `resource.data`. | I en **list**-query må reglen **ikke** bruge `get()`/exists() på dokumenter, der afhænger af `resource.data` (per-result). |
| `request.query` | Giver adgang til `where`, `orderBy`, `limit`, `offset`. | Den måde, man normalt lader en liste-query virke på, er at sikre, at query-filtrene matcher reglernes betingelser (f.eks. `where("ownerId", "==", request.auth.uid)`). |

### 2.3 Konsekvens for cross-document references

Firestore kræver, at en liste-query kan bevises sikker uden at røre de returnerede dokumenter.  
To klassiske løsningsmønstre opfylder det:

1. **Selvstændigt auth-felt i dokumentet** — f.eks. `allowedUsers: [uid1, uid2, ...]`, og query'en bruger `where("allowedUsers", "array-contains", request.auth.uid)`. Reglen kan så tillade, hvis query'en netop indeholder det filter.
2. **Hierarkisk sti** — f.eks. `projects/{projectId}/items/{itemId}`, hvor `projectId` er en stivariabel. Reglen kan lave et fast `get(/projects/$(projectId))` for hele subcollection-query'en.

Den nuværende top-level `/items/{itemId}`-struktur med `projectId` som et datafelt falder udenfor begge mønstre.

---

## 3. Berørte collections / paths

| Path | App-kode der læser | Regel i `firestore.rules` | Fejler liste-query? | Bemærkning |
|---|---|---|---|---|
| `/items/{itemId}` | `services/items.ts:68` `subscribeToItems`<br>`services/items.ts:101` `getItemsForProject`<br>`services/items.ts:149` `getItemsByAssignee`<br>`services/items.ts:186` `isTitleDuplicate`<br>`app/(tabs)/search.tsx:167` per-projekt items<br>`services/checklists.ts:355/453/811` checkpoints oprettelse | `firestore.rules:101-131` | **Ja** | Hovedårsag. Alle list-queries fejler, fordi reglen gør `get()` på `projects/$(resource.data.projectId)`. |
| `/items/{itemId}/checkpoints/{checkpointId}` | `services/checkpoints.ts:83` `getCheckpointsForItem`<br>`services/checklists.ts:692` status-sync | `firestore.rules:134-161` | **Ja** | Reglen gør `get()` på `projects/$(checkpointProjectId())`. `getDocs()` på subcollection fejler. |
| `/items/{itemId}/comments/{commentId}` | `services/comments.ts:117` `subscribeToComments`<br>`services/comments.ts:149` `deleteAllCommentsForItem`<br>`app/item.tsx:187` | `firestore.rules:163-192` | **Ja** | Reglen gør `get()` på parent item + derefter på project. Subcollection-liste uden `where` fejler klart. |
| `/checklists/{checklistId}` | `services/checklists.ts:525` `subscribeToChecklists`<br>`services/checklists.ts:553` `subscribeToProjectChecklists`<br>`services/checklists.ts:602` `getChecklistById`<br>`app/(tabs)/checklists.tsx:81` | `firestore.rules:214-250` | **Delvis** | `subscribeToChecklists` (`where("ownerId","==",userId)`) kan virke, fordi reglen har en selvstændig `ownerId == getUserId()`-gren. `subscribeToProjectChecklists` (`where("projectId","==",projectId)`) fejler, fordi den rammer `hasProjectRoleById(...)`-grenen med `get()`. |
| `/checklists/{checklistId}/items/{itemId}` | `services/checklists.ts:580` `subscribeToChecklistItems`<br>`services/checklists.ts:733` `markChecklistAsViewed`<br>`app/checklist.tsx:144` | `firestore.rules:252-283` | **Ja** | Reglen gør `get()` på parent checklist. Liste-query på subcollection afvises. |
| `/projects/{projectId}/members/{memberId}` | `services/projects.ts:456` `subscribeToProjectMembers` | `firestore.rules:70-98` | **Nej** | Reglen bruger `getAfter()` på parent `projects/{projectId}`, som er tilladt, fordi stien er kendt fra path-variablen. |
| `/users/{userId}/reminders/{reminderId}` | `services/reminders.ts:70` `subscribeToReminders`<br>`services/reminders.ts:91/104/119` get-queries | `firestore.rules:195-211` | **Nej** | Reglen tjekker kun `request.auth.uid == userId` og `request.query`-filtre matcher; ingen cross-document `get()`. |

**Opsummering:** Alle read-paths, der er afhængige af `projectId` i dokument-data eller parent-lookup via `get()`, fejler for liste-queries. Skrivninger (`create`, `update`, `delete`) virker stadig, fordi de evalueres ét dokument ad gangen.

---

## 4. Vurdering af gamle firestore.rules

De gamle regler er ikke inkluderet i repository nu, men ud fra kode og testhistorik kan vi udlede:

- **Hvis de gamle regler brugte `allow read: if isAuthenticated()` eller `if resource.data.projectId == ...` uden cross-document `get()`**, ville `subscribeToItems` virke.  
  I så fald var adgangskontrollen dog meget svag — enhver autentificeret bruger kunne læse alle items, når blot query'en matchede.
- **Hvis de gamle regler brugte den samme `hasProjectRoleById(...)`-logik med `get()`**, ville de gamle regler **også** have fejlet for liste-queries.  
  Så ville Board-read aldrig have virket i produktion, hvilket er usandsynligt givet den testede baseline.
- Den mest plausible forklaring er derfor, at de **gamle regler var bredere / mindre sikre**, og at REG-001's stramning med email-baserede roller og cross-document auth brød liste-query-mønsteret.

**Konklusion:** De gamle regler *virkede læse-mæssigt* fordi de ikke stillede cross-document krav til list-queries; de var muligvis ikke sikre nok til email-medlemmer.

---

## 5. Løsningsforslag med trade-offs

### A. Denormalisér adgang på items (`allowedUsers` / `allowedEmails`)

**Idé:** Gem et array `allowedUsers` (UID'er) og/eller `allowedEmails` på hvert `item`, `checkpoint` og `comment`. Reglerne tjekker, at `request.auth.uid` eller `request.auth.token.email` findes i array'et.  
Query i appen ændres til:

```ts
query(itemsCollection,
  where("projectId", "==", projectId),
  where("allowedUsers", "array-contains", currentUser.uid)
);
```

**Fordele:**
- Items kan forblive top-level `/items/{itemId}`.
- Lille regel-ændring.
- Ingen flytning af eksisterende data.

**Ulemper:**
- **Data-duplikering:** Medlemslisten skal kopieres til hvert item, checkpoint og comment.
- **Synkroniseringsbyrde:** Når et medlem inviteres/fjernes eller skifter rolle, skal alle items/checkpoints/comments i projektet opdateres (batch/cloud function).  Risiko for inkonsistens og partial updates.
- **Rolleniveau:** Med `allowedUsers` kan man kun sige "ja/nej"; det bliver komplekst at håndtere `viewer` vs `editor` adgang, hvis reglen skal kontrollere både array og rolle.
- **Emails uden UID:** Anonyme/brugere der kun har email-invitation, men endnu ikke har logget ind med den email, kan ikke matches på `uid`. Email-array kræver `request.auth.token.email`, som ikke altid er til stede (anonym auth).
- **Query-kompleksitet:** For `getItemsByAssignee` og `isTitleDuplicate` skal du tilføje `allowedUsers array-contains` på alle kombinerede queries, hvilket kræver nye composite indexes.

**Vurdering:** Kan fungere kortsigtet, men er ikke skalerbart og bryder med "single source of truth" for medlemskab.

---

### B. Omlæg items/checkpoints/comments til subcollections under `projects/{projectId}/...`

**Idé:** Flyt data til:

```
/projects/{projectId}/items/{itemId}
/projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}
/projects/{projectId}/items/{itemId}/comments/{commentId}
```

Reglerne kan nu bruge `projectId` som **path-variabel** i stedet for at læse det fra `resource.data`:

```firestore
match /projects/{projectId}/items/{itemId} {
  allow read: if isAuthenticated()
                 && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);
  allow create: if isAuthenticated()
                 && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);
  ...
}
```

`hasProjectRoleById(projectId, ...)` laver stadig et `get()` på `projects/{projectId}`, men nu er stien kendt fra den **scopede subcollection** og ikke fra `resource.data` per dokument.

**Fordele:**
- Følger Firestore's anbefalede hierarkiske model.
- Auth kontrolleres centralt på parent-path; ingen duplikeret `allowedUsers`.
- Liste-queries på projektets items/checkpoints/comments virker naturligt.
- Rolleniveauer (owner/admin/editor/viewer) beholdes i ét sted (`projects/{projectId}` og `members`).
- Rydder op i `deleteProjectCascade` — sletning af projekt kan være et enkelt recursive delete (evt. Cloud Function) frem for manuel opsamling af top-level items.

**Ulemper:**
- **Større kodeændring:** Alle stier i `services/items.ts`, `services/checkpoints.ts`, `services/comments.ts`, `services/checklists.ts`, `app/item.tsx`, `app/checklist.tsx`, `app/(tabs)/search.tsx`, `services/projects.ts` (cascade delete) skal opdateres.
- **Data-migration:** Eksisterende testdata skal migreres eller wipes.
- **Checklists** er i dag top-level med valgfri `projectId`; hvis de skal forblive globale/personlige, kan de blive hvor de er, men interaktionen med `sourceItemId`/`sourceCheckpointId` peger nu på nye paths.
- **Dyb links / targetId:** Reminders og checklist-items gemmer `targetId`/`sourceItemId`; disse ID'er er stadig unikke, men stierne ændres.

**Vurdering:** Dette er den mest robuste og Firestore-idiomatiske løsning.

---

### C. Custom claims via Cloud Function

**Idé:** En Cloud Function vedligeholder brugerens projektroller i Firebase Auth custom claims, f.eks.:

```json
{ "projects": { "projA": "editor", "projB": "viewer" } }
```

Reglerne tjekker `request.auth.token.projects[resource.data.projectId] in allowedRoles` uden `get()`.

**Fordele:**
- Meget hurtig regel-evaluering.
- Ingen duplikering af medlemsdata på items.
- Virker med top-level `/items/{itemId}`.

**Ulemper:**
- **JWT-størrelse:** Custom claims har en hård grænse på ca. 1000 bytes. Med mange projekter eller lange projectId'er kan claims vokse sig for store.
- **Latency ved rolleændring:** Nyt medlem/rolleændring kræver re-generation af token (kan tage op til 1 time, medmindre man tvinger refresh i appen).
- **Kompleksitet:** Kræver Cloud Function, admin SDK, trigger på `projects/{projectId}/members` og rollback-håndtering.
- **Anonyme brugere:** Custom claims er knyttet til Firebase UID; brugere der kun inviteres via email, men ikke har et fast UID endnu, er vanskelige at håndtere.
- **Query-filtre:** Appen skal stadig bruge `where("projectId", "==", projectId)`, og reglen skal tillade sådan en query. For top-level items uden `get()` kræver reglen, at query-filteret er bevisbart sikkert — f.eks. `request.query.projectId == projectId`, men reglen kan ikke kende `projectId` i forvejen.

**Vurdering:** Kraftfuldt, men overdrevet for nuværende scope og har signifikante drift-/skaleringsproblemer.

---

### D. Andre muligheder

| Alternativ | Hvad det går ud på | Trade-off |
|---|---|---|
| **D1: App-level filtering via Cloud Function / callable** | Appen kalder en HTTPS Callable, der returnerer items efter server-side auth. | Fjerner real-time `onSnapshot`-updates; kræver polling. Dårlig UX. |
| **D2: Adskil `get` og `list` regler** | Behold cross-document `get()` for single-document reads, men giv `list` en bredere regel, f.eks. `allow list: if isAuthenticated() && request.query.projectId == resource.data.projectId` — men dette er ikke gyldigt, fordi reglen ikke må referere `resource` i en list-regel på den måde. | Ikke muligt inden for Firestore's regelmotor. |
| **D3: Query kun egne items (`createdBy`)** | `subscribeToItems` ændres til `where("projectId", "==", projectId).where("createdBy", "==", uid)`. Reglen kan så tillade, hvis `request.auth.uid == resource.data.createdBy`. | Bruger ser kun egne sager, ikke team-sager. Bryder collaboration-kravet. |
| **D4: Midlertidigt rul reglerne tilbage** | Gå tilbage til gamle, bredere regler indtil migrering er klar. | Giver fungerende app, men åbner for sikkerhedshuller ved email-medlemmer. Kan bruges som hotfix. |

---

## 6. Anbefaling

### 6.1 Valg: B — omlæg items/checkpoints/comments under `projects/{projectId}`

Dette giver den **bedste E2E / 360° løsning**, fordi det:

1. Overholder Firestore's regelmotor-begrænsninger.
2. Bevarer den eksisterende rollemodel (`owner/admin/editor/viewer`) ét sted.
3. Eliminerer duplikeret auth-data på hvert dokument.
4. Gør projekt-sletning og cascade-delete mere naturlig.
5. Gør fremtidige features (f.eks. global dynamiske lister, offline sync, slet projekt) nemmere at regelsikre.

### 6.2 Ændringer i app-kode

#### `services/items.ts`
- Skift collection path fra `collection(db, "items")` til `collection(db, "projects", projectId, "items")`.
- Alle funktioner skal acceptere `projectId`:
  - `createItem(projectId, item)`
  - `subscribeToItems(projectId, ...)` (bevar signatur, men brug subcollection)
  - `getItemsForProject(projectId)`
  - `getItemById(projectId, itemId)`
  - `updateItem(projectId, itemId, updates)`
  - `deleteItem(projectId, itemId)`
  - `getItemsByAssignee(projectId, assigneeId)`
  - `isTitleDuplicate(projectId, title, excludeItemId?)`
  - `unassignItemsFromMember(projectId, assigneeId)`

#### `services/checkpoints.ts`
- Skift `checkpointsCollection(itemId)` til `collection(db, "projects", projectId, "items", itemId, "checkpoints")`.
- Alle funktioner skal kende `projectId`:
  - `getCheckpointsForItem(projectId, itemId)`
  - `getOrCreateCheckpointsForItem(projectId, item, sourceFields)`
  - `updateCheckpoint(projectId, itemId, checkpointId, updates)`
  - `createCheckpoint(projectId, itemId, point)`

#### `services/comments.ts`
- Skift `commentsCollection(itemId)` til `collection(db, "projects", projectId, "items", itemId, "comments")`.
- Opdater `createComment`, `subscribeToComments`, `deleteComment`, `deleteAllCommentsForItem`.

#### `services/checklists.ts`
- `toggleChecklistPoint` / `setChecklistPointCompleted` opdaterer nu checkpoints under `projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}`.
- `createChecklistFromItems`, `createDynamicChecklistFromSearch`, `addManualItemToChecklist`, `synchronizeDynamicChecklist` skal bruge nye item- og checkpoint-paths.
- Checklists selv kan fortsat være top-level `/checklists/{checklistId}`, men `projectId` i reglerne skal kunne evalueres for projekt-scopede lister.  
  Alternativt flyttes projekt-scopede checklists også til `/projects/{projectId}/checklists/{checklistId}` for ensartethed (anbefales, men er ekstra scope).

#### `services/projects.ts`
- `deleteProjectCascade` skal iterere `projects/{projectId}/items/{itemId}` og subcollections i stedet for top-level `/items`.  
  **Anbefaling:** Flyt cascade-delete til en Cloud Function (se B9) for at undgå timeout og partial deletes i appen.
- `getProjectDeletionStats` skal bruge nye paths.

#### UI-filer
- `app/(tabs)/board.tsx`: `subscribeToItems(activeProject.id, ...)` forbliver uændret i signatur, men service-implementation ændres.
- `app/item.tsx`: `getItemById`, `subscribeToComments`, `deleteItem`, `updateItem` skal have `projectId` tilgængeligt fra item.
- `app/(tabs)/search.tsx`: `subscribeToItems(project.id, ...)` forbliver uændret; service-implementation ændres.
- `app/checklist.tsx`: `subscribeToChecklistItems` forbliver uændret; interne checkpoint-opdateringer skal bruge `sourceProjectId`.

### 6.3 Ændringer i firestore.rules

Erstat top-level `items`, `items/{itemId}/checkpoints`, `items/{itemId}/comments` med subcollection-regler:

```firestore
match /projects/{projectId} {
  // bevares som i dag
  allow read: if isAuthenticated()
                 && hasAnyProjectRole(resource.data, ["owner", "admin", "editor", "viewer"]);
  ...
}

match /projects/{projectId}/items/{itemId} {
  allow read: if isAuthenticated()
                 && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);
  allow create: if isAuthenticated()
                 && request.resource.data.keys().hasAll(["projectId", "createdBy"])
                 && request.resource.data.projectId == projectId
                 && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);
  allow update: if isAuthenticated()
                 && hasProjectRoleById(projectId, ["owner", "admin"])
                    || (hasProjectRoleById(projectId, ["editor"])
                        && (resource.data.createdBy == getUserId()
                            || resource.data.assignedTo == getUserId()));
  allow delete: if isAuthenticated()
                 && (hasProjectRoleById(projectId, ["owner", "admin"])
                     || (hasProjectRoleById(projectId, ["editor"])
                         && resource.data.createdBy == getUserId()));
}

match /projects/{projectId}/items/{itemId}/checkpoints/{checkpointId} {
  allow read: if isAuthenticated()
                 && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);
  allow create, update: if isAuthenticated()
                           && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);
  allow delete: if isAuthenticated()
                  && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);
}

match /projects/{projectId}/items/{itemId}/comments/{commentId} {
  allow read: if isAuthenticated()
                 && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);
  allow create: if isAuthenticated()
                 && request.resource.data.keys().hasAll(["projectId", "itemId", "text"])
                 && request.resource.data.projectId == projectId
                 && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);
  allow update, delete: if isAuthenticated()
                           && (resource.data.authorId == getUserId()
                               || hasProjectRoleById(projectId, ["owner", "admin"]));
}
```

For `/checklists/{checklistId}` bør projekt-scopede lister enten:
- forbli top-level, men få en `list`-regel, der kun bruger `resource.data.ownerId` / `sharedWith` (dvs. fjern `hasProjectRoleById` fra `list`-delen), eller
- flyttes til `/projects/{projectId}/checklists/{checklistId}`.

**Anbefaling:** Behold checklists top-level, men split `read` i `get` og `list`:

```firestore
match /checklists/{checklistId} {
  allow get: if canReadChecklist();
  allow list: if isAuthenticated()
                 && (resource.data.ownerId == getUserId()
                     || getUserId() in resource.data.sharedWith
                     || (resource.data.projectId != null
                         && request.query.projectId == resource.data.projectId
                         && hasProjectRoleById(resource.data.projectId,
                              ["owner", "admin", "editor", "viewer"])));
  allow create, update, delete: if ...;
}
```

Bemærk: `request.query.projectId` kunne bruges til at begrænse projekt-scopede list-queries, men `request.query`-syntax varierer; det skal testes med Firestore emulator.

### 6.4 Test / QA

| Niveau | Hvad der skal testes | Hvordan |
|---|---|---|
| **Firestore emulator** | Deploy nye regler og kør unit-tests for hver `allow read/create/update/delete` på items, checkpoints, comments, checklists. | `firebase emulators:exec --only firestore "npm test"`. Test både positive og negative cases for owner/admin/editor/viewer/email-member. |
| **Integrationstest** | `subscribeToItems` returnerer live data; `createItem` efterfølges af visning i Board. | E2E-test på Board-fanen med to projekter og to brugere. |
| **Regressionscases** | TC-D.1, TC-D.2, TC-D.3, TC-E.1-E.5, TC-F.1-F.4, TC-G.1-G.2, TC-H.1-H.3, TC-005.7-005.20, TC-R.1-R.5, TC-AS.1-AS.3. | Gennemfør hele baseline-regressionsskabelonen fra `memory/data-capture-test-baseline.md`. |
| **Sikkerhedstest** | Ikke-medlem får `permission-denied` på `subscribeToItems`, `subscribeToComments`, `subscribeToChecklistItems`, `subscribeToProjectChecklists`. | Brug en testbruger, der ikke er medlem af projektet, og verificér at queries returnerer tom liste / fejl. |
| **Migrationstest** | Eksisterende testdata kan wipes eller migreres; efter migration vises items korrekt. | Se afsnit 8. |

---

## 7. Risikovurdering for B3 / B4 / B8 / B9 / D1 / D3

Baseret på mappingen i `memory/data-capture-test-baseline.md`:

| Feature | Mapping | Påvirkning af items-read løsning | Risiko | Bemærkning / mitigation |
|---|---|---|---|---|
| **B3** | Offline understøttelse af lister (US-005) | Mellem-høj. Checklist-logik (`services/checklists.ts`, `checklistsOffline.ts`) læser/skriver checkpoints og source items. Hvis items flyttes under `projects/{projectId}`, skal alle sti-referencer og offline pending-ops opdateres. | 🟡🟡 Gul/Orange | Planlæg sti-ændringer samtidig med B3-implementation. Brug `sourceProjectId` feltet, der allerede findes på `ChecklistItem`. |
| **B4** | Push-påmindelser (US-011) | Lav. Reminders ligger i `users/{userId}/reminders` og er uafhængige af items-path. `targetId` er et item-id, som stadig er unikt. | 🟢 Grøn | Ingen regelændring nødvendig. Bemærk at `deleteRemindersForItem` kaldes ved item-sletning; sørg for at nye `deleteItem` stadig kalder den. |
| **B8** | Tomt projektnavn + server-side dubletter (US-006) | Lav for selve navne-/dubletvalideringen. Mellem fordi en Cloud Function til projektoprettelse (B8-anbefalingen) bliver et naturligt sted også at sætte op subcollection-paths fremadrettet. | 🟡 Gul | Cloud Function-baseret `createProject` ændres ikke af items-read løsningen. Men hvis B8 også introducerer en Cloud Function, bør den samme function senere håndtere cascade-delete (B9). |
| **B9** | Slet projekt (US-001) | Høj. `deleteProjectCascade` (`services/projects.ts:337`) er i dag client-side og traverserer top-level `/items`. Med nye paths skal logikken ændres. Samtidig anbefales det at flytte cascade-delete til Cloud Function. | 🔴 Rød | Gør B9 til en Cloud Function **nu** i stedet for at rette client-side kode to gange. Function skal slette `projects/{projectId}` og alle subcollections rekursivt. |
| **D1** | Voice — fjern "Åben"/"åbn"-residu (US-004) | Ingen. D1 er ren stemmeparser-logik i `VoiceCaptureModal` / `parseVoiceCommand`. | 🟢 Grøn | Fortsæt uafhængigt. Parser-tests i `scripts/verify-voice-parser.ts` skal stadig bestå. |
| **D3** | Auto-titel må ikke overskrive manuel titel (US-004) | Ingen. D3 er UI/state-håndtering i `CreateItemForm` / `VoiceCaptureModal`. | 🟢 Grøn | Fortsæt uafhængigt. Sikr at service-signaturændringer (`createItem(projectId, item)`) integreres pænt med formens gemme-flow. |

**Samlet risiko:** Den største risiko ligger i **B9** (projektsletning), fordi det er den funktion, der har flest sti-afhængigheder til items/checkpoints/comments, og som samtidig bør omskrives til en Cloud Function.  
**Mitigation:** Implementér items-read løsning (B) og Cloud Function-cascade-delete (B9) i samme runde, så der ikke laves dobbeltarbejde.

---

## 8. Migration plan (kun testdata)

Da der kun er testdata, kan vi **wipe og recreate** frem for at køre en kompleks migration.

### 8.1 Pre-migration

1. **Eksportér testdata til reference:**
   - Firestore-dokumenter under `/items` og subcollections.
   - `/checklists` og subcollections.
   - `/projects` og `/projects/{projectId}/members`.
2. **Screenshots af nøgle-tilstande** i appen (Board, Søg, Lister) til sammenligning efter migration.
3. **Tag en backup af `firestore.rules`** og de branch-commits, der ligger før ændringen.

### 8.2 Code migration

1. Opret feature branch fra `fix/us004-voice-redesign`.
2. Omskriv `services/items.ts`, `services/checkpoints.ts`, `services/comments.ts` til subcollection-paths.
3. Omskriv `services/checklists.ts` til at bruge nye item/checkpoint-paths ved toggle/sync.
4. Omskriv `services/projects.ts`:
   - Ret `getProjectDeletionStats` til nye paths.
   - Erstat `deleteProjectCascade` client-side logik med kald til ny Cloud Function (eller behold minimal CF-kald).
5. Opdater `firestore.rules`.
6. Kør Firestore emulator-tests og fix fejl.

### 8.3 Data wipe & recreate

1. Slet i Firebase Console eller via script:
   - Alle `/items/{itemId}` og subcollections.
   - Alle `/checklists/{checklistId}` og subcollections.
   - (Valgfrit) alle `/projects` og `/projects/{projectId}/members` — behold gerne projekter for at teste medlemshåndtering.
2. Genopret testdata:
   - Opret projekter via appen.
   - Inviter email-medlemmer.
   - Opret items manuelt og via stemme.
   - Opret kommentarer og checkpoints.
   - Opret dynamiske checklister fra søgning.
3. Verificér at:
   - Board viser items.
   - Søg viser items.
   - Item-detalje viser kommentarer.
   - Checklister kan afkrydse punkter og synkronisere status.
   - Projektsletning (B9) fjerner alt under projektet.

### 8.4 Post-migration QA

- Kør regressionsskabelonen fra `memory/data-capture-test-baseline.md`.
- Kør specifikt sikkerhedstest for ikke-medlemmer.
- Dokumentér eventuelle nye composite-index-behov i `firestore.indexes.json`.

---

## 9. Konklusion og næste skridt

1. **Root cause:** Liste-queries på `/items/{itemId}` fejler, fordi `firestore.rules` bruger cross-document `get()` baseret på `resource.data.projectId`. Firestore kan ikke evaluere sådanne `get()` for hele resultatsæt.
2. **Anbefalet løsning:** Omlæg items, checkpoints og comments til subcollections under `projects/{projectId}`. Det er den eneste løsning, der både bevarer den ønskede rollebaserede adgangskontrol OG virker med Firestore's liste-query-regler.
3. **Største sideeffekt:** Projektsletning (B9) skal omskrives til Cloud Function samtidig.
4. **Næste skridt:**
   - PO / teknisk review af denne RCA.
   - Master Agent opretter implementation plan med tasks for service-ændringer, regel-ændringer, Cloud Function-cascade-delete og QA.
   - Ingen yderligere kodning af features, der berører items/checkpoints/comments, før denne løsning er landet.

---

## Referencer

- `firestore.rules`
- `services/items.ts`
- `services/checkpoints.ts`
- `services/comments.ts`
- `services/checklists.ts`
- `services/checklistsOffline.ts`
- `services/reminders.ts`
- `services/projects.ts`
- `services/roles.ts`
- `app/(tabs)/board.tsx`
- `app/item.tsx`
- `app/(tabs)/search.tsx`
- `app/(tabs)/checklists.tsx`
- `app/checklist.tsx`
- `memory/data-capture-test-baseline.md`
