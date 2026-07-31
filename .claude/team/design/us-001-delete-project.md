# US-001: Slet projekt (B9)

> Rolle: Solution Design Agent  
> Scope: Ejer kan slette et projekt og al dets tilhørende data.  
> Dato: 2026-07-15  
> Status: Klar til PO-godkendelse

---

## 1. Scope

### 1.1 Hvad skal med

- **Kun projektejeren** kan slette et projekt.
- Sletning fjerner **alle** projektets tilknyttede data:
  - Projekt-dokumentet (`projects/{projectId}`).
  - Medlemmer (`projects/{projectId}/members/{memberId}`).
  - Sager/items i rotsamlingen med `projectId == {projectId}`.
  - Checkpoints under hver sag (`items/{itemId}/checkpoints/{checkpointId}`).
  - Kommentarer under hver sag (`items/{itemId}/comments/{commentId}`).
  - Aktionslister/checklister knyttet til projektet (`checklists/{checklistId}` hvor `projectId == {projectId}`) og deres listepunkter (`checklists/{checklistId}/items/{listItemId}`).
  - Fotos i Firebase Storage under stien `projects/{projectId}/items/`.
  - Lokale push-påmindelser for projektets checklister annulleres, når US-011 er implementeret.

### 1.2 Hvad ligger udenfor (i denne runde)

- **Soft delete / papirkurv**: Implementeres ikke nu. Brugeren får i stedet en eksplicit "kan ikke fortrydes"-advarsel.
- **Varsel til medlemmer**: Medlemmer mister øjeblikkeligt adgang, men modtager ikke push/mail om sletningen.
- **Gendannelse**: Efter sletning kan data ikke genskabes uden backup.

### 1.3 Hvem har gavn af det

- **Slutbrugeren** kan rydde op i gamle eller oprettede ved fejl-projekter.
- **PO / ejer** får en længe-ønsket funktion fra backloggen (B9).
- **Udviklingsteamet** får en centraliseret, sikker sletmekanisme, der reducerer risikoen for spredte zombie-data.

---

## 2. Brugerflow

```text
┌──────────────────────────────┐
│  Projekter (app/(tabs)/index) │
│  Bruger (owner) trykker "..." │
│  eller langt-tryk på projekt   │
└──────────────┬─────────────────┘
               ▼
┌──────────────────────────────┐
│  Vælg "Slet projekt"           │
└──────────────┬─────────────────┘
               ▼
┌──────────────────────────────┐
│  Dialog 1: Konsekvenser        │
│  - Navn på projekt             │
│  - Antal sager, lister, fotos  │
│  - Advarsel: kan ikke fortrydes│
│  Knapper: Annuller / Fortsæt   │
└──────────────┬─────────────────┘
               ▼
┌──────────────────────────────┐
│  Dialog 2: Bekræftelse         │
│  "Skriv projektets navn for at  │
│   bekræfte"                    │
│  [Tekstfelt]                   │
│  Knapper: Annuller / Slet      │
│  Slet-knap deaktiveret indtil   │
│  navnet matcher                │
└──────────────┬─────────────────┘
               ▼
┌──────────────────────────────┐
│  Sletning igangsættes          │
│  Spinner + "Sletter..."         │
└──────────────┬─────────────────┘
               ▼
┌──────────────────────────────┐
│  Success: Tilbage til projekt- │
│  listen. Aktivt projekt        │
│  nulstilles hvis nødvendigt.   │
└────────────────────────────────┘
```

### 2.1 Hvor findes slet-knappen

- Primær placering: **Projektkortet i `app/(tabs)/index.tsx`**.
- For ejere vises en lille rød tekst/knap eller en overflow-menu (f.eks. tre prikker) på hvert kort.
- Alternativ: langt-tryk-menu, men da langt-tryk allerede bruges til invitation, anbefales en synlig "..."-knap for at undgå konflikter.

### 2.2 Konsekvenser forklares

Dialog 1 skal vise:

> Du er ved at slette projektet **"{projectName}"**.
>
> Dette sletter:
> - {n} sager og tilhørende noter
> - {m} aktionslister
> - {k} fotos
> - Alle medlemmer mister adgang
>
> Handlingen kan **ikke fortrydes**.

### 2.3 Bekræftelse

- Brugeren skal skrive projektets præcise navn i et tekstfelt, før "Slet" aktiveres.
- Dette forhindrer utilsigtede sletninger og fejltryk.
- Hvis PO finder tekstbekræftelsen for tung, kan den erstattes af en ekstra "Forstået, slet nu"-knap (beslutning registreres i afsnit 5).

