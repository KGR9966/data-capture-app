# Compliance & sikkerhedsgodkendelse — B+C redo v2

**Dokument:** `compliance-b-c-redo-v2.md`  
**Status:** Compliance/Security Agent review udført. Klar til PO-godkendelse af design.  
**Dækker:** US-006, US-004 og US-005 design-dokumenter samt eksisterende Firestore-regler og app-konfiguration.

---

## 1. Review-scope

Denne rapport gennemgår:

1. Firestore Security Rules for `projects`, `items`, `checklists` og subcollections.
2. GDPR/persondata-aspekter ved projektoprettelse, stemmeoptagelse, deling og dynamiske lister.
3. App Store-egnethed og tilladelser.
4. Firestore læseomkostninger ved dynamiske lister.
5. Identifikation af nødvendige regelændringer og risici.

---

## 2. Gennemgang af Firestore Security Rules

### 2.1 `projects/{projectId}` — eksisterende regel

```firestore
allow read: if isAuthenticated()
             && (resource.data.ownerId == getUserId()
                 || getUserId() in resource.data.members
                 || getUserId() in resource.data.roles);
```

**Fund:** Reglen refererer til `resource.data.members`, men projekt-dokumentet har feltet `memberEmails` (array af email-adresser). `roles` er en map med uid-nøgler.

**Vurdering:**

- `getUserId() in resource.data.roles` virker korrekt for uid-baserede roller.
- `getUserId() in resource.data.memberEmails` vil aldrig være sandt, fordi `getUserId()` er `request.auth.uid` og ikke email.
- Hvis invitationer skal give læseadgang før modtageren har accepteret (email-baseret), kræves `request.auth.token.email in resource.data.memberEmails`.

**PO-beslutning:** Ja — giv email-baseret læseadgang til projekter, hvor brugerens email står i `memberEmails`. Dette gør invitations-flowet mere intuitivt og harmonerer med fremtidig samarbejdsfunktionalitet.

**Anbefaling:** Ret `resource.data.members` til `resource.data.memberEmails` og tilføj email-baseret læseadgang i projects-reglen og members-subcollection-reglen.

### 2.2 `projects/{projectId}/members/{memberId}` — manglende regel

**Fund:** Der findes ingen regel for medlems-subcollection. Standard er `deny`.

**Konsekvens:** `createProject` skriver projekt-dokumentet med succes, men fejler på medlems-skrivningen. Dette er den præcise årsag til den falske fejlmeddelelse i US-006.

**Anbefaling:** Tilføj regel som specificeret i `design-006-project-creation.md`, afsnit 6.2:

```firestore
match /projects/{projectId}/members/{memberId} {
  function projectData() {
    // getAfter() er nødvendig fordi medlemsdokumentet oprettes i samme batched write som projektet.
    return getAfter(/databases/$(database)/documents/projects/$(projectId)).data;
  }

  allow read: if isAuthenticated()
               && (projectData().ownerId == getUserId()
                   || getUserId() in projectData().memberEmails
                   || getUserId() in projectData().roles);

  allow create: if isAuthenticated()
                 && projectData().ownerId == getUserId()
                 && request.resource.data.keys().hasAll(["role"])
                 && request.resource.data.role in ["owner", "admin", "editor", "viewer"];

  allow update, delete: if isAuthenticated()
                         && (projectData().ownerId == getUserId()
                             || (getUserId() in projectData().roles
                                 && projectData().roles.get(getUserId(), null) in ["owner", "admin"]));
}
```

### 2.3 `items/{itemId}` — eksisterende regel

Reglerne for items er korrekte, men komplekse. De læser projekt-dokumentet for hver operation, hvilket er nødvendigt for projekt-baseret adgangskontrol.

**Bemærkning:** Ved afkrydsning i dynamiske lister med `syncStatusToSource` opdateres kildesagen. Dette sker via app-logikken med de eksisterende update-regler, som kræver `owner/admin/editor`. Det er acceptabelt, fordi listen kun kan oprettes af brugere med samme rolle.

### 2.4 `checklists/{checklistId}` — eksisterende regel

Nuværende regler:

```firestore
match /checklists/{checklistId} {
  allow read: if isAuthenticated()
               && (resource.data.ownerId == getUserId()
                   || getUserId() in resource.data.sharedWith);
  ...
}
```

**Fund:** Reglerne er udelukkende owner/sharedWith-baserede. De håndhæver ikke, at modtagere af en delt liste også har adgang til det underliggende projekt og items.

**Konsekvens:** En bruger kunne dele en dynamisk liste med en anden bruger, som ikke er medlem af projektet. Ved dyb link ville modtageren kunne læse listen, men ikke kildesagerne. Hvis checklist-items indeholder titler/noter fra kildesager, kan dette medføre informationslækage.

