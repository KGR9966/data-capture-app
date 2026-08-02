# Implementation Plan — Items/Checkpoints/Comments som subcollections under `projects/{projectId}`

**Branch:** `fix/us004-voice-redesign`  
**App:** Data Capture (`C:\Users\kimgr\data-capture-app`)  
**Dato:** 2026-07-15  
**Solution Design Agent:** Solution Design Agent  
**Status:** Klar til PO/Master Agent review før kodning  

---

## 1. Overblik og valg

Løsningen følger RCA-rapporten `rca-items-read-us004.md` og vælger **B: omlæg `items`, `checkpoints` og `comments` til subcollections under `projects/{projectId}`**. Dette er den eneste løsning, der både bevarer rollebaseret adgangskontrol (inkl. email-medlemmer med editor-rettigheder) og virker med Firestores liste-query-regelmotor.

**Nye datastier:**

```
/projects/{projectId}/items/{itemId}
/projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}
/projects/{projectId}/items/{itemId}/comments/{commentId}
```

**Hvad der forbliver uændret i første omgang:**
- `/projects/{projectId}` og `/projects/{projectId}/members/{memberId}` — allerede subcollections, fungerer.
- `/users/{userId}/reminders/{reminderId}` — uafhængige; kun smal udvidelse med `targetProjectId`.
- `/checklists/{checklistId}` og `/checklists/{checklistId}/items/{itemId}` — beholdes top-level, men reglerne splittes i `get`/`list` så projekt-scopede list-queries igen virker. Hvis emulator-tests viser, at `request.query`-tilgangen ikke er robust, flyttes projekt-scopede checklists også under `projects/{projectId}/checklists` som fallback.

**Scope-afgrænsning:** Denne plan fokuserer på at få **read på items til at virke** og samtidig lande **B9 (projektsletning)** som Cloud Function. D1/D3 (US-004 voice/parser) berøres kun via service-signaturer og testes ikke dybere her.

---

## 2. Task-liste med ansvarlige agent-roller

| # | Task | Ansvarlig rolle | Fil(er) / output | Succeskriterie |
|---|---|---|---|---|
| 2.1 | Opret feature branch `fix/us004-items-subcollection` fra `fix/us004-voice-redesign`. | Master Agent | Git branch | Branch findes og CI/TS er grøn før ændringer. |
| 2.2 | Omskriv `services/items.ts` til subcollection-paths og nye signaturer. | Backend/UI Agent | `services/items.ts` | Alle item-operationer kræver `projectId`; typecheck grøn. |
| 2.3 | Omskriv `services/checkpoints.ts` til subcollection-paths. | Backend/UI Agent | `services/checkpoints.ts` | Alle checkpoint-operationer kræver `projectId`. |
| 2.4 | Omskriv `services/comments.ts` til subcollection-paths. | Backend/UI Agent | `services/comments.ts` | Kommentar-operationer kræver `projectId` + `itemId`. |
| 2.5 | Opdater `services/checklists.ts` til at læse/skrive checkpoints og items under nye stier; opdater `sourceItemPath`. | Backend/UI Agent | `services/checklists.ts` | Checklist-toggle, sync, create og manuel tilføjelse virker. |
| 2.6 | Opdater `services/checklistsOffline.ts` pending-ops til at bære `sourceProjectId`. | Offline Agent | `services/checklistsOffline.ts` | Offline toggle flush virker efter genetablering af net. |
| 2.7 | Opdater navigation/routing til item-detalje så `projectId` medsendes; opdater `services/deeplinks.ts`. | UI/UX Agent | `app/(tabs)/board.tsx`, `app/(tabs)/search.tsx`, `app/checklist.tsx`, `services/deeplinks.ts` | Alle links til `/item` indeholder `projectId`. |
| 2.8 | Opdater `app/item.tsx` til at bruge `projectId` fra route params og nye service-signaturer. | UI/UX Agent | `app/item.tsx` | Item-detalje, redigering, sletning og kommentarer virker. |
| 2.9 | Udvid `Reminder` med `targetProjectId` og opdater `NotificationResponseHandler` samt reminder-creation. | Backend/UI Agent | `services/reminders.ts`, `components/NotificationResponseHandler.tsx`, `app/item.tsx` | Notification-tap åbner korrekt item-detalje. |
| 2.10 | Erstat client-side `deleteProjectCascade` med kald til ny Cloud Function; opdater `getProjectDeletionStats`. | Cloud Agent | `services/projects.ts` | App kalder kun callable; sletning sker server-side. |
| 2.11 | Initier Firebase Functions-projekt og implementer `deleteProject` callable. | Cloud Agent | `functions/` (nyt), `firebase.json` | Function deployes og sletter projekt + subcollections + checklists + storage. |
| 2.12 | Opdater `firestore.rules` for items/checkpoints/comments-subcollections og checklists `get`/`list`-split. | Security Agent | `firestore.rules` | Emulator-tests består for owner/admin/editor/viewer/email-medlem/ikke-medlem. |
| 2.13 | Opdater `firestore.indexes.json` hvis nye composite indexes er nødvendige. | Security Agent | `firestore.indexes.json` | Ingen "missing index"-fejl i emulator/prod. |
| 2.14 | Kør `npm run typecheck` og `npm run lint`; fix fejl. | QA Agent | Hele repo | Ingen TS/Lint-fejl. |
| 2.15 | Kør Firestore-emulator med regeltests (manuelt eller nyt testscript). | QA Agent | `firestore.rules`, emulator | Positive + negative cases består. |
| 2.16 | Data wipe og genskabelse af testdata; gennemfør E2E baseline regression. | QA/PO | Firebase Console, emulator, fysiske enheder | Board, Søg, Item, Checklister, Reminders, Projekt-sletning virker. |
| 2.17 | Build, deploy og verificering. | Release Agent | EAS build, Firebase deploy | Build installeres og PO godkender. |

