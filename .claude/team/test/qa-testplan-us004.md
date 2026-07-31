# QA-testplan — US-004 / B3-B4-B8-B9-D1-D3 + REG-001

**Dokument:** `.claude/team/test/qa-testplan-us004.md`  
**Branch:** `fix/us004-voice-redesign`  
**Dato:** 2026-07-15  
**Ansvarlig:** Test Manager Agent  
**Platforme:** iOS, Android (fysisk enhed påkrævet for push/offline), simulator tilladt for parser-tests.

---

## 1. Scope

Denne plan dækker QA-testrunden for følgende godkendte punkter:

| ID | Område | Design-referencer |
|---|---|---|
| B3 / US-005 | Offline understøttelse af lister | `.claude/team/design/us-005-offline-lists.md`, `.claude/team/design/us-010-offline-lists.md` |
| B4 / US-011 | Push-påmindelser på sager og listepunkter | `.claude/team/design/us-011-push-reminders.md` |
| B8 / US-006 | Tomt projektnavn + server-side forhindring af dubletter | `.claude/team/design/us-006-empty-name-server-duplicates.md`, `.claude/team/design/design-006-project-creation.md` |
| B9 / US-001 | Slet projekt med cascade delete | `.claude/team/design/us-001-delete-project.md` |
| D1 / US-004 | Fjern "åben/åbn"-residu efter foto-kommando | `.claude/team/design/us-004-d1-remove-open-residue.md` |
| D3 / US-004 | Auto-titel må ikke overskrive manuelt redigeret titel | `.claude/team/design/us-004-d3-auto-title-bug.md` |
| REG-001 | Firestore-regelrettelse: lister/checkpoints accepterer email-medlemmer | `.claude/team/design/design-search-lists-v2.md`, `firestore.rules`, `.claude/team/status/build-ready-checklist.md` |

### Ude af scope (markeret eksplicit)

- Server push / FCM / fælles påmindelser (B4 er lokale notifikationer).
- Offline oprettelse af **helt nye lister** er ifølge US-005-designet online-only. Denne plan verificerer, at forsøg håndteres sikkert (deaktiveret/fejl). Hvis PO ønsker egentlig offline listeoprettelse, kræves designopdatering.
- Soft delete / papirkurv for projekter.

---

## 2. Forudsætninger

### 2.1 Testbrugere

| Bruger | Rolle | Formål |
|---|---|---|
| `qa-owner@example.com` | Ejer af egne projekter | B8, B9, REG-001 (owner-reference) |
| `qa-editor@example.com` | Email-inviteret medlem (email står i `memberEmails`, evt. uden `roles[uid]`) | REG-001 (skal kunne oprette liste og redigere punkter) |
| `qa-stranger@example.com` | Ikke-medlem i testprojektet | REG-001 (skal få permission error) |
| `qa-device-b@example.com` | Samme konto som `qa-owner` på anden enhed | B3 konflikthåndtering |

Alle testbrugere skal have gyldige Firebase Auth-konti og være logget ind på testenhederne.

### 2.2 Testprojekter og testdata

| Projekt | Indhold | Formål |
|---|---|---|
| "US004 Test A" (unikt navn) | Sager, kommentarer, checklister, fotos | B3, B4, B9, REG-001 |
| "Renovering" (ejet af `qa-owner`) | Eksisterende projekt | B8 dublet-tjek |
| "Renovering" (ejet af anden bruger, delt med `qa-owner`) | Delt projekt | B8 scope-test: samme navn hos anden må gerne oprettes |
| "Slet-Test" | Sager + checkpoints + kommentarer + checklister + listepunkter + fotos i Storage | B9 cascade delete |
| "Offline-Test" | Manuel og dynamisk checkliste med punkter | B3 offline |

### 2.3 Enheder og miljø

- **iOS:** Fysisk iPhone med iOS 16+ (push + flymode kræver fysisk enhed/simulator med netinfo).
- **Android:** Fysisk Android 13+ enhed (push-tilladelser + flymode).
- **Simulator:** Acceptabelt til parser-tests (D1) og simple UI-tests, ikke til push.
- **Firebase-projekt:** Staging/udviklingsmiljø.
- **Deployede Firestore-regler:** REG-001 + B8 `projects` create-regel skal være publiceret.
- **Deployede Cloud Functions:** `createProject` (B8) og `deleteProject` (B9).
- **App-build:** Ny EAS-build med `@react-native-community/netinfo` (B3) og `expo-notifications` (B4).
- **Netværksmulighed:** Mulighed for at slå flymode til/fra; mulighed for at simulere netværksfejl.

