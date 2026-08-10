# Data Capture US-004 — Samlet observations- og bugliste

**Dato:** 2026-08-02
**PO:** Kim Grandal
**Master Agent:** Claude
**Kontekst:** Build 1 (EAS iOS preview) fejlede kritiske E2E-tests. Build 2 blev genereret med rettelser til P1 (projekt-synlighed + checkliste-navigation/deeplinks) og P2 (stemme-parser type-nøgleord som titel). Denne liste samler alle observationer og bugs fra test af Build 1 og Build 2.

---

## Kategorier

| Emoji | Kategori | Beskrivelse |
|-------|----------|-------------|
| 🔴 | Kritisk | Forhindrer core-flow eller får app til at crashe/fryse. Kræver omgående handling. |
| 🟡 | Høj | Påvirker vigtig funktionalitet, men appen kan bruges med workarounds. |
| 🟢 | Mellem | Funktionsmæssigt problem eller uforventet adfærd, men ikke blocker. |
| 🔵 | Lav / UX | Kosmetisk, forbedringsforslag, eller design-afklaring. |
| ⚪ | Observation | Bemærkning der kræver afklaring før klassificering. |

---

## Kritiske issues (🔴)

### K1: App fryser ved notifikation/påmindelse for projekt-liste
**Set i:** Build 2, E8 / E7
**Beskrivelse:** Når brugeren sætter en påmindelse/notifikation på en sag i en projekt-scoped checkliste, fryser skærmen. Efter genstart vises "Listen blev ikke fundet". Tilbage-knap virker ikke, og skærmen forbliver frossen.
**Impact:** Brugeren kan ikke bruge påmindelser på projekt-lister. Appen bliver ubrugelig indtil genstart.
**Root cause:**
1. `app/checklist.tsx` opretter reminder for et checkliste-item uden at angive `checklist.projectId` i `createReminder` payload.
2. `services/reminders.ts` gemmer dokumentet med `targetType: "checklistItem"`, `targetId: checklistId`, men **mangler `targetProjectId`** i Firestore-dokument og i notifikations-`data`.
3. Når notifikationen affyres, modtager `NotificationResponseHandler.tsx` payload uden `targetProjectId` og router til `/checklist?id=...` uden `projectId`.
4. `checklist.tsx` kan ikke finde listen (den leder i personlig path `/users/{uid}/checklists/{id}`), så `checklist` bliver `null`, og "Listen blev ikke fundet" vises.
5. "Tilbage" peger på `router.back()`, men hvis appen blev åbnet direkte fra notifikation, findes der ingen navigation stack, så knappen virker ikke.
6. Freeze kan skyldes `scheduleLocalNotification` / modal-interaktion eller at notifikations-listener trigges i en ugyldig tilstand.
**Isoleret løsning:**
1. Udvid `ReminderInput` i `services/reminders.ts` med valgfri `targetProjectId`.
2. I `app/checklist.tsx` send `checklist.projectId` med til `createReminder` / `updateReminder`.
3. Sikr at `buildNotificationData` og `updateReminder` rescheduling inkluderer `targetProjectId`.
4. (Separat UX) Overvej fallback-navigation når `router.back()` ikke er mulig (f.eks. `router.replace('/checklists')`).
**Testplan:**
1. Unit: verificer at `createReminder` med `targetProjectId` gemmer feltet i Firestore og i notifikations-data.
2. Emulator/script: trig notifikation med `targetProjectId` og verificer at URL bliver `/checklist?id=...&projectId=...`.
3. Lokal E2E: sæt påmindelse på projekt-liste, vent til den affyres, verificer at appen åbner listen korrekt.
**Berørte filer:** `services/reminders.ts`, `app/checklist.tsx`, `components/NotificationResponseHandler.tsx`.
**Status:** Root cause fundet, ikke rettet.

