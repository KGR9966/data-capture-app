# QA-gate — US-004 items/checkpoints/comments subcollection (løsning B)

**App:** Data Capture (`C:\Users\kimgr\data-capture-app`)  
**Branch:** `fix/us004-items-subcollection` (ud fra `fix/us004-voice-redesign`)  
**Dato:** 2026-07-15  
**QA Agent:** QA Agent  
**Status:** Forslag — skal godkendes af Master Agent / PO før Dev Agent startes

> **Beslutning (endelig):** Projekt-scopede checklists ligger under `/projects/{projectId}/checklists/{checklistId}` med deres items under `/projects/{projectId}/checklists/{checklistId}/items/{itemId}`. Personlige/delte checklists uden `projectId` forbliver top-level `/checklists/{checklistId}`. Denne beslutning er truffet i design-spec `design-us004-items-subcollection-us004.md` og reflekteres i alle test cases nedenfor.

---

## 1. Formål

Dette dokument definerer test-specifikation og kvalitetsport for omlægningen af items, checkpoints og comments til subcollections under `projects/{projectId}`. Gaten skal sikre, at regelændringerne ikke introducerer nye sikkerhedshuller eller regressions, før Dev Agent anses som færdig og før Build 1 bestilles.

---

## 2. Forudsætninger (skal være lukket inden denne gate træder i kraft)

| # | Forudsætning | Status |
|---|---|---|
| P1 | PO har godkendt løsning B og wipe af testdata. | Åben |
| P2 | Solution Design-specifikation (`design-us004-items-subcollection-us004.md`) er godkendt — inkl. endelig checklist-path. | Åben |
| P3 | Flowagent-implementeringsplan er godkendt. | Åben |
| P4 | `firestore.rules` er opdateret med subcollection-regler for items/checkpoints/comments og godkendt checklist-path. | Åben |
| P5 | `scripts/test-rules.js` oprettes af Security/QA Agent inden første regel-ændring deployes. | Åben |

---

## 3. Krævede Firestore-emulator test cases

### 3.1 Generelle testprincipper

- Alle tests køres mod Firestore-emulator med de *nye* `firestore.rules`.
- Hver test seeder mindst ét projekt med owner, admin, editor, viewer, email-editor (via `memberEmails`) og en non-member bruger.
- `email-editor` er en autentificeret bruger, hvis email findes i `project.memberEmails`, men som ikke har en rolle i `project.roles` — denne skal falde tilbage til `editor`.
- `non-member` er en autentificeret bruger uden relation til projektet.
- Negative cases skal verificere `permission-denied` (eller tom liste for `list`/`getAll`), ikke blot `allow == false`.
- Bemærk audit-fundet vedrørende `update`-reglen for items: den skal parenteseres eksplicit, så `&&` binder stærkere end `||` — ellers er reglen fejltrænet. Test cases I-UP-2 og I-UP-3 validerer dette.

### 3.2 Testdata-seed (fælles)

Et seed-projekt `projectA` oprettes med:

```text
ownerId:       user_owner
roles:         user_admin  -> "admin"
               user_editor -> "editor"
               user_viewer -> "viewer"
memberEmails:  email_editor@example.com
```

Der oprettes:

- `/projects/projectA/items/item1` (`createdBy: user_owner`, `assignedTo: user_editor`)
- `/projects/projectA/items/item2` (`createdBy: user_editor`, `assignedTo: user_viewer`)
- `/projects/projectA/items/item1/checkpoints/cp1`
- `/projects/projectA/items/item1/comments/com1` (`authorId: user_editor`)
- `/projects/projectA/items/item1/comments/com2` (`authorId: user_owner`)

Checklists:

- `/projects/projectA/checklists/checklist1` (`ownerId: user_owner`, project-scoped)
- `/projects/projectA/checklists/checklist1/items/cli1`
- `/checklists/checklist2` (`ownerId: user_owner`, `sharedWith: { user_editor: "editor" }`, personal/shared)
- `/checklists/checklist3` (`ownerId: user_other`, personal, not shared)

### 3.3 Test-case-tabel

#### Items: `/projects/{projectId}/items/{itemId}`

