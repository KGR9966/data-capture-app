# Firestore Security Rules for Data Capture

**Advarsel:** Disse regler erstatter ALLE eksisterende regler i Firebase Console.
Sørg for at læse hele filen igennem før deploy, og test grundigt efterfølgende.

## Full rules (replace the entire content of the Firebase Console Rules tab)

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // TIDLIGERE REGEL: Åben adgang indtil 2026-08-09.
    // Bemærk: Denne regel giver fortsat læse- og skriveadgang til HELE databasen
    // indtil denne dato. CHAT-001 reglerne nedenfor tilføjer specifik sikkerhed
    // for kommentarer, men den generelle åbne regel trumfer indtil videre.
    // PLAN: Efterhånden som RBAC og item/itemMember-regler skrives, skal denne
    // catch-all regel fjernes og erstattes af specifikke regler per collection.
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 8, 9);
    }

    // --- CHAT-001: Kommentarer på items ---

    function isSignedIn() {
      return request.auth != null;
    }

    function getProjectId(itemId) {
      return get(/databases/$(database)/documents/items/$(itemId)).data.projectId;
    }

    function isProjectMember(projectId) {
      let project = get(/databases/$(database)/documents/projects/$(projectId));
      let uid = request.auth.uid;
      let email = request.auth.token.email;

      return project.data.ownerId == uid
          || exists(/databases/$(database)/documents/projects/$(projectId)/members/$(uid))
          || exists(/databases/$(database)/documents/projects/$(projectId)/members/$(email))
          || project.data.roles[uid] != null
          || project.data.roles[email] != null;
    }

    function getUserRole(projectId) {
      let project = get(/databases/$(database)/documents/projects/$(projectId));
      let uid = request.auth.uid;
      let email = request.auth.token.email;

      return project.data.ownerId == uid ? "owner"
          : project.data.roles[uid] != null ? project.data.roles[uid]
          : project.data.roles[email] != null ? project.data.roles[email]
          : exists(/databases/$(database)/documents/projects/$(projectId)/members/$(uid)) ? get(/databases/$(database)/documents/projects/$(projectId)/members/$(uid)).data.role
          : exists(/databases/$(database)/documents/projects/$(projectId)/members/$(email)) ? get(/databases/$(database)/documents/projects/$(projectId)/members/$(email)).data.role
          : null;
    }

    function canWriteComment(projectId) {
      return getUserRole(projectId) in ["owner", "admin", "editor"];
    }

    function isOwnerOrAdmin(projectId) {
      return getUserRole(projectId) in ["owner", "admin"];
    }

    match /items/{itemId}/comments/{commentId} {
      allow read: if isSignedIn()
          && isProjectMember(getProjectId(itemId));

      allow create: if isSignedIn()
          && canWriteComment(getProjectId(itemId))
          && exists(/databases/$(database)/documents/items/$(itemId))
          && request.resource.data.projectId == getProjectId(itemId)
          && request.resource.data.itemId == itemId
          && request.resource.data.authorId == request.auth.uid
          && request.resource.data.text is string
          && request.resource.data.text.size() > 0
          && request.resource.data.text.size() <= 2000
          && request.resource.data.createdAt == request.time
          && request.resource.data.updatedAt == request.time;

      allow delete: if isSignedIn()
          && isProjectMember(getProjectId(itemId))
          && (
              request.auth.uid == resource.data.authorId
              || isOwnerOrAdmin(getProjectId(itemId))
          );

      allow update: if false;
    }
  }
}
```

## Bemærkninger

- **Catch-all reglen** (`match /{document=**}`) giver fortsat fuld læse- og skriveadgang
  indtil 2026-08-09. Det betyder, at CHAT-001 kommentar-reglerne ikke i praksis
  begrænser adgang yderligere end den allerede åbne regel. De er dog klar til,
  når catch-all reglen senere fjernes.
- Der er ingen composite index påkrævet for `items/{itemId}/comments` sorteret efter
  `createdAt`, da der sorteres på ét felt.
- **Rate limiting:** Kun client-side throttling i appen. Server-side rate limiting
  kræver Cloud Function eller dedikeret counter collection.
- **Data retention:** Kommentarer slettes kaskade sammen med item i app-koden.