### K2: Dynamisk liste opdaterer ikke
**Set i:** Build 2
**Beskrivelse:** Listen opdaterer ikke automatisk med nye punkter, selvom der kommer nye sager med samme match. PO vurderer dette som kritisk, da en "Dynamisk Liste" forventes at være netop dynamisk.
**Impact:** Kernefunktionaliteten i dynamiske lister er brudt. Brugeren får ikke løbende overblik over nye matches.
**Root cause:** `services/checklists.ts` indeholder `synchronizeDynamicChecklist(checklist, currentItems)`, men funktionen **kaldes aldrig fra `app/checklist.tsx`**. Derfor sker der ingen re-match, ingen tilføjelse af nye punkter, og ingen markering af forsvundne matches som stale.
**Isoleret løsning:**
1. I `app/checklist.tsx`: abonner på projekt-items når `checklist.projectId` og `checklist.isDynamic` er sat.
2. Kald `synchronizeDynamicChecklist(checklist, projectItems)` hver gang projectItems opdateres.
3. Sikr at kaldet ikke kører i infinite loop (afhænger af `projectItems` state, ikke af `items` state).
4. Overvej en Cloud Function/scheduled trigger til server-side sync, så opdatering sker også når appen er lukket.
**Testplan:**
1. Unit/emulator: opret dynamisk liste, tilføj ny sag der matcher søgningen, verificer at `synchronizeDynamicChecklist` tilføjer et nyt punkt.
2. Lokal E2E: åbn dynamisk liste, opret ny sag med match, træk-refresh, verificer nyt punkt vises med "Nyt" badge.
3. Lokal E2E: fjern match fra en sag, verificer punkt markeres som stale.
**Berørte filer:** `app/checklist.tsx`, `services/checklists.ts`.
**Status:** Root cause fundet, ikke rettet.

---

## Høje issues (🟡)

### H1: Slette projekt virker ikke
**Set i:** Build 2
**Beskrivelse:** Brugeren kan ikke slette et projekt fra appen.
**Impact:** Ingen mulighed for at rydde op i test- eller forkerte projekter.
**Root cause:** UI i `app/(tabs)/index.tsx` kalder `deleteProject(projectId)` via `httpsCallable(getFunctions(), "deleteProject")`. Cloud Function `functions/src/deleteProject.ts` findes, men det er **ikke verificeret** om den kører succesfuldt i produktion. Mulige fejlkilder:
- Cloud Function ikke deployet / gammel version kører.
- `admin.firestore().recursiveDelete()` eller `bucket.deleteFiles()` fejler pga. rettigheder.
- Timeout på store projekter.
- Appen får ikke feedback ved fejl.
**Isoleret løsning:**
1. Verificer at `deleteProject` Cloud Function er deployet og kører.
2. Kør isoleret test mod emulator: opret projekt med items/checkpoints/comments/checklists, kald deleteProject, verificer alt slettes.
3. Tilføj bedre fejlhåndtering og brugerfeedback i appen.
**Testplan:**
1. Emulator: `firebase emulators:exec --only firestore,functions,storage "node scripts/test-delete-project.js"`.
2. Lokal E2E: slet projekt i app, verificer projekt forsvinder og subcollections ryddes.
**Berørte filer:** `functions/src/deleteProject.ts`, `services/projects.ts`, `app/(tabs)/index.tsx`, `services/firebase.ts`.
**Status:** ✅ Rettet og testet mod emulator. Cloud Function sletter nu alle subcollections manuelt + Storage. Client-side fallback i appen prøver CF først og falder tilbage til batch-sletning for ejere hvis CF fejler. Emulator-test (`functions/src/deleteProject.test.js`) bestået: owner/admin kan slette, editor/uanonym afvist.

