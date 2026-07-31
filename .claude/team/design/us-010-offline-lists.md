# US-010: Offline redigering og synkronisering af checkliste-punkter

## 1. Baggrund og scope

Brugeren skal kunne arbejde med checkliste-punkter selv uden netværk (f.eks. i fly). Løsningen begrænser sig til **checkliste-punkter** (`checklists/{id}/items`), ikke hele appen. Checklistens metadata (navn, sortering, deling) samt underliggende sager/checkpoints synkroniseres stadig online.

## 2. Forretningsmæssigt omfang

| Operation | Offline-understøttelse | Bemærkning |
|-----------|------------------------|------------|
| Afkrydsning / fjern afkrydsning | **Ja** | Kernekrav. Opdaterer både listepunkt og tilhørende checkpoint ved sync. |
| Redigering af titel og noter | **Ja** | Opdaterer kun lokale felter; `updatedAt` sættes ved sync. |
| Tilføjelse af nyt punkt | **Ja** | Både manuel og dynamisk liste. For dynamisk liste oprettes sag/checkpoint først ved sync. |
| Sletning af punkt | **Ja** | For dynamiske lister registreres `deletedItemKeys` ved sync. |
| Ændring af sortering (`sortBy`) | **Nej** | Liste-metadata, ikke punkter. Kan overvejes senere. |
| Deling / kopier link / slet liste | **Nej** | Kræver netværk. |
| Dynamisk re-match / stale-markering | **Nej** | Kører kun online. |

## 3. Arkitektur

### 3.1 Komponenter

```
┌─────────────────────────────────────────┐
│           app/checklist.tsx             │
│     UI + optimistic state updates       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│     services/checklistsOffline.ts       │
│  Cache, pending queue, sync orchestrator│
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐ ┌──────────────┐
│ AsyncStorage │ │  Firestore   │
│  lokal cache │ │  (online)    │
└──────────────┘ └──────────────┘
```

### 3.2 Nye filer

- `services/checklistsOffline.ts` — cache, queue og sync
- `hooks/useChecklistOffline.ts` — wrapper der kombinerer online subscription med offline cache
- Eventuelt `services/network.ts` — netværksstatus (hvis `@react-native-community/netinfo` tilføjes)

### 3.3 Ændrede filer

- `services/checklists.ts`: operationerne `toggleChecklistPoint`, `updateChecklistItem`, `addManualItemToChecklist`, `deleteChecklistItemAndTrack` delegerer til offline-first wrappers.
- `app/checklist.tsx`: kalder de nye offline-aware services; viser sync-badge/pending-indikator.

## 4. Lokal cache (AsyncStorage)

### 4.1 Nøgler

```ts
const CHECKLIST_KEY = (checklistId: string) =>
  `@dc:checklist:${checklistId}`;
const CHECKLIST_ITEMS_KEY = (checklistId: string) =>
  `@dc:checklist_items:${checklistId}`;
const PENDING_OPS_KEY = (checklistId: string) =>
  `@dc:pending_ops:${checklistId}`;
const LAST_SYNC_AT_KEY = (checklistId: string) =>
  `@dc:last_sync_at:${checklistId}`;
```

### 4.2 Cache-format

```ts
interface CachedChecklist {
  checklist: Checklist;
  fetchedAt: number; // ms since epoch
}

interface CachedChecklistItems {
  items: ChecklistItem[];
  fetchedAt: number;
}

interface PendingOperation {
  id: string; // UUID genereret lokalt
  type: "toggle" | "update" | "add" | "delete";
  checklistId: string;
  itemId?: string; // null for add indtil lokal id tildelt
  payload: unknown;
  createdAt: number;
  retryCount: number;
}
```

### 4.3 Initial load

1. Hvis cache findes: vis med det samme.
2. Start online subscription (`subscribeToChecklistItems`).
3. Når første snapshot modtages: merge med pending queue, så serverændringer ikke overskriver lokale ændringer.

## 5. Optimistic updates

1. UI opdaterer `items` state øjeblikkeligt.
2. Samtidig skrives en `PendingOperation` til kø.
3. Hvis operationen lykkes online: fjernes fra kø.
4. Hvis operationen fejler (offline eller anden fejl): beholdes i kø og vises som "afventer sync".
5. Hvis server snapshot modtager en ændring for et punkt med pending operation: anvend pending-ændringen frem for snapshot-værdien indtil operationen er synkroniseret.

### 5.1 Specifikke optimistic regler

- **Toggle**: lokal `isCompleted`, `completedAt`, `completedBy` opdateres med det samme.
- **Update**: lokal `title` og `notes` opdateres med det samme.
- **Add**: tildel lokalt id (`local_<uuid>`); vis i listen. Ved sync erstattes med Firestore-id.
- **Delete**: fjern fra lokal liste med det samme; gem `deletedItemKeys` og `deletedItemId` i kø.

## 6. Synkronisering

### 6.1 Triggere

- Appen kommer online igen.
- Bruger trækker ned for at genindlæse.
- En ændring sker mens online.
- App resume/foreground.

### 6.2 Netværksdetektion

**Alternativ A (anbefales):** tilføj `@react-native-community/netinfo`:

```ts
import NetInfo from "@react-native-community/netinfo";
NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) {
    flushPendingOperations();
  }
});
```

**Alternativ B (minimal):** hver service-forsøg fejler med timeout; hvis timeout: marker offline og spool til kø.

> **Beslutning:** Implementer Alternativ A for pålidelig sync, men med timeout-fallback så appen ikke hænger.