| ID | Path/collection | Operation | Rolle | Forventet resultat | Regel-betingelse testet |
|---|---|---|---|---|---|
| I-L-1 | `projects/projectA/items` | list | owner | allow | `hasProjectRoleById(projectId, [owner,admin,editor,viewer])` |
| I-L-2 | `projects/projectA/items` | list | admin | allow | samme |
| I-L-3 | `projects/projectA/items` | list | editor | allow | samme |
| I-L-4 | `projects/projectA/items` | list | viewer | allow | samme |
| I-L-5 | `projects/projectA/items` | list | email-editor | allow | `memberEmails`-fallback giver editor |
| I-L-6 | `projects/projectA/items` | list | non-member | deny | `hasProjectRoleById == false` |
| I-G-1 | `projects/projectA/items/item1` | get | editor | allow | read-regel med path-baseret `projectId` |
| I-G-2 | `projects/projectA/items/item1` | get | non-member | deny | ingen rolle |
| I-C-1 | `projects/projectA/items` | create | owner | allow | `hasProjectRoleById(projectId, [owner,admin,editor])` + `projectId == request.resource.data.projectId` |
| I-C-2 | `projects/projectA/items` | create | editor | allow | samme |
| I-C-3 | `projects/projectA/items` | create | viewer | deny | viewer ikke i allowed-roller |
| I-C-4 | `projects/projectA/items` | create | non-member | deny | ingen rolle |
| I-C-5 | `projects/projectA/items` | create | editor (forkert projectId) | deny | `request.resource.data.projectId == projectId` |
| I-UP-1 | `projects/projectA/items/item1` | update | owner | allow | `hasProjectRoleById(projectId, [owner,admin])` |
| I-UP-2 | `projects/projectA/items/item2` | update | editor (createdBy=self) | allow | editor parenteseret: `(editor && (createdBy == self || assignedTo == self))` |
| I-UP-3 | `projects/projectA/items/item1` | update | editor (createdBy=other, assignedTo=self) | allow | editor må opdatere tildelt item |
| I-UP-4 | `projects/projectA/items/item1` | update | editor (createdBy=other, assignedTo=other) | deny | editor må ikke opdatere andres item |
| I-UP-5 | `projects/projectA/items/item1` | update | viewer | deny | viewer har ikke update-rettighed |
| I-UP-6 | `projects/projectA/items/item1` | update | non-member | deny | ingen rolle |
| I-D-1 | `projects/projectA/items/item1` | delete | owner | allow | `hasProjectRoleById(projectId, [owner,admin])` |
| I-D-2 | `projects/projectA/items/item2` | delete | editor (createdBy=self) | allow | editor må slette egne items |
| I-D-3 | `projects/projectA/items/item1` | delete | editor (createdBy=other) | deny | editor må ikke slette andres items |
| I-D-4 | `projects/projectA/items/item1` | delete | viewer | deny | viewer har ikke delete-rettighed |
| I-D-5 | `projects/projectA/items/item1` | delete | non-member | deny | ingen rolle |

#### Checkpoints: `/projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}`

| ID | Path/collection | Operation | Rolle | Forventet resultat | Regel-betingelse testet |
|---|---|---|---|---|---|
| CP-L-1 | `projects/projectA/items/item1/checkpoints` | list | viewer | allow | `hasProjectRoleById(projectId, [owner,admin,editor,viewer])` |
| CP-L-2 | `projects/projectA/items/item1/checkpoints` | list | non-member | deny | ingen rolle |
| CP-G-1 | `projects/projectA/items/item1/checkpoints/cp1` | get | editor | allow | read-regel |
| CP-C-1 | `projects/projectA/items/item1/checkpoints` | create | editor | allow | `hasProjectRoleById(projectId, [owner,admin,editor])` |
| CP-C-2 | `projects/projectA/items/item1/checkpoints` | create | viewer | deny | viewer ikke i allowed-roller |
| CP-UP-1 | `projects/projectA/items/item1/checkpoints/cp1` | update | editor | allow | create/update-regel |
| CP-UP-2 | `projects/projectA/items/item1/checkpoints/cp1` | update | viewer | deny | viewer ikke i allowed-roller |
| CP-D-1 | `projects/projectA/items/item1/checkpoints/cp1` | delete | admin | allow | `hasProjectRoleById(projectId, [owner,admin,editor])` |
| CP-D-2 | `projects/projectA/items/item1/checkpoints/cp1` | delete | viewer | deny | viewer ikke i allowed-roller |
| CP-D-3 | `projects/projectA/items/item1/checkpoints/cp1` | delete | non-member | deny | ingen rolle |