### H2: Invitation via email i projekt virker ikke
**Set i:** Build 2
**Beskrivelse:** Når man inviterer en person til et projekt via email, sker der ingenting.
**Impact:** Kerne-funktionalitet for samarbejde virker ikke.
**Root cause:** UI kalder `addProjectMemberByEmail(projectId, email, role)` i `services/projects.ts`. Denne funktion:
1. Tilføjer email til `memberEmails` array på projektet.
2. Opretter et medlemsdokument i `projects/{projectId}/members/{email}`.
Der sendes **ingen faktisk email-invitation**. Hvis den inviterede email ikke allerede findes i Firebase Auth, kan brugeren ikke logge ind. UI viser "Inviteret", men der er ingen invitation at acceptere.
**Isoleret løsning:**
1. Implementer en Cloud Function der sender en invitation-email med et link, eller
2. Skift til en eksplicit invitations-model hvor projekt-ejeren tilføjer en bruger via UID/email og den inviterede ser projektet, når de logger ind med samme email.
3. Dokumentér i UI at invitation kun virker, hvis den inviterede allerede har en konto med samme email.
**Testplan:**
1. Emulator: opret projekt, kald `addProjectMemberByEmail`, verificer at `memberEmails` og `members` opdateres.
2. Lokal E2E: inviter `test.dc@test.dk` til projekt, log ind med den bruger, verificer projekt vises.
3. (Hvis email-invitation implementeres) Verificer at email modtages og link accepteres.
**Berørte filer:** `services/projects.ts`, eventuelt ny Cloud Function.
**Status:** Root cause fundet; design-afklaring nødvendig: skal der sendes email, eller skal invitation være email-baseret uden udsendelse?

### H3: Slette liste virker ikke korrekt
**Set i:** Build 2
**Beskrivelse:**
- Dialog spørger: "Er du sikker på du vil slette 'Søgning si'?" (titel vises forkert afkortet).
- Ved tryk på skraldespand/kurv-ikon på en sag i listen fjernes indholdet, men listen forbliver i fanen.
- Der vises en toast/boks med "9 afventer", der tæller 1 op hver gang man forsøger at slette igen.
- Samme sker ved brug af "Slet" knappen i søgningspunktet.
- Listen i fanen forbliver uændret selvom indhold slettes.
**Impact:** Forvirrende UI, data slettes delvist, brugeren kan ikke fjerne lister.
**Root cause:**
1. `deleteChecklistAndClearCache(checklistId, userId)` i `services/checklistsOffline.ts` opretter en pending-op med kun `checklistId` og `userId`.
2. `executePendingOp` kalder `deleteChecklist(checklistId, userId)`.
3. `deleteChecklist` kalder `getChecklistById(checklistId, undefined, userId)`. For **projekt-scopede** lister mangler `projectId`, så listen ikke findes, og sletningen fejler.
4. Pending-op bliver liggende, og `flushPendingOps` prøver igen ved hver online-event, hvilket tæller "afventer" op.
5. Cache ryddes lokalt (derfor forsvinder indholdet i UI), men dokumentet i Firebase slettes ikke.
**Isoleret løsning:**
1. Udvid `deleteChecklistAndClearCache` til at tage `checklist: Pick<Checklist, "id" | "projectId" | "ownerId">` og gemme `projectId` i pending-op payload.
2. Opdater `executePendingOp` til at kalde `deleteChecklist(checklistId, userId, projectId)`.
3. Udvid `deleteChecklist` signaturen til at acceptere `projectId` og bruge det i `getChecklistById`.
4. Tilføj håndtering hvis listen allerede er slettet (idempotens).
**Testplan:**
1. Unit/emulator: opret projekt-scoped liste, kald `deleteChecklistAndClearCache`, verificer at både items og checklist-dokument slettes.
2. Lokal E2E: slet projekt-scoped liste og personlig liste, verificer begge forsvinder fra Checklister-fane.
**Berørte filer:** `services/checklistsOffline.ts`, `services/checklists.ts`, `app/(tabs)/checklists.tsx`.
**Status:** Root cause fundet, ikke rettet.

---

## Mellem issues (🟢)

