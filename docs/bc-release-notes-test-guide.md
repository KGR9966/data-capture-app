# Data Capture – B+C preview: installationsguide, testcases og kommandoer

> Build: `v2026.07.18-rc2` (commit `f85bda8`)  
> Dato: 2026-07-18

---

## 1. Installation via QR-kode på PC

Åbn nedenstående link på din PC i en browser. EAS-siden viser en **QR-kode**, som du scanner med den enhed, der skal installere appen.

| Enhed | EAS build-side (viser QR-kode) |
|---|---|
| **iPhone / iPad** | [Åbn iOS build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/0323bbbb-bee5-4fb0-a040-2cfb4f34bf64) |
| **Android** | [Åbn Android build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/e823cf07-aa97-421e-88ed-98e86b33c70f) |

> **Tip:** Du kan også downloade filerne direkte fra PC og installere via kabel, men QR-installation er hurtigst for de 3 enheder.

### Trin-for-trin
1. Åbn linket på din PC.
2. Find QR-koden på build-siden (typisk øverst til højre på enhedssektionen).
3. På iPhone/iPad: åbn **kamera-appen**, peg på QR-koden, og følg linket. Accepter installationen.
4. På Android: brug en QR-scanner eller Chrome, og følg linket. Tillad installation fra ukendt kilde, hvis du installerer APK direkte.
5. Åbn appen og log ind.

---

## 2. Firestore Security Rules – hvor finder du dem, og hvordan deployes de?

Filen ligger i repo-roden:

```
C:\Users\kimgr\data-capture-app\firestore.rules
```

Den indeholder nu regler for:
- `projects`
- `items` (sager)
- `items/{id}/comments`
- `checklists` (nyt)
- `checklists/{id}/items` (nyt)