#### Comments: `/projects/{projectId}/items/{itemId}/comments/{commentId}`

| ID | Path/collection | Operation | Rolle | Forventet resultat | Regel-betingelse testet |
|---|---|---|---|---|---|
| CM-L-1 | `projects/projectA/items/item1/comments` | list | viewer | allow | `hasProjectRoleById(projectId, [owner,admin,editor,viewer])` |
| CM-L-2 | `projects/projectA/items/item1/comments` | list | non-member | deny | ingen rolle |
| CM-G-1 | `projects/projectA/items/item1/comments/com1` | get | editor | allow | read-regel |
| CM-C-1 | `projects/projectA/items/item1/comments` | create | editor | allow | `hasProjectRoleById(projectId, [owner,admin,editor])` + `projectId`/`itemId` validering |
| CM-C-2 | `projects/projectA/items/item1/comments` | create | viewer | deny | viewer ikke i allowed-roller |
| CM-C-3 | `projects/projectA/items/item1/comments` | create | editor (forkert projectId) | deny | `request.resource.data.projectId == projectId` |
| CM-C-4 | `projects/projectA/items/item1/comments` | create | editor (forkert itemId) | deny | `request.resource.data.itemId == itemId` |
| CM-UP-1 | `projects/projectA/items/item1/comments/com1` | update | editor (authorId=self) | allow | `resource.data.authorId == getUserId()` |
| CM-UP-2 | `projects/projectA/items/item1/comments/com2` | update | editor (authorId=other) | deny | editor må ikke opdatere andres kommentar |
| CM-UP-3 | `projects/projectA/items/item1/comments/com1` | update | owner | allow | owner/admin må opdatere alle kommentarer |
| CM-D-1 | `projects/projectA/items/item1/comments/com1` | delete | editor (authorId=self) | allow | `resource.data.authorId == getUserId()` |
| CM-D-2 | `projects/projectA/items/item1/comments/com1` | delete | editor (authorId=other) | deny | editor må ikke slette andres kommentar |
| CM-D-3 | `projects/projectA/items/item1/comments/com1` | delete | owner | allow | owner/admin må slette andres kommentarer |
| CM-D-4 | `projects/projectA/items/item1/comments/com1` | delete | non-member | deny | ingen rolle |

#### Project-scoped checklists: `/projects/{projectId}/checklists/{checklistId}`

| ID | Path/collection | Operation | Rolle | Forventet resultat | Regel-betingelse testet |
|---|---|---|---|---|---|
| PCH-L-1 | `projects/projectA/checklists` | list | owner | allow | `hasProjectRoleById(projectId, [owner,admin,editor,viewer])` |
| PCH-L-2 | `projects/projectA/checklists` | list | admin | allow | samme |
| PCH-L-3 | `projects/projectA/checklists` | list | editor | allow | samme |
| PCH-L-4 | `projects/projectA/checklists` | list | viewer | allow | samme |
| PCH-L-5 | `projects/projectA/checklists` | list | email-editor | allow | `memberEmails`-fallback giver editor |
| PCH-L-6 | `projects/projectA/checklists` | list | non-member | deny | ingen rolle |
| PCH-G-1 | `projects/projectA/checklists/checklist1` | get | editor | allow | read-regel |
| PCH-G-2 | `projects/projectA/checklists/checklist1` | get | non-member | deny | ingen rolle |
| PCH-C-1 | `projects/projectA/checklists` | create | editor | allow | `hasProjectRoleById(projectId, [owner,admin,editor])` |
| PCH-C-2 | `projects/projectA/checklists` | create | viewer | deny | viewer ikke i write-roller |
| PCH-C-3 | `projects/projectA/checklists` | create | non-member | deny | ingen rolle |
| PCH-UP-1 | `projects/projectA/checklists/checklist1` | update | editor | allow | create/update-regel |
| PCH-UP-2 | `projects/projectA/checklists/checklist1` | update | viewer | deny | viewer ikke i write-roller |
| PCH-D-1 | `projects/projectA/checklists/checklist1` | delete | owner | allow | delete-regel (owner/admin) |
| PCH-D-2 | `projects/projectA/checklists/checklist1` | delete | editor | deny | editor må ikke slette projekt-checkliste |
| PCH-D-3 | `projects/projectA/checklists/checklist1` | delete | non-member | deny | ingen rolle |