### 2.4 Forberedelse før første testcase

1. Ryd app-data / geninstaller app på testenhederne.
2. Log ind som `qa-owner`.
3. Opret testprojekterne og seed-data i staging.
4. Inviter `qa-editor` til "US004 Test A" og "Slet-Test" (kun email-invitation, accepter IKKE nødvendigvis endnu — afhængigt af testcase).
5. Verificer at `qa-stranger` ikke er medlem af nogen testprojekter.
6. Bekræft deploy-status af regler og Cloud Functions.

---

## 3. Prioriteret testrækkefølge (must-test først)

Testen køres i faser. **P0** skal være grønne før næste fase påbegyndes. **P1** må køres parallelt, når P0 i samme område er stabilt.

| Fase | Prioritet | Område | Begrundelse |
|---|---|---|---|
| 1 | P0 | **Sikkerhed & data-integritet** — REG-001, B8, B9 | Ligger til grund for resten; fejl her blokerer hele runden. |
| 2 | P0 | **Offline lister (B3)** | Største nye feature + native dependency; afhænger af REG-001 for delte lister. |
| 3 | P0 | **Push-påmindelser (B4)** | Kræver fysisk enhed og OS-tilladelser; afhænger af B9 for cleanup ved sletning. |
| 4 | P0 | **Voice / create flow fixes (D1, D3)** | Små, kritiske regression-risici i stemmeflowet. |
| 5 | P1 | **Regression & polish** | Eksisterende baseline-funktionalitet må ikke bryde. |
| 6 | P2 | **Edge cases / could** | Race-conditions, dårligt netværk, store datamængder. |

### Prioritering inden for hver fase

**Fase 1:**
1. REG-001 — email-medlem kan oprette liste (TC-SEC-001).
2. REG-001 — email-medlem kan redigere/afkrydse punkter (TC-SEC-002).
3. REG-001 — ikke-medlem får permission error (TC-SEC-003).
4. B8 — tomt/whitespace navn afvises (TC-SEC-004/005).
5. B8 — dubletter afvises client-side og server-side (TC-SEC-006/007).
6. B8 — samtidige oprettelser (TC-SEC-008).
7. B9 — tekstbekræftelse + cascade delete (TC-SEC-009/010/011).

**Fase 2 (B3):**
1. Listeåbning og afkrydsning offline.
2. Sync ved netværksgenoprettelse.
3. Konflikt mellem to enheder.
4. Pending queue-kompaktion og pull-to-refresh.
5. UI-feedback (badge, status, deaktiverede handlinger).

**Fase 3 (B4):**
1. Oprette påmindelse på sag.
2. Oprette påmindelse på listepunkt.
3. Notifikation til tiden + åbning af rigtig skærm.
4. Slette påmindelse.
5. Annullere påmindelse ved afkrydsning.
6. Tilladelses-flow og app-kill.

**Fase 4 (D1/D3):**
1. Parser fjerner residu (D1).
2. "Åbn ..." stadig fungerer (D1 regression).
3. Auto-titel ikke overskriver manuel titel (D3).
4. Gem-fallback og voice-mode (D3).

---

## 4. Go/no-go kriterie for teststart

Testrunden må **ikke** startes før alle følgende er opfyldt:

| # | Kriterie | Ansvarlig | Status inden start |
|---|---|---|---|
| 1 | Kode er merget til `fix/us004-voice-redesign` og build kan installeres på testenhederne. | Developer Agent | Påkrævet |
| 2 | Firestore-regler (REG-001 + B8) er deployet til staging-miljøet. | PO / Firebase Console | Påkrævet |
| 3 | Cloud Functions `createProject` (B8) og `deleteProject` (B9) er deployet og callable fra appen. | Developer Agent | Påkrævet |
| 4 | `@react-native-community/netinfo` er inkluderet i EAS-build (B3). | Developer Agent / EAS | Påkrævet |
| 5 | Testbrugere, testprojekter og seed-data er oprettet og verificeret i Firestore. | Test Manager Agent | Påkrævet |
| 6 | Fysiske iOS- og Android-enheder er tilgængelige (push + flymode). | Test Manager Agent | Påkrævet |
| 7 | Notifikationstilladelser kan testes (friske install / afvist tilladelse). | Test Manager Agent | Påkrævet |
| 8 | Netværksforbindelse kan kontrolleres (flymode / simuleret netværksfejl). | Test Manager Agent | Påkrævet |
| 9 | Forudgående TypeScript, lint og pre-test checks er grønne (eller afvigelser PO-godkendt). | Audit Agent | Påkrævet |