---

## 3. Præcis beskrivelse af kodeændringer

### 3.1 `services/items.ts`

**Collection-reference:**

```ts
function itemsCollection(projectId: string) {
  return collection(db, "projects", projectId, "items");
}
```

**Nye signaturer:**

| Gammel signatur | Ny signatur | Bemærkning |
|---|---|---|
| `createItem(item: Omit<CaptureItem, "id" \| "createdAt" \| "updatedAt">)` | `createItem(projectId: string, item: Omit<CaptureItem, "id" \| "projectId" \| "createdAt" \| "updatedAt">)` | `projectId` overføres nu som path-variabel, men skrives stadig i dokumentet for at bevare `item.projectId`. |
| `subscribeToItems(projectId, callback)` | uændret signatur | Intern query bruger `itemsCollection(projectId)` uden `where("projectId", ...)` — list-reglen sikrer projekt-scope. |
| `getItemsForProject(projectId)` | uændret signatur | Intern query mod subcollection. |
| `getItemById(itemId)` | `getItemById(projectId: string, itemId: string)` | Kræver `projectId` fra route param. |
| `updateItem(itemId, updates)` | `updateItem(projectId: string, itemId: string, updates)` |  |
| `deleteItem(itemId)` | `deleteItem(projectId: string, itemId: string)` | Kalder `deleteAllCommentsForItem(projectId, itemId)` før doc-delete. |
| `getItemsByAssignee(projectId, assigneeId)` | uændret signatur | Intern query mod subcollection; bevar composite index. |
| `isTitleDuplicate(projectId, title, excludeItemId?)` | uændret signatur | Intern query mod subcollection; bevar composite index. |
| `unassignItemsFromMember(projectId, assigneeId)` | uændret signatur | Intern update mod subcollection. |

**Implementation detaljer:**
- `subscribeToItems` fjerner `where("projectId", "==", projectId)` og lytter på hele subcollection. Sortering og normalisering af `type` beholdes.
- `deleteItem` sletter kommentarer før selve item. Sletning af checkpoints sker implicit via cascade i Cloud Function eller kan gøres eksplicit i `deleteItem` for at undgå orphaned checkpoints.
- `CaptureItem` interface bevares inkl. `projectId`, så UI stadig kan læse feltet.

### 3.2 `services/checkpoints.ts`

```ts
function checkpointsCollection(projectId: string, itemId: string) {
  return collection(db, "projects", projectId, "items", itemId, "checkpoints");
}
```

**Nye signaturer:**

| Gammel signatur | Ny signatur |
|---|---|
| `getCheckpointsForItem(itemId)` | `getCheckpointsForItem(projectId: string, itemId: string)` |
| `getOrCreateCheckpointsForItem(item, sourceFields)` | `getOrCreateCheckpointsForItem(projectId: string, item: CaptureItem, sourceFields: SourceField[])` |
| `updateCheckpoint(itemId, checkpointId, updates)` | `updateCheckpoint(projectId: string, itemId: string, checkpointId: string, updates)` |
| `createCheckpoint(itemId, point)` | `createCheckpoint(projectId: string, itemId: string, point: Omit<Checkpoint, "id" \| "createdAt" \| "updatedAt">)` |

`Checkpoint` interface bevares inkl. `itemId` og `projectId`.