#### Project-scoped checklist items: `/projects/{projectId}/checklists/{checklistId}/items/{itemId}`

| ID | Path/collection | Operation | Rolle | Forventet resultat | Regel-betingelse testet |
|---|---|---|---|---|---|
| PCLI-L-1 | `projects/projectA/checklists/checklist1/items` | list | editor | allow | `hasProjectRoleById(projectId, [owner,admin,editor,viewer])` |
| PCLI-L-2 | `projects/projectA/checklists/checklist1/items` | list | non-member | deny | ingen rolle |
| PCLI-G-1 | `projects/projectA/checklists/checklist1/items/cli1` | get | editor | allow | read-regel |
| PCLI-C-1 | `projects/projectA/checklists/checklist1/items` | create | editor | allow | create/update/delete-regel |
| PCLI-C-2 | `projects/projectA/checklists/checklist1/items` | create | viewer | deny | viewer ikke i write-roller |
| PCLI-UP-1 | `projects/projectA/checklists/checklist1/items/cli1` | update | editor | allow | write-regel |
| PCLI-D-1 | `projects/projectA/checklists/checklist1/items/cli1` | delete | admin | allow | write-regel |
| PCLI-D-2 | `projects/projectA/checklists/checklist1/items/cli1` | delete | viewer | deny | viewer ikke i write-roller |

#### Personal/shared checklists: `/checklists/{checklistId}`

| ID | Path/collection | Operation | Rolle | Forventet resultat | Regel-betingelse testet |
|---|---|---|---|---|---|
| CH-L-1 | `checklists` | list med `where("ownerId","==",user_owner)` | owner | allow | `request.query.ownerId == getUserId()` |
| CH-L-2 | `checklists` | list med `where("sharedWith","array-contains",user_editor)` | shared editor | allow | `request.query.sharedWith.hasAny([getUserId()])` |
| CH-L-3 | `checklists` | list | non-member (andet query filter) | deny | ingen relation til checklist |
| CH-G-1 | `checklists/checklist2` | get | owner | allow | `ownerId == getUserId()` |
| CH-G-2 | `checklists/checklist2` | get | shared editor | allow | `sharedWith` |
| CH-G-3 | `checklists/checklist2` | get | non-member | deny | ingen relation |
| CH-C-1 | `checklists` | create (uden projectId) | owner | allow | `ownerId == getUserId()` |
| CH-UP-1 | `checklists/checklist2` | update | shared editor | allow | `sharedWith` |
| CH-UP-2 | `checklists/checklist2` | update | non-member | deny | ingen relation |
| CH-D-1 | `checklists/checklist2` | delete | owner | allow | `ownerId == getUserId()` |
| CH-D-2 | `checklists/checklist2` | delete | shared editor | deny | kun owner må slette |

#### Personal/shared checklist items: `/checklists/{checklistId}/items/{itemId}`

| ID | Path/collection | Operation | Rolle | Forventet resultat | Regel-betingelse testet |
|---|---|---|---|---|---|
| CLI-L-1 | `checklists/checklist2/items` | list | owner | allow | `request.query.ownerId` / `sharedWith` |
| CLI-L-2 | `checklists/checklist2/items` | list | shared editor | allow | `request.query.sharedWith` |
| CLI-L-3 | `checklists/checklist2/items` | list | non-member | deny | ingen relation |
| CLI-G-1 | `checklists/checklist2/items/cli1` | get | owner | allow | parent owner/sharedWith |
| CLI-C-1 | `checklists/checklist2/items` | create | owner | allow | parent owner/sharedWith |
| CLI-C-2 | `checklists/checklist2/items` | create | non-member | deny | ingen relation |
| CLI-UP-1 | `checklists/checklist2/items/cli1` | update | shared editor | allow | parent owner/sharedWith |
| CLI-D-1 | `checklists/checklist2/items/cli1` | delete | owner | allow | parent owner/sharedWith |
| CLI-D-2 | `checklists/checklist2/items/cli1` | delete | non-member | deny | ingen relation |


