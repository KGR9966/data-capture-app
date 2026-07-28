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
- [x] Kopiér billede fra sag (COPY-001)
- [x] Chat / kommentarer på indlæg (CHAT-001)
- [ ] Stemmeoptagelse og tale-til-tekst (udskudt pga. SDK 57-kompatibilitet)

## I gang / afventer PO-test

- [x] Installer ny iOS build på iPhone 13 / iPhone 17 / iPad med CHAT-001 + COPY-001 + ny Google Translate nøgle
- [x] Kør acceptance test: kommentarer, COPY-001, oversættelse, opret/rediger item
- [x] Registrér push-token på fysiske enheder
- [x] Modtag test-push-notifikation på fysisk enhed (iPad)
- [ ] Byg Android development build
- [ ] Installér og test B+C build på iPhone 13 / iPhone 17 / iPad

## Prioriteret backlog – næste skridt

> Anbefaling fra Master Agent, baseret på stabilitet, brugerværdi og afhængigheder.

### P1 – Stabilitet og installation (gør appen brugbar på alle enheder)
1. [x] **iPad-installation og verifikation**
2. [x] **iPhone Pro 17 installation og verifikation**
3. [x] **Test push-notifikationer på fysiske enheder**
   - Se detaljer under "Push-notifikationstest – hvad skal du gøre?" nedenfor.
4. [ ] **Byg Android development build**
5. [ ] **EAS Update konfiguration**
   - Aktiver OTA JavaScript-opdateringer via `expo-updates` + `eas update`.
   - Kræver `updates.url` + `runtimeVersion` strategi i `app.json`/`eas.json`.
   - Separat opgave efter US-004 hotfix er accepteret; ikke blandet ind nu for at holde hotfix simpelt.
   - Værdi: fremtidige små parser-/UI-rettelser kan pushes ud uden hel EAS build.
6. [ ] **Slet flere sager / bulk-slet (CLEAN-001)**
   - Mulighed for at vælge flere sager i Board og slette dem på én gang.
   - Adgang begrænses til owner/admin.
   - Bekræftelsesdialog før sletning.
   - Som midlertidig workaround kan en ad-hoc script køres i databasen efter PO-godkendelse.

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

### P2 – Samarbejde, søgning og eksekvering
8. [ ] **PO-notifikationer for governance-gates (NOTIFY-PO-001)** — proposed
   - Lokal push- eller in-app notifikation når Master Agent/QA/Audit har noget, PO skal godkende eller afklare.
   - Eksempler: plan klar til godkendelse, EAS build færdig, QA-fund kræver afklaring, audit-gate afventer godkendelse.
   - Bruger `expo-notifications` (allerede i projektet).
   - Kræver PO-godkendte eksempler på hvad/when/hvordan før kode.
   - Relateret til governance-reglerne G1–G6; designes sammen med workflow-agent roller.

9. [x] **Forbedret søgning (SEARCH-001)** — implemented
   - Præcis ordsøgning: `*vand*` finder kun hele ordet, ikke "Vandkande".
   - Frasesøgning: `"vandkande med blomster"`.
   - Negation: `vand -kande`.
   - OR-søgning: `vand OR flaske`.
   - Filtre: type, kategori, status, ansvarlig, projekt, har foto/kommentar.
   - Nylige og gemte søgninger; gemte søgninger bliver grundlag for Context Lists.
   - Fuzzy søgning (fase 2).
   - Se detaljeret case: `docs/backlog-cases/SEARCH-001-search-improvements.md`.

9. [x] **Context Lists – aktionslister fra søgning (CHECKLIST-001)** — implemented (MVP)
   - Omdan søgeresultater til navngivne, vedligeholdelige checklister med flueben.
   - Hvert listepunkt er knyttet til en reel sag; nye punkter oprettes først som sager.
   - Deduplikering, alfabetisk sortering af åbne punkter, udførte punkter i bunden.
   - Automatisk status-tilbagekobling til original sag når punktet afkrydses.
   - Deling via e-mail/SMS (native share-sheet).
   - AI: smart deduplikering, auto-gruppering, opsummering til deling (altid forslag, aldrig tvang) — fase 2.
   - Separat "Context Lists" fane med gemte, navngivne lister og dynamiske søgebaserede lister — dynamiske lister fase 2.
   - Deadlines og påmindelser; notifikationer ved nye matches undgås (for støjende).
   - Se detaljeret case: `docs/backlog-cases/CHECKLIST-001-search-action-list.md`.
   - Kreativ berigelse: `docs/backlog-cases/CHECKLIST-001-creative-enrichment.md`.

10. [ ] **Context Lists – lokationstriggere (GEOFENCE-001)** — proposed
   - Aktionslister popper op når brugeren nærmer sig et relevant sted.
   - Bruger telefonens automatisering (iOS Shortcuts / Android Tasker) + deep links.
   - Appen tracker IKKE baggrundslokation selv.
   - Wizard til opsætning af sted, radius og deep link.
   - Eksempler: indkøbsliste ved butik, aflever pakke ved posthus, hent skjorter i renseri.
   - Se detaljeret case: `docs/backlog-cases/GEOFENCE-001-location-triggered-lists.md`.

### P2 – Stemmeindtaling (forbedret)
11. [x] **Forbedret stemmeindtaling (VOICE-001)** — implemented
   - Kommandoord under indtaling: "skift" (ny linje), "punktum", "komma", "slet sidste ord", "fortryd", "gem", "annuller".
   - Post-processing: mellemrum efter tegnsætning, fjern dobbeltmellemrum, trim.
   - Redigerbart preview før gem (løser auto-save problem).
   - Fase 2: AI-korrektur og kontekstbaseret opdeling af sammensatte ord.
   - Se detaljeret case: `docs/backlog-cases/VOICE-001-voice-input-improvements.md`.

