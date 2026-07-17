# Firestore Security Rules for CHAT-001

These rules must be copied into Firebase Console under Firestore Database > Rules.
They enforce project membership, role-based write access for comments, and
validate the comment document shape.

## Full rules (append inside `service cloud.firestore { match /databases/$(database)/documents { ... }}`)

```firestore
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

function canWriteComment(projectId) {
  let project = get(/databases/$(database)/documents/projects/$(projectId));
  let uid = request.auth.uid;
  let email = request.auth.token.email;
  let role = project.data.ownerId == uid ? "owner"
      : project.data.roles[uid]
      ?? project.data.roles[email]
      ?? get(/databases/$(database)/documents/projects/$(projectId)/members/$(uid)).data.role
      ?? get(/databases/$(database)/documents/projects/$(projectId)/members/$(email)).data.role;
  return role in ["owner", "admin", "editor"];
}

function isOwnerOrAdmin(projectId) {
  let project = get(/databases/$(database)/documents/projects/$(projectId));
  let uid = request.auth.uid;
  let email = request.auth.token.email;
  let role = project.data.ownerId == uid ? "owner"
      : project.data.roles[uid]
      ?? project.data.roles[email]
      ?? get(/databases/$(database)/documents/projects/$(projectId)/members/$(uid)).data.role
      ?? get(/databases/$(database)/documents/projects/$(projectId)/members/$(email)).data.role;
  return role in ["owner", "admin"];
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
```

## Notes

- There is no composite index required for the default query
  `items/{itemId}/comments orderBy createdAt asc` because it sorts on a single
  field.
- **Rate limiting:** Client-side throttling is implemented in `app/item.tsx`:
  maximum one send click per 2 seconds and maximum 10 comments per minute per
  item (kept in memory). This reduces accidental spam but can be bypassed by a
  determined client because it is not enforced server-side.
- **Server-side rate limiting is not implemented in v1.** Firestore Security
  Rules do not support time-window counting across multiple documents without
  extra write overhead and race conditions. A robust rate limiter should be
  added later via a Cloud Function (or a dedicated rate-limit counter collection
  updated transactionally) that validates recent writes before creating the
  comment document.
- `updatedAt` is included in the create rule so the client can set it alongside
  `createdAt` using `serverTimestamp()`.
