# Compliance / Security review: Søgning og dynamiske lister (v2)

**Reviewet af:** Compliance/Security Agent  
**Dato:** 2026-07-15  
**Input:** `design-search-lists-v2.md`, `us-002-search-v2.md`, `us-005-dynamic-lists-v2.md`, afsnit 4 i `plan-search-lists-redesign.md`  
**Output-status:** GO med forbehold — designet er godkendt fra compliance-synspunkt, forudsat at forbeholdene nedenfor adresseres før kode og Firestore-regler deployes.

---

## 1. Overblik

**Konklusion: GO med forbehold.**

Designet indfører en klar projektbaseret adgangsmodel, adskiller listepunkt-status fra sags-status og gemmer søgestrenge sikkert i Firestore uden server-side evaluering. Dette reducerer både sikkerheds- og data-rettighedsrisici sammenlignet med den nuværende ejer-centric model.

Dog er der **tre konkrete forbehold**, som skal afklares eller lukkes, før designet kan betragtes som fuldt compliance-sikkert:

1. **Projekt-scoped læseadgang skal afklares med PO.** Designet antyder, at alle projektmedlemmer kan læse alle lister i projektet. Det er en ændring fra nuværende adfærd (kun ejer + `sharedWith`) og skal bekræftes eksplicit.
2. **Firestore-regler for `items/{itemId}/checkpoints` mangler i designet.** De skal tilføjes, så de matcher den eksisterende item-rettighedsmodel.
3. **Migrering af ejer-baserede lister uden `projectId` skal håndteres**, ellers risikerer eksisterende lister at blive ulæselige.

Hvis forbeholdene løses som anbefalet, er der **ingen compliance-blokerere** for at gå videre til testplan og kode.

---

## 2. Vurderede områder

### 2.1 Firestore-regler for lister og checkpoints

**Status: Delvist tilstrækkeligt — kræver præcisering.**

Designet angiver regler for `checklists` og `checklists/{id}/items`, men **angiver ikke konkrete regler for den nye subcollection `items/{itemId}/checkpoints`**. Det er kritisk, fordi checkpoints både oprettes og opdateres under listeoprettelse og afkrydsning.

**Bemærkninger:**

- Nuværende `firestore.rules` giver item-update til project owner/admin/editor og (i visse tilfælde) tildelte editor-brugere. Dette bør være udgangspunkt for checkpoint-reglerne.
- Designets forslag "bruger har update-adgang til parent item" er rigtig retning, men skal nedskrives som faktiske regler med `get()`/eksists-tjek på `projects/{projectId}`.
- `checklists`-reglerne skal opdateres fra ejer-baseret (nuværende) til projektbaseret adgang. Dette er en ændring af adfærd og skal testes grundigt.

### 2.2 Læseadgang: hvem må se hvilke lister?

**Status: Kræver PO-afklaring.**

Designet foreslår:

> read: Bruger er ejer (`ownerId == uid`) ELLER bruger er medlem af projektet (`projectId` matcher og bruger har rolle i `projects/{projectId}`) ELLER bruger er i `sharedWith`.

**Bemærkninger:**

- Denne model betyder, at **alle projektmedlemmer (inklusive viewers) kan se alle dynamiske lister i projektet**, ikke kun dem de ejer eller får delt.
- Det er en klar ændring fra nuværende regler, hvor læseadgang kun gives til ejer og `sharedWith`.
- PO-beslutning #3 ("projektspecifikke lister") fastslår scope, men ikke synlighedsrettigheder. Det er en implicit beslutning om, at lister er synlige på projektniveau.
- **Anbefaling:** få PO til eksplicit at bekræfte, at viewers i et projekt må se andres lister. Hvis nej, skal læseadgang begrænses til ejer + `sharedWith` + project owner/admin (men ikke viewers/editors generelt).

### 2.3 Skriveadgang: hvem må oprette/ændre/slette lister og punkter?

**Status: Tilstrækkeligt med justering.**

Designets skriveregler er:

| Operation | Model |
|---|---|
| create checklist | owner + project owner/admin/editor |
| update checklist | owner, sharedWith med role, eller project owner/admin |
| delete checklist | owner eller project owner/admin |
| checklist points | afledt af parent checklist update-adgang |
| item checkpoints | afledt af parent item update-adgang |

**Bemærkninger:**

- Model, hvor project owner/admin kan slette/redigere andres lister, er typisk OK for governance, men skal kommunikeres til brugerne.
- Ingen særskilt regel for, at project **editor** må slette andres lister — designet siger kun owner/admin til delete. Det er konsistent.
- **Bemærk:** Hvis en bruger er editor i et projekt, kan de oprette checkpoints i items (via listeoprettelse), men ikke slette andres lister. Det er en fin opdeling, men skal dokumenteres.

