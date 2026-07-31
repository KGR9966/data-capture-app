# B8 / US-006: Tomt projektnavn + server-side forhindring af projektdubletter

**Status:** Klar til PO-godkendelse.
**Bidragydere:** Solution Design Agent.
**Scope:** Bugfix for tomt/whitespace-projektnavn og robust server-side validering, så fremtidige dubletter forhindres for den aktuelle bruger. Eksisterende dubletter lades være (PO-aftale).

---

## 1. Scope

### 1.1 Tomt projektnavn
- Client-side trim og minimumslængde (min 1 ikke-whitespace karakter).
- Server-side afvisning af tomt/whitespace-only navn.
- UI-fejlbesked: **"Projektnavn må ikke være tomt"**.

### 1.2 Dubletter
- Forhindre fremtidige projektdubletter **for den aktuelle brugers egne projekter** (`ownerId`).
- Eksisterende dubletter lades være (PO-aftale) — de påvirker ikke nye oprettelser, men man kan ikke oprette endnu et projekt med et navn, hvor brugeren allerede ejer ét eller flere.
- Scope er **kun ejerens egne projekter** — et projekt med samme navn ejet af en anden må gerne oprettes.
- Sammenligning: trimmet, case-insensitiv.

---

## 2. Root cause for tomt-navn bug

Kode analyseret i:
- `services/projects.ts` (`createProject`, linje 55–94)
- `app/(tabs)/index.tsx` (`handleCreateProject`, linje 110–141)

### Fundne huller

1. **Ingen server-side navnevalidering i `createProject`.**
   `createProject` accepterer `name` som givet og skriver det direkte til Firestore. Der trimmes ikke og valideres ikke tomt navn.

2. **UI-guard kan omgås / er inkonsistent.**
   - Knappen disables ved `!newProjectName.trim()`, hvilket blokerer en ren `""`-submit.
   - Men `handleCreateProject` returnerer stille ved `!newProjectName.trim()` uden at vise en fejlbesked, så brugeren får ingen forklaring, hvis feltet af en eller anden grund bliver tomt (state, race, copy-paste, test).
   - Der er ingen minimumslængde-check eller whitespace-only check.

3. **Firestore rules tillader tomt `name`.**
   Nuværende `firestore.rules` (linje 63):
   ```
   allow create: if isAuthenticated() && request.resource.data.ownerId == getUserId();
   ```
   Reglen validerer ikke `name`, så et projekt med `name = ""` eller `name = "   "` accepteres.

4. **`updateProject` validerer heller ikke navn.**
   Hvis UI senere tilbyder omdøb, kan tomt navn også indsættes via update.

5. **Bemærkning til den oprindelige B+C "falske fejlmeddelelse":**
   Den tidligere fejlmeddelelse "Kunne ikke oprette projektet" er allerede håndteret i `app/(tabs)/index.tsx` ved at sætte aktivt projekt og lukke modalen efter vellykket `createProject`. Den nuværende kode viser korrekt fejl kun, hvis `createProject` kaster.

---

## 3. Brugerflow

### 3.1 Opret projekt med tomt navn

1. Bruger åbner "Nyt projekt"-dialogen.
2. Bruger indtaster kun mellemrum eller sletter navnet.
3. Bruger trykker **Opret** (hvis knappen er enabled) eller returnerer.
4. Appen validerer client-side: viser **"Projektnavn må ikke være tomt"** under navnefeltet.
5. Hvis client-side guard på en eller anden måde omgås, afviser Cloud Function / server-logik oprettelsen med samme besked.
6. Ingen projekt oprettes i Firestore.

### 3.2 Opret projekt med navn der allerede findes

1. Bruger indtaster "Renovering" i navnefeltet.
2. Brugeren ejer allerede et projekt ved navn "Renovering" (eller "  renovering  ", "RENovering").
3. Bruger trykker **Opret**.
4. Client-side duplicate-tjek (eller server-svar) viser **"Der findes allerede et projekt med dette navn."**
5. Oprettelsen blokeres; intet nyt projekt skrives.

---

## 4. Teknisk løsning

### 4.1 Client-side validering

Fil: `app/(tabs)/index.tsx` i `handleCreateProject`.

```typescript
const MIN_PROJECT_NAME_LENGTH = 1;

const validateProjectName = (name: string): string | null => {
  const trimmed = name.trim();
  if (trimmed.length < MIN_PROJECT_NAME_LENGTH) {
    return "Projektnavn må ikke være tomt";
  }
  return null;
};
```

Ændringer:
1. Erstat den nuværende tidlige guard med en eksplicit validering, der sætter `createError`.
2. Vis fejlbesked inline under navnefeltet (allerede understøttet af `createError`).
3. Bevar `disabled={creating || !!validationError}` på knappen.
4. Bevar det eksisterende `isDuplicateProjectName(trimmedName, ownedProjects)` tjek som første forsvarslinje.

### 4.2 Server-side validering — valgt tilgang

**Tilgang: Cloud Function `createProject`** (callable HTTPS function) der overtager projektoprettelse.