### Deploy-instruktion (manuel)
1. Gå til [Firebase Console](https://console.firebase.google.com/).
2. Vælg projektet **data-capture-app**.
3. Vælg **Firestore Database** → fanebladet **Rules**.
4. Kopier hele indholdet fra `firestore.rules` (se nedenfor) ind i tekstfeltet.
5. Tryk **Publish**.

> **Vigtigt:** Uden dette skridt kan Context Lists (lister) ikke oprette eller opdatere punkter i Firestore. Sager og kommentarer påvirkes ikke, hvis de gamle regler allerede var deployet.

### Aktuelt regelsæt (til copy/paste)

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function getUserId() {
      return request.auth.uid;
    }

    match /projects/{projectId} {
      allow read: if isAuthenticated()
                   && (resource.data.ownerId == getUserId()
                       || getUserId() in resource.data.members
                       || getUserId() in resource.data.roles);

      allow create: if isAuthenticated() && request.resource.data.ownerId == getUserId();

      allow update: if isAuthenticated()
                     && (resource.data.ownerId == getUserId()
                         || (getUserId() in resource.data.roles
                             && request.resource.data.roles.get(getUserId(), null) in ["owner", "admin"]));

      allow delete: if isAuthenticated() && resource.data.ownerId == getUserId();
    }

    match /items/{itemId} {
      allow read: if isAuthenticated()
                   && exists(/databases/$(database)/documents/projects/$(resource.data.projectId))
                   && (get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.ownerId == getUserId()
                       || getUserId() in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.members
                       || getUserId() in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.roles);

      allow create: if isAuthenticated()
                     && request.resource.data.keys().hasAll(["projectId", "createdBy"])
                     && exists(/databases/$(database)/documents/projects/$(request.resource.data.projectId))
                     && (get(/databases/$(database)/documents/projects/$(request.resource.data.projectId)).data.ownerId == getUserId()
                         || (getUserId() in get(/databases/$(database)/documents/projects/$(request.resource.data.projectId)).data.roles
                             && ["owner", "admin", "editor"].hasAny([get(/databases/$(database)/documents/projects/$(request.resource.data.projectId)).data.roles.get(getUserId(), null)])));

      allow update: if isAuthenticated()
                     && exists(/databases/$(database)/documents/projects/$(resource.data.projectId))
                     && (get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.ownerId == getUserId()
                         || (getUserId() in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.roles
                             && ["owner", "admin", "editor"].hasAny([get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.roles.get(getUserId(), null)]))
                         || (resource.data.assignedTo == getUserId()
                             && getUserId() in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.roles
                             && get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.roles.get(getUserId(), null) == "editor"));

      allow delete: if isAuthenticated()
                     && exists(/databases/$(database)/documents/projects/$(resource.data.projectId))
                     && (get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.ownerId == getUserId()
                         || (getUserId() in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.roles
                             && ["owner", "admin"].hasAny([get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.roles.get(getUserId(), null)])));
    }

    match /items/{itemId}/comments/{commentId} {
      allow read: if isAuthenticated()
                   && exists(/databases/$(database)/documents/items/$(itemId))
                   && exists(/databases/$(database)/documents/projects/$(get(/databases/$(database)/documents/items/$(itemId)).data.projectId))
                   && (get(/databases/$(database)/documents/projects/$(get(/databases/$(database)/documents/items/$(itemId)).data.projectId)).data.ownerId == getUserId()
                       || getUserId() in get(/databases/$(database)/documents/projects/$(get(/databases/$(database)/documents/items/$(itemId)).data.projectId)).data.members
                       || getUserId() in get(/databases/$(database)/documents/projects/$(get(/databases/$(database)/documents/items/$(itemId)).data.projectId)).data.roles);

      allow create: if isAuthenticated()
                     && request.resource.data.keys().hasAll(["projectId", "itemId", "text"])
                     && exists(/databases/$(database)/documents/projects/$(request.resource.data.projectId))
                     && (get(/databases/$(database)/documents/projects/$(request.resource.data.projectId)).data.ownerId == getUserId()
                         || (getUserId() in get(/databases/$(database)/documents/projects/$(request.resource.data.projectId)).data.roles
                             && ["owner", "admin", "editor"].hasAny([get(/databases/$(database)/documents/projects/$(request.resource.data.projectId)).data.roles.get(getUserId(), null)])));

      allow update, delete: if isAuthenticated()
                             && exists(/databases/$(database)/documents/items/$(itemId))
                             && (resource.data.authorId == getUserId()
                                 || (get(/databases/$(database)/documents/projects/$(get(/databases/$(database)/documents/items/$(itemId)).data.projectId)).data.ownerId == getUserId())
                                 || (getUserId() in get(/databases/$(database)/documents/projects/$(get(/databases/$(database)/documents/items/$(itemId)).data.projectId)).data.roles
                                     && ["owner", "admin"].hasAny([get(/databases/$(database)/documents/projects/$(get(/databases/$(database)/documents/items/$(itemId)).data.projectId)).data.roles.get(getUserId(), null)])));
    }

    match /checklists/{checklistId} {
      allow read: if isAuthenticated()
                   && (resource.data.ownerId == getUserId()
                       || getUserId() in resource.data.sharedWith);

      allow create: if isAuthenticated()
                     && request.resource.data.keys().hasAll(["name", "ownerId"])
                     && request.resource.data.ownerId == getUserId();

      allow update: if isAuthenticated()
                     && (resource.data.ownerId == getUserId()
                         || (getUserId() in resource.data.sharedWith
                             && resource.data.sharedWith.get(getUserId(), null) in ["owner", "admin", "editor"]));

      allow delete: if isAuthenticated()
                     && resource.data.ownerId == getUserId();
    }

    match /checklists/{checklistId}/items/{itemId} {
      allow read: if isAuthenticated()
                   && exists(/databases/$(database)/documents/checklists/$(checklistId))
                   && (get(/databases/$(database)/documents/checklists/$(checklistId)).data.ownerId == getUserId()
                       || getUserId() in get(/databases/$(database)/documents/checklists/$(checklistId)).data.sharedWith);

      allow create: if isAuthenticated()
                     && exists(/databases/$(database)/documents/checklists/$(checklistId))
                     && (get(/databases/$(database)/documents/checklists/$(checklistId)).data.ownerId == getUserId()
                         || (getUserId() in get(/databases/$(database)/documents/checklists/$(checklistId)).data.sharedWith
                             && get(/databases/$(database)/documents/checklists/$(checklistId)).data.sharedWith.get(getUserId(), null) in ["owner", "admin", "editor"]));

      allow update, delete: if isAuthenticated()
                             && exists(/databases/$(database)/documents/checklists/$(checklistId))
                             && (get(/databases/$(database)/documents/checklists/$(checklistId)).data.ownerId == getUserId()
                                 || (getUserId() in get(/databases/$(database)/documents/checklists/$(checklistId)).data.sharedWith
                                     && get(/databases/$(database)/documents/checklists/$(checklistId)).data.sharedWith.get(getUserId(), null) in ["owner", "admin", "editor"]));
    }
  }
}
```

---

## 3. Testcases for B+C

### B1 – Del tekst og oversættelser

| # | Handling | Forventet resultat |
|---|---|---|
| B1.1 | Åbn en sag med tekst. Tryk **Del tekst** / **Kopiér tekst** øverst ved teksten. | Native share-sheet vises / tekst kopieres til udklipsholder. |
| B1.2 | Åbn en sag med oversat tekst. Tryk **Del oversættelse** / **Kopiér oversættelse**. | Oversættelsen deles/kopieres. |
| B1.3 | Åbn VoiceCaptureModal, optag noget og tryk **Del** ved originalteksten. | Original OCR-tekst sendes til share-sheet. |
| B1.4 | I VoiceCaptureModal, tryk **Del** ved oversættelsen (hvis oversat). | Oversættelsen sendes til share-sheet. |

### B2 – Avanceret søgning

| # | Søgning | Forventet resultat |
|---|---|---|
| B2.1 | Søg på `*vand*` | Finder kun sager, der indeholder hele ordet `vand` (ikke f.eks. `vandret`). |
| B2.2 | Søg på `"rør i kælderen"` | Finder nøjagtig sætning. |
| B2.3 | Søg på `vand -kælder` | Finder sager med `vand`, men uden ordet `kælder`. |
| B2.4 | Søg på `vand OR el` | Finder sager, der indeholder `vand` **eller** `el`. |
| B2.5 | Søg på `type:note` | Kun sager med `type === "note"`. |
| B2.6 | Søg på `kategori:skade` | Kun sager med kategori `skade`. |
| B2.7 | Søg på `status:open` / `status:done` | Kun sager med den angivne status. |
| B2.8 | Søg på `ansvarlig:kim@example.com` | Kun sager tildelt den e-mail/bruger. |
| B2.9 | Søg på `has:photo` | Kun sager med ét eller flere billeder. |

### B3 – Stemmekommandoer

| # | Kommando | Resultat |
|---|---|---|
| B3.1 | Sig **"punktum"** | Indsætter `.` (punktum). |
| B3.2 | Sig **"komma"** | Indsætter `,`. |
| B3.3 | Sig **"ny linje"** eller **"skift linje"** | Indsætter linjeskift (`\n`). |
| B3.4 | Sig **"slet sidste ord"** | Fjerner det sidste ord i preview. |
| B3.5 | Sig **"fortryd"** | Ruller den sidste ændring tilbage (slet sidste ord). |
| B3.6 | Sig **"gem"** eller **"opret"** | Gemmer sagen. |
| B3.7 | Sig **"annuller"** eller **"afbryd"** | Lukker VoiceCaptureModal uden at gemme. |
| B3.8 | Rediger teksten i preview manuelt | Teksten kan rettes, før der trykkes **Gem**. |

### C – Context Lists MVP

| # | Handling | Forventet resultat |
|---|---|---|
| C.1 | Gå til **Søg**-fanen, lav en søgning, tryk **Opret aktionsliste**. | En ny liste oprettes med søgeresultaterne. |
| C.2 | Gå til **Lister**-fanen. | Listen vises med åbne punkter øverst (alfabetisk). |
| C.3 | Åbn listen. | Punkterne vises sorteret; færdige samles nederst. |
| C.4 | Sæt flueben ved et punkt. | Punktet markeres færdigt, og **kildesagens status** ændres automatisk til `done`. |
| C.5 | Tryk **Del liste** / **Del tekst**. | Listen deles som tekst via native share-sheet. |
| C.6 | Tryk på et punkt, der har en kilde-sag. | Appen navigerer til sagens detaljeside. |

---

## 4. Stemmekommando-guide

Når du taler til VoiceCapture, behandles følgende danske ord **før** teksten sendes videre. Du kan sige dem midt i en sætning.

| Ord du siger | Resultat i teksten | Bemærkning |
|---|---|---|
| `punktum` | `.` | |
| `komma` | `,` | |
| `ny linje`, `skift linje`, `linjeskift` | linjeskift | |
| `slet sidste ord` | fjerner sidste ord | Kan siges flere gange. |
| `fortryd` | gendanner sidste ord | Kun én niveau. |
| `gem`, `opret` | gemmer sagen | Stopper optagelsen. |
| `annuller`, `afbryd`, `fortryd alt` | kasserer optagelsen | Lukker uden at gemme. |

> **Eksempel:**  
> *"Der er vand i kælderen punktum vi skal have fat i en håndværder komma så hurtigt som muligt ny linje ingen billeder endnu"*  
> Bliver til:  
> `Der er vand i kælderen. vi skal have fat i en håndværder, så hurtigt som muligt  
> ingen billeder endnu`

---

## 5. Søgeguide

Søgningen er client-side (søger i de allerede hentede sager), så store projekter kan være langsomme. Understøttet syntaks:

| Mønster | Betydning | Eksempel |
|---|---|---|
| `*ord*` | Hele ord (substring) | `*vand*` finder `vand`, ikke `vandret`. |
| `"frase"` | Nøjagtig sætning | `"rør i kælderen"` |
| `-ord` | Ekskluder ord | `vand -kælder` |
| `A OR B` | Én af termerne | `vand OR el` |
| `type:værdi` | Filtrer på type | `type:note`, `type:defect` |
| `kategori:værdi` / `category:værdi` | Filtrer på kategori | `kategori:skade` |
| `status:værdi` | Filtrer på status | `status:open`, `status:done` |
| `ansvarlig:værdi` / `assignee:værdi` | Filtrer på tildelt | `ansvarlig:kim@example.com` |
| `projekt:værdi` / `project:værdi` | Filtrer på projekt | `projekt:byggeplads-a` |
| `has:photo` | Kun sager med billede | `has:photo` |

> **Tip:** Kombiner filtre og fri tekst: `status:open vand -kælder`.