### 3.3 `services/comments.ts`

```ts
function commentsCollection(projectId: string, itemId: string) {
  return collection(db, "projects", projectId, "items", itemId, "comments");
}
```

**Nye signaturer:**

| Gammel signatur | Ny signatur |
|---|---|
| `createComment(projectId, itemId, text)` | uændret signatur (allerede kender projectId) |
| `subscribeToComments(projectId, itemId, callback)` | uændret signatur |
| `deleteComment(projectId, itemId, commentId)` | uændret signatur |
| `deleteAllCommentsForItem(itemId)` | `deleteAllCommentsForItem(projectId: string, itemId: string)` |

`Comment` interface bevares inkl. `itemId` og `projectId`.

### 3.4 `services/checklists.ts`

**Ændringer:**

1. `extractPointsFromItem` opdaterer `sourceItemPath` til:
   ```ts
   sourceItemPath: `projects/${item.projectId}/items/${item.id}`
   ```
   (gør det samme i `parseSourceTextIntoPoints` og `addManualItemToChecklist`).

2. `createChecklistFromItems` / `createDynamicChecklistFromSearch` / `synchronizeDynamicChecklist` / `addManualItemToChecklist` kalder `getOrCreateCheckpointsForItem(item.projectId, item, sourceFields)` og `createCheckpoint(item.projectId, sourceItem.id, ...)`.

3. `setChecklistPointCompleted` opdateres til:
   ```ts
   export async function setChecklistPointCompleted(
     checklist: Checklist,
     point: ChecklistItem,
     completed: boolean,
     userId: string
   ): Promise<void>
   ```
   - Bruger `point.sourceProjectId` til checkpoint-reference:
     ```ts
     const checkpointRef = doc(
       db,
       "projects",
       point.sourceProjectId,
       "items",
       point.sourceItemId,
       "checkpoints",
       point.sourceCheckpointId
     );
     ```
   - Bruger `point.sourceProjectId` i `getCheckpointsForItem(point.sourceProjectId, point.sourceItemId)`.
   - Bruger `point.sourceProjectId` i `getItemById(point.sourceProjectId, point.sourceItemId)` og `updateItem(point.sourceProjectId, point.sourceItemId, { status: ... })`.

4. Ingen ændring af `Checklist` / `ChecklistItem` interfaces; `sourceProjectId` findes allerede på `ChecklistItem`.

### 3.5 `services/checklistsOffline.ts`

- `toggleChecklistPointOffline` gemmer allerede hele `Checklist` og `ChecklistItem` (inkl. `sourceProjectId`).
- I `executePendingOp` for `toggleChecklistItem` kaldes `toggleChecklistPoint(checklist, item, userId)`. Denne funktion skal nu selv læse `sourceProjectId` fra `item` og `checklist.projectId` som fallback, så pending-ops ikke skal ændre payload.
- Sikr at `flushPendingOps` fejler gracefult, hvis et item/checkpoint er flyttet/slettet imens brugeren var offline.

### 3.6 `services/projects.ts`

- Fjern `deleteProjectCascade` client-side implementering.
- Tilføj:
  ```ts
  export async function deleteProject(projectId: string): Promise<void> {
    const { httpsCallable } = await import("@react-native-firebase/functions");
    const deleteProjectFn = httpsCallable<{ projectId: string }, { success: boolean }>(
      getFunctions(),
      "deleteProject"
    );
    await deleteProjectFn({ projectId });
  }
  ```
  (eller tilsvarende hvis projektet bruger et andet functions-modul).
- `getProjectDeletionStats` skal ikke længere iterere items client-side. Foreslå at den også flyttes til callable, eller at appen viser et estimat. **Anbefaling:** Opret callable `getProjectDeletionStats({ projectId })` i samme Cloud Function-pakke og kald den fra appen.
- Behold `deleteProject` (som kun sletter doc) kun som fallback hvis functions ikke er tilgængelig; primær flow er callable.

### 3.7 UI-filer

#### `app/(tabs)/board.tsx`
- `subscribeToItems(activeProject.id, ...)` forbliver uændret.
- `createItem({ projectId: activeProject.id, ... })` ændres til `createItem(activeProject.id, { ... })` (uden `projectId` i payload).
- Item card `onPress` ændres til:
  ```ts
  router.push(`/item?itemId=${item.id}&projectId=${activeProject.id}`)
  ```

#### `app/(tabs)/search.tsx`
- `subscribeToItems(project.id, ...)` forbliver uændret.
- Item card `onPress` ændres til:
  ```ts
  router.push(`/item?itemId=${item.id}&projectId=${item.projectId}`)
  ```

