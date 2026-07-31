# US-005 / B3: Offline understøttelse af lister

**PO-godkendt scope:** `.claude/plans/comprehensive-bug-backlog-round.md` (B3 — offline redigering og synkronisering af lister).  
**Mål:** Brugeren skal kunne se sine lister og arbejde med listepunkter uden netværk; ændringer synkroniseres automatisk, når forbindelsen vender tilbage.

---

## 1. Scope

### 1.1 Inkluderet i denne US (offline understøttelse)

| Funktion | Offline? | Bemærkning |
|---|---|---|
| Se listeoversigt (projektets lister) | Ja | Cache af checklist-metadata per projekt. |
| Se punkter i en liste | Ja | Cache af `checklists/{id}/items`. |
| Afkryds / fjern afkrydsning af punkt | Ja | Kernekrav. Kildesag/checkpoint opdateres først ved sync. |
| Rediger punkt (titel + noter) | Ja | Lokale felter; `updatedAt` sættes ved sync. |
| Opret nyt punkt på **manuel** liste | Ja | Lokalt id tildelt; erstattes af Firestore-id ved sync. |
| Slette punkt | Ja | Både manuelle og dynamiske lister; `deletedItemKeys` synkroniseres for dynamiske lister. |
| Markere liste som "set" / rydde nye matches | Ja | Deferres til online; kræver write på `checklists` + `items`. |
| Pull-to-refresh | Ja | Forsøger flush af pending queue + genindlæs online data. |

### 1.2 Bevidst ude af scope

| Funktion | Begrundelse |
|---|---|
| Oprette **ny liste** | Kræver søgning/projektvalg — online-only. |
| Oprette punkt på **dynamisk** liste offline | Kræver oprettelse af kildesag + checkpoint i Firestore. UI viser "Tilføj" deaktiveret offline. |
| Ændre liste-metadata (navn, sortering, deling, slet liste) | Online-only; synkroniseres ikke offline. |
| Dynamisk re-match / stale-markering | Kører kun online via `synchronizeDynamicChecklist`. |
| Del / kopier link / slet liste | Kræver netværk og/eller eksterne shares. |
| Billeder/filer i noter | Uden for scope. |

---

## 2. Brugerflow

1. **Bruger har tidligere været online:** Lister og punkter er cachet i `AsyncStorage`.
2. **Bruger åbner app uden net:**
   - Listeoversigten vises fra cache.
   - Hver liste viser antal åbne/udførte punkter baseret på cache.
3. **Bruger trykker på en liste:**
   - Punkter vises fra cache.
   - Offline-indikator vises i toppen.
4. **Bruger afkrydser et punkt:**
   - UI opdateres med det samme (optimistic update).
   - Operationen gemmes i `pending`-kø.
   - Punktet markeres som "afventer sync".
5. **Bruger redigerer titel/noter:**
   - Tekstfelterne opdateres med det samme.
   - Gem-knappen skriver en `update`-operation i køen.
