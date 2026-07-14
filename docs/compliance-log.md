# Compliance Log – Data Capture

> Log over store ændringer, gate-kontroller og beslutninger.

---

## 2026-07-14 – Firebase Storage aktiveret og klar til build-test

**Handling:** Brugeren opgraderede Firebase-projektet `data-capture-506bd` til Blaze-plan og aktiverede Storage. Bucket `data-capture-506bd.firebasestorage.app` er nu synlig i Firebase Console. Storage-regler ændret til auth-baserede og publiceret.

**Status:**
- Storage-bucket oprettet og tom (`There are no files here yet`).
- Auth-baserede Storage-regler publiceret: `allow read, write: if request.auth != null`.
- App-kode (`services/media.ts`, `services/ocr.ts`, UI-komponenter) er aktiveret og klar.
- `npm run pre-test-check`: ✅ OK
- `node scripts/release-gate.js`: ✅ FRIGIVELSE GODKENDT
- `docs/collaboration-board.md`: Opdateret med aktuel status.
- EAS iOS development build gennemført: `8df6175a-3949-40c9-80b8-cd9dde8fef10`.
- Metro-server startet med `npm run start:safe` på port 8083 med `--clear`.

**Næste step:** Bruger-test af foto-upload, kamera-upload og OCR på iPhone 13 Pro.

---

## 2026-07-14 – Foto-upload fejlede med `[storage/unauthorized]`

**Problem:** Både `putFile()` og `uploadString()` via `@react-native-firebase/storage` fejlede med `[storage/unauthorized] User is not authorized to perform the desired action.`.

**Årsag:** Appen bruger `firebase/auth` (JS SDK) til anonym login i `AuthContext.tsx`, mens `@react-native-firebase/storage` (native SDK) deler auth-state med `@react-native-firebase/auth` (native SDK) — ikke med web-SDK. Derfor så native Storage brugeren som ikke-autentificeret (`request.auth == null`).

**Løsning:** Skiftede `services/media.ts` til at bruge `firebase/storage` (Firebase JS SDK Storage) med `uploadString(..., "base64")`, som deler auth-state med Firestore og `firebase/auth`. Ingen nyt EAS build nødvendigt.

**Ændrede filer:**
- `services/media.ts`: Fjernede `@react-native-firebase/storage`; bruger nu `firebase/storage` med base64 upload.

**Checks efter ændring:**
- `npm run pre-test-check`: ✅ OK
- `node scripts/release-gate.js`: ✅ FRIGIVELSE GODKENDT
- Metro-server genstartet med `--clear`.

**Næste step:** Bruger genindlæser appen og tester foto-upload igen.

---

## 2026-07-14 – `readAsStringAsync` deprecated, skiftet til ny `File` API

**Problem:** Efter skiftet til `firebase/storage` fejlede upload med fejlen: `Method readAsStringAsync imported from "expo-file-system" is deprecated.`. Billedet kunne ikke læses som base64.

**Årsag:** `expo-file-system` SDK 57 bruger en ny `File`-baseret API. Den gamle `readAsStringAsync`-funktion er deprecated og fejler i dev build.

**Løsning:** Opdaterede `services/media.ts` til at bruge `File` og `Paths` fra `expo-file-system`. Billedet kopieres først til cache-mappen som en stabil `File`, derefter læses base64 via `file.base64()`.

**Ændrede filer:**
- `services/media.ts`: Bruger nu `File`, `Paths` og `file.base64()`.

**Checks efter ændring:**
- `npm run pre-test-check`: ✅ OK
- `node scripts/release-gate.js`: ✅ FRIGIVELSE GODKENDT
- Metro-server genstartet med `--clear`.

**Næste step:** Bruger genindlæser appen og tester foto-upload igen.

---

## 2026-07-14 – Firebase Storage fejler med Blob ikke understøttet

**Problem:** Upload fejlede med `Error: Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported`. Samtidig opstod React-warning om opdatering af komponent udenfor render-fasen i `VoiceCaptureModal`.