Hvis ét eller flere kriterier mangler, er status **NO-GO** indtil de er lukket.

---

## 5. Testcases

Status-legend: `Ikke testet` / `OK` / `Forbehold` / `Fejler` / `Ikke relevant`.

---

### Fase 1 — Sikkerhed & data-integritet

#### TC-SEC-001: Email-inviteret bruger kan oprette en liste i projektet

| Felt | Værdi |
|---|---|
| ID | TC-SEC-001 |
| Prioritet | P0 |
| Område | REG-001 |
| Forudsætning | `qa-editor` er email-inviteret til "US004 Test A" (`memberEmails` indeholder email, ingen `roles[uid]`). Logget ind på Android-enhed. |
| Trin | 1. Åbn projektet. <br> 2. Gå til lister. <br> 3. Opret ny manuel liste. <br> 4. Tilføj et punkt. |
| Forventet resultat | Listen og punktet oprettes uden permission error. Dokumenterne ligger under `checklists/` og `checklists/{id}/items/`. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Verificer i Firestore Console at `createdBy`/ejer matcher projektrettigheder. |

#### TC-SEC-002: Email-inviteret bruger kan afkrydse og rette listepunkter

| Felt | Værdi |
|---|---|
| ID | TC-SEC-002 |
| Prioritet | P0 |
| Område | REG-001 |
| Forudsætning | TC-SEC-001 gennemført. Listen har et uafkrydset punkt. |
| Trin | 1. Afkryds punktet. <br> 2. Rediger punktets titel og noter. <br> 3. Gem. |
| Forventet resultat | Ændringer persistere i Firestore. `isCompleted`, `title`, `notes` opdateres. Ingen permission error. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Test både online og offline (B3 + REG-001 kombineret). |

#### TC-SEC-003: Ikke-medlem får permission error

| Felt | Værdi |
|---|---|
| ID | TC-SEC-003 |
| Prioritet | P0 |
| Område | REG-001 |
| Forudsætning | `qa-stranger` er logget ind. Kendt `projectId` for "US004 Test A". |
| Trin | 1. Forsøg at læse projektet (direkte navigation/deep link). <br> 2. Forsøg at oprette liste i projektet (direkte service-kald). <br> 3. Forsøg at læse checkliste-punkter. |
| Forventet resultat | Alle forsøg afvises med `permission-denied`. Appen viser fejl / fallback, ingen data eksponeres. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Test både via UI og via manuelt service-kald i debug. |

#### TC-SEC-004: Tomt projektnavn afvises client-side

| Felt | Værdi |
|---|---|
| ID | TC-SEC-004 |
| Prioritet | P0 |
| Område | B8 |
| Forudsætning | Logget ind som `qa-owner`. "Nyt projekt"-dialogen er åben. |
| Trin | 1. Slet alt tekst i navnefeltet. <br> 2. Tryk **Opret**. |
| Forventet resultat | Inline fejl: "Projektnavn må ikke være tomt". Knappen er deaktiveret. Intet projekt oprettes. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-SEC-005: Whitespace-only projektnavn afvises

| Felt | Værdi |
|---|---|
| ID | TC-SEC-005 |
| Prioritet | P0 |
| Område | B8 |
| Forudsætning | "Nyt projekt"-dialogen er åben. |
| Trin | 1. Indtast "   " (mellemrum). <br> 2. Tryk **Opret**. |
| Forventet resultat | Inline fejl: "Projektnavn må ikke være tomt". Intet projekt oprettes. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-SEC-006: Dublet-navn afvises client-side

| Felt | Værdi |
|---|---|
| ID | TC-SEC-006 |
| Prioritet | P0 |
| Område | B8 |
| Forudsætning | `qa-owner` ejer allerede projekt "Renovering". |
| Trin | 1. Åbn "Nyt projekt". <br> 2. Indtast "Renovering". <br> 3. Gentag med "  renovering  " og "RENovering". |
| Forventet resultat | Alle forsøg blokeres med "Der findes allerede et projekt med dette navn.". Intet nyt projekt oprettes. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Verificer at trim + lowercasing anvendes. |

#### TC-SEC-007: Cloud Function afviser tomt navn og dublet server-side

