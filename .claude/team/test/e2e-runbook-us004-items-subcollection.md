# Manuel E2E runbook — US-004 items/checkpoints/comments subcollection migration

**App:** Data Capture (`C:\Users\kimgr\data-capture-app`)  
**Branch:** `fix/us004-items-subcollection`  
**Dato:** 2026-08-02  
**QA Agent:** QA Agent  
**Formål:** Trin-for-trin runbook for manuel gennemførelse af E1–E9 fra `impl-plan-items-subcollection-us004.md` afsnit 6.3.  
**Status:** Klar til E2E-afvikling (ikke afviklet endnu).

> **Note:** Denne runbook forbereder testen. E2E køres **ikke** nu.

---

## 1. Generel E2E-forberedelse

### 1.1 Data-wipe første gang (kræves én gang før E1–E9)

| # | Aktivitet | Sådan gøres det | Verifikation |
|---|---|---|---|
| W1 | Backup | Tag screenshots af Board, Søg, Checklister og Projekt-medlemmer i dev/prod. Gem lokalt i `C:\Users\kimgr\data-capture-app\.claude\team\test\screenshots\pre-wipe-YYYY-MM-DD\`. | Mappe med screenshots findes. |
| W2 | Wipe Firestore | I Firebase Console: slet alle dokumenter under gamle top-level `/items/{itemId}` og subcollections (`checkpoints`, `comments`). Slet alle `/projects/{projectId}` og subcollections (`members`, `items`, `checkpoints`, `comments`, `checklists`, `checklists/{id}/items`). | Ingen top-level `/items` tilbage. |
| W3 | Wipe checklists | Slet alle `/checklists/{checklistId}` og subcollections (`items`) der **ikke** er projekt-scopede (personlige/delte). | Kun relevante personlige checklists beholdes, hvis PO ønsker det. |
| W4 | Wipe Storage | Slet Storage-præfikset `projects/`. | Ingen `projects/{projectId}/items/` filer tilbage. |
| W5 | Reminders (valgfrit) | Behold `/users/{userId}/reminders/{reminderId}` med accept af at gamle reminders mangler `targetProjectId`. | Dokumenteret i testnoter. |

### 1.2 Testbrugere og projekter (genskab efter wipe)

| Projekt | Rolle | Bruger-ID / email | Bemærkning |
|---|---|---|---|
| **Projekt A** | Owner | `user_owner` | Opretter og administrerer projektet. |
| **Projekt A** | Editor (UID) | `user_editor` | Inviteres via medlemsliste med editor-rolle. |
| **Projekt A** | Viewer (UID) | `user_viewer` | Inviteres med viewer-rolle. |
| **Projekt A** | Email-editor | `email_editor@example.com` | Tilføjes via `memberEmails` som editor. |
| **Projekt B** | Owner | `user_owner` | Bruges til email-medlemsscenarie (E9). |
| **Eksterne** | Ikke-medlem | `user_non_member` | Bruges til sikkerhedstest (E7). |

### 1.3 Oprettelse af testdata efter wipe

1. Opret **Projekt A** og **Projekt B** i appen.
2. Inviter `user_editor` (editor), `user_viewer` (viewer) og `email_editor@example.com` (editor) i Projekt A.
3. I Projekt A opret følgende items:
   - **Item A1** (manuel): Titel "Knap virker ikke", type "Bug", status "new".
   - **Item A2** (via stemme): Sig "Bug. Knappen virker ikke."
   - **Item A3** (med checkpoints): Opret item med type der genererer checkpoints, eller tilføj checkpoints manuelt.
   - **Item A4** (med foto): Opret item med billede fra album/kamera.
4. Tilføj kommentarer til Item A1 og Item A3.
5. Opret en dynamisk checkliste fra Søg i Projekt A (med status-synk slået til).
6. Opret reminders på Item A1.
7. Verificér stier i Firebase Console:
   - `/projects/{projectId}/items/{itemId}`
   - `/projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}`
   - `/projects/{projectId}/items/{itemId}/comments/{commentId}`
   - `/projects/{projectId}/checklists/{checklistId}/...`
   - Storage: `projects/{projectId}/items/{itemId}/...`

### 1.4 Miljøkrav

| Miljø | Krav | Hvordan |
|---|---|---|
| Dev build | Expo dev client eller simulator med branch `fix/us004-items-subcollection` checked ud. | `git checkout fix/us004-items-subcollection && npm install && npx expo start --dev-client` |
| Emulator (valgfrit) | Firestore emulator kører med nye `firestore.rules`. | `firebase emulators:start --only firestore` |
| Cloud Function | `deleteProject` callable deployet til emulator eller dev-projekt. | `cd functions && npm run build && firebase emulators:start --only functions,firestore` |
| Netværk | WiFi til online-scenarier; flymode til offline-scenarie. | Enhedsindstillinger. |

---

## 2. E2E-scenarier E1–E9

### E1 — Opret item via Board

| Felt | Værdi |
|---|---|
| **Scenario** | Owner opretter item manuelt og via stemme i Projekt A. |
| **Forudsætninger** | Logget ind som `user_owner` i Projekt A. Appen peger på dev-build. Data wipe gennemført og testdata genskabt (se afsnit 1.3). |
| **Kræver data wipe først** | Ja (én gang før hele runbooken). |
| **Miljø** | Kan testes i simulator/dev client. Fysisk iOS-enhed valgfrit, men anbefales til stemmeoptagelse. |

#### Trin-for-trin

1. Vælg **Projekt A** i Projekter-fanen.
2. Gå til **Board**.
3. Tryk **"+ Tilføj"**.
4. Vælg type **"Bug"**.
5. Indtast titel: **"Knap virker ikke"**.
6. Indtast beskrivelse: **"Når jeg trykker på gem-knappen sker der intet."**
7. Tryk **"Gem"**.
8. Verificér at item vises øverst i Board.
9. Tryk **"🎤 Optag"**.
10. Accepter mikrofontilladelse.
11. Sig: **"Idé. Vi skal have mørkt tema som standard."**
12. Stop optagelsen.
13. Vent ca. 5 sekunder på auto-gem.
14. Verificér at begge items vises i Board.

#### Forventet resultat

- Begge items vises i Board med korrekte type-badges, titler, dato og forfatter.
- Items ligger i Firestore under `/projects/{projectA}/items/{itemId}`.
- `projectId`-feltet i dokumentet matcher projekt-ID.
- Board opdateres live uden manuel refresh.

---

### E2 — Søg viser items

| Felt | Værdi |
|---|---|
| **Scenario** | Søg i Projekt A og naviger til item-detalje. |
| **Forudsætninger** | Projekt A har items oprettet i E1. Logget ind som `user_owner`. |
| **Kræver data wipe først** | Nej (forudsætter E1 gennemført). |
| **Miljø** | Kan testes i simulator/dev client. Fysisk iOS-enhed valgfrit. |

#### Trin-for-trin

1. Gå til **Søg**-fanen.
2. Indtast søgetekst: **"knap"**.
3. Vent på resultater.
4. Verificér at Item A1 og evt. Item A2 vises.
5. Tryk på **Item A1**.
6. Verificér at item-detalje åbnes.
7. Tjek URL/route params indeholder både `itemId` og `projectId`.
8. Gå tilbage til Søg.
9. Indtast søgetekst: **"mørkt tema"**.
10. Verificér at stemme-itemet vises.

#### Forventet resultat

- Søgeresultater vises sorteret efter relevans.
- Tryk på resultat åbner item-detalje korrekt med begge route params.
- Ingen crash ved navigation frem/tilbage.
- Søgning fungerer på tværs af projekter brugeren har adgang til.

---

### E3 — Kommentarer

| Felt | Værdi |
|---|---|
| **Scenario** | Editor tilføjer kommentar; owner sletter den. |
| **Forudsætninger** | Logget ind som `user_editor` i Projekt A. Item A1 findes. Derefter logget ind som `user_owner` i samme projekt. To enheder eller skift mellem brugere. |
| **Kræver data wipe først** | Nej. |
| **Miljø** | Kan testes i simulator/dev client. To enheder anbefales for realtidstest; ellers skift bruger på én enhed. |

#### Trin-for-trin (som editor)

1. Log ind som `user_editor`.
2. Gå til Board og tryk på **Item A1**.
3. Indtast tekst i kommentarfeltet: **"Jeg kan reproducere det på iPad."**
4. Tryk **"Send"**.
5. Verificér at kommentaren vises straks i listen.
6. Verificér at forfatter vises som editor og timestamp er korrekt.

#### Trin-for-trin (som owner)

7. Log ind som `user_owner`.
8. Åbn **Item A1**.
9. Verificér at editor-kommentaren vises i realtid (eller efter åbning).
10. Tryk på slet-ikonet ved editor-kommentaren.
11. Bekræft sletning.

#### Forventet resultat

- Kommentar gemmes under `/projects/{projectA}/items/{itemA1}/comments/{commentId}`.
- Kommentar vises i realtid for anden bruger/enhed.
- Owner kan slette andres kommentarer.
- Kommentar forsvinder fra listen og Firestore efter sletning.

---

### E4 — Checkliste fra søgning

| Felt | Værdi |
|---|---|
| **Scenario** | Owner opretter dynamisk liste fra søgning og afkrydser punkter. |
| **Forudsætninger** | Projekt A har flere items med fælles søgeord. Logget ind som `user_owner`. |
| **Kræver data wipe først** | Nej. |
| **Miljø** | Kan testes i simulator/dev client. Fysisk iOS-enhed valgfrit. |

#### Trin-for-trin

1. Gå til **Søg**.
2. Indtast et ord der matcher flere items, f.eks. **"knap"** eller **"tema"**.
3. Tryk på **"Opret dynamisk liste"** (eller tilsvarende knap).
4. Vælg **status-synk til**.
5. Gem checklisten.
6. Gå til **Checklister** og åbn den nye liste.
7. Afkryds ét punkt.
8. Tryk på punktets source-link og verificér at det åbner source item.
9. Gå tilbage til Board eller Søg og find source item.

#### Forventet resultat

- Checkliste oprettes under `/projects/{projectA}/checklists/{checklistId}`.
- Checkliste-items har `sourceItemPath = projects/{projectA}/items/{itemId}` og `sourceProjectId = {projectA}`.
- Afkrydsning opdaterer checkpoint under `/projects/{projectA}/items/{itemId}/checkpoints/{checkpointId}`.
- Source item status ændres til **done** (hvis alle checkpoints done) eller **in_progress** (hvis delvist).
- Source-link åbner item-detalje med korrekte `itemId` og `projectId`.

---

### E5 — Offline checklist

| Felt | Værdi |
|---|---|
| **Scenario** | Slå flymode til, afkryds punkt, slå flymode fra, vent på synkronisering. |
| **Forudsætninger** | Der findes en dynamisk checkliste fra E4. Logget ind som `user_owner`. |
| **Kræver data wipe først** | Nej. |
| **Miljø** | Kan testes i simulator/dev client med netværksforbindelse slået fra/iOS simulator flymode. Fysisk iOS-enhed anbefales for realistisk offline-test. |

#### Trin-for-trin

1. Gå til **Checklister** og åbn listen fra E4.
2. Notér source item status før test (f.eks. "in_progress" eller "new").
3. Slå **flymode til** på enheden.
4. Afkryds ét punkt.
5. Verificér at UI markerer punktet (muligvis med "afventer synkronisering"-indikator).
6. Slå **flymode fra**.
7. Vent 10-30 sekunder på at pending-op flushes.
8. Gå til Board eller Søg og find source item.

#### Forventet resultat

- Pending-op gemmes lokalt uden crash.
- Efter flymode fra synkroniseres opdatering til Firestore.
- Source item status opdateres korrekt (done/in_progress).
- Ingen dobbelt-toggle eller fejl i UI.
- Hvis source item/checkpoint er slettet imens, vises brugervenlig fejl i stedet for crash.

---

### E6 — Reminder notification

| Felt | Værdi |
|---|---|
| **Scenario** | Opret reminder på item, tappes notifikation, åbner item-detalje korrekt. |
| **Forudsætninger** | Logget ind som `user_owner`. Item A1 findes. Push-tilladelser accepteret. |
| **Kræver data wipe først** | Nej. |
| **Miljø** | **Kræver fysisk iOS-enhed** (simulator understøtter ikke rigtige push-notifikationer). Alternativt kan local notification testes i simulator hvis appen bruger local notifications. |

#### Trin-for-trin

1. Gå til Board og åbn **Item A1**.
2. Tryk **"Opret påmindelse"** (eller tilsvarende).
3. Vælg tidspunkt 2-3 minutter frem i tiden.
4. Gem reminder.
5. Verificér i Firestore at `/users/{userId}/reminders/{reminderId}` har feltet `targetProjectId = {projectA}`.
6. Luk appen helt.
7. Vent til notifikation modtages på låseskærmen.
8. Tap notifikationen.

#### Forventet resultat

- Notification data payload indeholder `targetProjectId`.
- Appen åbner item-detalje med både `itemId` og `projectId`.
- Item A1 vises korrekt.
- Hvis gammel reminder mangler `targetProjectId`, vises Alert i stedet for crash.

---

### E7 — Sikkerhed: ikke-medlem

| Felt | Værdi |
|---|---|
| **Scenario** | Log ind som bruger C, prøv at subscribe items i Projekt A. |
| **Forudsætninger** | Bruger `user_non_member` eksisterer og er IKKE medlem af Projekt A. Projekt A har items. |
| **Kræver data wipe først** | Nej. |
| **Miljø** | Kan testes i simulator/dev client. Fysisk iOS-enhed valgfrit. |

#### Trin-for-trin

1. Log ud af appen.
2. Log ind som `user_non_member`.
3. Gå til **Projekter**.
4. Verificér at Projekt A **ikke** vises i listen.
5. (Valgfrit) Forsøg at navigere til Board for Projekt A via manipuleret deep link: `datacapture://tabs/board?projectId={projectA}`.
6. (Valgfrit) Forsøg at åbne item-detalje via manipuleret link: `datacapture://item?itemId={itemA1}&projectId={projectA}`.