### 2.4 Søgestrenge: logges de? Indeholder de persondata?

**Status: OK med forbehold om data-retention.**

Designet angiver korrekt:

- Søgestrenge logges **ikke** med persondata.
- `searchQuery.raw` gemmes i Firestore.
- Parser kører klient-side; ingen server-side evaluering.

**Bemærkninger:**

- Der er ingen SQL/NoSQL-injection-risiko, da søgestrengen ikke evalueres af Firestore eller en backend.
- Søgestrenge kan indeholde persondata, følsomme projektoplysninger eller forretningskritisk tekst. Da de gemmes i Firestore under `checklists/{id}/searchQuery.raw`, gælder samme adgangsregler som for selve listen.
- **Ingen specifik retention-politik** for søgestrenge er beskrevet. Da det er brugerdata, er det OK under PO's nuværende model, men bør noteres i privacy-/data-model-dokumentation.

### 2.5 Reference-integritet: listepunkt → item/checkpoint

**Status: Acceptabelt med håndtering af brudte referencer.**

Designet definerer tre referenceniveauer:

- `sourceItemId`
- `sourceCheckpointId`
- `sourceField` + `lineIndex`

**Bemærkninger:**

- Designet håndterer brudte referencer ved at markere punkter som `isStale: true` med en note. Dette reducerer risiko for data-tab.
- Der er dog en **risiko under lazy migration**: hvis en item er slettet *før* listen åbnes og migreres, kan checkpoint ikke genskabes, og punktet vil blive markeret som `manual`/ældre punkt. Det kan medføre tab af sporbarhed.
- Der er ingen transaktionsbeskrivelse for samtidig opdatering af `checklist point`, `checkpoint` og eventuelt `item.status`. Dette skal håndteres atomisk i koden (f.eks. Firestore `runTransaction` eller batch) for at undgå inkonsistent status.

### 2.6 Migrering af eksisterende data

**Status: Risikabelt — kræver forbehold og testplan.**

Designet foreslår lazy migration ved første åbning efter deploy:

- Punkter uden `sourceCheckpointId` får oprettet checkpoints ud fra item-tekst.
- `syncStatusToSource` fjernes.
- Gamle afkrydsningsstatus bevares.

**Bemærkninger:**

- Lazy migration er fornuftig for at undgå tvungen massiv migration, men den er **afhængig af netværk og item-tilgængelighed**.
- Hvis en bruger åbner en gammel liste offline, kan migration ikke gennemføres. Koden skal håndtere dette gracefult og markere punkter som "ikke migreret endnu" eller blokere redigering indtil online.
- Eksisterende lister uden `projectId` vil blive problematiske under de nye projektbaserede regler. Designets `projectId?: string` gør det optional, men reglerne skal enten:
  - give ejeren fortsat adgang til lister uden `projectId`, eller
  - migrere eksisterende lister til et projekt ved første åbning.
- **Ingen rollback-strategi** er beskrevet. Anbefales tilføjet i testplan/udviklingsnoter.

### 2.7 Offline / concurrency

**Status: Ude af scope — acceptabelt, men med kendte risici.**

Designet fastslår, at offline-synkronisering af lister ikke er med i fase 1. Klient-side søgning giver dog offline-søgning i allerede cached items.

**Bemærkninger:**

- Der er **ingen beskrivelse af concurrency-håndtering**. Når to brugere afkrydser samme listepunkt eller samme checkpoint samtidig, kan der opstå race conditions. Anbefaling: brug Firestore-transaktioner eller optimistisk låsning.
- Dynamisk opdatering (nye matches tilføjes automatisk) kører ved åbning. Hvis det samtidig med brugerredigering, kan der opstå konflikter. Dette bør håndteres i `synchronizeDynamicChecklist`.

---

## 3. Risici

