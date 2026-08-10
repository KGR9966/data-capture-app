# Data Capture – opsætning og kørsel

## 1. Installer afhængigheder

```bash
cd C:\Users\kimgr\data-capture-app
npm install --legacy-peer-deps
```

## 2. Konfigurer Firebase

1. Gå til [Firebase Console](https://console.firebase.google.com/).
2. Vælg det projekt du vil bruge, eller opret et nyt projekt til Data Capture.
3. Tilføj iOS-app med bundle-id: `com.kgradm.datacapture`.
4. Tilføj Android-app med package: `com.kgradm.datacapture`.
5. Kopier `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` og `appId`.
6. Opret filen `.env` i projektroden ud fra `.env.example` og indsæt værdierne.

Eksempel (erstat `your_*` værdierne med dine egne Firebase-projektindstillinger):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 3. Firestore regler (test)

Under udvikling kan du bruge disse åbne regler. Skift til strammere regler før produktion.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 4. Kør lokalt med dev client

```bash
npx expo start --dev-client --lan -c
```

Brug QR-koden i Expo Go eller den installerede development build.

## 5. Byg development build

### iOS (til fysiske enheder)

```bash
npx eas build --platform ios --profile development
```

### Android

```bash
npx eas build --platform android --profile development
```

Builds distribueres internt via EAS og kan installeres med det link du modtager.

## 6. Push-notifikationer

Push-notifikationer kræver:
- Gyldig Expo push-token (registreres automatisk på settings-skærmen).
- Firebase Cloud Messaging for Android.
- Apple Push Notification service (APNs) certifikat for iOS.

På settings-skærmen kan du trykke "Registrer push" for at hente og vise enhedens token.