Begrundelse:
- Firestore rules kan ikke lave unikhedstjek på tværs af dokumenter; de kan kun validere det aktuelle dokument.
- En Cloud Function kan køre en query før write og afvise dubletter og tomme navne.
- Funktionen kan skrive `projects/{id}` og `members/{id}` i en `runTransaction` eller batch, så operationen forbliver atomisk.
- Appen bruger allerede native Firebase SDK (`@react-native-firebase/*`), så et kald til `httpsCallable` kan tilføjes.

#### Cloud Function `createProject`

Placering: `functions/src/projects/createProject.ts` (ny mappe, hvis functions-miljøet eksisterer; ellers oprettes det).

```typescript
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const createProject = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Brugeren er ikke logget ind.");
  }

  const ownerId = context.auth.uid;
  const ownerEmail = context.auth.token?.email ?? "";
  const rawName = typeof data.name === "string" ? data.name : "";
  const description = typeof data.description === "string" ? data.description : "";

  const name = rawName.trim();
  if (name.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Projektnavn må ikke være tomt");
  }

  // Unikhedstjek: kun brugerens egne projekter (ownerId)
  const normalized = name.toLowerCase();
  const existing = await db
    .collection("projects")
    .where("ownerId", "==", ownerId)
    .get();

  const duplicate = existing.docs.find(
    (doc) => doc.data().name?.trim().toLowerCase() === normalized
  );

  if (duplicate) {
    throw new functions.https.HttpsError(
      "already-exists",
      "Der findes allerede et projekt med dette navn."
    );
  }

  const projectRef = db.collection("projects").doc();
  const memberDocId = ownerEmail || ownerId;
  const memberRef = db.collection("projects").doc(projectRef.id).collection("members").doc(memberDocId);

  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    tx.set(projectRef, {
      name,
      description,
      ownerId,
      memberEmails: ownerEmail ? [ownerEmail] : [],
      roles: { [ownerId]: "owner" },
      createdAt: now,
      updatedAt: now,
    });
    tx.set(memberRef, {
      userId: ownerId,
      email: ownerEmail,
      role: "owner",
      joinedAt: now,
    });
  });

  return {
    id: projectRef.id,
    name,
    description,
    ownerId,
    memberEmails: ownerEmail ? [ownerEmail] : [],
    roles: { [ownerId]: "owner" },
  };
});
```

#### Alternative, lette tilgang: query før write i appen

Hvis Cloud Functions ikke ønskes i første omgang, kan server-side sikkerhedsnettet indtil videre gøres i appen via en eksplicit `getDocs` query før `createProject`. Denne løsning er dog svagere (client-kode kan omgås) og bør senere erstattes af en Cloud Function eller en `name` + `ownerId` unik counter.

**PO-aftalt vej:** Cloud Function `createProject` er primær løsning. Client-side tjek beholdes for hurtig feedback.

### 4.3 Firestore rules justering

For at lukke hullet med tomt navn og styrke ejerskab:

```
match /projects/{projectId} {
  allow create: if isAuthenticated()
                 && request.resource.data.ownerId == getUserId()
                 && request.resource.data.name is string
                 && request.resource.data.name.trim().size() > 0;
  // ... øvrige regler uændrede
}
```

Bemærk: Firestore rules kan stadig ikke lave unikhedstjek, men kan afvise tomt navn som forsvarslinje bag Cloud Function.

### 4.4 `updateProject` navnevalidering

Fil: `services/projects.ts` / evt. Cloud Function.

```typescript
export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, "name" | "description">>
) {
  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (trimmed.length === 0) {
      throw new Error("Projektnavn må ikke være tomt");
    }
    updates.name = trimmed;
  }
  // ... resten
}
```

Hvis omdøb senere skal forhindre dubletter, bør også dette gå gennem Cloud Function `renameProject`.

---

## 5. UI/UX

### Fejlmeddelelser

| Scenario | Fejlbesked til brugeren |
|----------|------------------------|
| Tomt eller whitespace-only navn | **"Projektnavn må ikke være tomt"** |
| Navn matcher eksisterende ejet projekt (case-insensitiv / trim) | **"Der findes allerede et projekt med dette navn."** |
| Generisk server/network fejl | **"Kunne ikke oprette projektet. Prøv igen."** |

### Interaktionsdetaljer

1. Fejlbesked vises **inline** under navnefeltet (allerede implementeret via `createError` og `styles.errorText`).
2. Fejlen ryddes, når brugeren begynder at skrive i navnefeltet.
3. **Opret**-knappen disables mens `creating` er sand eller der er aktiv valideringsfejl.
4. Ved vellykket oprettelse: sæt aktivt projekt, luk modal, nulstil felter, naviger til `/(tabs)/board`.

---

## 6. Testcases

### Client-side

1. **Tom navn**
   - Bruger åbner dialog, sletter alt tekst, trykker **Opret**.
   - Forventet: "Projektnavn må ikke være tomt", intet projekt oprettes.

2. **Whitespace-only navn**
   - Bruger indtaster "   ", trykker **Opret**.
   - Forventet: "Projektnavn må ikke være tomt", intet projekt oprettes.