### 6.3 Flush-algoritme

1. Hent alle pending operations sorteret efter `createdAt`.
2. For hver operation:
   - **toggle**: kør `toggleChecklistPoint`.
   - **update**: kør `updateChecklistItem`.
   - **add**: kør `addManualItemToChecklist` eller `addChecklistItem`; opdater lokalt id til Firestore-id.
   - **delete**: kør `deleteChecklistItemAndTrack`.
3. Ved succes: fjern operation fra kø.
4. Ved fejl: øg `retryCount`; stop flush hvis `retryCount >= 3` og vis fejl.
5. Ved konflikt (se afsnit 7): løs konflikt og fjern/forkast operation.

### 6.4 Sammensætning af kø

Flere operationer på samme punkt skal sammensættes for at undgå overflødige writes:

- `update` efterfulgt af `toggle` → kun den endelige `toggle` + sidste `update` payload.
- `add` efterfulgt af `update`/`toggle`/`delete` → brug endelig tilstand ved sync; hvis endelig tilstand er `delete`, drop hele operationen.
- Sletning vinder altid over andre operationer på samme id.

## 7. Konfliktløsning

Da én bruger typisk ejer listen, prioriteres **last-write-wins** baseret på lokal ændringstid:

1. Hvis server har en nyere `updatedAt` end den lokale pending operation, og operationen ikke er toggle: vis prompt "Server-versionen er nyere. Vil du overskrive?".
2. Hvis operationen er toggle: lokal afkrydsning vinder (bruger handling er autoritativ).
3. Hvis server har slettet punktet: drop pending operationer for det punkt og vis notifikation.
4. For tilføjede lokale punkter: der kan ikke opstå konflikt (nyt id).

## 8. Data-model ændringer

Ingen nye Firestore collections. Der tilføjes lokale felter:

```ts
interface ChecklistItem {
  // ...existing fields
  isPending?: boolean;      // UI flag
  pendingError?: string;    // hvis sync fejlede
  localOnly?: boolean;      // tilføjet offline, endnu ikke syncet
}
```

`isPending` og `pendingError` bruges kun i hukommelsen / UI og skrives **ikke** til Firestore.

## 9. UI/UX

### 9.1 Indikatorer

- Sync-badge i header: "Synkroniseret" / "Afventer sync" / "Offline".
- Pending punkter markeres med en diskret indikator (f.eks. gråt ur-ikon).
- Snackbar/toast ved sync-fejl med "Prøv igen".

### 9.2 Pull-to-refresh

FlatList får `refreshControl` der trigger `flushPendingOperations()` og genindlæser subscription.

### 9.3 Fejlhåndtering

- Hvis flush fejler efter 3 forsøg: behold operation i kø, vis "Kunne ikke synkronisere. Prøv igen senere."
- Hvis bruger logger ud: behold cache og pending queue; sync ved næste login.

## 10. Implementeringsrækkefølge

1. Tilføj `@react-native-community/netinfo` dependency.
2. Implementer `services/checklistsOffline.ts` med cache og queue.
3. Omskriv `services/checklists.ts` operationer til offline-first wrappers.
4. Implementer `hooks/useChecklistOffline.ts` og opdater `app/checklist.tsx`.
5. Testscenarioer (se afsnit 11).
6. PO-godkendelse.

## 11. Testscenarioer (acceptance)

| # | Scenario | Forventet resultat |
|---|----------|--------------------|
| 1 | Åbn liste online → slå flymode til → afkryds et punkt | Punktet vises afkrydset; badge viser "Afventer sync". |
| 2 | Rediger noter offline → slå flymode fra | Noter synkroniseres til Firestore indenfor få sekunder. |
| 3 | Tilføj punkt offline på dynamisk liste | Punktet vises lokalt; ved sync oprettes sag og checkpoint. |
| 4 | Slet punkt offline på dynamisk liste | Punktet fjernes lokalt; `deletedItemKeys` opdateres ved sync. |
| 5 | Flere offline ændringer på samme punkt | Kun endelig tilstand synkroniseres (ingen overflødige writes). |
| 6 | En anden enhed ændrer samme punkt imens man er offline | Konfliktløsning vises; toggle vinder; andre felter promptes. |
| 7 | App genstartes offline | Cache indlæses; bruger kan fortsætte redigering. |
| 8 | App genstartes online med pending queue | Queue flushes automatisk ved start. |

## 12. Risici og afgrænsninger

- **Dynamisk re-match** (`synchronizeDynamicChecklist`) kører ikke offline. Nye matches vises først når appen er online.
- **Billeder/filer** i noter er uden for scope.
- **Realtidssamarbejde** mellem flere brugere på samme liste: konfliktløsning er simpel og kan skarpes senere.
- **Stor queue**: hvis hundredvis af operationer spooles, kan flush tage lang tid. Overvej batching i fremtidig iteration.

## 13. Beslutninger der skal godkendes af PO

1. Skal vi tilføje `@react-native-community/netinfo` (anbefalet) eller bruge timeout-baseret offline-detektion?
2. Skal sletning af punkter på statiske lister også huskes permanent, eller kun i dynamiske lister?
3. Skal konflikter ved andres ændringer vise en dialog, eller altid vælge lokal version?
4. Skal vi også understøtte offline ændring af liste-metadata (navn, sortering) i denne US?

---

**Næste trin:** Efter PO-godkendelse implementeres `services/checklistsOffline.ts` først, derefter UI-integration og test.