### P2.5 – US-004 hotfix restpunkter (næste pulje)
11b. [ ] **Fjern "Åben"/"åbn"-tekst fra titel/content efter kamera/album-kommando**
   - Parser/modal fjerner kommandoen, men residu kan stadig vises. Rettes så kamera/album-kommandoer forsvinder helt.
   - Oprindeligt rapporteret under US-004 hotfix test, 2026-07-28.

11c. [ ] **Board header: projektnavn vises kun delvist**
   - Mindre UI-bug. Projektnavnet i Board-header skal vises fuldt eller afkortes pænt uden at skjule knapper.
   - Relateret til tidligere header-layout justering.

11d. [ ] **Board header: "Optag" og "+ Tilføj" knapper skal være lige store**
   - Mindre UI-justering for visuel konsistens.

11e. [ ] **Tilføj-flow: auto-titel fra beskrivelse forstyrrer manuel redigering**
   - Når brugeren starter med at skrive i Beskrivelse først, genereres titlen automatisk fra første bogstav/første ord.
   - Problemet: hvis beskrivelsen er "Due", bliver titlen "D". Hvis brugeren retter titlen, synkroniseres den tilbage med beskrivelsen, så man ikke kan rette titlen uafhængigt.
   - Forventet adfærd: auto-titel må ikke overskrive en titel, som brugeren aktivt har redigeret. Titlen skal være valgfri og uafhængig af beskrivelse, når først brugeren har taget kontrol over feltet.

### P3 – Deling og eksport (øget fleksibilitet)
12. [x] **Kopiér billede fra sag (COPY-001)**
   - Mulighed for at kopiere et foto fra item-detalje til udklipsholder.
   - Mulighed for at dele et foto via native share-sheet.
   - Implementeret med `react-native-share` og `expo-clipboard` i RC `v2026.07.15-rc1`.
13. [x] **Del tekst og oversættelser fra sag**
   - Del original OCR-tekst og oversat tekst via native share-sheet eller clipboard.
   - Tilføj del-knapper i item-detail og VoiceCaptureModal.
14. [ ] **Eksport og deling af kombineret item-indhold**
   - Del item-indhold (titel, note, OCR, oversættelse, foto) samlet via native share-sheet, mail eller SMS.
   - Understøtter både tekst og medier.

### P4 – Afstemning og engagement
15. [ ] **Afstemning med genbrug fra Meetup-appen**
    - Vurder om afstemningskomponenten fra Meetup-appen kan isoleres og genbruges.
    - Afstemninger knyttet til et item eller som selvstændig funktion.
    - Resultater synlige for projektmedlemmer.

### P5 – Intelligent hjælp og administration
16. [ ] **AI-kategorisering via Firebase Functions**
17. [ ] **Management panel med filtre og statusoversigt**
18. [ ] **Eksport af data**
19. [ ] **Personlig afkrydsningsliste (samleværktøj)**

### P6 – Platform
20. [ ] **Fælles app-platform strategi** (allokeret til [[app-platform-strategy]])

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

## Teknisk gæld / forbehold fra Build 2 redesign

> Fund fra QA-gate på `fix/us004-voice-redesign`, 2026-07-15. Ikke blokerende for udviklingsbuild, men skal adresseres før endelig release.

1. **Parser: E7/E8 — clear/undo returnerer stadig tekst i parser-output.**
   - `parseVoiceInput` returnerer titel/indhold før clear/undo håndteres. End-state i UI er korrekt, men parseren er ikke selvforsynende ift. PO-eksemplerne.
   - Prioritet: medium. Rettes før næste stemme-iteration.

2. **Parser: Duplikerede tegnsætningskommandoer normaliseres ikke.**
   - “punktum punktum” bliver ikke ét punktum.
   - Prioritet: lav.

3. **Gemt-lyd (`saved.mp3`) ikke implementeret.**
   - Bruger vibration + toast som fallback. PO har accepteret dette for nu.
   - Prioritet: lav. Tilføj lydfil senere hvis ønsket.

4. **Ingen projekt-ejede parser unit-tests.**
   - Planen krævede min. 20 eksempler; tests er kørte logisk men ikke commit'et i repoet.
   - Prioritet: medium. Tilføj før næste stemme-releasen.

5. **pre-test-check warning om package-kompatibilitet.**
   - Ikke relateret til stemme-redesignet. Eksisterende teknisk gæld.
   - Prioritet: lav.

## Compliance / Noter

- **CHAT-001**: Privatlivspolitikken skal opdateres, fordi chat/kommentarer gemmer nye persondata (forfatter-id, navn, e-mail, tekst og timestamp).
- **CHAT-001**: Item-type `comment` omdøbes til `note` i hele appen. Eksisterende Firestore-dokumenter med `type: "comment"` fortsætter med at virke og vises med label "Notat".
- **CHAT-001**: Firestore Security Rules skal håndhæve projektmedlemskab og roller server-side; `viewer` må ikke oprette kommentarer.

## Relateret

- [[data-capture-test-baseline]] — afkrydset baseline-testplan med trafiklys.
- [[data-capture-rbac-strategy]] — foreslået rolle- og rettighedsmodel.
- [[app-platform-strategy]] — fælles app-platform strategi.
