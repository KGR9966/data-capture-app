# Data Capture – backlog

## Gennemført

- [x] Opret Expo-projekt med SDK 57
- [x] Konfigurer app.json med bundle identifiers og EAS project
- [x] Installer Firebase, expo-router, expo-notifications, expo-speech-recognition
- [x] Firebase service med AsyncStorage persistence
- [x] AuthContext med anonym login og husket session
- [x] ThemeContext med lyst/mørkt tema
- [x] ProjectContext til aktivt projekt
- [x] Velkomstskærm med navn
- [x] Tab-navigation: Projekter, Board, Søg, Indstillinger
- [x] Projekter-skærm med opret/liste
- [x] Board-skærm med opret indlæg (idé, observation, bug, kommentar)
- [x] Søgning på tværs af projekter
- [x] Indstillinger med brugerinfo, tema og push-token
- [x] Detail-skærm for indlæg med slet
- [x] Kategori-forslag baseret på indhold
- [x] EAS development build konfiguration (eas.json)
- [x] Byg iOS development build
- [x] Test Data Capture på iPhone 13 Pro
- [x] Unikt app-ikon og splash screen
- [x] Billedupload i indlæg
- [x] Inviter medlemmer til projekter via email
- [x] Stemmeoptagelse med auto-stop og kategori-prefix
- [x] Vilkårligt kategori-prefix via stemme (f.eks. "Indkøb. Husk mælk.")
- [x] Metadata på indlæg: hvem og hvornår
- [x] Multi-word søgning med bindestreg/mellemrum
- [x] Voice-input til søgning
- [x] Email-validering ved invitation af medlemmer
- [x] Oversigt over invitationer per projekt
- [x] Foto-markering i søgeresultater
- [x] Fjern foto fra sag
- [x] Arkiv-fane på Board
- [x] OCR-læsning af tekst fra foto
- [x] Oversættelse af OCR-tekst med sprogvalg
- [x] OCR-oversættelse i Optag-modalen (VoiceCaptureModal)
- [x] Annuller i + Tilføj nulstiller formen (undgår uønsket gemt sag)
- [x] Kopiér-knap til original og oversat OCR-tekst
- [x] Visuel feedback på Kopiér-knapper ("Kopieret!" i 1,5 sek.)
- [x] Rolle- og rettighedsmodel (RBAC): owner/admin/editor/viewer
- [x] Projektmedlemskab med rolle ved invitation og rolleændring
- [x] Ansvarlige for sager (assignedTo / assignedToName) i Board, item-detalje og Optag-modal
- [x] Vis ansvarlig i søgeresultater
- [x] Forbedret visning af medlemmer i medlemsmodal (email på flere linjer, ejer vises korrekt)
- [ ] Stemmeoptagelse og tale-til-tekst (udskudt pga. SDK 57-kompatibilitet)

## I gang / afventer PO-test

- [ ] Installer ny iOS build på iPhone 13 Pro med stemme/ikon/billede/medlemmer
- [x] Installer på iPad
- [x] Installer på iPhone Pro 17
- [x] Registrér push-token på fysiske enheder
- [x] Modtag test-push-notifikation på fysisk enhed (iPad)
- [ ] Byg Android development build

## Prioriteret backlog – næste skridt

> Anbefaling fra Master Agent, baseret på stabilitet, brugerværdi og afhængigheder.

### P1 – Stabilitet og installation (gør appen brugbar på alle enheder)
1. [ ] **iPad-installation og verifikation**
   - Åben opgave: Safari/dev-link eller EAS build installeres på iPad.
   - Blokeret af: usikkerhed om dev-link eller build-problem på iPad.
2. [ ] **iPhone Pro 17 installation og verifikation**
3. [ ] **Test push-notifikationer på fysiske enheder**
   - Se detaljer under "Push-notifikationstest – hvad skal du gøre?" nedenfor.
4. [ ] **Byg Android development build**

### P2 – Samarbejde og ansvarlighed (høj brugerværdi for dig som owner + kgr@trust.dk som editor)
5. [x] **Rolle- og rettighedsmodel (RBAC)**
   - Owner/admin/editor/viewer.
   - Firestore `roles` map + sikkerhedsregler.
   - UI der skjuler/forkorter handlinger efter rolle.
6. [x] **Ansvarlige for sager**
   - Tildel en ansvarlig til hvert item.
   - Vis ansvarlig i Board-liste og item-detalje.
   - (Filtrer Board på "Mine sager" – udskudt til Phase 2.)
7. [x] **Chat / kommentarer på indlæg (CHAT-001)**
   - Kommentar-tråd under hvert item.
   - Understøtter 2 eller flere deltagere.
   - Notifikation ved nye kommentarer (udskudt; data-model forberedes).
   - Omdøb item-type `comment` → `note` i hele appen; legacy `type: "comment"` vises som "Notat".
   - Rettelser: kommentar-afsendelse og "Ingen ansvarlig" redigering virker i RC `v2026.07.15-rc1`.