**Anbefaling:** Opdater reglerne til projektspecifik adgangskontrol som angivet i `design-005-dynamic-lists.md`, afsnit 9:

- Læsning kræver `ownerId == getUserId()` **eller** medlemskab af `projectId`.
- Oprettelse kræver `owner/admin/editor`-rolle i projektet.
- Opdatering kræver `owner/admin/editor`-rolle i projektet (eller ejerskab).
- Sletning kræver ejerskab.

For **eksisterende manuelle Aktionslister uden `projectId`** skal en fallback-regel sikre, at kun ejeren kan læse/slette:

```firestore
match /checklists/{checklistId} {
  allow read: if isAuthenticated()
               && (
                   resource.data.ownerId == getUserId()
                   || (resource.data.projectId != null && isProjectMember(resource.data.projectId))
               );
  ...
}
```

### 2.5 `checklists/{checklistId}/items/{itemId}` — eksisterende regel

Nuværende regler er owner/sharedWith-baserede. De skal opdateres til projektspecifik adgangskontrol parallelt med `checklists`-reglerne.

**Anbefaling:**

```firestore
match /checklists/{checklistId}/items/{itemId} {
  function parentChecklist() {
    return get(/databases/$(database)/documents/checklists/$(checklistId)).data;
  }

  allow read: if isAuthenticated()
               && (
                   parentChecklist().ownerId == getUserId()
                   || (parentChecklist().projectId != null && isProjectMember(parentChecklist().projectId))
               );

  allow create, update, delete: if isAuthenticated()
                                 && (
                                     parentChecklist().ownerId == getUserId()
                                     || (parentChecklist().projectId != null && hasProjectRole(parentChecklist().projectId, ["owner", "admin", "editor"]))
                                 );
}
```

---

## 3. GDPR / persondata

### 3.1 Hvilke persondata håndteres?

| Data | Hvor | Bemærkning |
|---|---|---|
| Navn / email | `ProjectMember`, `CaptureItem.createdByName/Email` | Bruges til visning og invitationer |
| Talemæssig input | Stemmeoptagelse konverteres til tekst | Ingen stemmelagring, kun transcript |
| Fotos | Firebase Storage | Bruger-genereret; kan indeholde personer |
| Transkriptioner / noter | `CaptureItem.content` | Kan indeholde personoplysninger |
| Projektmedlemmer | `projects/{id}/members` | Email og rolle |

### 3.2 Lovlighed

- **Behandlingsgrundlag:** Appen er et produktivitetsværktøj. Brugeren behandler egne data og data om projektmedlemmer baseret på samtykke/legitim interesse i arbejdssammenhæng. Der indsamles ingen data uden brugeraktion.
- **Tredjeparter:** Firebase (Google) lagrer data. Ingen andre tredjeparter tilgår tekst/foto uden brugerens handling (f.eks. deling via native share sheet).
- **OCR/oversættelse:** Lokal/fjern ML kan behandle tekst. Sørg for, at brugeren er informeret i privacy-policy. Dette er ikke en ændring i scope for fase 1.

### 3.3 Deling af lister