3. **Dublet — eksakt match**
   - Bruger ejer "Renovering", opretter nyt "Renovering".
   - Forventet: "Der findes allerede et projekt med dette navn.", intet nyt projekt.

4. **Dublet — case/mellemrum varianter**
   - Bruger ejer "Renovering", opretter "  renovering  " eller "RENovering".
   - Forventet: Blokeret med dublet-besked.

5. **Anden brugers projekt med samme navn**
   - Bruger har adgang til delt projekt "Renovering" ejet af en anden.
   - Bruger opretter eget projekt "Renovering".
   - Forventet: Tilladt; unikhed gælder kun egne projekter.

### Server-side

6. **Cloud Function afviser tomt navn**
   - Appkalder Cloud Function med `name = ""`.
   - Forventet: `invalid-argument` / "Projektnavn må ikke være tomt".

7. **Cloud Function afviser dublet**
   - Eksisterende ejet projekt med navn "Renovering" i Firestore.
   - Cloud Function kaldes med `name = "Renovering"`.
   - Forventet: `already-exists` / "Der findes allerede et projekt med dette navn.".

8. **Eksisterende dubletter blokkerer ikke helt**
   - Bruger har to eksisterende projekter med navn "Renovering".
   - Forsøg på at oprette tredje "Renovering".
   - Forventet: Blokeret. Bruger kan fortsat arbejde med de to eksisterende, men kan ikke skabe flere.

9. **Vellykket oprettelse**
   - Gyldigt unikt navn.
   - Forventet: Projekt oprettes, modal lukker, navigation til board, aktivt projekt sættes.

---

## 7. Risici + mitigation

| Risiko | Sandsynlighed | Konsekvens | Mitigation |
|--------|---------------|-----------|------------|
| Cloud Functions introducerer ny infrastruktur og deployment-kompleksitet | Mellem | Forlænget udviklings- og testtid | Start med minimal callable function; genbrug eksisterende `firebase.json` og Firebase Admin setup. Dokumentér deploy-trin i task. |
| Client-side duplicate-tjek og server-side tjek kommer ud af sync | Lav | Bruger ser anderledes fejlbeskeder | Brug samme normaliseringsfunktion (`trim().toLowerCase()`) begge steder. Server er autoritativ. |
| Eksisterende dubletter gør det umuligt at oprette projekter med navne, brugeren har flere af | Mellem | Bruger oplever blokering uden mulighed for at løse det | PO-aftale: gamle dubletter lades være, men fremtidige forhindres. Ingen auto-oprydning uden PO-godkendelse. |
| Tomt navn via `updateProject` (fremtidigt omdøb) | Mellem | Regression af samme bug | Tilføj trim + min-length validering i `updateProject`; overvej Cloud Function for omdøb. |
| Race condition ved hurtigt dobbeltklik på **Opret** | Mellem | To projekter oprettes alligevel | Deaktiver knap under `creating`; Cloud Function query + transaction gør dubletter usandsynligt. |
| Callable function CORS/regional issues på web | Lav | Web-build fejler | Test på både iOS/Android og web; vælg region `europe-west1` eller tilsvarende. |

---

## 8. Næste trin / afhængigheder

### 8.1 Næste trin

1. **PO-godkendelse** af valgt teknisk tilgang (Cloud Function) og UI-beskeder.
2. **Opret task** til implementering med følgende delopgaver:
   - Client-side validering i `app/(tabs)/index.tsx`.
   - Cloud Function `createProject` (ny mappe/functions-setup).
   - Opdater `services/projects.ts` med `createProject` wrapper til callable function.
   - Opdater `firestore.rules` med min-length check på `name`.
   - Validering i `updateProject` (trim + min length).
   - Unit/integration tests for client- og server-logik.
   - Manuel test på iOS/Android/web.
3. **Deploy** Cloud Function til staging/udviklingsmiljø.
4. **Regressionstest** af projektoprettelse, projektliste, invitation og omdøb.

### 8.2 Afhængigheder

- Eksisterende `services/projects.ts` og `app/(tabs)/index.tsx`.
- Firebase Functions setup (hvis ikke allerede tilstede). Genbrug `firebase.json` som base.
- Firestore Security Rules deploy.
- `useProject()` context til aktivt projekt.
- `subscribeToProjects` for at opdatere listen efter oprettelse.
- Godkendelse af PO på Cloud Function omkostning vs. simpel client-side query.

---

## 9. PO-beslutninger bekræftet

| # | Spørgsmål | PO-valg |
|---|---|---|
| 1 | Eksisterende dubletter | Lades være — fremtidige dubletter forhindres. |
| 2 | Unikheds-scope | Kun brugerens egne projekter (`ownerId`). |
| 3 | Fejlbesked tomt navn | "Projektnavn må ikke være tomt" |
| 4 | Fejlbesked dublet | "Der findes allerede et projekt med dette navn." |
| 5 | Sammenligning | Trim + case-insensitiv. |
| 6 | Minimumslængde | 1 ikke-whitespace karakter. |
| 7 | Server-side mekanisme | Cloud Function `createProject` (primær) + client-side tjek (hurtig feedback). ✅ PO godkendt 2026-07-15 |
