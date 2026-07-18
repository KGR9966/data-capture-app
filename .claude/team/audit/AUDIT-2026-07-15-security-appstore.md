# Security / App Store Readiness Audit — Data Capture

**Dato:** 2026-07-15  
**Auditor:** Security / App Store Agent  
**Scope:** API-nøgler, Firestore-regler, PII-håndtering, app.json-tilladelser, App Store/Play Store-parathed, deep links/share flows, oversættelses-API, injectionsrisici.

---

## Resume

Appen er **ikke klar til App Store / Play Store review** og har **kritiske sikkerhedshuller** på grund af åbne Firestore-regler, en klientindlejret betalings-API-nøgle og manglende privatlivspolitik. De fleste fund kan rettes uden større arkitekturændringer, men bør afhjælpes før næste build / release.

---

## Findings (maks. 10)

### 1. HIGH — Firestore Security Rules har åben catch-all indtil 2026-08-09

- **Reference:** `docs/firestore-rules.md`, linjer 19-21.
- **Beskrivelse:** `match /{document=**} { allow read, write: if request.time < timestamp.date(2026, 8, 9); }` giver enhver autentificeret bruger fuld læse- og skriveadgang til hele databasen. CHAT-001 kommentar-reglerne er dermed overflødige i praksis.
- **Risiko:** Total dataeksponering, manipulation af projekter/items, sletning af andres data.
- **Mitigation:**
  1. Fjern catch-all-reglen øjeblikkeligt.
  2. Skriv specifikke regler for `projects`, `items`, `members` og `comments` baseret på projektmedlemskab og rolle.
  3. Opret `firestore.rules` og `firebase.json` i repoet og automatiser deploy.

---

### 2. HIGH — Google Translate API-nøgle er indlejret i app-bundle

- **Reference:** `services/translation.ts` linjer 24-48; `.env` (lokal); `.claude/team/docs/project-services-register.md`.
- **Beskrivelse:** `process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` bundtes ind i JavaScript-bundlet under EAS-build. Enhver med APK/IPA kan udtrække nøglen og misbruge Cloud Translation-kvoten.
- **Risiko:** API-kvota-tyveri, uventede omkostninger, potentiel videregivelse af OCR-tekst til tredjemand.
- **Mitigation:**
  1. Indfør stramme API-key restrictions i Google Cloud Console (bundle ID / app signing / IP-interval).
  2. Overvej omgående at flytte oversættelse til en Firebase Cloud Function eller backend proxy, så nøglen aldrig når klienten.
  3. Log og monitor API-brug for unormal aktivitet.

---

### 3. HIGH — Manglende offentlig privatlivspolitik

- **Reference:** `docs/privacy-notes.md` er intern; ingen `privacy-policy.md` eller publiceret URL findes i repoet.
- **Beskrivelse:** Appen indsamler persondata: navn, e-mail, Firebase UID, kommentarer, fotos, OCR-tekst, stemmeoptagelser (sendt til Apple/Googles genkendelsesservere), push-token og projektmedlemsdata. Både App Store Review Guidelines og Google Play kræver en privatlivspolitik for apps, der indsamler brugerdata.
- **Risiko:** App Store / Play Store afvisning, GDPR-overtrædelse, manglende brugertransparens.
- **Mitigation:**
  1. Udarbejd og publicér en privatlivspolitik på en web-URL.
  2. Angiv URL i App Store Connect og Google Play Console.
  3. Dokumentér dataformål, juridisk grundlag, retention, brugerrettigheder (sletning/indsigt) og tredjepartsbehandlere (Firebase, Google Cloud Translation, Apple Speech Recognition, Expo).

---

### 4. MEDIUM — Firebase-konfigurationsfiler med API-nøgler ligger i git

- **Reference:** `GoogleService-Info.plist` linjer 5-6; `google-services.json` linjer 16-19. Begge filer er tracked (`git ls-files`).
- **Beskrivelse:** Selvom Firebase client API-keys er offentlige i den installerede app, bør de ikke versioneres i repo. Det øger risikoen for lækage, hvis repoet senere deles, og gør det sværere at rotere nøgler.
- **Risiko:** Nøgle-lækage, repo-forurening, svært at skille miljøer.
- **Mitigation:**
  1. Tilføj `GoogleService-Info.plist` og `google-services.json` til `.gitignore`.
  2. Injicer filerne via EAS secrets / build credentials pr. miljø.
  3. Roter de eksponerede nøgler i Firebase Console, hvis repoet har været eksponeret.

---

### 5. MEDIUM — Firestore- og Storage-regler er ikke versioneret / automatiseret

- **Reference:** Ingen `firestore.rules`, `storage.rules` eller `firebase.json` i repoet; `release-readiness-2026-07-15.md` bemærker manuelt deploy og manglende smoke-test.
- **Beskrivelse:** Reglerne dokumenteres i markdown og deployes manuelt. Det giver risiko for, at produktionsregler afviger fra repoet, og gør rollback besværligt.
- **Risiko:** Driftsfejl, utilsigtede regelændringer, langsom incident response.
- **Mitigation:**
  1. Opret `firestore.rules` og `storage.rules` (eller `firebase.json`) i repoet.
  2. Tilføj CI/CD-deploy med `firebase deploy --only firestore:rules,storage`.
  3. Tilføj automatiske regel-tests (f.eks. Firebase Emulator + Jest).

---

### 6. MEDIUM — Firebase Storage-regler er brede; delte billeder bliver effectively offentlige