---

## 4. Foreslået test-script-struktur (`scripts/test-rules.js`)

> Der skrives **ikke** fuld kode her — kun struktur, test-cases, setup og teardown.

### 4.1 Teknologi

- Anvend `@firebase/rules-unit-testing` (pakke fra Firebase JS SDK) til at starte/stoppe emulator-kontekst og autentificere testbrugere.
- Alternativt kan `firebase-admin` bruges til teardown/cleanup, men regel-evaluering skal ske via rules-unit-testing, så `request.auth` simuleres korrekt.
- Kørsel: `firebase emulators:exec --only firestore "node scripts/test-rules.js"`

### 4.2 Setup per test-suite

```text
beforeAll:
  1. initializeTestEnvironment({ projectId: "data-capture-us004", firestore: { rules: readFileSync("firestore.rules") } })
  2. Opret autentificerede test-app-instanser for:
     - user_owner
     - user_admin
     - user_editor
     - user_viewer
     - email_editor (simuleret med auth.token.email)
     - user_non_member
  3. Seed fælles testdata (se afsnit 3.2) via owner-kontekst.

beforeEach:
  - Ingen yderligere seed, medmindre testen muterer data; i så fald resettes relevante dokumenter.

afterAll:
  1. clearFirestore() / clearAuth()
  2. cleanupTestEnvironment()
```

### 4.3 Test-suite-opdeling

```text
describe("projects/{projectId}/items", () => {
  describe("list", () => { I-L-1 .. I-L-6 })
  describe("get", () => { I-G-1 .. I-G-2 })
  describe("create", () => { I-C-1 .. I-C-5 })
  describe("update", () => { I-UP-1 .. I-UP-6 })
  describe("delete", () => { I-D-1 .. I-D-5 })
})

describe("projects/{projectId}/items/{itemId}/checkpoints", () => {
  describe("list", () => { CP-L-1 .. CP-L-2 })
  describe("get", () => { CP-G-1 })
  describe("create", () => { CP-C-1 .. CP-C-2 })
  describe("update", () => { CP-UP-1 .. CP-UP-2 })
  describe("delete", () => { CP-D-1 .. CP-D-3 })
})

describe("projects/{projectId}/items/{itemId}/comments", () => {
  describe("list", () => { CM-L-1 .. CM-L-2 })
  describe("get", () => { CM-G-1 })
  describe("create", () => { CM-C-1 .. CM-C-4 })
  describe("update", () => { CM-UP-1 .. CM-UP-3 })
  describe("delete", () => { CM-D-1 .. CM-D-4 })
})

describe("projects/{projectId}/checklists", () => {
  describe("list", () => { PCH-L-1 .. PCH-L-6 })
  describe("get", () => { PCH-G-1 .. PCH-G-2 })
  describe("create", () => { PCH-C-1 .. PCH-C-3 })
  describe("update", () => { PCH-UP-1 .. PCH-UP-2 })
  describe("delete", () => { PCH-D-1 .. PCH-D-3 })
})

describe("projects/{projectId}/checklists/{checklistId}/items", () => {
  describe("list", () => { PCLI-L-1 .. PCLI-L-2 })
  describe("get", () => { PCLI-G-1 })
  describe("create", () => { PCLI-C-1 .. PCLI-C-2 })
  describe("update", () => { PCLI-UP-1 })
  describe("delete", () => { PCLI-D-1 .. PCLI-D-2 })
})

describe("checklists (personal/shared)", () => {
  describe("list", () => { CH-L-1 .. CH-L-3 })
  describe("get", () => { CH-G-1 .. CH-G-3 })
  describe("create", () => { CH-C-1 })
  describe("update", () => { CH-UP-1 .. CH-UP-2 })
  describe("delete", () => { CH-D-1 .. CH-D-2 })
})

describe("checklists/{checklistId}/items (personal/shared)", () => {
  describe("list", () => { CLI-L-1 .. CLI-L-3 })
  describe("get", () => { CLI-G-1 })
  describe("create", () => { CLI-C-1 .. CLI-C-2 })
  describe("update", () => { CLI-UP-1 })
  describe("delete", () => { CLI-D-1 .. CLI-D-2 })
})
```

