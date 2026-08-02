# Security Gate 4 sign-off — US-004 items subcollection

**Branch:** `fix/us004-items-subcollection`  
**App:** Data Capture  
**Date:** 2026-08-02  
**Security Agent:** Security/Compliance Agent  
**Mandat:** Gennemgå emulator-testresultat, sammenlign `firestore.rules` med design-spec afsnit 5, og verificér lukning af punkter fra `security-approval-us004-items-subcollection.md`.

---

## 1. Emulator-testresultat

Testscript: `C:\Users\kimgr\data-capture-app\scripts\test-rules.js`  
Kørt med:

```bash
npx firebase emulators:exec --only firestore --project data-capture-us004 "node scripts/test-rules.js"
```

**Resultat:** 92 passed, 0 failed.

Testdækning:

| Path | Antal tests | Roller / cases |
|---|---|---|
| `/projects/{projectId}/items/{itemId}` | 24 | owner, admin, editor, viewer, email-editor, non-member; list, get, create, update, delete |
| `/projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}` | 10 | owner, admin, editor, viewer, non-member; list, get, create, update, delete |
| `/projects/{projectId}/items/{itemId}/comments/{commentId}` | 14 | owner, admin, editor, viewer, email-editor, non-member; list, get, create, update, delete |
| `/projects/{projectId}/checklists/{checklistId}` | 16 | owner, admin, editor, viewer, email-editor, non-member; list, get, create, update, delete |
| `/projects/{projectId}/checklists/{checklistId}/items/{itemId}` | 8 | owner, admin, editor, viewer, non-member; list, get, create, update, delete |
| `/checklists/{checklistId}` (personlig/delt) | 11 | owner, editor, non-member; list, get, create, update, delete |
| `/checklists/{checklistId}/items/{itemId}` (personlig/delt) | 9 | owner, editor, non-member; list, get, create, update, delete |
| **Total** | **92** | |

Emulatoren er grøn for de testede query-shapes.

---

## 2. Sammenligning af `firestore.rules` med design-spec afsnit 5

### 2.1 Afsnit 5.2 — items/checkpoints/comments subcollections

**Status: ✅ Matcher design-spec.**

- `match /projects/{projectId}/items/{itemId}` findes med `read`, `create`, `update`, `delete` regler.
- `update`-reglen er eksplicit parenteseret (se verifikation nedenfor).
- `match /projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}` findes med `read`, `create, update`, `delete`.
- `match /projects/{projectId}/items/{itemId}/comments/{commentId}` findes med `read`, `create`, `update, delete`.
- Alle regler bruger `hasProjectRoleById(projectId, [...])` og er aligned med spec.

### 2.2 Afsnit 5.3 — projekt-scopede checklists under `/projects/{projectId}/checklists`

**Status: ✅ Matcher design-spec.**

- `match /projects/{projectId}/checklists/{checklistId}` findes med `read`, `create, update`, `delete`.
- `match /projects/{projectId}/checklists/{checklistId}/items/{itemId}` findes med `read`, `create, update, delete`.
- Rolfordeling (kun owner/admin må slette checkliste, editor må CRUD items) matcher spec.

### 2.3 Afsnit 5.4 — personlige/delte checklists top-level `/checklists/{checklistId}`

**Status: ❌ Afviger fra godkendt design-spec — NO-GO blocker.**

Godkendt design-spec afsnit 5.4 angiver:

```firestore
allow get: if canReadPersonalChecklist();

allow list: if isAuthenticated()
              && (
                   request.query.ownerId == getUserId()
                   || (request.query.sharedWith != null
                       && request.query.sharedWith.hasAny([getUserId()]))
                 );
```

Deployed `firestore.rules` linje 219 har:

```firestore
allow get, list: if canReadPersonalChecklist();
```

hvor `canReadPersonalChecklist()` refererer `resource.data.ownerId` og `resource.data.sharedWith`.

**Problem:**

- Dette er præcis den `list`-regel-fælde, som security-audit (afsnit 2.4 og 4) flagde som **MUST-FIX**: Firestore `list`-regler må ikke referere `resource.data` per dokument.
- Design-spec valgte eksplicit `request.query`-formuleringen for at undgå implicit query-to-rule-matching og sikre, at kun godkendte query-shapes (med `where`-filtre) tillades.
- Den deployed formulering afhænger af, at Firestore-motoren kan omskrive `resource.data`-betingelserne til query-filtre for de testede shapes. Selvom emulator-tests er grønne for de testede queries, er formuleringen ikke den godkendte, og den kan fejle for ufiltrerede lister eller fremtidige query-kombinationer.

