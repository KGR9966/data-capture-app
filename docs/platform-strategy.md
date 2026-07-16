# Data Capture – Platform- og rettighedsstrategi

> Strategisk notat vedrørende Data Capture og fremtidig fælles app-platform.
> Oprettet: 2026-07-15

## 1. Data Capture-roller

| Rolle | Rettigheder |
|---|---|
| **Owner** | Alt: oprette/redigere/slette projekt, invitere, fjerne medlemmer, se alt. |
| **Admin** | Redigere projekt, invitere, slette indlæg. Ikke slette projekt eller fjerne owner. |
| **Editor** | Oprette og redigere egne indlæg, se projekt og medlemmer. |
| **Viewer** | Se projekt og indlæg. |
| **Guest** | Begrænset preview. |

## 2. Start-setup for Kim

- `kim.grandal@live.dk` = **Owner** på egne projekter.
- `kgr@trust.dk` = **Editor** på de projekter hvor den inviteres.
- Ingen global admin rolle i første omgang.

## 3. Data-model

### `projects/{projectId}`
```json
{
  "name": "Projektnavn",
  "ownerId": "<kim-uid>",
  "memberEmails": ["kim.grandal@live.dk", "kgr@trust.dk"],
  "roles": {
    "<kim-uid>": "owner",
    "<kgr-uid>": "editor"
  }
}
```

### `projects/{projectId}/members/{userId}`
```json
{
  "userId": "<kgr-uid>",
  "email": "kgr@trust.dk",
  "role": "editor"
}
```

## 4. Fælles platform-vision

Fremadrettet bygges en fælles platform:
- Fælles auth, betaling (RevenueCat), notifikationer, filer.
- Separate apps: Meet-up, CD, Data Capture, Jagt.
- Hub-app der viser hvilke apps brugeren har adgang til.
- Genbrugeligt SDK (`@kgradm/core-mobile`).

Se detaljer i hukommelse:
- `memory/data-capture-rbac-strategy.md`
- `memory/app-platform-strategy.md`