#### `app/checklist.tsx`
- Source-link `onPress` ændres til:
  ```ts
  router.push(`/item?itemId=${item.sourceItemId}&projectId=${item.sourceProjectId}` as any)
  ```

#### `app/item.tsx`
- Læs `projectId` fra route params:
  ```ts
  const { itemId, projectId } = useLocalSearchParams();
  ```
- Valider at begge er strings.
- `getItemById(projectId, itemId)`.
- `subscribeToComments(projectId, itemId, ...)`.
- `deleteItem(projectId, itemId)`.
- `updateItem(projectId, itemId, updates)`.
- `createComment(projectId, itemId, trimmed)`.
- `deleteComment(projectId, item.id, comment.id)`.
- `updateItem(projectId, item.id, { mediaUrl: "" })` ved fjern foto.
- Ved oprettelse af reminder for item inkluder `targetProjectId: projectId`.
- Hvis `projectId` mangler i params (f.eks. gammel deeplink), vis fejl eller fallback-søgning (se risiko-mitigation B4).

#### `services/deeplinks.ts`
- `buildItemUrl(itemId)` ændres til `buildItemUrl(itemId: string, projectId: string)`:
  ```ts
  return `${APP_SCHEME}://item?itemId=${encodeURIComponent(itemId)}&projectId=${encodeURIComponent(projectId)}`;
  ```

### 3.8 `services/reminders.ts` + `components/NotificationResponseHandler.tsx`

- Udvid `Reminder` / `ReminderInput` med valgfrit felt:
  ```ts
  targetProjectId?: string;
  ```
- I `createReminder` kopieres `targetProjectId` fra input til dokument og til notification-data payload.
- I `updateReminder`, hvis `title` ændres og reminder skal reschedule, inkluder `targetProjectId` i notification data.
- I `NotificationResponseHandler.tsx`:
  ```ts
  const targetProjectId = data.targetProjectId as string | undefined;
  if (targetType === "item") {
    router.push(`/item?itemId=${targetId}${targetProjectId ? `&projectId=${targetProjectId}` : ""}` as any);
  }
  ```
- Hvis `targetProjectId` mangler (gamle reminders), viser handler en Alert med "Påmindelsen peger på en sag uden projekt-id" frem for at crashe.

### 3.9 `services/notifications.ts` (hvis den findes)

- Sikr at `scheduleLocalNotification` accepterer og gemmer `targetProjectId` i notification data. Hvis filen ikke eksisterer, håndteres det i `reminders.ts`.

---

## 4. `firestore.rules` ændringer

### 4.1 Fjern top-level items/checkpoints/comments-regler

Følgende regel-blokke fjernes helt:
- `match /items/{itemId}` (nuværende linjer ~101-131)
- `match /items/{itemId}/checkpoints/{checkpointId}` (nuværende linjer ~134-161)
- `match /items/{itemId}/comments/{commentId}` (nuværende linjer ~164-192)

### 4.2 Nye subcollection-regler

Indsættes efter `/projects/{projectId}/members/{memberId}`-blokken:

```firestore
    // Sager / items under projekt
    match /projects/{projectId}/items/{itemId} {
      allow read: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);

      allow create: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor"])
                     && request.resource.data.keys().hasAll(["projectId", "createdBy"])
                     && request.resource.data.projectId == projectId;

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

    // Checkpoints under items
    match /projects/{projectId}/items/{itemId}/checkpoints/{checkpointId} {
      allow read: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);

      allow create, update: if isAuthenticated()
                               && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);

      allow delete: if isAuthenticated()
                      && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);
    }

    // Kommentarer under items
    match /projects/{projectId}/items/{itemId}/comments/{commentId} {
      allow read: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);

      allow create: if isAuthenticated()
                     && hasProjectRoleById(projectId, ["owner", "admin", "editor"])
                     && request.resource.data.keys().hasAll(["projectId", "itemId", "text"])
                     && request.resource.data.projectId == projectId
                     && request.resource.data.itemId == itemId;

      allow update, delete: if isAuthenticated()
                               && (resource.data.authorId == getUserId()
                                   || hasProjectRoleById(projectId, ["owner", "admin"]));
    }