| # | Risiko | Konsekvens | Sandsynlighed | Mitigation |
|---|---|---|---|---|
| R1 | Projektmedlemmer (inkl. viewers) får automatisk læseadgang til alle lister i projektet. | Lækage af interne/arbejdslistefortegnelser mellem projektmedlemmer, der forventede privat ejerskab. | Mellem | **PO skal eksplicit bekræfte læseadgangsmodellen.** Hvis nej, begræns læseadgang til ejer + sharedWith + project owner/admin. |
| R2 | Manglende Firestore-regler for `items/{itemId}/checkpoints`. | Uautoriserede brugere kan potentielt læse eller ændre checkpoints, eller regler fejler ved deploy. | Høj | **Tilføj konkrete regler** for checkpoints, der matcher item-rettigheder, før kode-test. |
| R3 | Eksisterende lister uden `projectId` bliver utilgængelige efter regelændring. | Brugere mister adgang til eksisterende lister. | Mellem | **Håndtér gammel data i reglerne** eller migrér `projectId` ved første åbning. Test med gamle lister. |
| R4 | Lazy migration fejler offline eller hvis item er slettet. | Tab af sporbarhed; punkter markeres som manual/ældre uden korrekt reference. | Mellem | Blokér migration-afhængige handlinger offline; log brudte referencer; test edge cases. |
| R5 | Race condition mellem `checklist point`-status, `checkpoint`-status og `item.status`. | Inkonsistent tilstand: item markeret done mens checkpoints stadig er åbne, eller omvendt. | Mellem | Brug Firestore `runTransaction` eller batch for afkrydsningsflowet; test samtidige opdateringer. |
| R6 | Søgestrenge med persondata/følsomme oplysninger gemmes uden retention-politik. | Potentiel overholdelsesrisiko (GDPR/data-minimering) på længere sigt. | Lav | Dokumentér at søgestrenge behandles som brugerdata; overvej retention-/slettepolitik senere. |
| R7 | Dyb link-delning bypasser projekttjek hvis appen åbner link direkte. | Modtagere uden projektrettigheder kan få vist liste eller fejlmeldinger, der afslører eksistensen af lister. | Lav | Sørg for at dyb link-håndtering altid tjekker projektmedlemskab **før** data hentes; vis neutral fejlmeddelelse. |
| R8 | Highlight-komponenten parser brugerinput og renderer tekst-segmenter. | Hvis implementeret forkert, kan specialtegn eller escape-sekvenser forårsage rendering-problemer (ikke injection i React Native, men UX/fejl). | Lav | Brug kun React Native `Text`-segmenter; ingen HTML/markup; test med specialtegn. |

---

## 4. Anbefalinger til Developer Agent

1. **Tilføj konkrete Firestore-regler for `items/{itemId}/checkpoints`** før kode-test. Forslag:
   - `read`: bruger har read-adgang til parent item.
   - `create/update/delete`: bruger har update-adgang til parent item (project owner/admin/editor, eller tildelt editor efter nuværende model).

2. **Løs `projectId` for gamle lister.** Enten:
   - Behold ejer-baseret læseadgang for lister uden `projectId` i reglerne, eller
   - Migrér `projectId` ved første åbning og opdater reglerne til altid at kræve `projectId`.

3. **Brug transaktion/batch ved afkrydsning.** `toggleChecklistPoint` skal opdatere `checklist point`, `checkpoint` og eventuelt `item.status` i én atomisk handling for at undgå race conditions.

4. **Håndtér offline migration.** Hvis en gammel liste åbnes offline, vis en tydelig indikator og blokér oprettelse/ændring af checkpoints indtil netværksforbindelse er tilbage.

5. **Dyb link-sikkerhed.** Ved åbning af delt liste via dyb link: tjek først projektmedlemskab, derefter hent liste. Vis neutral fejlmeddelelse ved manglende rettigheder.

6. **Valider projektvalg og rettigheder før listeoprettelse.** Som beskrevet i designet — sørg for at UI viser specifikke fejl (ikke generisk) og deaktiverer "Opret liste" hvis brugeren ikke har editor/admin/owner-rolle.

7. **Dokumentér søgestrengs-håndtering** i privacy-/data-model-noter: søgestrenge gemmes sammen med listen og følger listens adgangsregler.

---

## 5. Godkendelse

**Compliance-status: GO med forbehold.**

Designet godkendes fra et sikkerheds- og data-rettighedssynspunkt, **forudsat** at følgende lukkes før kode og Firestore-regel-deploy:

- [ ] PO bekræfter læseadgangsmodel for projektspecifikke lister (se afsnit 2.2).
- [ ] Konkrete Firestore-regler for `items/{itemId}/checkpoints` tilføjes.
- [ ] Håndtering af eksisterende lister uden `projectId` afklares og implementeres.
- [ ] `toggleChecklistPoint` implementeres atomisk (transaction/batch).

Når ovenstående er på plads, er der ingen compliance-blokerere for at fortsætte til testplan og kodefasen.

**Forbehold ved godkendelse:**

- Nuværende godkendelse dækker design-niveau. Kode og Firestore-regler skal gennemgås igen af QA og Audit Agent før build.
- Offline-synkronisering og push-notifikationer er ude af scope og skal gennemgås separat, når de tages op.

---

## Relaterede filer

- `C:\Users\kimgr\data-capture-app\.claude\team\design\design-search-lists-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-002-search-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-005-dynamic-lists-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\plans\plan-search-lists-redesign.md`
- `C:\Users\kimgr\data-capture-app\firestore.rules`