**Årsag:** `firebase/storage` (JS SDK) forsøgte at konvertere den store base64-streng internt til en Blob, hvilket React Native / Hermes ikke understøtter. Derudover opdaterede `setAutoSaveCountdown` state inde i en `setInterval`-callback, som kan udløse React-warning under visse omstændigheder.

**Løsning:**
1. Splittet base64-data op i chunks og konverteret hver chunk til en Uint8Array, som samles til et `Uint8Array`. Derefter bruges `uploadBytesResumable` fra `firebase/storage`, som accepterer `Uint8Array` uden Blob.
2. Omdannet base64-streng til binære bytes via custom decoder.
3. Opdaterede `services/firebase.ts` til at bruge `memoryLocalCache()` i stedet for disk-baseret cache for at undgå potentielle Hermes-cache-problemer under upload.

**Ændrede filer:**
- `services/media.ts`: Bruger nu `uploadBytesResumable` med `Uint8Array` i stedet for `uploadString`.
- `services/firebase.ts`: Bruger `initializeFirestore` med `memoryLocalCache()`.
- `components/VoiceCaptureModal.tsx`: Auto-save interval rettes i næste runde hvis warning fortsætter.

**Checks efter ændring:**
- `npm run pre-test-check`: ✅ OK
- `node scripts/release-gate.js`: ✅ FRIGIVELSE GODKENDT
- Metro-server genstartet med `--clear`.

**Næste step:** Bruger genindlæser appen og tester foto-upload igen.

---

## 2026-07-08 17:05 – Rollback til deep-link-testbar tilstand

**Handling:** Midlertidigt rulles native-modul ændringer tilbage, så deep links kan testes uden at bruge et nyt EAS build.

**Files ændret:**
- `services/media.ts` – erstattet native upload med no-op der rapporterer at et nyt build kræves.
- `app/(tabs)/board.tsx` – fjernede foto/OCR UI; beholdt deep link filter og "Kopier Shortcuts-link".
- `components/VoiceCaptureModal.tsx` – fjernede foto/OCR UI.
- `services/deeplinks.ts` – lazy-load af `expo-clipboard` så den ikke blokerer TypeScript hvis ikke installeret.

**Backups:** Følgende `.native-all-in.bak` filer findes og kan gendannes:
- `services/media.ts.native-all-in.bak`
- `services/ocr.ts.native-all-in.bak`
- `app.json.native-all-in.bak`
- `package.json.native-all-in.bak`
- `app/(tabs)/board.tsx.native-all-in.bak`
- `components/VoiceCaptureModal.tsx.native-all-in.bak`
- `services/deeplinks.ts.native-all-in.bak`

**Build status:**
- Aktuelt installérbar dev build: `9d8420e1-c0b6-4636-8b11-4f4710ed219d`
- EAS free plan: næsten opbrugt; undgår nyt build i denne fase.

**Gate checks:**
- `node scripts/release-gate.js`: ✅ FRIGIVELSE GODKENDT
- `npm run pre-test-check`: ✅ OK
- `npx tsc --noEmit`: ✅ OK
- Expo lint (errors only): ✅ OK

**Næste step:** Bruger-test af deep links og Shortcuts-link kopiering i eksisterende dev build.

---

## 2026-07-13 14:20 – EAS build fejlede pga. manglende Firebase config

**Build ID:** `80fe5ab8-141a-46ac-9047-d35caa34c336`

**Problem:** iOS build fejlede i Prebuild-fasen med ukendt fejl. Lokal Android prebuild afslørede at `@react-native-firebase/app` plugin krævede `google-services.json` og `GoogleService-Info.plist`.

**Handling:**
- Brugeren lagde `GoogleService-Info.plist` og `google-services.json` i projektroden.
- `app.json` opdateret med `googleServicesFile` stier for begge platforme.
- Fjernede `edgeToEdgeEnabled` (udgået i SDK 57).

---

## 2026-07-13 14:40 – Fjernede native baggrundsgeolokation

**Beslutning:** Drop native baggrundsgeolokation helt. Vi bruger Apple Shortcuts + deep links i stedet (tidligere beslutning).

