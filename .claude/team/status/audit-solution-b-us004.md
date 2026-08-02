# Audit-vurdering — Løsning B: items/checkpoints/comments under `projects/{projectId}`

**Audit Agent:** uafhængig vurdering af RCA-rapport `.claude/team/status/rca-items-read-us004.md`  
**App:** Data Capture (`C:\Users\kimgr\data-capture-app`)  
**Dato:** 2026-07-15  
**Anledning:** GO / NO-GO til at sætte Developer Agent i gang med løsning B.

---

## Executive summary

Løsning B (omlægning til subcollections under `projects/{projectId}`) er **teknisk korrekt og den eneste holdbare langsigtede løsning**, der både bevarer rollebaseret adgangskontrol og overholder Firestores regelmotor. RCA-rapportens root-cause-analyse er præcis.

Men B er en **stor, strukturel ændring**, der berører data-model, Firestore-paths, sikkerhedsregler, cascade-delete og en lang række UI/kald. RCA-rapporten identificerer de fleste berørte filer, men den har **tre udestående huller**, der skal lukkes, før Dev Agent kan kodes sikkert:

1. **Item-lookup uden `projectId`:** I dag navigeres der til item-detail og åbnes source-items fra checklists kun med `itemId`. Under B kræves `projectId` for at adressere `projects/{projectId}/items/{itemId}`. Dette kræver enten nye routes med `projectId` eller en ny mappingsstruktur — RCA nævner det ikke eksplicit.
2. **Checklister:** Forslaget til top-level checkliste-regler er ikke gyldigt for `list`-queries, fordi det stadig refererer `resource.data.projectId`. Enten skal checklister også flyttes under `projects/{projectId}/checklists`, eller også få nye, query-aligned `list`-regler.
3. **Cascade delete:** RCA anbefaler at flytte `deleteProjectCascade` til en Cloud Function, men der findes endnu ikke specifikation eller implementeringsplan for den function.

**Anbefaling: NO-GO for at sætte Dev Agent i gang med B lige nu.**

B er den rigtige retning, men process-gates fra governance er ikke lukkede (design-spec, Flowagent-plan, testplan, regel-emulator-tests, PO-godkendelse af data-model-ændring). Når disse er på plads, kan Dev Agent starte.

---

## 1. Sikkerhedsvurdering

### 1.1 Virker reglerne for owner / admin / editor / viewer / email-member?

Under B kan reglerne for items, checkpoints og comments skrives som anført i RCA afsnit 6.3, med følgende rettelser:

- **Roller:** `hasProjectRoleById(projectId, [...])` genbruger den eksisterende `getProjectMemberRole()`-logik, som dækker `ownerId`, `roles`-kortet og `memberEmails` (email-medlemmer uden specifik rolle får `editor`). Dette virker uændret, fordi projekt-dokumentet stadig ligger på `/projects/{projectId}`.
- **Viewer:** Får `read` på items/checkpoints/comments, men ikke `create/update/delete`. Dette er korrekt.
- **Editor:** Får `create` og kan opdatere/slette egne items eller items tildelt dem. Kommentarer kan editor oprette, men kun slette egne. Dette matcher nuværende forretningslogik.
- **Owner / admin:** Får fuld `read/create/update/delete` på items, checkpoints og andres kommentarer. Korrekt.
- **Email-medlemmer:** Fortsætter med at få `editor` via `memberEmails`-fallback. Bibeholdes under B, så længe `request.auth.token.email` er til stede. Bemærk: anonyme brugere uden email kan ikke matche `memberEmails`; dette er en begrænsning, der også findes i dag.

### 1.2 Nye sikkerhedshuller

- **Precedence-fælde i `update`-regel for items:** RCA's udkast har formateringsmæssigt tvetydig operatorpræcedence:
  ```firestore
  allow update: if isAuthenticated()
                 && hasProjectRoleById(projectId, ["owner", "admin"])
                    || (hasProjectRoleById(projectId, ["editor"])
                        && (resource.data.createdBy == getUserId()
                            || resource.data.assignedTo == getUserId()));
  ```
  I Firestore-regler har `&&` højere præcedence end `||`, så udtrykket evalueres faktisk korrekt. Men det er **fejltrænet og risikabelt at vedligeholde**. Kræv eksplicit parentesering i den endelige regel, så editor-klausulen ikke kan læses som at give alle editere `owner/admin`-rettigheder.