---

## 3. Rettigheder

### 3.1 Hvem må slette

| Rolle | Må slette projekt? | Bemærkning |
|---|---|---|
| **Owner** | Ja | Eneste rolle med sletteadgang til selve projektet |
| **Admin** | Nej | Kan redigere medlemmer og slette enkelte sager, men ikke hele projektet |
| **Editor / Viewer** | Nej | Ingen adgang |

### 3.2 Firestore Security Rules

Eksisterende regel for `projects/{projectId}`:

```firestore
allow delete: if isAuthenticated() && resource.data.ownerId == getUserId();
```

Denne regel **beholdes uændret**. Cascade-delete køres enten via en Cloud Function (med admin-rettigheder) eller i en client-side batch, hvor ejeren allerede har tilladelse til de enkelte underliggende dokumenter.

Hvis PO senere ønsker, at admin også må slette projekter, skal reglen udbygges. Dette dokument anbefaler **ikke** at åbne for admin-sletning i denne runde, da sletning af et helt projekt er en irreversibel, højrisiko-handling.

---

## 4. Data-rydning (cascade delete)

### 4.1 Data der skal fjernes

| Ressource | Sti / query | Slettes via |
|---|---|---|
| Projekt | `projects/{projectId}` | `deleteDoc` |
| Medlemmer | `projects/{projectId}/members/{memberId}` | Batch-delete |
| Sager | `items` hvor `projectId == {projectId}` | Query + batch |
| Checkpoints | `items/{itemId}/checkpoints/{checkpointId}` | Per sag: query + batch |
| Kommentarer | `items/{itemId}/comments/{commentId}` | Per sag: query + batch |
| Checklister | `checklists` hvor `projectId == {projectId}` | Query + batch |
| Listepunkter | `checklists/{checklistId}/items/{listItemId}` | Per checkliste: query + batch |
| Fotos | `projects/{projectId}/items/{fileName}.jpg` i Storage | `deleteObject` / admin Storage |
| Lokale reminders | `expo-notifications` planlagte notifikationer | `cancelScheduledNotificationAsync` |

### 4.2 Arkitekturvalg: Cloud Function (anbefalet)

**Primær anbefaling:** Implementer en Firebase Callable Cloud Function `deleteProject({ projectId })`.

| Aspekt | Cloud Function | Client-side writeBatch |
|---|---|---|
| Atomiskitet | Ikke én atomisk transaktion, men serverstyret og robust | Begrænset til 500 operationer pr. batch |
| Skalerbarhed | Kan paginere og håndtere tusindvis af dokumenter | Rammer grænser ved store projekter |
| Pålidelighed | Kører færdig selv hvis appen lukkes | Kan efterlade delvist slettet data ved netværksfejl |
| Sikkerhed | Verificerer ejerskab server-side (forsvar i dybde) | Kun client-side validering |
| Storage-sletning | Kan slette Storage-filer i samme kald | Kræver separat client-kode og ekstra tilladelser |
| Omkostning | Lille; sletning sker sjældent | Gratis, men højere risiko |

**Konklusion:** Cloud Function er den sikreste og mest skalerbare løsning. Den centraliserer sletlogikken og beskytter mod partielle sletninger, hvis appen afbrydes.

### 4.3 Cloud Function - skitse

```typescript
// functions/src/deleteProject.ts
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { https } from "firebase-functions/v2";

const db = getFirestore();
const storage = getStorage();

export const deleteProject = https.onCall(async (request) => {
  const { projectId } = request.data as { projectId: string };
  const uid = request.auth?.uid;
  if (!uid || !projectId) {
    throw new https.HttpsError("unauthenticated", "Du skal være logget ind.");
  }

  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    throw new https.HttpsError("not-found", "Projektet findes ikke.");
  }

  const projectData = projectSnap.data();
  if (projectData?.ownerId !== uid) {
    throw new https.HttpsError("permission-denied", "Kun ejeren kan slette projektet.");
  }

  // Slet sager + checkpoints + kommentarer
  const itemsSnap = await db.collection("items").where("projectId", "==", projectId).get();
  for (const item of itemsSnap.docs) {
    const checkpointsSnap = await item.ref.collection("checkpoints").get();
    const commentsSnap = await item.ref.collection("comments").get();

    const batch = db.batch();
    checkpointsSnap.docs.forEach((d) => batch.delete(d.ref));
    commentsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(item.ref);
    await batch.commit();
  }

  // Slet checklister + listepunkter
  const checklistsSnap = await db.collection("checklists").where("projectId", "==", projectId).get();
  for (const checklist of checklistsSnap.docs) {
    const pointsSnap = await checklist.ref.collection("items").get();
    const batch = db.batch();
    pointsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(checklist.ref);
    await batch.commit();
  }

  // Slet projekt og medlemmer
  const membersSnap = await projectRef.collection("members").get();
  const finalBatch = db.batch();
  membersSnap.docs.forEach((d) => finalBatch.delete(d.ref));
  finalBatch.delete(projectRef);
  await finalBatch.commit();

  // Slet fotos i Storage
  const bucket = storage.bucket();
  const prefix = `projects/${projectId}/items/`;
  const [files] = await bucket.getFiles({ prefix });
  await Promise.all(files.map((file) => file.delete().catch(() => null)));

  return { success: true };
});
```