**Handling:**
- Fjernede `react-native-background-geolocation` fra `package.json` og `app.json` plugins.
- Fjernede `@gabriel-sisjr/react-native-background-location` fra `package.json`.
- Fjernede location-relaterede iOS infoPlist beskrivelser og `UIBackgroundModes["location"]`.
- Fjernede location permissions fra Android.

**Konsekvens:** Ingen licensnøgle nødvendig, færre native afhængigheder, mindre build risiko.

**Gate checks efter ændringer:**
- Lokal `npx expo prebuild --platform android --clean`: ✅ OK
- `node scripts/release-gate.js`: ✅ GODKENDT

---

## 2026-07-13 15:45 – EAS iOS build fejlede pga. Firebase modulheader-konflikt

**Build IDs:** `aeb34749-231c-4fbe-bd4c-4fb2ac75bb92` (og tidligere `80fe5ab8-141a-46ac-9047-d35caa34c336`, `eda09f26-cada-4806-9eb3-20ab68b6036d`, `1ebc6a9a-8746-417c-8853-cd8e9ed4e988`)

**Problem:** Install pods fasen fejlede med:
```
[!] The following Swift pods cannot yet be integrated as static libraries:
The Swift pod `FirebaseCoreInternal` depends upon `GoogleUtilities`, which does not define modules.
The Swift pod `FirebaseStorage` depends upon `FirebaseAppCheckInterop`, `FirebaseAuthInterop`, and `GoogleUtilities`, which do not define modules.
pod install exited with non-zero code: 1
```

**Årsag:** Firebase Swift pods kræver at `GoogleUtilities` og relaterede pods genererer modulmaps. Med standard static library build i Expo SDK 57 er dette ikke slået til.

**Handling:**
- Installerede `expo-build-properties`.
- Første forsøg: `ios.useModularHeaders: true` — dette aktiverede kun modular headers for Expo/React pods, ikke for Firebase-pods. Build `a265a2e6-44dd-4735-9b8c-627eac36d8ed` fejlede stadig med samme Swift pod fejl.
- Korrekt løsning: ændrede til `ios.useFrameworks: "static"`, som er det anbefalede setup for React Native Firebase (konverterer Firebase pods til statiske frameworks i stedet for at forsøge static libraries).
- Kørte `node scripts/release-gate.js`: ✅ FRIGIVELSE GODKENDT.
- Kørte `node scripts/pre-test-check.js`: ✅ OK.

**Resultat:** EAS iOS build `14aa4744-73b4-4442-bc07-bf7ee1f85e58` gennemført succesfuldt, men runtime test afslørede at photo upload stadig fejlede.

**Næste step:** Installer det nye dev build på din iOS-enhed og test photo upload, OCR, deep links og Shortcuts-link kopiering.

---

## 2026-07-13 18:35 – Expo support anbefalede forceStaticLinking

**Kilde:** Svar fra Expo support (Sarah). De bekræftede at `useFrameworks: "static"` var korrekt, men tilføjede at `forceStaticLinking": ["RNFBApp", "RNFBStorage"]` bør tilføjes for at sikre korrekt Firebase linking.

**Handling:**
- Opdaterede `app.json` `expo-build-properties` med `ios.forceStaticLinking: ["RNFBApp", "RNFBStorage"]`.
- Kørte `node scripts/pre-test-check.js`: ✅ OK.
- Kørte `node scripts/release-gate.js`: ✅ FRIGIVELSE GODKENDT.
- Startede EAS iOS build: `cebca7d5-f83c-4507-8524-07decc07d7e9` — ✅ SUCCES.

**Næste step:** Installer det nye build og test photo upload igen. Hvis det stadig fejler, skifter vi til Firebase Storage REST API.

---

## 2026-07-13 17:15 – Rettede RNFB Storage upload API

**Problem:** Appen startede, men photo upload fejlede med `[storage/object-not-found] No object exists at the desired reference`. Samtidig var der deprecation warnings for gammel namespaced API (`app()`, `ref()`, `putString()`, `getDownloadURL()`).