| Felt | Værdi |
|---|---|
| ID | TC-SEC-007 |
| Prioritet | P0 |
| Område | B8 |
| Forudsætning | Client-side guard omgås (testkald eller debug). Eksisterende ejet projekt "Renovering". |
| Trin | 1. Kald `createProject` Cloud Function med `name = ""`. <br> 2. Kald med `name = "Renovering"`. |
| Forventet resultat | 1) `invalid-argument`: "Projektnavn må ikke være tomt". <br> 2) `already-exists`: "Der findes allerede et projekt med dette navn.". |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Sikrer forsvar i dybden. |

#### TC-SEC-008: Samtidige oprettelser håndteres sikkert

| Felt | Værdi |
|---|---|
| ID | TC-SEC-008 |
| Prioritet | P0 |
| Område | B8 |
| Forudsætning | To enheder logget ind som `qa-owner`. Netværk tilgængeligt. Ingen eksisterende projekt "Race-Test". |
| Trin | 1. På begge enheder: åbn "Nyt projekt", indtast "Race-Test". <br> 2. Tryk **Opret** samtidigt på begge enheder. |
| Forventet resultat | Højst ét projekt oprettes. Det andet kald returnerer dublet-fejl eller genbruger det oprettede projekt. Ingen to dubletter. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Alternativ: hurtigt dobbeltklik på én enhed. |

#### TC-SEC-009: Slet projekt med tekstbekræftelse

| Felt | Værdi |
|---|---|
| ID | TC-SEC-009 |
| Prioritet | P0 |
| Område | B9 |
| Forudsætning | `qa-owner` ejer "Slet-Test". |
| Trin | 1. Tryk "..." på projektkortet. <br> 2. Vælg "Slet projekt". <br> 3. Læs konsekvensdialog. <br> 4. Indtast projektnavnet korrekt. <br> 5. Bekræft. |
| Forventet resultat | Projekt slettes. Bruger sendes tilbage til projektlisten. Aktivt projekt nulstilles hvis det var aktivt. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Test at forkert navn deaktiverer Slet-knappen. |

#### TC-SEC-010: Underliggende data fjernes ved projektsletning

| Felt | Værdi |
|---|---|
| ID | TC-SEC-010 |
| Prioritet | P0 |
| Område | B9 |
| Forudsætning | TC-SEC-009 gennemført. "Slet-Test" havde sager, checkpoints, kommentarer, checklister, listepunkter og fotos. |
| Trin | 1. Verificer i Firestore Console: ingen dokumenter med `projectId == <Slet-Test-id>`. <br> 2. Verificer i Storage: mappe `projects/<id>/items/` er tom. <br> 3. Verificer at planlagte reminders annulleres. |
| Forventet resultat | Alle data og fotos fjernet. Ingen orphaned dokumenter. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Kræver Cloud Function `deleteProject`. |

#### TC-SEC-011: Anden bruger mister adgang til slettet projekt

| Felt | Værdi |
|---|---|
| ID | TC-SEC-011 |
| Prioritet | P0 |
| Område | B9 |
| Forudsætning | `qa-editor` var medlem af "Slet-Test". |
| Trin | 1. Log ind som `qa-editor`. <br> 2. Genindlæs projektlisten. <br> 3. Forsøg at åbne det gamle `projectId`. |
| Forventet resultat | Projektet vises ikke længere. Direkte åbning afvises med `not-found` / `permission-denied`. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

---

### Fase 2 — Offline lister (B3)

#### TC-OFL-001: Oprettelse af ny liste mens offline

| Felt | Værdi |
|---|---|
| ID | TC-OFL-001 |
| Prioritet | P0 |
| Område | B3 |
| Forudsætning | App offline (flymode). Logget ind som `qa-owner` i "US004 Test A". |
| Trin | 1. Gå til lister. <br> 2. Forsøg at oprette ny liste. |
| Forventet resultat | Handlingen blokeres: knap deaktiveret eller besked "Denne handling kræver netværk. Prøv igen, når du er online." Ingen lokal liste oprettes. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Ifølge US-005-design er ny liste-oprettelse online-only. |

#### TC-OFL-002: Listeoversigt og listedetalje vises offline

| Felt | Værdi |
|---|---|
| ID | TC-OFL-002 |
| Prioritet | P0 |
| Område | B3 |
| Forudsætning | "Offline-Test" er åbnet online. App sættes i flymode. |
| Trin | 1. Åbn Checklister-fane. <br> 2. Åbn "Offline-Test". |
| Forventet resultat | Cachede lister og punkter vises. Offline-badge vises. Ingen uendelig loader. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-OFL-003: Afkrydsning af punkter offline synkroniseres ved online