### 4.4 Alternativ: Client-side chunked batch (hvis CF ikke kan nås)

Hvis Cloud Function ikke kan sættes op inden for denne runde, kan sletning køres client-side:

1. Hent alle `items` for projektet (`getDocs`).
2. For hver sag: hent og slet checkpoints + comments i batches på max 500 operationer.
3. Slet items i batches.
4. Hent alle `checklists` for projektet; slet listepunkter og checklister i batches.
5. Slet `members`-subcollection.
6. Slet projekt-dokumentet.
7. Slet Storage-filer client-side via `@react-native-firebase/storage`.

**Begrænsning:** Ved mere end et par hundrede dokumenter kan dette blive langsomt og fejludsat. Cloud Function foretrækkes.

---

## 5. Sikkerhed og godkendelse

### 5.1 Forsvar i dybde

| Lag | Foranstaltning |
|---|---|
| UI | Slet-knappen vises kun for ejere |
| Tekstbekræftelse | Bruger skal skrive projektnavnet |
| Firestore Rules | Kun owner må slette `projects/{projectId}` |
| Cloud Function | Verificerer ejerskab igen server-side |
| Audit-log | Function logger `projectId`, `uid` og `timestamp` |

### 5.2 Soft delete vs. hard delete

- **Hard delete** er anbefalet i denne runde. Det matcher brugerens forventning når de trykker "Slet projekt" og frigør Storage-plads.
- **Soft delete** kan overvejes senere, hvis PO ønsker en "papirkurv" eller en opsigelsesperiode. Et soft-delete ville kræve et nyt `deletedAt`-felt, en dæmon til oprydning og ændrede queries overalt.

### 5.3 PO-beslutning

| # | Spørgsmål | Anbefaling |
|---|---|---|
| 1 | Hard eller soft delete? | **Hard delete** nu |
| 2 | Tekstbekræftelse eller ekstra knap? | **Tekstbekræftelse** (skriv navn) |
| 3 | Må admin også slette? | **Nej**, kun owner |
| 4 | Cloud Function eller client-side? | **Cloud Function** ✅ PO godkendt 2026-07-15 |

---

## 6. Testcases

### TC-01: Owner sletter tomt projekt
- **Forudsætning:** Bruger ejer et projekt uden sager, lister eller fotos.
- **Trin:** Tryk "Slet projekt" → bekræft i dialogerne.
- **Forventet:** Projektet og `members`-subcollection fjernes fra Firestore. Bruger sendes tilbage til projektlisten.

### TC-02: Owner sletter projekt med sager, checkpoints og kommentarer
- **Forudsætning:** Projektet har sager med checkpoints og kommentarer.
- **Trin:** Gennemfør slet-flow.
- **Forventet:** Alle `items`, `checkpoints` og `comments` for projektet er fjernet. Ingen dokumenter kan queries frem med `projectId == {projectId}`.

### TC-03: Owner sletter projekt med checklister
- **Forudsætning:** Projektet har en eller flere checklister med listepunkter.
- **Trin:** Gennemfør slet-flow.
- **Forventet:** Alle `checklists` og `checklists/{id}/items` for projektet er fjernet.

### TC-04: Owner sletter projekt med fotos
- **Forudsætning:** Projektet har sager med fotos uploadet til Storage under `projects/{projectId}/items/`.
- **Trin:** Gennemfør slet-flow.
- **Forventet:** Storage-mappen for projektet er tom (eller ikke-eksisterende). Download-URL'er returnerer 404.

### TC-05: Medlem eller admin forsøger at slette projekt
- **Forudsætning:** Bruger er medlem/admin i et projekt, som en anden ejer.
- **Trin:** Forsøg at påkalde slet-funktionen (via UI eller direkte mod Cloud Function).
- **Forventet:** Handling afvises. Projekt og data forbliver intakte.