- **Reference:** `docs/compliance-log.md` angiver Storage-regler `allow read, write: if request.auth != null`; `services/media.ts` bruger `getDownloadURL`; `services/share.ts` deler billedet via `react-native-share`.
- **Beskrivelse:** `getDownloadURL` returnerer et token-baseret URL, der kan tilgås uden yderligere auth. Når en bruger deler et foto fra en sag, modtager alle med linket adgang til billedet, uanset projektmedlemskab.
- **Risiko:** Uautoriseret adgang til projektbilleder, dataleakage via share-kanaler.
- **Mitigation:**
  1. Stram Storage-reglerne til paths / projektmedlemskab.
  2. Overvej at generere kortlivede signed URLs via en Cloud Function i stedet for standard download URLs.
  3. Vis en advarsel i UI: “Delte links giver modtageren adgang til billedet.”

---

### 7. MEDIUM — Ingen server-side rate limiting for kommentarer

- **Reference:** `app/item.tsx` linjer 280-293 har client-side throttling; `docs/firestore-rules.md` noterer at server-side rate limiting mangler.
- **Beskrivelse:** En bruger med skriveadgang kan omgå client-throttling og oprette ubegrænset mange kommentarer, da Firestore-reglerne ikke begrænser oprettelseshastighed.
- **Risiko:** Spam, denial-of-service mod en kommentartråd, kvotaforbrug.
- **Mitigation:**
  1. Implementer rate limiting i Firestore rules via en dedikeret counter-doc (f.eks. `users/{uid}/commentRate`) eller en Cloud Function.
  2. Bevar client-side throttling som UX-forbedring, men betragt det ikke som sikkerhed.

---

### 8. MEDIUM — iOS baggrundstilstand og Android storage-tilladelser er bredere end nødvendigt

- **Reference:** `app.json` linjer 20-23 (`UIBackgroundModes: ["fetch", "remote-notification"]`), linjer 36-41 (`android.permissions` inkl. `READ_EXTERNAL_STORAGE` og `READ_MEDIA_IMAGES`).
- **Beskrivelse:** `UIBackgroundModes["fetch"]` er ikke dokumenteret brugt. Android har både den brede `READ_EXTERNAL_STORAGE` og den mere specifikke `READ_MEDIA_IMAGES`, hvilket ser unødigt bredt ud på nyere Android-versioner.
- **Risiko:** App Store / Play Store review kan kræve begrundelse eller afvise som overflødige tilladelser.
- **Mitigation:**
  1. Fjern `fetch` fra `UIBackgroundModes`, hvis det ikke bruges.
  2. Fjern `READ_EXTERNAL_STORAGE`, hvis `READ_MEDIA_IMAGES` er tilstrækkelig; ellers dokumentér behovet tydeligt.
  3. Gennemgå hver permission i App Store Connect / Play Console med en specifik begrundelse.

---

### 9. LOW — Ingen samlet iOS Privacy Manifest for appens egen dataindsamling

- **Reference:** Bibliotekerne har egne `PrivacyInfo.xcprivacy` (f.eks. `expo-file-system`, `expo-notifications`, `@react-native-async-storage/async-storage`), men appen har ingen egen manifest-fil.
- **Beskrivelse:** Apple kræver App Privacy-angivelser i App Store Connect. Selvom bibliotek-manifester dækker SDK'er, mangler der en samlet beskrivelse af Data Captures egen indsamling (foto, stemme, kommentarer, kontakter/e-mail). Dette er ikke nødvendigvis en blokker, men en review-risiko.
- **Risiko:** Forlænget review, afvisning pga. uklar privacy-erklæring.
- **Mitigation:**
  1. Udfyld App Store Connect App Privacy-sektion nøjagtigt med de indsamlede datakategorier.
  2. Overvej at tilføje en app-level `PrivacyInfo.xcprivacy` via `expo-build-properties` for egne required-reason APIs, hvis relevant.

---

### 10. LOW — Deep-link-handler er implicit og ikke eksplicit auth-valideret

- **Reference:** `app.json` linje 8 (`scheme: "datacapture"`); `services/deeplinks.ts` bygger `datacapture://item?itemId=...`; `app/_layout.tsx` bruger `expo-router` uden eksplicit link-handler.
- **Beskrivelse:** `expo-router` navigerer automatisk til `item.tsx` når et deep link modtages. Der er ingen eksplicit gate, der validerer adgang før navigation. Med de nuværende åbne Firestore-regler kan enhver autentificeret bruger teoretisk åbne ethvert item.
- **Risiko:** Information om item-eksistens kan lække gennem forskellige fejlbeskeder; åbne regler gør det aktuelt til et reelt problem.
- **Mitigation:**
  1. Efterlad deep-link-navigation til `expo-router`, men tilføj en adgangstjek i `item.tsx`, der viser en generisk “Ikke fundet”-fejl uanset årsag.
  2. Sørg for, at Firestore-reglerne er stramme (se finding 1), så uautoriserede forsøg afvises server-side.

---

## Anbefalinger på kort sigt

1. **Stop release** indtil catch-all Firestore-reglen er fjernet og `firestore.rules` er versioneret/deployet.
2. **Roter / restrikter Google Translate API-nøglen** og overvej en Cloud Function-proxy før næste production-build.
3. **Publicer en privatlivspolitik** og opdater App Store / Play Store indstillinger.
4. **Fjern Firebase-konfigurationsfilerne fra git** og flyt dem til EAS build credentials.
5. **Gennemfør en regel-smoke-test** for items/projects/comments/storage med både owner/admin/editor/viewer og ikke-medlemmer.

---

*Audit afsluttet. Ingen originale filer ændret. Ingen secrets er skrevet i output.*