### 4.4 Hjælpefunktioner

- `assertSucceeds(promise)` — forventet `allow`.
- `assertFails(promise)` — forventet `permission-denied`.
- `seedProject(ctx, projectId, config)` — opretter projekt + members + email-medlem.
- `seedItem(ctx, projectId, itemId, data)` — opretter item under subcollection.
- `seedProjectChecklist(ctx, projectId, checklistId, data)` — opretter project-scoped checklist.
- `seedProjectChecklistItem(ctx, projectId, checklistId, itemId, data)` — opretter project-scoped checklist item.
- `seedPersonalChecklist(ctx, checklistId, data)` — opretter top-level personal checklist.
- `seedPersonalChecklistItem(ctx, checklistId, itemId, data)` — opretter top-level checklist item.
- `listQuery(ctx, path, filters)` — bygger en `query(collection, ...filters)` og forsøger `getDocs`.

### 4.5 Design-spec reference

Alle checklist-paths følger `design-us004-items-subcollection-us004.md` afsnit 7.1–7.3:
- Projekt-scopede: `/projects/{projectId}/checklists/{checklistId}` + `.../items/{itemId}`
- Personlige/delte: `/checklists/{checklistId}` + `.../items/{itemId}`

---

## 5. QA-gate definition

### 5.1 Hvad skal være grønt før Dev Agent anses som færdig

| Gate | Kommando / aktivitet | Succeskriterie | Ansvarlig |
|---|---|---|---|
| G1 Typecheck | `npm run typecheck` | Ingen TypeScript-fejl. | Backend/UI Agent |
| G2 Lint | `npm run lint` | Ingen lint-fejl; warnings skal begrundes og accepteres af QA. | QA Agent |
| G3 Pre-test check | `npm run pre-test-check` | `scripts/pre-test-check.js` består (verificerer pakker, env, bundle-konfig). | QA Agent |
| G4 Firestore emulator tests | `firebase emulators:exec --only firestore "node scripts/test-rules.js"` | Alle cases i afsnit 3 består; ingen `allow`, der burde være `deny`, eller omvendt. | Security Agent / QA Agent |
| G5 Manuel E2E på simulator/emulator | Gennemfør scenarioerne E1-E9 fra `impl-plan-items-subcollection-us004.md` afsnit 6.3. | Board, Søg, Item, Checklister, Offline, Reminders, Projekt-sletning og sikkerhed virker. | QA Agent |
| G6 Cloud Function tests | `cd functions && npm run test` eller manuel callable-test i emulator. | `deleteProject` verificerer auth, rolle, recursive delete og storage cleanup. | Cloud Agent / QA Agent |
| G7 Bug-gate | Review af issue-board / projekt-backlog. | Ingen åbne P1- eller P2-bugs relateret til items, checkpoints, comments, checklists eller projekt-sletning. | QA Agent |
| G8 Data migration gate | PO-godkendelse + backup/wipe. | Testdata er wiped og genskabt; migration ikke nødvendig for prod (kun testdata). | PO / Master Agent |

### 5.2 Hvad skal være grønt før Build 1 bestilles

Build 1 må først bestilles, når **G1-G8** alle er grønne. Yderligere:

- `firestore.rules` er deployet til emulator og verificeret.
- Alle service-ændringer (`services/items.ts`, `services/checkpoints.ts`, `services/comments.ts`, `services/checklists.ts`, `services/checklistsOffline.ts`, `services/projects.ts`, `services/reminders.ts`) er gennemreviewet.
- UI-ændringer (`app/item.tsx`, `app/(tabs)/board.tsx`, `app/(tabs)/search.tsx`, `app/checklist.tsx`, `components/NotificationResponseHandler.tsx`) er gennemreviewet.
- Der er taget screenshots af nøgle-tilstande før data wipe.

### 5.3 Hvad skal være grønt før Build 2 bestilles