6. **Netværk kommer tilbage:**
   - Appen registrerer online via `@react-native-community/netinfo`.
   - Pending-kø afvikles i rækkefølge.
   - Ved succes fjernes operationerne; UI opdateres (nye Firestore-id'er, timestamps).
7. **Sync fejler:**
   - Badge/skuffe viser fejl.
   - Bruger kan trække ned for at prøve igen.

---

## 3. Cache-strategi

### 3.1 Teknisk valg

- **Lager:** `@react-native-async-storage/async-storage` (allerede i `package.json` v2.2.0).
- **Netværksdetektion:** `@react-native-community/netinfo` (skal installeres).
- **Format:** JSON. Alle Firestore `Timestamp` konverteres til millisekunder ved skrivning og genopbygges ved læsning.

### 3.2 Nøgler

```ts
const CHECKLIST_META_KEY = (id: string) => `@dc:checklist_meta:${id}`;
const CHECKLIST_ITEMS_KEY = (id: string) => `@dc:checklist_items:${id}`;
const PROJECT_CHECKLIST_IDS_KEY = (projectId: string) =>
  `@dc:project_checklist_ids:${projectId}`;
const PENDING_OPS_KEY = (id: string) => `@dc:pending_ops:${id}`;
const LAST_SYNC_KEY = (id: string) => `@dc:last_sync:${id}`;
```

### 3.3 Cache-format

```ts
interface CachedChecklistMeta {
  checklist: Checklist;        // liste-metadata
  fetchedAt: number;           // ms since epoch
}

interface CachedChecklistItems {
  items: ChecklistItem[];
  fetchedAt: number;
}

interface PendingOperation {
  id: string;                  // lokalt uuid
  type: "toggle" | "update" | "add_manual" | "delete" | "mark_viewed";
  checklistId: string;
  itemId?: string;              // lokalt id for "add_manual"
  payload: unknown;
  baseUpdatedAt?: number;       // item.updatedAt da operationen blev lavet
  createdAt: number;
  retryCount: number;
}
```

### 3.4 Populering af cachen

1. Ved første online åbning af listeoversigten:
   - Skriv hvert modtaget `Checklist` til `CHECKLIST_META_KEY`.
   - Opdater `PROJECT_CHECKLIST_IDS_KEY` for hvert projekt.
2. Ved første online åbning af en liste:
   - Skriv punkterne til `CHECKLIST_ITEMS_KEY`.
   - Opdater `LAST_SYNC_KEY`.
3. Efterfølgende online snapshots:
   - Overskriv cache med nyeste data.
   - **BUT:** punkter med pending operationer merges, så serverdata ikke overskriver lokale ændringer før sync.

### 3.5 Invalidation

- **Checkliste slettes (online):** fjern `CHECKLIST_META_KEY`, `CHECKLIST_ITEMS_KEY`, `PENDING_OPS_KEY` og id'et fra `PROJECT_CHECKLIST_IDS_KEY`.
- **Bruger skifter projekt / logger ud:** fjern alle `@dc:checklist_*` og `@dc:project_checklist_*` nøgler for at undgå datamiks mellem konti.
- **Cache uden udløb:** Data beholdes indtil der kommer et nyere online snapshot eller brugeren logger ud.
- **Listeåbning med forældet cache:** vises alligevel; online subscription opdaterer i baggrunden.

---

## 4. Sync & konflikthåndtering

### 4.1 Netværksdetektion

Installer `@react-native-community/netinfo`:

```bash
npx expo install @react-native-community/netinfo
```

Global listener i app-livscyklus:

```ts
NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) {
    flushPendingOperationsForAllChecklists();
  }
});
```

Supplerende triggers:
- App går i foreground.
- Pull-to-refresh.
- En online operation lykkes (viser at net er oppe).

### 4.2 Pending queue

Hver liste har sin egen kø i `AsyncStorage`. Operationer skrives umiddelbart efter den optimistic UI-update.

### 4.3 Kompaktion af kø

Før flush reduceres køen, så kun den endelige tilstand sendes:

- Flere `toggle` på samme punkt → ét `toggle` med endelig `isCompleted`.
- `update` efterfulgt af `toggle` → ét `toggle` + sidste `update`-payload.
- `update` efterfulgt af yderligere `update` → kun sidste payload.
- `add_manual` efterfulgt af `update`/`toggle`/`delete`:
  - Hvis endelig operation er `delete`: droppes hele kæden.
  - Ellers: operationerne hæftes på det nye Firestore-id efter oprettelse.
- `delete` vinder altid over andre operationer på samme id.

### 4.4 Flush-algoritme

1. Hent alle pending operations sorteret efter `createdAt`.
2. For hver operation:
   - **`toggle`:** Kald ny idempotent helper `setChecklistPointCompleted(..., desiredCompleted)` i stedet for den nuværende `toggleChecklistPoint`, så dobbeltsync ikke flipper tilbage.
   - **`update`:** Kald `updateChecklistItem` med endelig payload.
   - **`add_manual`:** Kald `addManualItemToChecklist`. Gem mapping fra lokalt id til Firestore-id; omskriv efterfølgende operationer på samme punkt.
   - **`delete`:** Kald `deleteChecklistItemAndTrack`.
   - **`mark_viewed`:** Kald `markChecklistAsViewed`.
3. Ved succes: fjern operationen fra køen.
4. Ved fejl: øg `retryCount`; stop ved `retryCount >= 3` og vis fejl. Næste flush prøver igen.

### 4.5 Konflikthåndtering

Forretningsregel: En bruger ejer typisk listen. Løsningen bruger **last-write-wins** baseret på lokal handling, med simple konfliktregler:

1. **Toggle:** Lokal brugerhandling er autoritativ. Hvis en anden enhed har ændret punktet imens, overskrives punktets afkrydsning stadig med den lokale endelige tilstand.
2. **Update (titel/noter):** Lokal update vinder. Hvis en anden enhed har ændret samme felter, vises en lille non-blocking indikator: "Overskrevet med din seneste ændring".
3. **Server har slettet punktet:** Lokale operationer på det punkt droppes; brugeren får en toast: "Punktet blev fjernet fra en anden enhed."
4. **Dynamisk liste `deletedItemKeys`:** To enheder kan begge have tilføjet nye nøgler. Ved sync merges arrays i stedet for at overskrive.

> **Fremtidig forbedring:** Hvis lister deles mellem flere aktive brugere, bør konfliktløsning skærpes med dialog eller server-wins. Det er ikke nødvendigt for B3.

---

## 5. UI/UX

### 5.1 Offline-indikator

- **Listeoversigt:** Lille badge i toppen: "Offline — viser cachede lister".
- **Listedetalje:** Badge under header: "Offline — ændringer gemmes lokalt".
- Når net er tilbage og sync kører: "Synkroniserer...".
- Efter sync: "Synkroniseret".

### 5.2 Pending-indikator på punkter

- Punkter med pending operation viser et gråt tekstlabel: "afventer sync".
- Hvis en operation fejler efter 3 forsøg: rødt tekstlabel + "Træk ned for at prøve igen".

### 5.3 Fejlmeddelelser

- **Sync fejl:** Snackbar/toast: "Kunne ikke synkronisere. Træk ned for at prøve igen."
- **Handling der kræver net:** "Denne handling kræver netværk. Prøv igen, når du er online."
  - Gælder: oprette ny liste, oprette punkt på dynamisk liste, ændre sortering/listenavn, dele/slette liste.

### 5.4 Pull-to-refresh

`FlatList` får `RefreshControl` der trigger:
1. Forsøg flush af pending queue.
2. Genopret online subscription hvis net er tilbage.
3. Vis spinner i 1 sekund for feedback.

### 5.5 Deaktiverede handlinger offline

- "Tilføj punkt"-knap på dynamiske lister: grå, ikke trykbar.
- "Del / Link / Slet liste": grå, ikke trykbar.
- Sorteringsknapper: stadig virker lokalt, men `sortBy`-ændring persisteres ikke offline.

---

## 6. Testcases

| # | Scenario | Forventet resultat |
|---|---|---|
| 1 | Åbn liste online → slå flymode til → afkryds et punkt. | Punktet vises afkrydset; "afventer sync"-label vises; source-sag/checkpoint opdateres først ved sync. |
| 2 | Rediger noter offline → slå flymode fra. | Noter synkroniseres til Firestore; `updatedAt` sættes af serveren. |
| 3 | Genstart app helt offline efter at have redigeret en liste. | Cache indlæses; alle pending operationer og lokale ændringer bevares. |
| 4 | Tilføj nyt punkt offline på en **manuel** liste. | Punktet vises med lokalt id; ved sync oprettes det i Firestore og id'et udskiftes uden UI-flash. |
| 5 | Slet punkt offline på en dynamisk liste. | Punktet fjernes lokalt; ved sync kaldes `deleteChecklistItemAndTrack` og `deletedItemKeys` opdateres. |
| 6 | To enheder: enhed A ændrer titlen på et punkt offline; enhed B ændrer titlen online; A går online. | A's lokale titel vinder; non-blocking indikator vises: "Overskrevet med din seneste ændring". |
| 7 | Flere offline ændringer på samme punkt (toggle + rediger + toggle). | Kun endelig tilstand synkroniseres — ingen overflødige Firestore-writes. |
| 8 | Træk ned for at genindlæse mens der er pending operationer og net er tilbage. | Queue flushes; liste opdateres fra Firestore; spinner forsvinder. |

---

## 7. Risici + mitigation

| Risiko | Konsekvens | Mitigation |
|---|---|---|
| `@react-native-community/netinfo` kræver native rebuild. | Ekstra EAS-build + test på fysisk enhed. ✅ PO godkendt 2026-07-15 | Installer tidligt i fasen; test netværksskift i simulator/dev-build før EAS. |
| Stor pending queue tager lang tid at flushe. | Bruger ser "synkroniserer..." længe. | Kompaktion af kø før flush; batching af uafhængige writes kan tilføjes senere. |
| Lokale data i `AsyncStorage` er ukrypteret. | Følsomme noter kan læses på en rootet/jailbreaket enhed. | Acceptabelt for B3; vurder krypteret lagring (f.eks. `react-native-encrypted-storage`) i fremtidig iteration hvis noter indeholder følsomme data. |
| Flere brugere redigerer samme liste samtidig. | Lokal last-write-wins kan overskrive andres ændringer. | B3 antager primært enejer-brug; dokumenter begrænsning. Fremtidig forbedring: server-wins/dialog. |
| Firestore's indbyggede offline-cache kan returnere gamle snapshots. | UI viser forældede data efter sync. | Brug altid explicit AsyncStorage-cache + pending queue som autoritativ; Firestore-snapshot bruges kun til at opdatere baseline. |
| App-installation / logud uden cache-rydning. | En anden bruger på samme enhed ser gamle lister. | Ryd alle `@dc:checklist_*` nøgler ved logud. |
| Dynamisk liste åbnes offline efter source-sag er ændret. | Source-link kan pege på forældet data. | Acceptabelt for B3; online sync retter til, når net er tilbage. |

---

## 8. Næste trin / afhængigheder

1. **Installer dependency:** `npx expo install @react-native-community/netinfo`.
2. **Implementer service:** `services/checklistsOffline.ts` med cache, pending queue og flush.
3. **Implementer hooks:**
   - `hooks/useProjectChecklistsOffline.ts` til listeoversigten.
   - `hooks/useChecklistItemsOffline.ts` til listedetalje.
4. **Tilføj idempotent toggle-helper** i `services/checklists.ts` (eller `services/checkpoints.ts`) så sync ikke dobbelt-toggler.
5. **Opdater UI:**
   - `app/(tabs)/checklists.tsx`: cached list, offline badge, loading-state.
   - `app/checklist.tsx`: optimistic updates, pending labels, pull-to-refresh, deaktiverede handlinger offline.
6. **Test:**
   - Unit tests for kø-kompaktion.
   - Manuel simulator-test med flymode.
   - Fysisk enheds-test før EAS build.
7. **Opdater testplan** med cases fra afsnit 6.
8. **QA + Audit-gate** før build-go.
9. **PO-acceptance test** på fysisk enhed.

---

**Relaterede filer:**
- `services/checklists.ts`
- `services/checkpoints.ts`
- `app/(tabs)/checklists.tsx`
- `app/checklist.tsx`
- `contexts/ProjectContext.tsx`
- `.claude/plans/comprehensive-bug-backlog-round.md`
- `.claude/team/design/us-010-offline-lists.md` (tidligere koncept-udkast)