| Felt | Værdi |
|---|---|
| ID | TC-OFL-003 |
| Prioritet | P0 |
| Område | B3 |
| Forudsætning | TC-OFL-002. Listen har uafkrydsede punkter. |
| Trin | 1. Afkryds et punkt. <br> 2. Observer UI. <br> 3. Slå flymode fra. |
| Forventet resultat | UI opdateres med det samme. "afventer sync"-label vises. Ved online flush opdateres punktet og tilhørende source-sag/checkpoint i Firestore. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Verificer i Firestore at `isCompleted` og eventuelt `completedAt` er sat. |

#### TC-OFL-004: Rediger noter offline synkroniseres

| Felt | Værdi |
|---|---|
| ID | TC-OFL-004 |
| Prioritet | P0 |
| Område | B3 |
| Forudsætning | App offline. Liste åben. |
| Trin | 1. Rediger noter på et punkt. <br> 2. Gem. <br> 3. Slå flymode fra. |
| Forventet resultat | Noter synkroniseres til Firestore. `updatedAt` sættes. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-OFL-005: Genstart app offline bevarer ændringer

| Felt | Værdi |
|---|---|
| ID | TC-OFL-005 |
| Prioritet | P0 |
| Område | B3 |
| Forudsætning | Ændringer lavet offline i TC-OFL-003/004. |
| Trin | 1. Luk app helt. <br> 2. Genstart app mens flymode stadig er aktiv. |
| Forventet resultat | Cache og pending operations indlæses. Lokale ændringer bevares. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-OFL-006: Opret punkt på manuel liste offline

| Felt | Værdi |
|---|---|
| ID | TC-OFL-006 |
| Prioritet | P0 |
| Område | B3 |
| Forudsætning | Manuel liste "Offline-Test" åben offline. |
| Trin | 1. Tryk "Tilføj punkt". <br> 2. Indtast titel. <br> 3. Gem. <br> 4. Slå flymode fra. |
| Forventet resultat | Punkt vises med lokalt id. Ved sync oprettes det i Firestore; id udskiftes uden UI-flash. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-OFL-007: Slet punkt offline på dynamisk liste

| Felt | Værdi |
|---|---|
| ID | TC-OFL-007 |
| Prioritet | P0 |
| Område | B3 |
| Forudsætning | Dynamisk liste åben offline med et punkt. |
| Trin | 1. Slet punkt. <br> 2. Slå flymode fra. |
| Forventet resultat | Punkt fjernes lokalt. Ved sync kaldes `deleteChecklistItemAndTrack`; `deletedItemKeys` opdateres. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-OFL-008: Konflikt når anden enhed har ændret samme punkt

| Felt | Værdi |
|---|---|
| ID | TC-OFL-008 |
| Prioritet | P0 |
| Område | B3 |
| Forudsætning | To enheder; samme konto; samme dynamiske liste. |
| Trin | 1. Enhed A går offline og ændrer titlen på et punkt. <br> 2. Enhed B går online og ændrer titlen på samme punkt. <br> 3. Enhed A går online. |
| Forventet resultat | A's lokale titel vinder (last-write-wins). Non-blocking indikator: "Overskrevet med din seneste ændring". |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Test også toggle: lokal afkrydsning vinder. |

#### TC-OFL-009: Pending queue-kompaktion

| Felt | Værdi |
|---|---|
| ID | TC-OFL-009 |
| Prioritet | P1 |
| Område | B3 |
| Forudsætning | App offline. |
| Trin | 1. Toggle punkt. <br> 2. Rediger noter. <br> 3. Toggle samme punkt igen. <br> 4. Slå flymode fra. |
| Forventet resultat | Kun endelig tilstand synkroniseres. Ingen overflødige Firestore-writes. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Log Firestore-calls hvis muligt. |

#### TC-OFL-010: Pull-to-refresh flusher queue

| Felt | Værdi |
|---|---|
| ID | TC-OFL-010 |
| Prioritet | P1 |
| Område | B3 |
| Forudsætning | Netværk tilbage. Pending operationer findes. |
| Trin | 1. Træk ned i listen. |
| Forventet resultat | Queue flushes. Liste opdateres fra Firestore. Spinner forsvinder. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-OFL-011: UI-feedback — offline-badge, sync-status, deaktiverede handlinger