### M1: Flueben i søgning/liste ændrer ikke status på oprindelig sag
**Set i:** Build 2
**Beskrivelse:** Når man sætter flueben på et punkt i en checkliste, ændres status ikke på den oprindelige sag (item). PO oplevede det som en bug.
**Impact:** Brugeren forventer synkronisering mellem checkliste og sag. Hvis det er design, er det ikke kommunikeret tydeligt.
**Root cause:**
- Hvert listepunkt har felterne `sourceProjectId`, `sourceItemId` og `sourceCheckpointId`, der peger tilbage på sagens checkpoint.
- `setChecklistPointCompleted` i `services/checklists.ts:955` opdaterer **checkpoint status** til `"done"` via en `writeBatch` på `projects/{sourceProjectId}/items/{sourceItemId}/checkpoints/{sourceCheckpointId}`.
- Derefter læses alle checkpoints for source-item og item-status opdateres til `"done"` hvis alle checkpoints er done (linje 1002-1008).
- Det betyder, at **koden faktisk synkroniserer tilbage**. Hvis status ikke ændres i UI, skyldes det formentlig én af følgende isolerede fejl:
  1. Brugeren trykkede flueben på et listepunkt uden `sourceCheckpointId` eller `sourceItemId` (f.eks. manuelt oprettet punkt eller dynamisk liste-punkt uden korrekt checkpoint-link).
  2. Checklisten blev åbnet fra en forkert path, så `checklist.projectId` manglede, og `setChecklistPointCompleted` kunne ikke finde checkpoint.
  3. UI re-renderede ikke, fordi `subscribeToItems` ikke var aktiv i den pågældende skærm, eller fordi item-dokumentet ikke ændrede sig (hvis checkpoint-status er det eneste, der ændres, opdateres item-status kun efter flueben, ikke automatisk på item-subscription).
**Isoleret løsning:**
1. Verificér at alle listepunkter har korrekte `sourceCheckpointId`/`sourceItemId` ved oprettelse (især projekt-scopede lister og dynamiske lister).
2. Log fejl fra `setChecklistPointCompleted` hvis checkpoint-opdatering fejler (i dag swallows commit-fejl).
3. Sørg for, at den skærm der viser sagen, abonnerer på item-dokumentet, så status-ændring reflekteres.
4. Tilføj en integrationstest der beviser: flueben i checkliste → checkpoint done → item status done.
**Testplan:**
1. Emulator: opret sag med 1 checkpoint, opret projekt-liste, sæt flueben, verificér både checkpoint og item.status bliver "done".
2. Lokal E2E: gentag for dynamisk liste og manuel liste.
**Berørte filer:** `services/checklists.ts`, `services/checkpoints.ts`, `app/checklist.tsx`.
**Status:** Root cause delvist fundet — kode findes, men adfærd er ikke verificeret end-to-end; muligvis data/miljøfejl.

### M2: Punkter uden punktum vises ikke i søgning
**Set i:** Build 2
**Beskrivelse:** Hvis en sag har flere punkter i beskrivelsen, vises kun dem der ender med punktum (.) i søgeresultater. Punkter uden punktum i slutningen bliver ikke listede op.
**Impact:** Søgningen er ufuldstændig; brugeren misser information.
**Root cause:**
- Stemme-parseren (`services/voiceCommands.ts`) bruger `splitTitleContent` til at adskille titel og indhold. Funktionen splitter på første sætningsafslutning (`[.!?]`) eller afsnitsskift.
- Hvis brugeren dikterer "Vedligeholdelse købe maling punktum gå til Silvan punktum", bliver resultatet:
  - title = "Vedligeholdelse købe maling"
  - content = "gå til Silvan"
- Hvis brugeren kun siger "Vedligeholdelse købe maling gå til Silvan" uden punktum, lægges **hele teksten i titlen**, og `content` bliver tom.
- `extractPointsFromItem` (checklists.ts:228) opretter listepunkter fra `content` linje for linje, men kun hvis `content` findes. Punkter uden punktum ender derfor ikke i content, og derfor heller ikke i checkpoints/søgning.
- Samme problem gælder for sager oprettet manuelt i UI, hvis brugeren skriver flere linjer uden punktum: parseren ser én lang titel.
**Isoleret løsning:**
1. Ændr `splitTitleContent` så den enten:
   a. accepterer linjeskift som adskillelse mellem punkter (hvis brugeren trykker Enter mellem linjer), eller
   b. begrænser titel til første linje og resten bliver content, også uden punktum.
