# Data Capture – Firebase opsætning

## Firestore regler (testmiljø)

Gå til Firebase Console → Firestore Database → Rules. Indsæt følgende:

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

Tryk **Publish**.

## Firebase Storage regler (testmiljø)

Gå til Firebase Console → Storage → Rules. Indsæt følgende:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Tryk **Publish**.

> Bemærk: Disse regler er åbne og kun til test. Før produktion skal de strammes op, så brugere kun kan læse/skrive deres egne projekters data.

## Authentication

1. Gå til Authentication → Sign-in method.
2. Aktiver **Anonymous**.
3. (Valgfrit) Aktiver Email/Password hvis du vil have permanente konti senere.