| Felt | Værdi |
|---|---|
| ID | TC-OFL-011 |
| Prioritet | P0 |
| Område | B3 |
| Forudsætning | App offline. |
| Trin | 1. Åbn listeoversigt og liste. <br> 2. Observer "Tilføj punkt" på dynamisk liste og Del/Slet/Link knapper. <br> 3. Slå net tilbage og observer statusskift. |
| Forventet resultat | Offline-badge vises. "Synkroniserer..." / "Synkroniseret" vises. Deaktiverede knapper er grå. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

---

### Fase 3 — Push-påmindelser (B4)

#### TC-REM-001: Opret påmindelse på en sag

| Felt | Værdi |
|---|---|
| ID | TC-REM-001 |
| Prioritet | P0 |
| Område | B4 |
| Forudsætning | Sag "Køb maling" er åben. Notifikationstilladelser er givet. |
| Trin | 1. Tryk klokke-ikon. <br> 2. Sæt tid til om 2 min. <br> 3. Vælg "En gang". <br> 4. Gem. |
| Forventet resultat | Påmindelse gemmes i `/users/{uid}/reminders`. Planlagt notifikation vises i OS. Efter 2 min vises push med titel "Køb maling". |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Test på fysisk enhed. |

#### TC-REM-002: Opret påmindelse på et listepunkt

| Felt | Værdi |
|---|---|
| ID | TC-REM-002 |
| Prioritet | P0 |
| Område | B4 |
| Forudsætning | Liste åben med punkt "Bestil isolering". |
| Trin | 1. Tryk påmindelse-knap på punktet. <br> 2. Sæt tid til om 2 min. <br> 3. Gem. |
| Forventet resultat | Påmindelse gemmes. Notifikation vises til tiden. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-REM-003: Tryk på notifikation åbner rigtig sag

| Felt | Værdi |
|---|---|
| ID | TC-REM-003 |
| Prioritet | P0 |
| Område | B4 |
| Forudsætning | TC-REM-001 gennemført; push modtaget. |
| Trin | 1. Tryk på notifikationen. |
| Forventet resultat | Appen åbner `app/item.tsx` med korrekt `itemId`. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-REM-004: Tryk på notifikation åbner rigtig liste

| Felt | Værdi |
|---|---|
| ID | TC-REM-004 |
| Prioritet | P0 |
| Område | B4 |
| Forudsætning | TC-REM-002 gennemført; push modtaget. |
| Trin | 1. Tryk på notifikationen. |
| Forventet resultat | Appen åbner `app/checklist.tsx` med korrekt `checklistId`. Punktet fremhæves visuelt. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-REM-005: Annuller påmindelse når punktet afkrydses

| Felt | Værdi |
|---|---|
| ID | TC-REM-005 |
| Prioritet | P0 |
| Område | B4 |
| Forudsætning | Listepunkt "Bestil isolering" har en fremtidig påmindelse. |
| Trin | 1. Afkryds punktet. <br> 2. Vent til planlagt tid. |
| Forventet resultat | Ingen notifikation vises. Påmindelsesdokument markeres inaktivt eller slettes. Planlagt OS-notifikation annulleres. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-REM-006: Slet påmindelse

| Felt | Værdi |
|---|---|
| ID | TC-REM-006 |
| Prioritet | P0 |
| Område | B4 |
| Forudsætning | Påmindelse planlagt om 5 min på en sag. |
| Trin | 1. Åbn påmindelsesmodal. <br> 2. Tryk Slet / Fjern. |
| Forventet resultat | Ingen notifikation vises efter 5 min. Dokument fjernes/inaktiveres. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-REM-007: Tilladelse nægtet flow

| Felt | Værdi |
|---|---|
| ID | TC-REM-007 |
| Prioritet | P1 |
| Område | B4 |
| Forudsætning | Frisk installation eller afvist tilladelse. |
| Trin | 1. Åbn sag. <br> 2. Tryk klokke. <br> 3. Afvis tilladelse i systemdialog. |
| Forventet resultat | Modal viser ikke fejl. Blid prompt vises med mulighed for at åbne systemindstillinger. Ingen crash. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Test på iOS og Android 13+. |

#### TC-REM-008: Ændring af tidspunkt

| Felt | Værdi |
|---|---|
| ID | TC-REM-008 |
| Prioritet | P1 |
| Område | B4 |
| Forudsætning | Eksisterende påmindelse kl. 10.00. |
| Trin | 1. Åbn modal. <br> 2. Ændr til kl. 11.00. <br> 3. Gem. |
| Forventet resultat | Kl. 10.00 vises ingen notifikation. Kl. 11.00 vises den. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-REM-009: App dræbt inden udløb