```

**Bemærkninger til sikkerhed:**
- `hasProjectRoleById(projectId, ...)` laver stadig et `get()` på `projects/{projectId}`, men stien er nu en **path-variabel** frem for at blive læst fra `resource.data`. Derfor kan Firestore bevise listen sikker uden at kende resultatsættet.
- Email-medlemmer får stadig automatisk `editor` via `getProjectMemberRole` (tjekker `memberEmails`), så de har både read og create/update på egne items.
- `viewer` får read-only adgang.

### 4.3 Checklists-regel-ændring

Nuværende `allow read: if canReadChecklist();` splittes:

```firestore
    match /checklists/{checklistId} {
      function canReadChecklist() {
        return isAuthenticated()
               && (resource.data.ownerId == getUserId()
                   || getUserId() in resource.data.sharedWith
                   || (resource.data.projectId != null
                       && hasProjectRoleById(resource.data.projectId,
                            ["owner", "admin", "editor", "viewer"])));
      }

      function canWriteChecklist() { /* uændret */ }
      function canDeleteChecklist() { /* uændret */ }

      allow get: if canReadChecklist();

      // Liste-queries må kun bruge dokument-felter, ikke cross-document get().
      allow list: if isAuthenticated()
                     && (
                         resource.data.ownerId == getUserId()
                         || getUserId() in resource.data.sharedWith
                         || (resource.data.projectId != null
                             && request.query.projectId == resource.data.projectId
                             && hasProjectRoleById(resource.data.projectId,
                                  ["owner", "admin", "editor", "viewer"]))
                        );

      allow create: if isAuthenticated()
                     && request.resource.data.keys().hasAll(["name", "ownerId"])
                     && request.resource.data.ownerId == getUserId()
                     && (request.resource.data.projectId == null
                         || hasProjectRoleById(request.resource.data.projectId,
                              ["owner", "admin", "editor"]));

      allow update: if canWriteChecklist();

      allow delete: if canDeleteChecklist();
    }
```

**Fallback:** Hvis emulator-tests viser, at `request.query.projectId == resource.data.projectId` ikke er tilstrækkelig eller ikke virker i `@react-native-firebase`, skal projekt-scopede checklists flyttes til `/projects/{projectId}/checklists/{checklistId}` (se Task 2.12 fallback). Dette ændrer ikke item-subcollection-løsningen.

### 4.4 `checklists/{checklistId}/items/{itemId}` regler

De nuværende regler forbliver principielt uændrede, da de kun læser parent checklist (et `get()` er tilladt for subcollection-liste? Nej — også her vil liste-query fejle). **Anbefaling:** Split også denne `read` i `get` og `list`:

```firestore
    match /checklists/{checklistId}/items/{itemId} {
      function parentChecklistData() {
        return getAfter(/databases/$(database)/documents/checklists/$(checklistId)).data;
      }

      function canReadChecklistItem() {
        return isAuthenticated()
               && (parentChecklistData().ownerId == getUserId()
                   || getUserId() in parentChecklistData().sharedWith
                   || (parentChecklistData().projectId != null
                       && hasProjectRoleById(parentChecklistData().projectId,
                            ["owner", "admin", "editor", "viewer"])));
      }

      function canWriteChecklistItem() { /* tilsvarende med getAfter */ }

      allow get: if canReadChecklistItem();
      allow list: if isAuthenticated()
                    && (parentChecklistData().ownerId == getUserId()
                        || getUserId() in parentChecklistData().sharedWith);
      allow create, update, delete: if canWriteChecklistItem();
    }
```

Bemærk: Brug af `getAfter()` her, fordi checklist-items ofte oprettes i samme batch som parent checklist.

---

## 5. Cloud Function-cascade-delete design (B9)

### 5.1 Overordnet design

Implementer en Firebase **Callable Function** `deleteProject({ projectId })` i et nyt `functions/`-projekt. Functionen:

1. Verificerer autentificering.
2. Verificerer at brugeren har `owner` eller `admin`-rolle i projektet.
3. Sletter hele `projects/{projectId}`-dokumentet inkl. alle subcollections (`items`, `items/{itemId}/checkpoints`, `items/{itemId}/comments`, `members`) vha. `recursiveDelete`.
4. Sletter projekt-scopede checklists i `/checklists` og deres `items`-subcollection.
5. Sletter Storage-præfikset `projects/{projectId}/items`.
6. Returnerer `{ success: true }`.

### 5.2 Struktur

```
functions/
  package.json
  tsconfig.json
  src/
    index.ts
    deleteProject.ts
  .gitignore
```

`firebase.json` opdateres med:

```json
{
  "functions": {
    "source": "functions"
  }
}
```

### 5.3 Implementerings-skabelon (`functions/src/deleteProject.ts`)

```ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