- **Checkliste-reglerne er ugyldige for `list`:** RCA's forslag til `/checklists/{checklistId}` bruger `resource.data.projectId` i `list`-delen. Firestore kan ikke evaluere `resource.data` per dokument i en liste-query. Reglen vil afvise `subscribeToProjectChecklists` — eller endnu værre, åbne for en regel, der ikke kan bevises sikker. Dette er et **reelt nyt sikkerheds-/funktionshul**, hvis det ikke rettes.

- **Kommentar-`create` kræver `projectId`-felt:** Forslaget tjekker `request.resource.data.projectId == projectId`. Sikkerhedsmæssigt fint, men det er redundant, fordi stien allerede fastlægger projektet. Det er acceptabelt som forsvar i dybden, men betyder, at appen skal fortsætte med at skrive `projectId` på kommentarer.

- **CollectionGroup-queries:** Hvis appen på et tidspunkt introducerer collection-group queries på `items`, vil reglerne kræve en `list`-regel, der kan bevises sikker på tværs af alle projekter — hvilket er umuligt med rollebaseret projektadgang. Sørg for, at B-implementationen ikke åbner for collection-group reads.

### 1.3 Ikke-medlemmer

- En bruger, der **ikke** har en rolle i projektet, får `permission-denied` på både `get` og `list` under `projects/{projectId}/items`, fordi `hasProjectRoleById` returnerer `false`.
- Dette gælder også subcollection-queries for checkpoints og comments.
- Testcases som TC-CH.12 (uautoriseret bruger kan ikke skrive/slette) vil kunne dækkes under B, så længe reglerne testes med negative cases i emulator.

**Konklusion sikkerhed:** B kan give korrekt rollebaseret sikkerhed, **hvis** reglerne rettes for checklister og `update`-reglen parenteseres. Der er ingen princippile huller for ikke-medlemmer under items/checkpoints/comments.

---

## 2. Governance / process

### 2.1 Er løsningen tilstrækkeligt gennemtestet før build?

**Nej.** RCA-rapporten er en analyse og anbefaling, ikke en testede implementation. Ingen kode er ændret endnu. Før Dev Agent kan sættes i gang, skal følgende gates være lukkede:

| Gate | Status | Bemærkning |
|---|---|---|
| PO-godkendelse af data-model-ændring | **Åben** | B ændrer fundamentale Firestore-paths. Det er en scope- og data-model-ændring, som PO skal godkende eksplicit. |
| Userstoryagent / Flowagent-plan | **Åben** | Ifølge `memory/collaboration-structure.md` pkt. 13 kræver ændringer, der berører >3 filer, data-model, auth, sikkerhed, søgning, integration eller synkronisering, både Userstoryagent og Flowagent. |
| Solution Design-specifikation | **Åben** | RCA er ikke et design-dokument. Der mangler konkret spec for nye paths, service-signaturer, route-ændringer, offline-pending-ops, migration og cascade-delete CF. |
| Firestore-regler testet i emulator | **Åben** | Der findes ikke tests eller `firebase emulators:exec`-opsætning i repoet. Negative cases for ikke-medlemmer og alle roller skal køres, før regler deployes. |
| Testplan opdateret for B | **Åben** | Baseline-testplanen (`memory/data-capture-test-baseline.md`) skal udvides med migrationstest og sikkerhedstest under B. |
| Cascade-delete Cloud Function-spec | **Åben** | RCA anbefaler CF, men der er ingen spec eller funktion. |
| Checklister path-/regelbeslutning | **Åben** | Skal checklister også flyttes til subcollections, eller beholdes top-level med nye `list`-regler? |
| QA-gate definition | **Åben** | Hvad skal være grønt før Dev Agent anses som færdig? (`typecheck`, `lint`, `pre-test-check`, emulator-tests, regressionsskabelon). |

### 2.2 Hvilke gates bør være lukket?

Før **Dev Agent** (Fase 6) må starte:

1. **PO godkender B** som løsning og accepterer data wipe af testdata.
2. **Solution Design Agent** leverer godkendt design-dokument (`design-us004-items-read-b.md`) med:
   - Nye paths.
   - Opdaterede service-signaturer (inkl. `projectId` på alle item-/checkpoint-/comment-funktioner).
   - Route-ændringer for item-detail (håndtering af `projectId` vs. `itemId`).
   - Beslutning for checklister (top-level med nye regler vs. subcollections).
   - Cloud Function-spec for cascade-delete.
3. **Flowagent** leverer implementeringsplan med tasks, rækkefølge, afhængigheder og estimeret omfang.
4. **Test Manager Agent** opdaterer testplan med B-specifikke cases og sikkerhedstest.
5. **Compliance/Security Agent** reviewer og godkender nye regler og cascade-delete.

Før **EAS build** (Fase 10-11):

6. Dev Agent har implementeret, QA Agent har kørt `typecheck`, `lint`, `pre-test-check`.
7. Firestore emulator-tests er grønne for alle roller og negative cases.
8. Regressionsskabelonen er kørt mod wipe/recreated testdata.
9. Audit Agent godkender, at alle gates er lukkede.
10. PO giver GO til build.

### 2.3 Hvad kan gå galt under implementeringen?

- **Manglende `projectId` ved item-lookup:** Mange steder i UI (search, checklist-detail, deep links) navigeres der med kun `itemId`. Under B kræves `projectId` for at slå item op. Hvis dette overses, vil item-detail og status-sync fra lister fejle.
- **Hardcodede paths:** `services/checklists.ts`, `services/checklistsOffline.ts` og `app/checklist.tsx` har hardcodede `items/{id}` og `checkpoints/{id}`-referencer. Risiko for at nogle paths ikke opdateres.
- **Offline pending-ops:** `checklistsOffline.ts` gemmer pending-ops, der refererer item/checkpoint-paths. Hvis en bruger har pending-ops fra gammel path-struktur, vil de fejle efter migration.
- **Cascade-delete uden CF:** Hvis man kun retter client-side `deleteProjectCascade`, risikeres timeout/partial delete for store projekter. CF skal med.
- **Data-migration:** Kun testdata, men wipe kræver eksplicit PO-go og backup.
- **Composite-indexe:** Nye subcollection-queries kræver ikke nye indexes for den simple `projectId`-query, men kombinerede queries (f.eks. `where("assignedTo")`) kan kræve nye indexe i `firestore.indexes.json`.
- **Checklister forbliver brudt:** Hvis checkliste-reglerne ikke rettes samtidig, vil `subscribeToProjectChecklists` fortsætte med at fejle.
- **Reminders:** `reminders.ts` bruger `targetId` = itemId. Sletning af item kalder `deleteRemindersForItem`. Under B skal `deleteItem` stadig kalde denne, men signaturen ændres til at tage `projectId` også.

---

## 3. Alternativ vurdering

### 3.1 A1: Denormalisér `allowedUsers` / `allowedEmails`

- **Fordele:** Mindre kodeændring. Items kan blive top-level. Ingen wipe.
- **Ulemper:** Data-duplikering, synkroniseringsbyrde ved medlemsændringer, svært at håndtere forskellige rolle-niveauer, kræver nye composite-indexe for alle kombinerede queries, og email-medlemmer uden UID er stadig problematiske.
- **Vurdering:** Kan fungere som midlertidig hotfix, men bryder "single source of truth" og er ikke skalerbar. B er bedre på lang sigt.

### 3.2 D4: Midlertidigt rul reglerne tilbage

- **Fordele:** Appen vil straks kunne læse items igen. Lav risiko for funktionsnedbrud.
- **Ulemper:** Åbner sikkerhedshuller for email-medlemmer og undergraver REG-001. Bør kun bruges som nød-hotfix, mens B planlægges.
- **Vurdering:** Ikke acceptabelt som permanent løsning, hvis PO har godkendt email-baserede roller.

### 3.3 Er B virkelig bedre end A1 og D4?

- **Ja** for langsigtet korrekthed, sikkerhed og vedligehold. B følger Firestores anbefalede hierarkiske model, eliminerer data-duplikering og bevarer rollemodellen ét sted.
- **Nej** for kortsigtet omkostning og risiko. B er den dyreste og mest invasive løsning.
- **Anbefaling:** B er den rigtige endelige løsning. A1 kan overvejes kun, hvis PO eksplicit prioriterer en hurtig midlertidig hotfix højere end strukturel korrekthed. D4 bør kun bruges, hvis appen er helt utilgængelig og PO accepterer sikkerhedsdegradering.