**Konklusion:** Deployed regler opfylder ikke punkt 2 i mandatet (sammenligning med design-spec afsnit 5.4), selvom de fungerer for de testede cases.

---

## 3. Verifikation af lukning af security-approval punkter

### 3.1 Item `update`-regel er eksplicit parenteseret

**Status: ✅ Lukket.**

`firestore.rules` linje 110-120:

```firestore
allow update: if isAuthenticated()
               && (
                    hasProjectRoleById(projectId, ["owner", "admin"])
                    || (
                         hasProjectRoleById(projectId, ["editor"])
                         && (
                              resource.data.createdBy == getUserId()
                              || resource.data.assignedTo == getUserId()
                            )
                       )
                  );
```

Ingen tvetydighed; `isAuthenticated()` dækker hele udtrykket.

### 3.2 Projekt-scopede checklists ligger under `/projects/{projectId}/checklists`

**Status: ✅ Lukket.**

`firestore.rules` linje 181-199 definerer:

```firestore
match /projects/{projectId}/checklists/{checklistId} { ... }
match /projects/{projectId}/checklists/{checklistId}/items/{itemId} { ... }
```

### 3.3 Top-level `/checklists` kun bruges til personlige/delte lister med `projectId == null`

**Status: ✅ Lukket for datamodel; delvist lukket for regelformulering.**

- `firestore.rules` linje 201-229 definerer top-level `/checklists/{checklistId}` uden projekt-relaterede regler.
- `create`-reglen tvinger `request.resource.data.projectId == null` (linje 224), så der ikke kan oprettes projekt-scopede lister top-level.
- `list`-reglen afviger dog fra design-spec (se afsnit 2.3 ovenfor).

### 3.4 `deleteProject` Cloud Function spec har korrekt rollecheck (ingen `roles[email]`, `memberEmails` håndteret) og memory 512MB

**Status: ✅ Lukket.**

Fil: `C:\Users\kimgr\data-capture-app\functions\src\deleteProject.ts`

- `runWith({ memory: "512MB", timeoutSeconds: 300 })` — korrekt.
- Rolechenk (linje 48-62):
  1. `projectData.ownerId === uid`
  2. `projectData.roles[uid] === "owner"`
  3. `projectData.roles[uid] === "admin"`
  4. fallback: `/projects/{projectId}/members/{uid}` med role `owner` eller `admin`.
- Ingen `roles[email]` — korrekt.
- `memberEmails` håndteres ved at email-medlemmer uden explicit rolle er editors og derfor **ikke** må slette projekter. Dette er konsistent med design-spec afsnit 6.4.
- Sletning sker via `db.recursiveDelete(projectRef)` (linje 71), som dækker alle nestede subcollections inkl. `checklists`.
- Storage cleanup bruger `bucket.deleteFiles({ prefix: ... })` (linje 75), hvilket er robust.

---

## 4. Afgørelse

**NO-GO.**

### Begrundelse

Emulator-testresultatet er grønt (92/0), og de fleste regelblokke samt `deleteProject` Cloud Function matcher design-spec og security-approval. Der er dog én blocker:

- **Deployed `firestore.rules` for top-level `/checklists/{checklistId}` afviger fra godkendt design-spec afsnit 5.4.**
- `allow get, list: if canReadPersonalChecklist();` refererer `resource.data` i en `list`-regel, hvilket security-audit oprindeligt klassificerede som MUST-FIX.
- Godkendt spec kræver split mellem `allow get` og `allow list` med `request.query`-filtre.

### Påkrævet handling før GO

1. Opdater `firestore.rules` afsnit om `/checklists/{checklistId}` så det matcher design-spec afsnit 5.4 eksakt:
   - `allow get: if canReadPersonalChecklist();`
   - `allow list: if isAuthenticated() && (request.query.ownerId == getUserId() || (request.query.sharedWith != null && request.query.sharedWith.hasAny([getUserId()])));`
2. Genkør emulator-tests (`npx firebase emulators:exec --only firestore --project data-capture-us004 "node scripts/test-rules.js"`) og bekræft fortsat 92 passed / 0 failed.
3. Evt. opdater testscriptet med en negativ case for en ufiltreret `/checklists`-liste, såfremt det ønskes som ekstra sikkerhedsnet.

Når ovenstående er lukket, kan sign-off opdateres til **GO**.

---

## 5. Bilag — filer refereret

- `C:\Users\kimgr\data-capture-app\firestore.rules`
- `C:\Users\kimgr\data-capture-app\.claude\team\status\design-us004-items-subcollection-us004.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\status\security-approval-us004-items-subcollection.md`
- `C:\Users\kimgr\data-capture-app\scripts\test-rules.js`
- `C:\Users\kimgr\data-capture-app\functions\src\deleteProject.ts`