export const deleteProject = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login påkrævet.");
  }

  const { projectId } = data as { projectId?: string };
  if (!projectId || typeof projectId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "projectId påkrævet.");
  }

  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Projektet findes ikke.");
  }

  const projectData = projectSnap.data()!;
  const uid = context.auth.uid;
  const email = context.auth.token?.email;

  // Rollecheck: owner/admin eller rolle i members-subcollection.
  const isOwnerOrAdmin =
    projectData.ownerId === uid ||
    projectData.roles?.[uid] === "owner" ||
    projectData.roles?.[uid] === "admin" ||
    (email && projectData.roles?.[email] === "owner") ||
    (email && projectData.roles?.[email] === "admin");

  if (!isOwnerOrAdmin) {
    const memberSnap = await projectRef.collection("members").doc(uid).get();
    const memberByEmail = email
      ? await projectRef.collection("members").doc(email).get()
      : null;
    const role = memberSnap.data()?.role || memberByEmail?.data()?.role;
    if (role !== "owner" && role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Kun ejer/admin kan slette projektet.");
    }
  }

  // Slet projekt-scopede checklists og deres items.
  const checklistsSnap = await db
    .collection("checklists")
    .where("projectId", "==", projectId)
    .get();

  for (const checklistDoc of checklistsSnap.docs) {
    await db.recursiveDelete(checklistDoc.ref);
  }

  // Slet hele projektet inkl. subcollections (items, checkpoints, comments, members).
  await db.recursiveDelete(projectRef);

  // Slet fotos i Storage.
  try {
    const [files] = await storage.bucket().getFiles({ prefix: `projects/${projectId}/items/` });
    await Promise.all(files.map((file) => file.delete()));
  } catch (error) {
    console.warn(`[deleteProject] Storage cleanup error for ${projectId}:`, error);
  }

  return { success: true };
});
```

### 5.4 App-side integration

```ts
// services/projects.ts
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";