2. Sikr at `parseSourceTextIntoPoints` splitter på både linjeskift og punktum, så hver sætning uanset tegnsætning bliver et punkt.
3. Dokumentér for brugeren hvordan flere punkter oprettes (tryk Enter / dictation pause / punktum).
**Testplan:**
1. Unit: `parseVoiceInput("Vedligeholdelse købe maling gå til Silvan")` skal returnere content med 2 punkter (eller adskille på linjeskift).
2. Emulator: opret sag med content uden punktum, søg efter et af ordene, verificér det vises.
3. Lokal E2E: diktér 3 punkter uden punktum, verificér alle vises i søgning.
**Berørte filer:** `services/voiceCommands.ts`, `services/checklists.ts`, `services/checkpoints.ts`.
**Status:** Root cause fundet, ikke rettet.

### M3: Slettet sag vises stadig i liste
**Set i:** Build 2
**Beskrivelse:** Når en sag slettes, forbliver den i checklisten som reference.
**Impact:** Forældede data i lister.
**Root cause:**
- Checkliste-items gemmer `sourceItemId` og `sourceProjectId`, men der er ingen lytter på source-item dokumentet.
- Når en sag slettes, får listepunkterne ingen trigger til at blive fjernet eller markeret.
- `synchronizeDynamicChecklist` (checklists.ts:1058) bruger `searchItems` på nuværende items. Hvis source-item er slettet, vil den naturligvis ikke længere matche søgningen, og `synchronizeDynamicChecklist` vil markere de tilhørende punkter som `isStale`.
- Problemet er, at `synchronizeDynamicChecklist` **ikke kaldes automatisk** (se K2). Derfor forbliver punkterne synlige.
- For manuelle lister findes der slet ingen sync/logik til at fjerne punkter fra slettede sager.
**Isoleret løsning:**
1. Implementér automatisk kørsel af `synchronizeDynamicChecklist` (løser K2 samtidig), så punkter fra slettede sager markeres som stale.
2. Beslut ønsket adfærd for manuelle lister:
   a. Fjern punkter fra slettede sager helt, eller
   b. Behold som reference med label "Slettet sag", eller
   c. Konverter til manuelt punkt (fjern source-link).
3. Tilføj Cloud Function trigger på `onDelete` for `projects/{projectId}/items/{itemId}` der rydder/markerer tilhørende checklist-punkter.
**Testplan:**
1. Emulator: opret dynamisk liste, slet en sag der matcher, trig sync, verificér punkt markeres stale/fjernes.
2. Lokal E2E: slet sag fra Projekt A, åbn dynamisk liste, verificér opdatering.
**Berørte filer:** `services/checklists.ts`, `app/checklist.tsx`, evt. Cloud Function.
**Status:** Root cause fundet, ikke rettet.

### M4: Flere søgeord understøttes ikke
**Set i:** Build 2
**Beskrivelse:** Man kan ikke søge på flere ord fx "Silvan og Jem og Fix". Brugeren forventer at kunne søge med flere ord.
**Impact:** Begrænset søgning; vigtig for dynamiske lister.
**Root cause:**
- `parseSearchQuery` i `services/search.ts:231` tokeniserer input og lægger alle almindelige ord i `required` med AND-semantik.
- "Silvan og Jem og Fix" tokeniseres til ordene: `Silvan`, `og`, `Jem`, `og`, `Fix`.
- "og" er ikke et søgeord — det er en støj/boolsk operator, men parseren behandler det som et required ord.
- Resultat: søgningen kræver at teksten indeholder "og" to gange, hvilket de fleste sager ikke gør, så resultatet bliver tomt.
- Forventet adfærd er enten:
  1. "Silvan Jem Fix" = alle tre ord skal findes (AND), eller
  2. "Silvan eller Jem eller Fix" = et af ordene skal findes (OR), eller
  3. "Silvan og Jem og Fix" fortolkes som AND (uden at "og" kræves).
