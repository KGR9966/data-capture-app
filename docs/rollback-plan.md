# Data Capture – Rollback Plan

> Dokumentation over hvordan vi ruller native moduler tilbage og frem igen.
> Sidst opdateret: 2026-07-15

---

## Baggrund

Native moduler installeret per release-kandidat `v2026.07.15-rc1`:
- `@react-native-firebase/app`
- `@react-native-firebase/auth`
- `@react-native-firebase/firestore`
- `@react-native-firebase/storage`
- `expo-mlkit-ocr`
- `expo-clipboard`
- `react-native-share` (nyt i COPY-001)
- `@gabriel-sisjr/react-native-background-location` (pt. ikke aktivt brugt)
- `react-native-background-geolocation` (pt. ikke aktivt brugt)

Når nye native moduler tilføjes (f.eks. `react-native-share`), kræves et nyt EAS build; OTA (`eas update`) er ikke tilstrækkeligt.

---

## Native-modul tilstand A: Alle native moduler installeret (til fremtidigt all-in build)

### package.json dependencies (per `v2026.07.15-rc1`)
```json
"@gabriel-sisjr/react-native-background-location": "^1.0.0",
"@react-native-firebase/app": "^25.1.0",
"@react-native-firebase/auth": "^25.1.0",
"@react-native-firebase/firestore": "^25.1.0",
"@react-native-firebase/storage": "^25.1.0",
"expo-clipboard": "~57.0.0",
"expo-mlkit-ocr": "^0.2.7",
"react-native-background-geolocation": "^5.3.0",
"react-native-share": "^12.3.1"
```

### app.json plugins (per `v2026.07.15-rc1`)
```json
"@react-native-firebase/app",
"expo-mlkit-ocr",
"react-native-background-geolocation",
["react-native-share", {}]
```

### app.json iOS infoPlist additions
```json
"NSCameraUsageDescription": "...",
"NSPhotoLibraryUsageDescription": "...",
"NSLocationWhenInUseUsageDescription": "...",
"NSLocationAlwaysAndWhenInUseUsageDescription": "...",
"NSLocationAlwaysUsageDescription": "...",
"UIBackgroundModes": ["location", "fetch", "remote-notification"]
```

### app.json android permissions
```json
"android.permission.CAMERA",
"android.permission.READ_EXTERNAL_STORAGE",
"android.permission.READ_MEDIA_IMAGES",
"android.permission.ACCESS_FINE_LOCATION",
"android.permission.ACCESS_BACKGROUND_LOCATION",
"android.permission.FOREGROUND_SERVICE",
"android.permission.FOREGROUND_SERVICE_LOCATION",
"android.permission.POST_NOTIFICATIONS"
```

---

## Native-modul tilstand B: Minimal (til test af deep links i gammel dev build)

### package.json dependencies (fjer følgende)
- `@gabriel-sisjr/react-native-background-location`
- `@react-native-firebase/app`
- `@react-native-firebase/storage`
- `expo-clipboard`
- `expo-mlkit-ocr`
- `react-native-background-geolocation`

### app.json plugins (fjer følgende)
- `@react-native-firebase/app`
- `expo-mlkit-ocr`
- `react-native-background-geolocation`

### app.json iOS infoPlist (fjer location-relaterede og kamera-relaterede entries, behold kun mikrofon/speech)

### app.json android permissions (fjer alle permissions udover eksisterende)

### Kodeændringer
- `services/media.ts`: fjern `@react-native-firebase/storage` brug; vend tilbage til standard Firebase Storage Web SDK, men med lazy load for at undgå Blob-fejl i Expo Go/dev build.
- `services/ocr.ts`: fjern eller deaktivér OCR-funktionen midlertidigt.
- Board og VoiceCaptureModal: deaktivér "Læs tekst"-knap og foto-upload knapper midlertidigt.

---

## Frem og tilbage proces

### Tilbage til tilstand B (minimal)
1. Slet native dependencies fra package.json.
2. Kør `npm install`.
3. Fjern native plugins fra app.json.
4. Ryd unødvendige permissions fra app.json.
5. Tilpas `services/media.ts`, `services/ocr.ts`, Board, VoiceCaptureModal.
6. Kør `node scripts/release-gate.js`.
7. Opdater denne plan og compliance log.

### Tilbage til tilstand A (all-in)
1. Geninstaller native dependencies med `npx expo install ...`.
2. Tilføj plugins til app.json.
3. Tilføj permissions til app.json.
4. Genaktivér foto/OCR/handlingslinks i koden.
5. Kør `node scripts/release-gate.js`.
6. Start EAS build.
7. Opdater denne plan og compliance log.

---

## Backup reference

Før hver rollback/forward, gem commit-reference eller snapshot af:
- `package.json`
- `package-lock.json`
- `app.json`
- `services/media.ts`
- `services/ocr.ts`
- Relevante komponenter
