# Sikkerhedsgodkendelse — US-004 items/checkpoints/comments som subcollections under `projects/{projectId}`

**App:** Data Capture  
**Branch:** `fix/us004-voice-redesign` / ny feature branch `fix/us004-items-subcollection`  
**Dato:** 2026-07-15  
**Security/Compliance Agent:** Security/Compliance Agent  
**Status:** Conditional approval — MUST-FIX skal lukkes før Dev Agent start

---

## 1. Godkendelse af datamodel-ændring

**Conditional approval.**

Omlægning af `items`, `checkpoints` og `comments` til subcollections under `projects/{projectId}` er den korrekte og langsigtet holdbare sikkerhedsarkitektur. Den:

- Følger Firestores anbefalede hierarkiske model.
- Eliminerer cross-document `get()` baseret på `resource.data.projectId` i `list`-regler.
- Bevarer single source of truth for rollekontrol i `projects/{projectId}`.
- Gør cascade-delete mere robust via `recursiveDelete`.

**Betingelse for fuld godkendelse:** Nedenstående MUST-FIX punkter skal være adresseret i design-spec og regler, før Dev Agent må kode.

---

## 2. Review af foreslåede `firestore.rules`-snippet

### 2.1 `/projects/{projectId}/items/{itemId}`

```firestore
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
```

**Vurdering:**

- `read` og `create`: korrekte og query-aligned.
- `delete`: korrekt parenteseret.
- `update`: **precedence-fælde / MUST-FIX.** Selvom Firestore-evalueringen faktisk bliver korrekt pga. `&&`-præcedens over `||`, er udtrykket formateringsmæssigt tvetydigt. Det læses nemt som at enhver editor kan opdatere ethvert item, eller at `isAuthenticated()` kun dækker første gren. Kræv eksplicit parentesering:

```firestore
allow update: if isAuthenticated()
               && (
                    hasProjectRoleById(projectId, ["owner", "admin"])
                    || (hasProjectRoleById(projectId, ["editor"])
                        && (resource.data.createdBy == getUserId()
                            || resource.data.assignedTo == getUserId()))
                  );
```

- `request.resource.data.projectId == projectId` i `create` er fin defense-in-depth, men redundant ift. stien.

### 2.2 `/projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}`

```firestore
match /projects/{projectId}/items/{itemId}/checkpoints/{checkpointId} {
  allow read: if isAuthenticated()
                 && hasProjectRoleById(projectId, ["owner", "admin", "editor", "viewer"]);

  allow create, update: if isAuthenticated()
                           && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);

  allow delete: if isAuthenticated()
                  && hasProjectRoleById(projectId, ["owner", "admin", "editor"]);
}
```

**Vurdering:** Korrekt. Ingen precedence-fælder. `hasProjectRoleById(projectId, ...)` er path-variabel-baseret og derfor query-aligned for både `get` og `list`.

### 2.3 `/projects/{projectId}/items/{itemId}/comments/{commentId}`

```firestore
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

**Vurdering:** Korrekt. `update, delete` er korrekt parenteseret. `create` kræver `itemId == itemId`, hvilket er fin defense-in-depth. Bemærk at editors kan slette andres kommentarer? Nej — kun owner/admin kan ifølge `hasProjectRoleById(..., ["owner", "admin"])`. Editor kan kun slette egne (`authorId == getUserId()`). Korrekt.

### 2.4 `/checklists/{checklistId}` get/list split

```firestore
allow get: if canReadChecklist();

allow list: if isAuthenticated()
               && (
                    resource.data.ownerId == getUserId()
                    || getUserId() in resource.data.sharedWith
                    || (resource.data.projectId != null
                        && request.query.projectId == resource.data.projectId
                        && hasProjectRoleById(resource.data.projectId,
                             ["owner", "admin", "editor", "viewer"]))
                  );