**Isoleret løsning:**
1. Filtrér danske/engelske boolske fyldord (`og`, `eller`, `and`, `or`) fra `required`, medmindre de bruges eksplicit som OR-operator.
2. Dokumentér søgesyntaxen tydeligt i UI/UX.
3. Alternativt: tilføj knap/switch til "Match alle ord" vs. "Match et af ordene".
**Testplan:**
1. Unit: `parseSearchQuery("Silvan og Jem og Fix")` skal give required = ["Silvan","Jem","Fix"].
2. Unit: `parseSearchQuery("Silvan eller Jem")` skal give orGroups med de to ord.
3. Emulator/Lokal E2E: søg med flere ord adskilt af "og" og verificér resultater.
**Berørte filer:** `services/search.ts`.
**Status:** Root cause fundet, ikke rettet.

### M5: Liste-forslag burde bruge fælles overskrift som titel
**Set i:** Build 2
**Beskrivelse:** Ved oprettelse af liste fra søgning foreslås titel baseret på enkelt sags-overskrift, selvom flere sager deler samme overordnede overskrift (fx "Vedligeholdelse"). Titlen burde i stedet forslås som "Vedligeholdelse".
**Impact:** Brugeren skal manuelt rette titlen. Forværrer oplevelsen ved oprettelse af mange lignende lister.
**Root cause:**
- Titel-forslaget genereres ikke i `services/checklists.ts` — det kommer fra UI/søgeskærmen.
- I `app/(tabs)/search.tsx` (omkring linje 308 i tidligere version) oprettes checklisten med et navn baseret på brugerinput eller første resultat.
- Hvis søgningen f.eks. er "Vedligeholdelse", men resultaterne har titler som "Vedligeholdelse - bad", "Vedligeholdelse - køkken", så bruges den første fulde titel i stedet for det fælles nøgleord.
- Der findes ingen logik til at finde længste fælles token/præfix eller mest almindelige kategori/titel blandt resultaterne.
**Isoleret løsning:**
1. I `app/(tabs)/search.tsx`: før `createDynamicChecklistFromSearch`, beregn et smart forslag:
   - Hvis alle resultater deler samme `category`, brug category.
   - Ellers find længste fælles prefix blandt titler (efter normalisering og fjernelse af bindestreg/nummerering).
   - Ellers brug selve søgestrengen som forslag.
2. Gør forslaget redigerbart før oprettelse, så brugeren kan godkende/rette.
3. Fallback til "Aktionsliste — {dato}" hvis intet fælles mønster findes.
**Testplan:**
1. Unit: funktion der finder fælles titel-præfix/kategori blandt 3+ items.
2. Lokal E2E: søg på "Vedligeholdelse" med flere sager, verificér titelforslag bliver "Vedligeholdelse".
**Berørte filer:** `app/(tabs)/search.tsx`.
**Status:** Root cause fundet, ikke rettet.

---

## Lav / UX issues (🔵)

### L1: "Udført" grøn tekst er for svag
**Set i:** Build 2
**Beskrivelse:** Den grønne tekst for afsluttede punkter er svær at se.
**Impact:** Tilgængelighed og visuel afklaring.
**Root cause:**
- Farven er hardcoded et sted i `app/checklist.tsx` stilark, sandsynligvis med lav kontrast mod baggrund.
- I `themedStyles` findes `completedMeta` / lignende med grøn farve der måske ikke opfylder WCAG-kontrast.
**Isoleret løsning:**
1. Find den grønne stil (søg efter `color:` med grøn værdi i `app/checklist.tsx`).
2. Øg farven til en mørkere grøn (f.eks. `#15803d` i light mode, `#4ade80` i dark mode).
3. Verificér kontrastratio ≥ 4.5:1.
**Testplan:**
1. Visuel test i både light og dark mode.
2. Kontrast-check via værktøj eller manuel vurdering.
**Berørte filer:** `app/checklist.tsx`.
**Status:** Root cause fundet, ikke rettet.