#### Forventet resultat

- Projekt A vises ikke i Projekt-listen for ikke-medlem.
- Board viser tom liste eller permission-denied uden crash.
- Item-detalje viser fejl/Alert eller tom skærm.
- Ingen data eksponeres.

---

### E8 — Projektsletning

| Felt | Værdi |
|---|---|
| **Scenario** | Owner sletter Projekt A. Callable returnerer success; alt relateret data forsvinder. |
| **Forudsætninger** | Logget ind som `user_owner`. Projekt A har items, checkpoints, comments, project-scoped checklists og fotos. Cloud Function `deleteProject` deployet. |
| **Kræver data wipe først** | Nej — dette scenarie sletter selv projektet. |
| **Miljø** | Kan testes i simulator/dev client mod emulator eller dev-projekt. Fysisk iOS-enhed valgfrit. **Vigtigt:** Test kun på dev/test-projekt. |

#### Trin-for-trin

1. Gå til **Projekter**.
2. Find **Projekt A**.
3. Hold inde på projektet eller tryk slet-ikon (afhængigt af UI).
4. Bekræft sletning.
5. Vent på at Cloud Function returnerer `{ success: true }`.
6. Gå til Firebase Console.
7. Tjek at `/projects/{projectA}` og alle subcollections er fjernet.
8. Tjek at project-scopede checklists under `/projects/{projectA}/checklists` er fjernet.
9. Tjek Storage at `projects/{projectA}/items/` er fjernet.
10. Tjek at Projekt A ikke længere vises i appens projektliste.