```

**Vurdering:** **Ugyldig `list`-regel / MUST-FIX.**

Firestore `list`-regler må **ikke** referere `resource.data` per dokument, fordi regelmotoren ikke kender resultatsættet på forhånd. `resource.data.ownerId`, `resource.data.sharedWith` og `resource.data.projectId` kan derfor ikke bruges i en `list`-regel. Dette vil afvise `subscribeToChecklists` / `subscribeToProjectChecklists` eller give uforudsigelig opførsel.

Korrekt løsning er en af følgende:

**Option A (anbefales):** Flyt projekt-scopede checklists til `/projects/{projectId}/checklists/{checklistId}` med tilsvarende subcollection-regler. Personlige checklists kan beholdes top-level med `where("ownerId", "==", uid)` / `where("sharedWith", "array-contains", uid)` og regler uden cross-document lookups.

**Option B (hvis checklists forbliver top-level):**
- For personlige lister: `allow list: if isAuthenticated() && (request.query.ownerId == getUserId() || request.query.sharedWith == getUserId());`
- For projekt-scopede lister: `allow list: if isAuthenticated() && request.query.projectId == projectId && hasProjectRoleById(request.query.projectId, [...]);`

Bemærk: Appen skal så køre separate queries for personlige vs. projekt-scopede lister. Option A er simplere og sikrere.

### 2.5 `/checklists/{checklistId}/items/{itemId}`

Impl-planen foreslår `get`/`list`-split med `getAfter()` på parent checklist:

```firestore
allow list: if isAuthenticated()
              && (parentChecklistData().ownerId == getUserId()
                  || getUserId() in parentChecklistData().sharedWith);
```

**Vurdering:** **Ugyldig `list`-regel / MUST-FIX.** `parentChecklistData()` bruger `getAfter()` (eller `get()`), hvilket er ugyldigt i en `list`-regel. Subcollection-liste-query på `/checklists/{checklistId}/items` vil fejle. Hvis checklists flyttes til `/projects/{projectId}/checklists/{checklistId}/items/{itemId}`, kan reglerne baseres på path-variablen `projectId` i stedet for parent-lookup.

---

## 3. Review af `deleteProject` Cloud Function spec

Specifikationen i `impl-plan-items-subcollection-us004.md` afsnit 5.3 reviewes her.

### 3.1 Auth

```ts
if (!context.auth) {
  throw new functions.https.HttpsError("unauthenticated", "Login påkrævet.");
}
```

**OK.** Callable Function kræver autentificeret bruger.

### 3.2 Input validation

```ts
if (!projectId || typeof projectId !== "string") {
  throw new functions.https.HttpsError("invalid-argument", "projectId påkrævet.");
}
```

**OK.** Enkelt og tilstrækkeligt. Overvej at validere format/længde for at forhindre path traversal.

### 3.3 Rollecheck

```ts
const isOwnerOrAdmin =
  projectData.ownerId === uid ||
  projectData.roles?.[uid] === "owner" ||
  projectData.roles?.[uid] === "admin" ||
  (email && projectData.roles?.[email] === "owner") ||
  (email && projectData.roles?.[email] === "admin");