| Felt | Værdi |
|---|---|
| ID | TC-REM-009 |
| Prioritet | P1 |
| Område | B4 |
| Forudsætning | Påmindelse sat om 10 min. |
| Trin | 1. Luk app helt. <br> 2. Vent 10 min. |
| Forventet resultat | Notifikation vises alligevel (OS gemmer trigger). |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

---

### Fase 4 — Voice / create flow fixes (D1, D3)

#### TC-VRC-001: Parser fjerner "åbn/åben/åbne" før foto-kommando

| Felt | Værdi |
|---|---|
| ID | TC-VRC-001 |
| Prioritet | P0 |
| Område | D1 |
| Forudsætning | Voice parser tilgængelig. |
| Trin | 1. Kør parser med input `"Åbn kamera"`, `"Åben kamera"`, `"Åbne kamera"`, `"Åbn album"`. |
| Forventet resultat | `command === "openCamera"` / `"openAlbum"`. `title === ""`. `content === ""`. Ingen "åben"/"åbn" residu. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Kan køres via `scripts/verify-voice-parser.ts`. |

#### TC-VRC-002: "Tag billede af ..." efterlader ikke "åben" i titel

| Felt | Værdi |
|---|---|
| ID | TC-VRC-002 |
| Prioritet | P0 |
| Område | D1 |
| Forudsætning | Voice parser tilgængelig. |
| Trin | 1. Kør parser med `"Tag billede af skaden på taget"`. |
| Forventet resultat | `command === "openCamera"`. `title === "af skaden på taget"` (per nuværende parser). Ingen "tag billede" residu. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-VRC-003: "Åbn ..." kommando åbner stadig relevant skærm

| Felt | Værdi |
|---|---|
| ID | TC-VRC-003 |
| Prioritet | P0 |
| Område | D1 (regression) |
| Forudsætning | Voice parser tilgængelig. |
| Trin | 1. Kør parser med `"Åbn køb maling"` / `"Åbn checkliste Renovering"` (afhængigt af understøttede åbn-kommandoer). <br> 2. Verificer at app navigerer til sag/liste. |
| Forventet resultat | Åbn-kommandoen genkendes og åbner rigtig skærm. Residu-fjernelsen påvirker ikke ikke-foto-kommandoer. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-VRC-004: Modal-flow uden residu

| Felt | Værdi |
|---|---|
| ID | TC-VRC-004 |
| Prioritet | P0 |
| Område | D1 |
| Forudsætning | Voice flow kører. |
| Trin | 1. Start optagelse. <br> 2. Sig `"Silvan punktum åbn kamera"`. <br> 3. Tag foto. <br> 4. Sig `"hammer"`. <br> 5. Sig `"gem"`. |
| Forventet resultat | Final title = "Silvan". Final content = "hammer". Intet residu af "åbn"/"kamera". |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-VRC-005: Eksisterende voice parser tests består

| Felt | Værdi |
|---|---|
| ID | TC-VRC-005 |
| Prioritet | P0 |
| Område | D1 (regression) |
| Forudsætning | `scripts/verify-voice-parser.ts` indeholder E1-E13 cases. |
| Trin | 1. Kør `npx ts-node scripts/verify-voice-parser.ts`. |
| Forventet resultat | Alle eksisterende cases består. Ingen regression. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-AUT-001: Auto-titel udledes fra beskrivelse

| Felt | Værdi |
|---|---|
| ID | TC-AUT-001 |
| Prioritet | P0 |
| Område | D3 |
| Forudsætning | Bruger åbner `+ Tilføj` manuel oprettelse. |
| Trin | 1. Skriv "Due" i Beskrivelse uden at røre Titel. |
| Forventet resultat | Titel auto-udledes til "Due". |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-AUT-002: Manuel titel overskrives ikke

| Felt | Værdi |
|---|---|
| ID | TC-AUT-002 |
| Prioritet | P0 |
| Område | D3 |
| Forudsætning | TC-AUT-001 gennemført. |
| Trin | 1. Ret Titel til "Duer". <br> 2. Skriv videre i Beskrivelse. |
| Forventet resultat | Titel forbliver "Duer". Beskrivelse ændres kun af brugerens input. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | Kritisk acceptance: "Due -> Duer". |

#### TC-AUT-003: Fallback ved gem når titel er tom