#### Forventet resultat

- Callable `deleteProject({ projectId })` returnerer success.
- Projekt-dokument og subcollections (items, checkpoints, comments, members, checklists) slettes.
- Storage-filer under `projects/{projectA}/items/` slettes.
- Ingen orphaned data tilbage.
- Appen viser opdateret projektliste uden Projekt A.

#### Faktisk resultat fra PO-test (build `92247ec7`, commit `60542c1`, 2026-08-11/12)

- **Status:** 🔴 Fejlet
- **Observation:** Sletningsdialog viser:  
  `Diagnose: sletning fejlede. Sletning fejlede (unknown): deleteProject fejlede: httpsCallable(unauthenticated): UNAUTHENTICATED; directUrl(unknown): JSON Parse error: Unexpected character:`
- **Rodårsag (verificeret):** `deleteProject` Cloud Function var deployet, men IAM-policy manglede `allUsers` / `Cloud Functions Invoker`. Google front-end afviste kaldet før det nåede funktionskoden.
- **Rettelse:** `allUsers` + `roles/cloudfunctions.invoker` tilføjet; appens `services/projects.ts` fik forbedret direct-URL fallback med auth-header. Skal verificeres i næste build.

---

### E9 — Email-medlem editor

| Felt | Værdi |
|---|---|
| **Scenario** | Email-editor opretter item og kommentar i Projekt B. |
| **Forudsætninger** | Projekt B oprettet af `user_owner`. `email_editor@example.com` tilføjet som medlem via `memberEmails` (editor). Email-bruger logger ind med samme email eller anonymt med token-email. |
| **Kræver data wipe først** | Nej (Projekt B genoprettes efter E8, hvis Projekt A og B var forskellige; ellers opret Projekt B før E9). |
| **Miljø** | Kan testes i simulator/dev client. Fysisk iOS-enhed valgfrit. |