- **Native share-sheet:** Brugeren aktivt vælger at dele en tekstoversigt. Dette er brugerstyret deling. Modtagere får kun det, listen indeholder.
- **Dyb link:** Modtageren skal have projektadgang for at åbne listen. Linket i sig selv er ikke sensitivt (kun id'er), men appen skal ikke eksponere indhold uden adgangstjek.
- **Anbefaling:** I appens UI vises en kort advarsel ved deling: "Modtagere kan se listens titler og noter. Del kun med personer, der må se disse oplysninger." Dette bør godkendes af PO, men er ikke en blocker.

### 3.4 Stemmeoptagelse

- Mikrofon- og talegenkendelsestilladelser er allerede i `app.json` med forklarende tekster.
- Stemmeoptagelse konverteres til tekst lokalt/via platform-API. Der lagres ikke lyd.
- Auto-gem sikrer, at brugerens transcript ikke går tabt.

### 3.5 Data-minimering

- Duplicate-tjek for projektnavn bruger kun navn; beskrivelse indgår ikke.
- Dynamiske lister deler kun det indhold, brugeren eksplicit vælger at dele.

---

## 4. App Store-egnethed

### 4.1 Eksisterende tilladelser

`app.json` indeholder allerede:

- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- Android: `CAMERA`, `READ_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `POST_NOTIFICATIONS`

### 4.2 Nye tilladelser nødvendige?

For fase 1 kræves **ingen nye native tilladelser**:

- Deling via native share sheet bruger `react-native-share` og kræver ikke ekstra tilladelser.
- Dyb links bruger det eksisterende `scheme: "datacapture"`.
- Dynamiske lister kræver ingen ny hardware-adgang.

### 4.3 App Store-review overvejelser

- **Stemmeoptagelse:** Forblød indtaling under aktiv optagelse (US-004) reducerer risiko for, at brugeren oplever tabt data. Dette er en kvalitetsforbedring, ikke en ny tilladelse.
- **Dyb link:** Sørg for, at dybe links håndteres korrekt, når appen ikke er installeret (fallback til hjemmeside/App Store). Dette kan konfigureres i fremtidig universal links / associated domains.
- **Privacy Nutrition Label:** Ingen ændringer i indsamlede datatyper.

---

## 5. Firestore læseomkostninger

### 5.1 Aktuel belastning

- `SearchScreen` abonnerer på alle brugerens projekter og alle deres items. Dette er den største læsekilde.
- Dynamiske lister tilføjer:
  - En `checklists`-subscription per bruger.
  - En `checklists/{id}/items`-subscription pr. åbnet liste.
  - Synkronisering kræver læsning af `items` for det pågældende projekt (allerede indlæst, hvis brugeren kommer fra Søg-fanen).

### 5.2 Kontroller

| Kontrol | Formål |
|---|---|
| Maks 50 dynamiske lister per bruger | Begræns subcollection-skræk |
| Synk kun ved åbning | Undgå baggrundslæsning |
| Unsubscribe når liste lukkes | Stop unødvendige lyttere |
| Projekt-scoped søgning | Reducer mængden af items i hukommelse |
| Ingen global dynamisk liste | PO-valg, reducerer kompleksitet |

### 5.3 Anbefaling

Overvåg antal læste dokumenter under QA. Hvis en testbruger med f.eks. 5 projekter à 500 sager oplever langsommelighed, skal paginering overvejes før produktion. Dette er dog en optimering, ikke en fase 1-blocker.

---

## 6. Risici og mitigations (compliance-vinkel)

| Risiko | Sandsynlighed | Konsekvens | Mitigation |
|---|---|---|---|
| Medlems-subcollection regel forbliver `deny` | Høj (hvis glemt) | US-006 fejler igen | Regelændring dokumenteret og skal testes før build |
| `members` vs `memberEmails` forvirring | Mellem | Invitationer virker ikke korrekt | Ret regel og test invitationsflow separat |
| Deling af dynamisk liste til ikke-projektmedlem | Mellem | Informationslækage | Projekt-baserede checklist-regler |
| Dyb link åbner indhold uden rettighedstjek | Mellem | GDPR-brud / data-lækage | App-level rettighedstjek før visning |
| For mange dynamiske lister → høj regning | Mellem | Omkostning / dårlig UX | Maks 50 lister, lazy sync, unsubscribe |
| OCR-tekst/oversættelse sendes til tredjepart | Lav | Privacy concern | Ingen ændring; eksisterende privacy policy gælder |

---

## 7. Krævede regelændringer (opsummering)

1. Tilføj regel for `/projects/{projectId}/members/{memberId}` (US-006).
2. Ret `resource.data.members` til `resource.data.memberEmails` i `projects/{projectId}` read-regel.
3. Opdater `checklists` og `checklists/{id}/items` regler til projektspecifik adgangskontrol (US-005).
4. Tilføj fallback for eksisterende manuelle Aktionslister uden `projectId`.

---

## 8. Godkendelse / afvisning

**Compliance/Security Agent vurdering:**

- Designet for US-006, US-004 og US-005 kan implementeres sikkert, **forudsat** at Firestore-reglerne opdateres som angivet ovenfor.
- Ingen nye native tilladelser kræves.
- Ingen nye persondata-indsamlinger indføres.
- Dyb link-deling skal altid kombineres med projekt-rettighedstjek i appen.

**Betinget godkendelse:** Ja — designet godkendes til videre testplan og kode, **under forudsætning af** at de krævede Firestore-regelændringer følger med i samme build og testes af QA Agent.

**Eskalering til PO:** Hvis PO ønsker email-baseret læseadgang til projekter før invitation accepteres, kræver det en mindre regelændring og skal besluttes inden kode.

---

## 9. Kontroller før build

- [ ] `firestore.rules` opdateret med medlems-subcollection regel.
- [ ] `firestore.rules` opdateret med `memberEmails` rettelse.
- [ ] `firestore.rules` opdateret med projektspecifikke checklist-regler.
- [ ] Dyb link-handler tjekker projektadgang i appen.
- [ ] Delings-UI viser privacy-advarsel (hvis PO godkender).
- [ ] QA Agent tester regler med emulator eller staging-database.