export async function deleteProject(projectId: string): Promise<void> {
  const fn = httpsCallable<{ projectId: string }, { success: boolean }>(
    getFunctions(),
    "deleteProject"
  );
  await fn({ projectId });
}
```

- Slet den gamle `deleteProjectCascade` fra appen.
- `getProjectDeletionStats` kan enten aflæses fra callable eller vises som "slettes ved bekræftelse".

### 5.5 Sikkerheds-/drift-noter

- Callable Function kører med Admin SDK og bypasser `firestore.rules`, så rollecheck skal gøres eksplicit i functionen.
- `recursiveDelete` håndterer store subcollections uden at ramme client-batch-limits.
- Functionen skal deployes med passende memory/timeout:
  ```json
  { "runWith": { "memory": "256MB", "timeoutSeconds": 300 } }
  ```
- For at undgå delvis sletning: hvis Storage-sletning fejler, logges det; functionen returnerer stadig success. Overvej en separat cleanup-job for stranded files.

---

## 6. Testplan / gates der skal lukkes før build

### 6.1 Automatiske gates (must-pass)

| Gate | Kommando / metode | Ansvarlig |
|---|---|---|
| G1 Typecheck | `npm run typecheck` | Backend/UI Agent |
| G2 Lint | `npm run lint` | QA Agent |
| G3 Pre-test check | `npm run pre-test-check` | QA Agent |
| G4 Firestore emulator regeltests | `firebase emulators:exec --only firestore "node scripts/test-rules.js"` (opret hvis ikke findes) | Security Agent |

### 6.2 Regeltest-cases (skal dækkes i G4)

| Collection | Operation | Rolle | Forventet |
|---|---|---|---|
| `projects/{p}/items` | list | owner/admin/editor/viewer/email-editor | tilladt |
| `projects/{p}/items` | list | ikke-medlem | afvist (tom liste/fejl) |
| `projects/{p}/items` | create | editor | tilladt |
| `projects/{p}/items` | create | viewer | afvist |
| `projects/{p}/items` | update | anden editors item (assignedTo=self) | tilladt |
| `projects/{p}/items` | delete | anden editors item (createdBy=other) | afvist |
| `projects/{p}/items/{i}/checkpoints` | list/create/update/delete | editor | tilladt |
| `projects/{p}/items/{i}/comments` | create | editor | tilladt |
| `projects/{p}/items/{i}/comments` | delete | andens kommentar | afvist (medmindre owner/admin) |
| `checklists` | list by ownerId | owner | tilladt |
| `checklists` | list by projectId | projektmedlem | tilladt |
| `checklists` | list by projectId | ikke-medlem | afvist |

### 6.3 Manuel E2E regression (must-pass)

**Forberedelse:** Wipe Firestore testdata og genskab 2 projekter med hhv. 1 owner + 1 email-editor og 1 owner + 1 uid-editor.

| # | Scenario | Steps | Succeskriterie |
|---|---|---|---|
| E1 | Opret item via Board | Owner opretter manuelt + via stemme i projekt A | Begge items vises i Board for owner og editor |
| E2 | Søg viser items | Søg i projekt A | Resultater vises; tryk ind og tilbage |
| E3 | Kommentarer | Editor tilføjer kommentar; owner sletter den | Kommentarer vises real-time; sletning virker |
| E4 | Checkliste fra søgning | Owner opretter dynamisk liste fra søgning, afkrydser punkter | Source-item status opdateres til done/in_progress |
| E5 | Offline checklist | Slå flymode til, afkryds punkt, slå flymode fra | Pending-op synkroniseres; source item opdateres |
| E6 | Reminder notification | Opret reminder på item, tappes notifikation | Åbner item-detalje korrekt |
| E7 | Sikkerhed — ikke-medlem | Log ind som bruger C, prøv at subscribe items i projekt A | Tom liste / permission-denied |
| E8 | Projektsletning | Owner sletter projekt A | Callable returnerer success; alle items/checkpoints/comments/checklists/fotos forsvinder |
| E9 | Email-medlem editor | Email-editor opretter item og kommentar i projekt B | Begge operationer tilladt; liste-query virker |

### 6.4 Data-migration gate

- Da der kun er testdata, anvendes **wipe-and-recreate**.
- Gate: PO/Master Agent godkender wipe af dev/prod testdata før build.
- Eksportér screenshots af nøgletilstande før wipe.

### 6.5 Build-go checklist

- [ ] G1-G4 grønne.
- [ ] E1-E9 bestået manuelt på fysisk enhed/simulator.
- [ ] Cloud Function deployet og B9 testet i emulator/prod.
- [ ] `firestore.rules` deployet.
- [ ] Data wiped og genskabt.
- [ ] Ingen nye composite-index-fejl i logs.
- [ ] PO-godkendelse ifølge SOP.

---

## 7. Omfangsskøn og nødvendige builds

| Område | Kompleksitet | Estimat |
|---|---|---|
| Service-ændringer (items/checkpoints/comments) | Mellem | 1-2 dage |
| Checklists-integration (toggle/sync/create) | Mellem | 1 dag |
| Offline pending-ops tilpasning | Lav-mellem | 0.5 dag |
| UI routing + item.tsx + notifications | Mellem | 1 dag |
| Firebase Functions opsætning + deleteProject | Mellem-høj | 1-2 dage |
| firestore.rules + emulator-tests | Mellem | 1 dag |
| Data wipe, E2E regression, bugfix | Mellem-høj | 1-2 dage |
| **I alt** | **Mellem-høj** | **5-8 arbejdsdage** |

**Builds:**
- **Build 1:** Efter service- og regel-ændringer; test mod emulator.
- **Build 2:** Efter Cloud Function-integration og første runde bugfixes.
- **Build 3 (valgfri):** Kun hvis emulator-tests viser, at checklists top-level `list`-split ikke er tilstrækkelig, og projekt-scopede checklists skal flyttes til subcollections.

**Forventning:** 2 builds minimum, 3 hvis checklists også flyttes.

---

## 8. Risiko-mitigation per feature

### B3 — Offline understøttelse af lister (US-005)

**Risiko:** Pending-ops og cachede lister refererer til gamle checkpoint-/item-stier.  
**Mitigation:**
- `ChecklistItem` bærer allerede `sourceProjectId`. Sørg for at `setChecklistPointCompleted` bruger dette felt og ikke `checklist.projectId`.
- Pending-op payload ændres ikke (hele objektet gemmes), men `executePendingOp` kalder nu en `toggleChecklistPoint`, der selv resolver nye stier.
- Test E5 specifikt: offline toggle -> online flush -> verificér source item status.
- Hvis pending-op fejler pga. slettet item/checkpoint, marker op som fejlet og vis brugeren en "afventer synkronisering"-fejl.

### B4 — Push-påmindelser (US-011)

**Risiko:** `targetId` (itemId) var nok før; nu kræves `projectId` for at navigere til item-detalje.  
**Mitigation:**
- Tilføj `targetProjectId` til `Reminder`/`ReminderInput` og notification data.
- Opdater `createReminder` i `app/item.tsx` til at sende `targetProjectId: projectId`.
- Opdater `NotificationResponseHandler` til at inkludere `projectId` i route.
- Fallback: hvis gammel reminder mangler `targetProjectId`, vis Alert i stedet for at crashe.
- Test E6.

### B8 — Tomt projektnavn + server-side dubletter (US-006)

**Risiko:** Ingen direkte påvirkning af item-read, men `createProject` Cloud Function (hvis den implementeres i B8) bør ikke modarbejde nye stier.  
**Mitigation:**
- Sikr at `createProject` (client-side i dag) ikke påvirkes; validering af navn forbliver uændret.
- Hvis B8 introducerer Cloud Function til projektoprettelse, sørg for at den returnerer `projectId` som i dag, så appen kan bruge det videre til `createItem`.
- Ingen ændringer i denne runde udover at `deleteProject` callable måske kan placeres i samme functions-pakke.

### B9 — Slet projekt (US-001)

**Risiko:** Højeste risiko. Gammel client-side cascade-delete traverserer top-level `/items` og rammer timeout/limits. Med nye subcollections skal logikken omskrives.  
**Mitigation:**
- **Gør B9 til Cloud Function nu.** Implementer `deleteProject` callable med `recursiveDelete`.
- Fjern client-side `deleteProjectCascade` for at undgå dobbeltarbejde og partial deletes.
- Test E8: slet et projekt med items + checkpoints + comments + checklists + fotos; verificér alt fjernet.
- Log warnings hvis Storage-cleanup fejler; overvej scheduled cleanup function senere.

### D1 — Voice fjern "Åben"/"åbn"-residu (US-004)

**Risiko:** Ingen. D1 er stemmeparser-logik.  
**Mitigation:**
- Sikr at `createItem(activeProject.id, { ... })` kaldes korrekt fra `VoiceCaptureModal`/`board.tsx`.
- Kør `scripts/verify-voice-parser.ts` uændret.

### D3 — Auto-titel må ikke overskrive manuel titel (US-004)

**Risiko:** Ingen direkte.  
**Mitigation:**
- Sikr at `CreateItemForm` / `VoiceCaptureModal` kalder `createItem` med korrekt `projectId` og at titel-feltet ikke påvirkes af path-ændring.

---

## 9. Migration og datahåndtering

Da der kun er testdata, anvendes **wipe-and-recreate**:

1. **Backup:** Tag screenshots af Board, Søg, Checklister, Projekt-medlemmer i dev/prod.
2. **Wipe:** Slet i Firebase Console:
   - Alle `/items/{itemId}` og subcollections (`checkpoints`, `comments`).
   - Alle `/checklists/{checklistId}` og subcollections (`items`).
   - Alle `/projects/{projectId}` og subcollections (inkl. `members`).
   - Storage-præfikset `projects/`.
   - (Valgfrit) behold `/users/{userId}/reminders` men accepter at gamle reminders mangler `targetProjectId`.
3. **Recreate:**
   - Opret 2+ testprojekter via appen.
   - Inviter email-medlem og uid-medlem.
   - Opret items manuelt og via stemme.
   - Tilføj kommentarer og checkpoints.
   - Opret checklister fra søgning.
   - Opret reminders.
4. **Verificer:** Gennemfør E1-E9.

---

## 10. Næste skridt / stop-kriterier

1. Master Agent reviewer denne plan og tildeler tasks til agent-roller.
2. PO godkender scope, wipe af testdata og antal builds (2-3).
3. **Stop-kriterium:** Ingen ny feature-kodning der berører items/checkpoints/comments/checklists før denne plan er landet og E2E-gates er grønne.
4. Efter godkendelse: Opret branch og start Task 2.2 (Backend/UI Agent).

---

## 11. Referencer

- `C:\Users\kimgr\data-capture-app\.claude\team\status\rca-items-read-us004.md`
- `C:\Users\kimgr\data-capture-app\firestore.rules`
- `C:\Users\kimgr\data-capture-app\services\items.ts`
- `C:\Users\kimgr\data-capture-app\services\checkpoints.ts`
- `C:\Users\kimgr\data-capture-app\services\comments.ts`
- `C:\Users\kimgr\data-capture-app\services\checklists.ts`
- `C:\Users\kimgr\data-capture-app\services\checklistsOffline.ts`
- `C:\Users\kimgr\data-capture-app\services\projects.ts`
- `C:\Users\kimgr\data-capture-app\services\reminders.ts`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\board.tsx`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\search.tsx`
- `C:\Users\kimgr\data-capture-app\app\item.tsx`
- `C:\Users\kimgr\data-capture-app\app\checklist.tsx`
- `C:\Users\kimgr\data-capture-app\components\NotificationResponseHandler.tsx`
- `C:\Users\kimgr\data-capture-app\services\deeplinks.ts`