Build 2 bestilles **kun** i to situationer:
1. Build 1 var NO-GO og årsagerne er rettet (re-build med rettelser, ingen nye features).
2. PO finder P1/P2-regressioner under fysisk iOS E2E-test af Build 1.

Før Build 2 skal følgende være grønt:

- Build 1 NO-GO-årsager eller fysiske regressioner er dokumenteret og rettet.
- G1-G8 er kørt igen og grønne.
- `deleteProject` callable er deployet og testet i emulator (hvis ikke allerede gjort før Build 1).
- Manuel E2E er gennemført på fysisk enhed eller simulator med den seneste build.
- Ingen nye P1/P2-bugs introduceret efter Build 1.
- Ingen data-model-, regel- eller feature-ændringer slippes ind.

---

## 6. Build 1 GO / NO-GO checklist

### 6.1 GO-kriterier

| # | Kriterie | Tjek |
|---|---|---|
| 1 | `npm run typecheck` grøn | [ ] |
| 2 | `npm run lint` grøn | [ ] |
| 3 | `npm run pre-test-check` grøn | [ ] |
| 4 | `firebase emulators:exec --only firestore "node scripts/test-rules.js"` grøn | [ ] |
| 5 | `scripts/test-rules.js` dækker alle cases i afsnit 3 | [ ] |
| 6 | Manuel E2E E1-E9 bestået på simulator/emulator | [ ] |
| 7 | Data wiped og genskabt; testdata valideret | [ ] |
| 8 | Ingen åbne P1/P2-bugs | [ ] |
| 9 | `firestore.rules` opdateret og reviewet af Security/Compliance Agent | [ ] |
| 10 | Impl-plan afsnit 2.1-2.16 gennemført eller dokumenteret undtaget | [ ] |
| 11 | PO godkender Build 1 GO | [ ] |

### 6.2 NO-GO-kriterier

Build 1 er **NO-GO**, hvis ét eller flere af følgende gælder:

- G1-G4 fejler.
- Én eller flere P1-bugs er åbne.
- Checklist-path og tilhørende regler/testcases er ikke endeligt afklarede i godkendt design-spec. Endelig beslutning: projekt-scopede checklists under `/projects/{projectId}/checklists/{checklistId}`, personlige checklists top-level.
- `deleteProject` callable kan ikke verificeres i emulator.
- E1-E9 manuel E2E har kritiske fejl.
- PO har ikke godkendt wipe af testdata.

### 6.3 Output ved NO-GO

Ved NO-GO skal QA Agent producere:

1. Liste over fejlende gates med log-output.
2. Klassificering af hver fejl som P1/P2/P3.
3. Anbefaling: Build 2 trigger eller re-planlægning.

---

## 7. Build 2 trigger-betingelser

Build 2 bestilles **kun** i følgende situationer:

| # | Trigger-betingelse | Hvad skal rettes før Build 2 |
|---|---|---|
| T1 | Build 1 var NO-GO på grund af Cloud Function, emulator, E2E eller gate-fejl. | Ret fejl; genkør G1-G8. |
| T2 | PO finder P1/P2-regressioner under fysisk iOS E2E-test af Build 1. | Ret de specifikke regressioner; genkør affected gates + E2E. |
| T3 | Checklist-subcollection migration, regel-redesign eller data-model-ændringer blev ikke færdige før Build 1. | **Ikke acceptabelt som Build 2** — kræver ny planlægningsrunde. |

**Ingen** af følgende må udløse Build 2:
- Nye features eller scope-ændringer.
- Ændringer i data-model eller `firestore.rules` efter Build 1.
- Genoptagelse af ikke-færdiggjort migration.

### 7.1 Stop-kriterium for Build 2

Build 2 må ikke bestilles, før Build 1 NO-GO-årsager er fuldt rettet og G1-G8 er grønne igen. Build 2 er ikke et "feature-build" — det er en **re-build med rettelser**.

---

## 8. Referencer

- `C:\Users\kimgr\data-capture-app\.claude\team\status\impl-plan-items-subcollection-us004.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\status\rca-items-read-us004.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\status\audit-solution-b-us004.md`
- `C:\Users\kimgr\data-capture-app\firestore.rules`
- `memory/data-capture-test-baseline.md`
- `memory/collaboration-structure.md`