```

**MUST-FIX:** `projectData.roles?.[email]` er forkert. `roles`-kortet i `projects/{projectId}` er key'ed by UID (`getUserId()`), ikke email. Email-medlemmer uden specifik rolle får editor via `memberEmails` fallback i reglerne. Hvis en email-medlem har fået tildelt en rolle explicit, vil den stadig være lagret under vedkommendes UID i `roles`-kortet (når de logger ind), ikke under email.

Derudover tjekkes `memberEmails` ikke her. En email-medlem, der kun findes i `memberEmails` (og dermed er editor ifølge reglerne), vil blive afvist i CF, selvom de har editor-rettigheder. Dette er inkonsistent med Firestore-reglerne.

Korrekt rollecheck:

1. Tjek `ownerId === uid`.
2. Tjek `roles[uid] in ["owner", "admin"]`.
3. Hvis ikke, slå `members/{uid}` op.
4. Hvis email findes og brugeren ikke er autentificeret med UID (fx anonym bruger), tjek `memberEmails` for email og giv editor.
5. Alternativt: slå `members/{email}` op, hvis denne konvention bruges.

### 3.4 recursiveDelete

```ts
await db.recursiveDelete(projectRef);
```

**OK.** Sletter `projects/{projectId}` og alle subcollections (`items`, `items/{itemId}/checkpoints`, `items/{itemId}/comments`, `members`). Dette er den rigtige mekanisme for cascade-delete.

### 3.5 Projekt-scopede checklists

```ts
const checklistsSnap = await db.collection("checklists").where("projectId", "==", projectId).get();
for (const checklistDoc of checklistsSnap.docs) {
  await db.recursiveDelete(checklistDoc.ref);
}
```

**OK under forudsætning af at checklists forbliver top-level.** Hvis checklists flyttes til subcollections under `projects/{projectId}`, fjernes dette trin, da de slettes med `recursiveDelete(projectRef)`.

### 3.6 Storage cleanup

```ts
const [files] = await storage.bucket().getFiles({ prefix: `projects/${projectId}/items/` });
await Promise.all(files.map((file) => file.delete()));
```

**SHOULD-FIX:**
- For mange filer kan `Promise.all(files.map(...))` ramme paralleliseringsgrænser. Overvej `bucket.deleteFiles({ prefix: ... })` eller batching.
- Hvis Storage-cleanup fejler, logges der blot warning. Dette er acceptabelt, men bør dokumenteres og evt. følges op af en scheduled cleanup-function.
- Sørg for at prefix ikke kan escapes af `projectId` (valider projectId-format).

### 3.7 Timeout / memory

```json
{ "runWith": { "memory": "256MB", "timeoutSeconds": 300 } }
```

**SHOULD-FIX:** `recursiveDelete` på store subcollections kan bruge betydelig hukommelse. Anbefaling: `memory: "512MB"` eller `"1GB"` for at undgå OOM. Timeout 300s er rimelig.

### 3.8 Error handling

- Hvis projekt ikke findes: `not-found` — OK.
- Hvis bruger ikke er owner/admin: `permission-denied` — OK, men se rollecheck-fix ovenfor.
- Hvis `recursiveDelete` fejler: kastes exception ud — OK, men ingen partial-state rollback. Dette er acceptabelt, da `recursiveDelete` selv er idempotent.
- Storage cleanup fejl logges, men function returnerer success — OK, men bør dokumenteres.

### 3.9 Oversigt Cloud Function-godkendelse

| Aspekt | Status | Bemærkning |
|---|---|---|
| Auth | OK | Kræver `context.auth`. |
| Input validation | OK | Tjekker `projectId` type. |
| Rollecheck | MUST-FIX | Fjern `roles[email]`; håndter `memberEmails` for email-editorer. |
| recursiveDelete | OK | Sletter projekt + subcollections. |
| Checklists cleanup | OK | Hvis checklists forbliver top-level. |
| Storage cleanup | SHOULD-FIX | Brug `deleteFiles({ prefix })`; valider projectId. |
| Timeout/memory | SHOULD-FIX | Øg memory til 512MB/1GB. |
| Error handling | OK | Logging er acceptabel; dokumenter partial cleanup. |

---

## 4. MUST-FIX før Dev Agent må starte

Følgende skal være specificeret og godkendt i design-spec, før Dev Agent koder:

1. **Item `update`-regel parentesering.** Reglen skal skrives med eksplicitte parenteser, så `isAuthenticated()` og rollelogikken ikke kan misforstås.
2. **Checklist `list`-regel ugyldig.** Nuværende forslag med `resource.data` i `list` virker ikke. Træf beslutning:
   - **Anbefaling:** Flyt projekt-scopede checklists til `/projects/{projectId}/checklists/{checklistId}` (inkl. deres `items`-subcollection).
   - Alternativ: behold top-level, men redesign `list`-regel udelukkende med `request.query`-filtre og del personlige/projekt-scopede queries op.
3. **Checklist-item `list`-regel ugyldig.** `getAfter()`/`get()` på parent checklist må ikke bruges i `list`. Løses automatisk hvis checklists flyttes under `projects/{projectId}`.
4. **Cloud Function rollecheck.** Fjern `projectData.roles?.[email]`. Implementer konsistent email-medlemshåndtering (se afsnit 3.3).
5. **Emulator-testplan som gate.** Der skal findes et testscript (`scripts/test-rules.js` eller lign.) med positive og negative cases for alle roller og ikke-medlemmer, før regler deployes.
6. **Data-model / path-afklaring for item-lookup uden `projectId`.** Alle UI-steder, der navigerer til item-detail kun med `itemId`, skal opdateres til at medsende `projectId`, eller der skal etableres en global unik mapping.

---

## 5. SHOULD-FIX under implementering

Disse kan adresseres under kodning, men skal følges op i QA:

1. **Cloud Function memory:** Øg til `512MB` eller `1GB` for `recursiveDelete`.
2. **Storage cleanup:** Brug `bucket.deleteFiles({ prefix })` i stedet for individuelle `file.delete()`; log warnings og dokumenter eventuelt stranded files.
3. **ProjectId validering i CF:** Tjek at `projectId` kun indeholder tilladte tegn (alphanumerisk, `-`, `_`) for at forhindre path traversal i Storage-prefix.
4. **Composite indexes:** Verificer at `where("assignedTo")`, `where("title")` etc. i subcollections stadig virker med eksisterende indexes; opdater `firestore.indexes.json` ved behov.
5. **Fallback for gamle reminders/deep links:** Dokumenter og test fallback, når `targetProjectId` mangler.
6. **Offline pending-ops:** Sikr at gamle pending-ops med gamle paths fejler gracefully og markeres som failed.

---

## 6. Bekræftelse: email-medlemmer bevarer editor-adgang

**Ja.**

`hasProjectRoleById(projectId, [...])` kalder `getProjectMemberRole(projectDataById(projectId))`, som genbruger eksisterende logik fra `firestore.rules`:

```firestore
function getProjectMemberRole(projectData) {
  return isAuthenticated()
         ? (getUserId() == projectData.ownerId
            ? "owner"
            : (getUserId() in projectData.roles
               ? projectData.roles.get(getUserId(), null)
               : (getUserEmail() != null
                  && getUserEmail() in projectData.memberEmails
                  ? "editor"
                  : null)))
         : null;
}
```

Så længe `request.auth.token.email` er til stede, får email-medlemmer (som findes i `memberEmails`) automatisk `editor`-rollen. Dette gælder for både gamle regler og nye subcollection-regler, fordi projekt-dokumentet stadig ligger på `/projects/{projectId}`.

**Bemærk:** Anonyme brugere uden email kan ikke matches via `memberEmails`. Dette er samme begrænsning som i dag.

---

## 7. Bekræftelse: ikke-medlemmer blokeres på alle relevante paths

**Ja, forudsat at de foreslåede regler rettes for checklist-liste-fælden.**

For subcollection-paths under `projects/{projectId}`:

| Path | list | get | create | update | delete |
|---|---|---|---|---|---|
| `/projects/{projectId}/items/{itemId}` | `permission-denied` | `permission-denied` | `permission-denied` | `permission-denied` | `permission-denied` |
| `/projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}` | `permission-denied` | `permission-denied` | `permission-denied` | `permission-denied` | `permission-denied` |
| `/projects/{projectId}/items/{itemId}/comments/{commentId}` | `permission-denied` | `permission-denied` | `permission-denied` | `permission-denied` | `permission-denied` |

Årsag: `hasProjectRoleById(projectId, [...])` returnerer `false` / `null` for brugere, der ikke er `ownerId`, ikke findes i `roles`, og hvis email ikke findes i `memberEmails`. Derfor fejler alle `allow`-betingelser, og Firestore returnerer `permission-denied`.

For `/checklists/{checklistId}` gælder blokering af ikke-medlemmer, når `get`- og gyldige `list`-regler er på plads. Hvis projekt-scopede checklists flyttes til `/projects/{projectId}/checklists/{checklistId}`, blokeres ikke-medlemmer på samme måde via path-variablen `projectId`.

---

## 8. Godkendelsesafgørelse

| Punkt | Afgørelse |
|---|---|
| Datamodel-ændring (items/checkpoints/comments under `projects/{projectId}`) | **Conditional approval.** |
| `firestore.rules` for items/checkpoints/comments-subcollections | **Conditional approval** — item `update` skal parenteseres eksplicit. |
| Checklists `get`/`list`-split | **NOT approved** som foreslået. `list`-regel er ugyldig. Kræver redesign eller flytning til subcollections. |
| `deleteProject` Cloud Function spec | **Conditional approval** — rollecheck for email-medlemmer skal rettes; memory bør øges. |
| Dev Agent start | **BLOCKED** indtil MUST-FIX i afsnit 4 er lukket. |

**Samlet vurdering:** Løsning B er den rigtige retning. De sikkerhedsmæssige fund er lukkelige, men de skal lukkes i design-spec og regel-udkast, før Dev Agent går i gang. Cloud Function-rollecheck er den mest kritiske funktionelle fejl, da den ellers vil afvise gyldige editor- eller admin-handlinger for email-medlemmer.

---

## 9. Re-review af opdateret design spec (`design-us004-items-subcollection-us004.md`)

**Dato for re-review:** 2026-07-15  
**Reviewer:** Security/Compliance Agent

### 9.1 Ændringer der er lukket korrekt

| Oprindelig MUST-FIX | Status | Bemærkning |
|---|---|---|
| Item `update`-regel parentesering | ✅ Lukket | Sektion 5.2 har nu eksplicitte parenteser. |
| Cloud Function `roles[email]` | ✅ Lukket | Sektion 6.4 angiver nu, at `roles`-kortet kun er keyed by UID, og `roles[email]` ikke må bruges. |
| Cloud Function memory | ✅ Lukket | Sektion 6.7 angiver `memory: "512MB"`. |
| Projekt-scopede checklists under `/projects/{projectId}/checklists` | ✅ Delvist | Sektion 5.3 indeholder korrekte regler for denne sti. |

### 9.2 Resterende blocker før Dev Agent må starte

**1. Inkonsistens i checklist-strategi (primær vs. fallback)**

Koordinatoren meddelte, at projekt-scopede checklists er **primær strategi** under `/projects/{projectId}/checklists/{checklistId}`. Men design-spec afsnit **7.1** og **7.2** beskriver stadig top-level `/checklists/{checklistId}` med `get`/`list`-split som **primær strategi**, mens subcollection-strategien er markeret som **fallback**.

Konsekvenser:
- Hvis Dev Agent starter efter afsnit 7.1, vil projekt-scopede checklists blive skrevet top-level, hvilket strider mod den godkendte arkitektur og kan kræve en senere migration.
- Cloud Function sektion **6.5** trin 2 siger fortsat, at function skal query `/checklists` for `projectId`. Hvis projekt-scopede checklists ligger under `/projects/{projectId}/checklists`, skal dette trin fjernes, da de slettes med `recursiveDelete(projectRef)`.

**Krævet handling:** Opdater afsnit 7.1, 7.2 og 6.5, så det entydigt fremgår, at:
- Projekt-scopede checklists **altid** ligger under `/projects/{projectId}/checklists/{checklistId}`.
- Top-level `/checklists/{checklistId}` kun bruges til personlige/shared checklists med `projectId == null`.
- `deleteProject` Cloud Function ikke længere query'er top-level `/checklists` efter `projectId`.

### 9.3 Andre bemærkninger (ikke blockers)

- **Personlige/shared checklist `list`-regel (afsnit 5.4):** `request.query.sharedWith.hasAny([getUserId()])` er en ny syntaks i dette repo. Den er **kun godkendt betinget** af, at emulator-tests viser, at `@react-native-firebase/firestore` oversætter `where("sharedWith", "array-contains", uid)` korrekt til denne regelform. Dette er dækket af emulator-gaten i afsnit 10, punkt 7.
- **`allow delete` for personlig checklist:** Bør eksplicit inkludere `isAuthenticated()` for læsbarhed, selvom resultatet uden bliver afvist alligevel.
- **`getProjectDeletionStats`:** Bør også overvejes som callable i samme functions-pakke for at undgå client-side iterering over subcollections. Dette er en implementation-beslutning, ikke en sikkerhedsblocker.

### 9.4 Opdateret godkendelsesafgørelse (efter re-review af nuværende fil)

Efter at have genlæst den nuværende version af `design-us004-items-subcollection-us004.md` er følgende bekræftet:

| Område | Afgørelse |
|---|---|
| Datamodel items/checkpoints/comments | ✅ Godkendt |
| `firestore.rules` items/checkpoints/comments (afsnit 5.2) | ✅ Godkendt |
| `firestore.rules` projekt-scopede checklists (afsnit 5.3) | ✅ Godkendt |
| `firestore.rules` personlige checklists (afsnit 5.4) | ✅ Godkendt betinget af emulator-tests |
| Checklist-strategi (afsnit 7.1-7.3) | ✅ Godkendt — projekt-scopede under `/projects/{projectId}/checklists`, personlige top-level, ingen fallback |
| `deleteProject` Cloud Function (afsnit 6.5) | ✅ Godkendt — `recursiveDelete(projectRef)` dækker nestede subcollections, ingen top-level `/checklists` query |
| `deleteProject` Cloud Function (roller + memory) | ✅ Godkendt — `roles[email]` fjernet, memory `512MB` |

### 9.5 Endelig sikkerhedsmæssig vurdering

**Security/Compliance Agent godkender design-spec'ens sikkerhedsarkitektur, regler og Cloud Function-spec.**

Dette er **ikke** en blanket-go til Dev Agent-start. Ifølge design-spec afsnit 10 skal følgende gates stadig være lukkede før Dev Agent må skrive kode:

1. PO-godkendelse af design, data-model-ændring og test-data wipe.
2. Master Agent-godkendelse af 2-build-strategi og branch-plan.
3. Denne sikkerhedsgodkendelse — **nu opfyldt**.
4. Flowagent-implementeringsplan med tasks, filrækkefølge og afhængigheder.
5. Test Manager-opdateret baseline-testplan med migration og security cases.
6. Endelige service-signaturer — nu fremstår de som endelige.
7. Emulator-tests grønne for både primary og (hvis relevant) fallback checklist-strategi. Bemærk: der er ingen fallback, så test kun den primære.
8. Ingen aktiv feature-kodning på berørte filer.

**Så snart gate 1, 2, 4, 5, 7 og 8 er bekræftet lukkede af koordinator/Master Agent, kan Dev Agent starte.**

### 9.6 Sikkerhedsanbefalinger under implementering (SHOULD-FIX)

Disse skal følges op i QA, men blokerer ikke start:

- Verificér i emulator, at `request.query.sharedWith.hasAny([getUserId()])` i afsnit 5.4 faktisk matcher `where("sharedWith", "array-contains", uid)`-queries fra `@react-native-firebase/firestore`.
- Sørg for `projectId`-format-validering i Cloud Function for at forhindre path-traversal i Storage-prefix.
- Overvej `bucket.deleteFiles({ prefix: ... })` i stedet for individuelle `file.delete()` for robust Storage-cleanup.
- Dokumentér partial Storage-cleanup strategi (scheduled function eller manual cleanup).
- Verificér composite-index-behov for subcollection-queries med `assignedTo`, `title` etc.