### TC-06: Annullér i bekræftelsesdialog
- **Forudsætning:** Owner trykker "Slet projekt".
- **Trin:** Tryk "Annuller" i dialog 1 eller dialog 2.
- **Forventet:** Intet slettes. Bruger forbliver på projektlisten.

### TC-07: Forkert projektnavn i tekstbekræftelse
- **Forudsætning:** Owner er nået til tekstbekræftelse.
- **Trin:** Indtast et forkert navn.
- **Forventet:** "Slet"-knappen forbliver deaktiveret. Sletning kan ikke gennemføres.

### TC-08: Aktivt projekt slettes
- **Forudsætning:** Det projekt brugeren står i, er valgt som aktivt.
- **Trin:** Slet det aktive projekt.
- **Forventet:** `activeProject` nulstilles i `ProjectContext` og `AsyncStorage`. Bruger navigeres til projektlisten og ser ikke længere "Vælg et projekt"-prompt fra Board.

### TC-09: Netværksfejl under sletning
- **Forudsætning:** Cloud Function kaldes, men netværket afbrydes.
- **Trin:** Gennemfør slet-flow under simuleret netværksfejl.
- **Forventet:** UI viser fejlmeddelelse. Projektet vises stadig i listen, fordi sletningen ikke er bekræftet færdig.

---

## 7. Risici og mitigations

| Risiko | Sandsynlighed | Konsekvens | Mitigation |
|---|---|---|---|
| Cascade-delete sletter forkert data pga. query-fejl | Lav | Data tabt hos andre projekter | Test på udviklingsprojekt først; brug præcis `projectId`-filter; gennemgå CF-kode i QA |
| Partiel sletning pga. client-side batch-grænser eller netværksfejl | Mellem | Zombie-data efterladt | Brug Cloud Function; log fejl; UI viser kun succes når function returnerer |
| Storage-sletning fejler (f.eks. fil ikke fundet) | Lav | Fotos forbliver liggende | CF ignorerer enkeltstående fejl og logger dem; manuel oprydning kan køres senere |
| Medlemmer mister adgang uden varsel | Mellem | Forvirring hos samarbejdspartnere | Accepteret scope; overvej fremtidig "projekt slettet"-notifikation |
| Cloud Function-omkostninger | Lav | Forhøjet Firebase-regning | Sletning er sjælden; overvåg functions-usage efter deploy |
| Bruger sletter ved fejl pga. dårlig knapplacering | Lav | Data tabt | Tekstbekræftelse + tydelig konsekvens forklaring + "..."-menu i stedet for langt-tryk |

---

## 8. Næste trin og afhængigheder

### 8.1 Afhængigheder

- **Cloud Functions-miljø:** Firebase Functions skal være initialiseret i projektet, hvis Cloud Function-valget godkendes.
- **Firestore-regler:** Eksisterende `allow delete` for owner skal bevares; yderligere regler er ikke nødvendige ved Cloud Function.
- **Storage-regler:** Cloud Function kører med admin-rettigheder og kræver derfor ikke nye Storage-regler.
- **ProjectContext:** Skal kunne nulstille `activeProject` og rydde `AsyncStorage` efter sletning.
- **US-011 Push-reminders:** Hvis reminders er implementeret, skal reminders for projektets checklister annulleres client-side efter sletning.

### 8.2 Filændringer (forventet)

| Fil | Ændring |
|---|---|
| `services/projects.ts` | Tilføj `deleteProjectCascade(projectId)` der kalder Cloud Function eller client-side cascade |
| `app/(tabs)/index.tsx` | Tilføj slet-knap/overflow-menu og bekræftelsesdialog på projektkortet |
| `contexts/ProjectContext.tsx` | Eksponér evt. `clearActiveProject()` eller håndter nulstilling i UI |
| `firestore.rules` | Ingen ændring, medmindre PO åbner for admin-sletning |
| `functions/src/deleteProject.ts` | Ny Cloud Function (hvis PO godkender) |
| `services/notificationScheduler.ts` | Tilføj `cancelChecklistReminders(checklistIds)` kald efter sletning |

### 8.3 Udførselsrækkefølge

1. PO godkender design, herunder valg af hard delete + Cloud Function + tekstbekræftelse.
2. Solution Design Agent / Developer Agent implementerer Cloud Function.
3. UI ændringer i `app/(tabs)/index.tsx` og `services/projects.ts`.
4. Integration med `ProjectContext` og evt. reminder-scheduler.
5. Gennemfør testcases TC-01 til TC-09.
6. QA review.
7. Audit-gate.
8. PO-go til build.