#### Trin-for-trin

1. Log ind som `user_owner`.
2. Opret **Projekt B**.
3. Inviter `email_editor@example.com` som editor via medlemsmodal.
4. Log ud.
5. Log ind som `email_editor@example.com` (anonymt med email-token eller via invitation).
6. Verificér at Projekt B vises i projektlisten.
7. Gå til Board for Projekt B.
8. Tryk **"+ Tilføj"** og opret item: **"Email editor test item"**.
9. Åbn det nye item.
10. Tilføj kommentar: **"Dette er en test fra email-editor."**

#### Forventet resultat

- Email-editor kan se Projekt B og Board.
- Item oprettes under `/projects/{projectB}/items/{itemId}`.
- Kommentar oprettes under `/projects/{projectB}/items/{itemId}/comments/{commentId}`.
- Begge operationer tilladt uden permission-denied.
- `memberEmails`-fallback giver editor-rolle korrekt.

---

## 3. Opsummering: simulator vs. fysisk enhed

| Scenario | Simulator/dev client | Fysisk iOS-enhed | Data wipe først |
|---|---|---|---|
| E1 Opret item via Board | ✅ Ja | ✅ Anbefalet til stemme | Ja (én gang) |
| E2 Søg viser items | ✅ Ja | ✅ Ja | Nej |
| E3 Kommentarer | ✅ Ja (to enheder eller brugerskift) | ✅ Ja | Nej |
| E4 Checkliste fra søgning | ✅ Ja | ✅ Ja | Nej |
| E5 Offline checklist | ✅ Ja (flymode i simulator) | ✅ Anbefalet | Nej |
| E6 Reminder notification | ⚠️ Kun local notification | ✅ Ja (push) | Nej |
| E7 Sikkerhed — ikke-medlem | ✅ Ja | ✅ Ja | Nej |
| E8 Projektsletning | ✅ Ja (mod emulator/dev) | ✅ Ja | Nej |
| E9 Email-medlem editor | ✅ Ja | ✅ Ja | Nej |