### 3.4 Største risiko ved B

1. **Cascade-delete + Cloud Function:** Det er den funktion med flest path-afhængigheder, og den bør omskrives til CF samtidig. Hvis dette springes over eller fejler, kan projektsletning efterlade orphan-data.
2. **Item-lookup uden `projectId`:** Stort antal steder i appen bruger kun `itemId`. Hvis ikke routes/signaturer opdateres konsekvent, vil kerneflows gå i stykker.
3. **Checklister:** Hvis checklister ikke også løses, forbliver en hel funktionalitet brudt efter B.
4. **Scope creep:** B kan let eskalere til også at flytte checklister, reminders, eller hele projektstrukturen. Dette skal afgrænses eksplicit i design-spec.

---

## 4. Anbefaling

### 4.1 GO / NO-GO

**NO-GO** for at sætte Developer Agent i gang med implementation af B på nuværende tidspunkt.

B er teknisk rigtig, men processen og designet er ikke modent nok. At kode nu vil med stor sandsynlighed introducere nye regressions-huller, især omkring checklister, item-lookup og cascade-delete.

### 4.2 Hvad mangler?

Før Dev Agent kan starte, skal følgende være på plads:

1. **PO godkendelse** af B som løsning og accept af data wipe/migration.
2. **Løsning på item-lookup uden `projectId`:** enten
   - opdater alle routes/links til at inkludere `projectId` (f.eks. `/item?projectId=X&itemId=Y`), eller
   - dokumenter en alternativ strategi (f.eks. global unik itemId-mapning).
3. **Beslutning og spec for checklister:**
   - Option A: behold top-level, men skriv nye, gyldige `get`/`list`-regler (uden `resource.data.projectId` i `list`).
   - Option B: flyt projekt-scopede checklister til `/projects/{projectId}/checklists/{checklistId}`.
   - Begge options kræver design-spec og regel-tests.
4. **Cloud Function-spec for cascade-delete:** funktionsnavn, triggers, sikkerhed, rollback, timeout-håndtering.
5. **Solution Design-dokument** godkendt af Solution Design Agent og Compliance/Security Agent.
6. **Flowagent-implementeringsplan** med tasks, filer, rækkefølge, afhængigheder.
7. **Opdateret testplan** fra Test Manager Agent med B-specifikke cases, herunder negative sikkerhedstest.
8. **Firestore-regler testet i emulator** med positive og negative cases for alle roller og ikke-medlemmer.
9. **Definition af QA-gate** for Dev Agent-afslutning.

### 4.3 Foreslået næste skridt

- Master Agent præsenterer denne audit for PO.
- Hvis PO bekræfter B, igangsættes Fase 4 (Solution Design) og Fase 5 (Testplan) med de relevante specialiserede agenter.
- Først når design og testplan er godkendt, gives Dev Agent mandat til Fase 6.

---

## 5. Læringspunkter / risiko til post-mortem

- **Root cause var kendt type fejl:** Cross-document `get()` i Firestore `list`-regler er en veldokumenteret fælde. Fremadrettet bør Solution Design Agent eksplicit verificere, at alle `list`-regler er query-aligned og testes i emulator, før regler deployes.
- **Regel-deploy uden list-test:** REG-001 blev deployet uden at teste `subscribeToItems`. Fremtidig regelændring skal inkludere negative list-query-tests.
- **Data-model-impact undervurderet:** Omlægning fra top-level til subcollections har bredere impact end først antaget (routes, CF, offline-ops). Design-fasen skal afdække alle sti-referencer.

---

## Referencer

- `.claude/team/status/rca-items-read-us004.md`
- `firestore.rules`
- `services/items.ts`, `services/checkpoints.ts`, `services/comments.ts`, `services/checklists.ts`, `services/checklistsOffline.ts`, `services/projects.ts`, `services/reminders.ts`, `services/roles.ts`
- `app/(tabs)/board.tsx`, `app/(tabs)/search.tsx`, `app/item.tsx`, `app/checklist.tsx`
- `memory/data-capture-test-baseline.md`
- `memory/collaboration-structure.md`