### P3 – Afstemning og engagement
8. [ ] **Afstemning med genbrug fra Meetup-appen**
   - Vurder om afstemningskomponenten fra Meetup-appen kan isoleres og genbruges.
   - Afstemninger knyttet til et item eller som selvstændig funktion.
   - Resultater synlige for projektmedlemmer.

### P2 – Samarbejde og eksekvering (ny)
8. [ ] **Context Lists – aktionslister fra søgning (CHECKLIST-001)** — proposed
   - Omdan søgeresultater til navngivne, vedligeholdelige checklister med flueben.
   - Hvert listepunkt er knyttet til en reel sag; nye punkter oprettes først som sager.
   - Deduplikering, alfabetisk sortering af åbne punkter, udførte punkter i bunden.
   - Automatisk status-tilbagekobling til original sag når punktet afkrydses.
   - Deling via e-mail/SMS (native share-sheet).
   - AI: smart deduplikering, auto-gruppering, opsummering til deling (altid forslag, aldrig tvang).
   - Separat "Context Lists" fane med gemte, navngivne lister og dynamiske søgebaserede lister.
   - Deadlines og påmindelser; notifikationer ved nye matches undgås (for støjende).
   - Se detaljeret case: `docs/backlog-cases/CHECKLIST-001-search-action-list.md`.
   - Kreativ berigelse: `docs/backlog-cases/CHECKLIST-001-creative-enrichment.md`.

9. [ ] **Context Lists – lokationstriggere (GEOFENCE-001)** — proposed
   - Aktionslister popper op når brugeren nærmer sig et relevant sted.
   - Bruger telefonens automatisering (iOS Shortcuts / Android Tasker) + deep links.
   - Appen tracker IKKE baggrundslokation selv.
   - Wizard til opsætning af sted, radius og deep link.
   - Eksempler: indkøbsliste ved butik, aflever pakke ved posthus, hent skjorter i renseri.
   - Se detaljeret case: `docs/backlog-cases/GEOFENCE-001-location-triggered-lists.md`.

### P3 – Deling og eksport (øget fleksibilitet)
8. [x] **Kopiér billede fra sag (COPY-001)**
   - Mulighed for at kopiere et foto fra item-detalje til udklipsholder.
   - Mulighed for at dele et foto via native share-sheet.
   - Implementeret med `react-native-share` og `expo-clipboard` i RC `v2026.07.15-rc1`.
9. [ ] **Eksport og deling af tekst, oversættelser og billeder**
   - Del item-indhold, OCR-tekst, oversættelser og fotos via native share-sheet, mail eller SMS.
   - Understøtter både tekst og medier.

### P4 – Afstemning og engagement
10. [ ] **Afstemning med genbrug fra Meetup-appen**
    - Vurder om afstemningskomponenten fra Meetup-appen kan isoleres og genbruges.
    - Afstemninger knyttet til et item eller som selvstændig funktion.
    - Resultater synlige for projektmedlemmer.

### P5 – Intelligent hjælp og administration
11. [ ] **AI-kategorisering via Firebase Functions**
12. [ ] **Management panel med filtre og statusoversigt**
13. [ ] **Eksport af data**
14. [ ] **Personlig afkrydsningsliste (samleværktøj)**

### P6 – Platform
15. [ ] **Fælles app-platform strategi** (allokeret til [[app-platform-strategy]])

## Push-notifikationstest – hvad skal du gøde?

Testen går ud på at verificere, at appen kan registrere et Expo push-token og modtage notifikationer på fysisk enhed.

### Testtrin
1. Åbn appen på din iPhone.
2. Gå til **Indstillinger**.
3. Tryk på knappen **"Registrer push"** (eller tilsvarende).
4. Accepter tilladelsesdialogen, når iOS spørger om notifikationer.
5. Et Expo push-token skulle nu vises på skærmen.

### Forventet resultat
- Et langt token-streng vises (f.eks. `ExponentPushToken[...]`).
- Ingen rød fejlmeddelelse.

### Næste niveau (valgfrit nu)
- Send en test-push via Expo Push API eller Expo Notifications tool for at bekræfte, at notifikationen dukker op på låseskærmen.

### Bemærkning
- Push-notifikationer virker **ikke** i simulator.
- Kræver netværk og at appen kører i en development build (ikke Expo Go).

## Compliance / Noter

- **CHAT-001**: Privatlivspolitikken skal opdateres, fordi chat/kommentarer gemmer nye persondata (forfatter-id, navn, e-mail, tekst og timestamp).
- **CHAT-001**: Item-type `comment` omdøbes til `note` i hele appen. Eksisterende Firestore-dokumenter med `type: "comment"` fortsætter med at virke og vises med label "Notat".
- **CHAT-001**: Firestore Security Rules skal håndhæve projektmedlemskab og roller server-side; `viewer` må ikke oprette kommentarer.

## Relateret

- [[data-capture-test-baseline]] — afkrydset baseline-testplan med trafiklys.
- [[data-capture-rbac-strategy]] — foreslået rolle- og rettighedsmodel.
- [[app-platform-strategy]] — fælles app-platform strategi.