---

## 4. Præ-build tjekliste for PO

> Kopieret fra `qa-gate-us004-items-subcollection.md` afsnit 6.1 — Build 1 GO-kriterier.  
> PO skal tjekke af på punkterne før Build 1 frigives.

| # | Kriterie | Tjek |
|---|---|---|
| 1 | `npm run typecheck` grøn | [ ] |
| 2 | `npm run lint` grøn | [ ] |
| 3 | `npm run pre-test-check` grøn | [ ] |
| 4 | `firebase emulators:exec --only firestore "node scripts/test-rules.js"` grøn | [ ] |
| 5 | `scripts/test-rules.js` dækker alle cases i afsnit 3 | [ ] |
| 6 | Manuel E2E E1–E9 bestået på simulator/emulator | [ ] |
| 7 | Data wiped og genskabt; testdata valideret | [ ] |
| 8 | Ingen åbne P1/P2-bugs | [ ] |
| 9 | `firestore.rules` opdateret og reviewet af Security/Compliance Agent | [ ] |
| 10 | Impl-plan afsnit 2.1-2.16 gennemført eller dokumenteret undtaget | [ ] |
| 11 | PO godkender Build 1 GO | [ ] |

---

## 5. Efter test: rapportering

Efter E2E-afvikling skal QA Agent udfylde følgende:

| Scenario | Status | Kommentar | Bemærkninger |
|---|---|---|---|
| E1 | ⚪ | | |
| E2 | ⚪ | | |
| E3 | ⚪ | | |
| E4 | ⚪ | | |
| E5 | ⚪ | | |
| E6 | ⚪ | | |
| E7 | ⚪ | | |
| E8 | 🔴 | Build 92247ec7: `deleteProject` fejler med `UNAUTHENTICATED` pga. manglende IAM invoker. Rettet efterfølgende; afventer verifikation i næste build. | Build 92247ec7 (2026-08-11) |
| E9 | ⚪ | | |

**Status-legend:**  
- 🟢 OK  
- 🟡 OK med forbehold / observeret udfordring  
- 🔴 Fejler / blocker  
- ⚪ Ikke testet endnu

---

## 6. Referencer

- `C:\Users\kimgr\data-capture-app\.claude\team\status\impl-plan-items-subcollection-us004.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\test\qa-testplan-us004-items-subcollection.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\test\qa-gate-us004-items-subcollection.md`