### L2: Projekt-vælger med blå knapper skaber forvirring
**Set i:** Build 2, E4
**Beskrivelse:** Brugeren forstår ikke formålet med de to blå knapper ved oprettelse af liste. Der vises 2 projekter, og man kan skifte mellem dem; knapperne er blå.
**Impact:** Forvirring om hvad der vælges.
**Root cause:**
- I søgningsvisningen/oprettelse af dynamisk liste vises projektvalg som to blå toggle-knapper uden tydelig label eller kontekst.
- Brugeren ved ikke, om knapperne filtrerer søgeresultater, vælger hvilket projekt listen skal gemmes under, eller begge dele.
- Dette er et UX/design-problem, ikke en teknisk fejl.
**Isoleret løsning:**
1. Tilføj label over vælgeren: "Gem listen under projekt:".
2. Gør det tydeligt hvilket projekt der er valgt (f.eks. radio button, ikke toggle).
3. Vis kun projekter brugeren har adgang til, og grupper dem hvis der er mange.
**Testplan:**
1. UX-gennemgang med PO: vis mockup før ændring.
2. Lokal E2E: opret liste, verificér projektvalg er forståeligt.
**Berørte filer:** `app/(tabs)/search.tsx`.
**Status:** Root cause fundet (design), ikke rettet.

### L3: To identiske "Min personlige liste" vises
**Set i:** Build 2, E6/E7
**Beskrivelse:** To lister med samme navn og indhold vises i Checklister-fanen.
**Impact:** Forvirring.
**Root cause:**
- Seed-scriptet `scripts/seed-us004-testdata.js` opretter testdata, herunder muligvis personlige lister med navnet "Min personlige liste".
- Hvis seed-scriptet køres flere gange uden at rydde op, eller hvis brugeren selv har oprettet en liste med samme navn, opstår der duplikater.
- Appen har ingen deduplikeringslogik for navne, så begge lister vises.
- Der er ingen teknisk fejl i koden; det er testdata-problem.
**Isoleret løsning:**
1. Identificér i Firestore (personlig path `/users/{uid}/checklists`) de to dokumenter med navn "Min personlige liste".
2. Slet ét af dem, eller omdøb det ene.
3. Fremover: gør seed-scriptet idempotente (tjek om liste findes før oprettelse), eller brug unikke navne.
**Testplan:**
1. Firestore-inspektion: bekræft der findes 2 docs med samme name.
2. Data-oprydning: slet en af dem.
3. Lokal E2E: verificér kun én liste vises.
**Berørte filer:** Testdata/Firestore, evt. `scripts/seed-us004-testdata.js`.
**Status:** Root cause fundet, ikke rettet.

### L4: Ønske om separat fane for personlige lister
**Set i:** Build 2
**Beskrivelse:** PO spørger om man kan have en fane kun med personlige lister, fordi Checklister-fanen nu blander projekt-lister og personlige/delte lister.
**Impact:** Ønske om bedre navigation og overblik.
**Root cause:**
- `app/(tabs)/checklists.tsx` viser to sektioner i én fane: "Projekt: X" og "Personlige / delte".
- Der er ingen separat tab/fane for kun personlige lister.
- Dette er en feature/anmodning, ikke en bug.
**Isoleret løsning:**
1. **Valgmulighed A:** Behold nuværende ene fane med sektioner, men gør sektionerne tydeligere.
2. **Valgmulighed B:** Tilføj en ny fane "Mine lister" i bundnavigationen, der kun viser personlige/delte lister. Projekt-lister kan så fjernes fra "Aktionslister" eller beholdes.
3. **Valgmulighed C:** Skift "Aktionslister" til en fane med sub-tabs/filtre: "Alle", "Projekt", "Personlige".
**Testplan:**
1. PO beslutter ønsket navigation.
2. UX-gennemgang med mockup.
3. Lokal E2E: verificér nye faner/filtre fungerer.
**Berørte filer:** `app/(tabs)/checklists.tsx`, evt. `app/(tabs)/_layout.tsx`.
**Status:** Feature-ønske, afventer PO-beslutning.