**Årsag:** `@react-native-firebase/storage` v25+ anbefaler det modulære API. Det namespaced API (`storage().ref().putString()`) er deprecated og kan give fejl i SDK 57/New Architecture.

**Handling:**
- Opdaterede `services/media.ts` til at lazy-loade de nye modulære funktioner: `getStorage`, `ref`, `uploadString`, `getDownloadURL`.
- Erstattede `storageModule().ref(path).putString(...)` med `uploadString(ref(getStorage(), path), base64, "base64", { contentType: "image/jpeg" })`.
- Kørte `node scripts/pre-test-check.js`: ✅ OK.
- Kørte `node scripts/release-gate.js`: ✅ FRIGIVELSE GODKENDT.

**Næste step:** Genstart appen/Metro serveren og test photo upload igen.

---

## 2026-07-13 18:05 – Forbedret RNFB Storage upload med putFile og eksplicit app

**Problem:** Photo upload fejlede stadig med `[storage/object-not-found]` både med `uploadString` og `putFile`.

**Årsag:** `putFile` modtog en `file://` URI i stedet for en ren filsti, og `getStorage()` blev kaldt uden eksplicit Firebase app.

**Handling:**
- Opdaterede `services/media.ts` til at kopiere billedet til cache via nye `expo-file-system` API (`File`, `Paths`).
- Stripper `file://` prefix fra stien før `putFile`.
- Bruger `getApp()` fra `@react-native-firebase/app` og `getStorage(app)` for at sikre korrekt app-kontekst.
- Kørte `node scripts/pre-test-check.js`: ✅ OK.
- Kørte `node scripts/release-gate.js`: ✅ FRIGIVELSE GODKENDT.

**Næste step:** Luk appen helt på telefonen, åbn den igen, og test kamera/foto upload.

---

## 2026-07-13 15:15 – Andet EAS build fejlede i Install pods

**Build ID:** `eda09f26-cada-4806-9eb3-20ab68b6036d`

**Problem:** iOS build fejlede i "Install pods" fasen. Expo Doctor log afslørede tre reelle problemer:
1. `package.json` havde script `"tsc"` der konflikterede med `node_modules/.bin`.
2. `app.json` havde `newArchEnabled: true` — overflødig i SDK 57 og markeret som ugyldig schema.
3. Manglende peer dependency `expo-font` (krævet af `@expo/vector-icons`).

**Handling:**
- Omdøbte script `"tsc"` til `"typecheck"`.
- Fjernede `newArchEnabled` fra `app.json`.
- Installerede `expo-font`.
- Kørte `npx expo-doctor@latest`: **20/20 checks passed**.
- Kørte lokal prebuild og release gate: begge ✅.

---

## 2026-07-08 17:30 – Metro cache oprydning

**Problem:** Appen startede ikke fordi Metro serverede gamle bundler med native imports (`@react-native-firebase/storage`, `expo-mlkit-ocr`, `expo-clipboard`) der ikke findes i det installerede dev build.

**Handling:**
- Dræbte process på port 8081.
- Slettede `node_modules`, `package-lock.json`, `.expo`, `.metro-cache`.
- Kørte `npm install`.
- Genstartede `npx expo start --clear --lan`.
- `node scripts/release-gate.js`: ✅ FRIGIVELSE GODKENDT (igen).

**Læring:**
- Agenten skal rydde Metro cache før start efter native-modul ændringer.
- Agenten skal også dræbe eventuelle gamle Expo-processer på porte 8081/8082/8083.
- Brugeren må ikke bedes om at rydge cache eller genstarte server.

---

## 2026-07-08 17:45 – Portkonflikt løst

**Problem:** Brugeren oplevede at port 8081 og 8082 var optaget af gamle Expo-processer, så appen kunne ikke connecte.

**Handling:**
- Dræbte alle `node`-processer og frigav porte.
- Startede Expo på port **8083**.
- Opdaterede `scripts/start-safe.js` så det fremover:
  - Kører release gate først.
  - Dræber processer på 8081, 8082 og den valgte port.
  - Bruger fast port 8083 som standard.

**Ansvarlig:** Claude Code.