| Felt | Værdi |
|---|---|
| ID | TC-AUT-003 |
| Prioritet | P1 |
| Område | D3 |
| Forudsætning | Bruger har redigeret titlen. |
| Trin | 1. Slet titlen. <br> 2. Gem sagen. |
| Forventet resultat | Ved gem udledes titel fra Beskrivelse. Sagen gemmes. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

#### TC-AUT-004: Voice-mode påvirkes ikke af auto-titel fix

| Felt | Værdi |
|---|---|
| ID | TC-AUT-004 |
| Prioritet | P0 |
| Område | D3 (regression) |
| Forudsætning | Bruger åbner Optag (`VoiceCaptureModal`). |
| Trin | 1. Tal tekst. <br> 2. Ret titel. <br> 3. Tal videre. <br> 4. Gem. |
| Forventet resultat | Voice-mode springer auto-titel over. Titel styres af stemmeparser. Sagen gemmes korrekt. |
| Status | Ikke testet |
| Faktisk resultat | |
| Bemærkninger | |

---

### Fase 5 — Regression (P1)

| ID | Område | Trin | Forventet resultat | Status |
|---|---|---|---|---|
| REG-001 | Voice baseline | Kør E1-E13 parser tests. | Alle består. | Ikke testet |
| REG-002 | Søgning / lister v2 | Opret liste fra søgning; afkryds punkt. | Liste oprettes; kun checkpoint ændres; item-status følger regler. | Ikke testet |
| REG-003 | Kommentar | Skriv og send kommentar på sag. | Kommentar gemmes; "Tilbage" forbliver synlig; navigation virker. | Ikke testet |
| REG-004 | Login/logout | Log ind og ud mellem brugere. | Ingen crash; cache/aktivt projekt ryddes korrekt. | Ikke testet |
| REG-005 | Projektinvitation | Inviter `qa-editor` og accepter invitation. | Medlem får adgang; `memberEmails` og `members` opdateres. | Ikke testet |

---

## 6. Kendte risici og afvigelser

| Risiko | Påvirker | Mitigation / Bemærkning |
|---|---|---|
| Offline oprettelse af **ny liste** er online-only i designet. | TC-OFL-001 | Testen verificerer sikker blokering. Hvis PO kræver egentlig offline listeoprettelse, opdateres designet først. |
| Cloud Functions-setup for B8/B9. | TC-SEC-007/010 | Kræver deploy og test i staging før teststart (go/no-go kriterie). |
| Native rebuild pga. `@react-native-community/netinfo` (B3). | TC-OFL-002 til TC-OFL-011 | Ny EAS-build påkrævet; simulator-test er ikke nok. |
| iOS-grænse for planlagte notifikationer (B4). | TC-REM-001 til TC-REM-009 | Brug entydigt `identifier = reminderId`; ryd inaktive. |
| Voice-flow regression (D1/D3). | TC-VRC-005, TC-AUT-004 | Kør `verify-voice-parser.ts` og baseline voice-tests før merge. |
| Flere brugere på samme liste (B3 konflikt). | TC-OFL-008 | Last-write-wins er acceptabelt for enejer-brug ifølge design. |

---

## 7. Exit-kriterier / build-go

Før PO-godkendelse og EAS build skal følgende være opfyldt:

| # | Kriterie | Ansvarlig |
|---|---|---|
| 1 | Alle P0-cases i denne plan er testet på fysisk iOS + Android (eller simulator hvor eksplicit tilladt). | Test Manager Agent |
| 2 | Ingen P0-case har status `Fejler` uden registreret bug og PO-accept. | Test Manager Agent |
| 3 | REG-001 Firestore-regler er verificeret deployed og testet. | Test Manager Agent |
| 4 | Cloud Functions `createProject` og `deleteProject` er testet i staging. | Test Manager Agent |
| 5 | `verify-voice-parser.ts` og baseline voice-tests består uden regression. | Developer Agent |
| 6 | TypeScript, lint og pre-test checks er grønne. | Audit Agent |
| 7 | Audit-gate gennemført før build-go. | Audit Agent |
| 8 | PO-acceptance på fysisk enhed for D3 ("Due -> Duer") og B4 (push). | PO |

---

## 8. Ændringslog

| Dato | Version | Ændring | Ansvarlig |
|---|---|---|---|
| 2026-07-15 | 1.0 | Oprettet QA-testplan for B3/B4/B8/B9/D1/D3 + REG-001 med prioriteret rækkefølge, forudsætninger og go/no-go. | Test Manager Agent |