---

## Observationer / afklaringer (⚪)

### O1: Hvorfor kun ét projekt ved oprettelse af liste?
**Set i:** Build 2, E4/E6
**Beskrivelse:** En liste tilknyttes ét projekt af gangen. PO spørger om det er design.
**Svar:** Ja, det er design. En checkliste hører under ét projekt i US-004 Solution B. Søgning kan vise resultater fra flere projekter, men listen oprettes i ét valgt projekt.

### O2: Build 1 fejl
**Set i:** Build 1
**Beskrivelse:** Projekt A/B vistes ikke; "Listen blev ikke fundet" ved checkliste; stemme-dictation fejl (type blev titel, æ/ae, linjeskift).
**Status:** P1 og P2 rettet i koden. P3-1 (æ→ae) ikke reproduceret i parser. P3-2 (linjeskift) afklares.

### O3: Hvorfor starter dynamisk liste med "0" eller duplikater?
**Set i:** Build 2
**Beskrivelse:** E6 viste "2 ens Min personlige liste" og andre lister der lignede testdata/seed-resultater.
**Root cause:** Seed-scriptet opretter lister med faste navne. Ved flere kørsler eller manuel test oprettes der duplikater.
**Status:** Data-oprydning; se L3.

---

## Hvad der faktisk virkede i Build 2

| Flow | Status |
|------|--------|
| Login (anonym bruger) | ✅ |
| Projekter-fane viser egen + Projekt A + Projekt B | ✅ |
| Åbne Projekt A med sager | ✅ |
| Søgning og oprette liste | ✅ |
| Liste åbnes uden "Listen blev ikke fundet" | ✅ |
| Personlige lister åbnes | ✅ |

---

## Build 2 scope vs udestående

### Inkluderet i Build 2 (rettet)
- P1: Projekt-synlighed (seed data matcher testbruger).
- P1: Project-scoped checkliste navigation med `projectId`.
- P1: Deeplinks og notifikationer forwarding `projectId`.
- P2: Stemme-parser fjerner ikke længere type-nøgleord som titel.

### Ikke inkluderet / udestående
- K1: Notifikation/påmindelse fryser app for projekt-lister.
- K2: Dynamisk liste opdaterer ikke med nye matches.
- H1-H3: Slette projekt, invitation, slette liste.
- M1-M5: Sync, søgning, reference-håndtering, titel-forslag.
- L1-L4: UX / design / oprydning.

---

## PO-beslutninger nødvendige

1. **Build 3?** Skal der bygges en Build 3 for at rette K1 (notifikation-freeze) og K2 (dynamisk liste)? Det bryder "max 2 builds"-aftalen.
2. **Scope for Build 3 (hvis ja):** Kun K1+K2? Eller også H1-H3?
3. **Stop US-004?** Skal US-004 afsluttes med Build 2 som baseline, og resten gå i backlog?
4. **Prioritering af backlog:** Hvilke af H/M/L issues skal arbejdes på næst?
5. **Navigation:** Skal personlige lister have egen fane?

---

## Næste anbefaling fra Master Agent

Jeg anbefaler:
1. **Afgør Build 3 ja/nej nu.** K1 er en reel blocker for påmindelser på projekt-lister.
2. **Hvis Build 3 ja:** Scope det til K1 + eventuelt H1-H3. Ikke M/L.
3. **Hvis Build 3 nej:** Acceptér Build 2 med kendte begrænsninger, og flyt alle issues til backlog.

Jeg er klar til at dykke ned i K1, hvis du giver GO.
