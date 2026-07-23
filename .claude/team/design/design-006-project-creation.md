# Design: US-006 — Ret "Kunne ikke oprette projektet"-fejl og forhindr dubletter

**Dokument:** `design-006-project-creation.md`  
**Status:** Klar til PO-review  
**Forudsætning:** PO har godkendt US-006 og besluttet dublet-politik, unikhedsscope, beskedtekst og beskrivelsesfelt (se PO-beslutninger nedenfor).  
**Scope:** Kun projektoprettelse, idempotens og dublet-forhindring. Ingen andre US'er berøres.

---

## 1. Root-cause analyse

### 1.1 Observeret fejlforløb (B+C preview 18.07.2026)

1. Bruger trykker **Opret** i "Nyt projekt"-dialogen.
2. `createProject` i `services/projects.ts` skriver `projects/{id}` og derefter `members`-subcollection.
3. `projects/{id}` oprettes i Firestore.
4. Appen viser alligevel `Alert.alert("Fejl", "Kunne ikke oprette projektet.")`.
5. Ved gentagne tryk oprettes flere identiske projekter.

### 1.2 Præcis årsag

**Firestore Security Rules mangler en regel for `/projects/{projectId}/members/{memberId}`.**

- `createProject` udfører to asynkrone skrivninger:
  - `addDoc(projectsCollection, ...)` — opretter projekt-dokumentet.
  - `setDoc(doc(membersSubcollection(projectRef.id), ownerEmail || ownerId), ...)` — opretter ejer-medlemskabet.
- Firestore-reglerne tillader oprettelse af `projects/{projectId}` (linje 24), men der findes **ingen regel for medlems-subcollection**. Standardreglen er derfor `deny`.
- Den anden skrivning fejler, `createProject` kaster, og `handleCreateProject` i `app/(tabs)/index.tsx` fanger fejlen og viser fejlmeddelelsen.
- Fordi de to skrivninger ikke kører i en transaktion, forbliver projekt-dokumentet i databasen, selvom medlemskabet fejler.

### 1.3 Yderligere bidragende faktor

- `handleCreateProject` nulstiller ikke `creating`-flaget før efter `finally`, så gentagne klik kan oprette yderligere projekter, hvis brugeren trykker hurtigt eller får vist fejlen og trykker igen.
- Der er ingen duplicate-tjek før oprettelse, så flere projekter med samme navn kan oprettes.

---

## 2. Designmål

1. Fjern den falske fejlmeddelelse ved at sikre, at hele oprettelses-flowet enten lykkes eller rulles tilbage.
2. Giv brugeren korrekt feedback: loading, success, tydelig fejl ved reelle fejl, og inline dublet-advarsel.
3. Forhindr fremtidige dubletter af projektnavne for ejeren (trim + case-insensitivt).
4. Behandl eksisterende dubletter efter PO-beslutning: gamle dubletter lades være.
5. Sikr idempotens ved gentagne klik på **Opret**.

---

## 3. Data-model

### 3.1 Eksisterende model (uændret)

```text
collection projects
  document {projectId}
    name: string
    description: string (optional)
    ownerId: string
    memberEmails: string[]
    roles: Record<userId | email, ProjectRole>
    createdAt: Timestamp
    updatedAt: Timestamp

  subcollection members
    document {email | userId}
      userId?: string
      email?: string
      role: ProjectRole
      joinedAt: Timestamp
```

### 3.2 Ændringer

Ingen ændringer af feltstruktur. Der tilføjes:

- Firestore-regel for `members`-subcollection (se afsnit 6).
- Firestore-regel bruger `getAfter()` så medlems-skrivning i samme batched write som projektet kan evalueres korrekt.
- Lokal duplicate-tjek funktion i `services/projects.ts`.
- Idempotent oprettelses-wrapper (`creating`-flag).

---

## 4. Duplicate-regel

### 4.1 Scope

- **Kun projekter som den aktuelle bruger ejer.** Projektet skal have `ownerId == currentUser.uid`.
- Projektmedlemskaber tæller **ikke** med. En bruger må gerne eje et projekt med samme navn som et projekt, han/hun er medlem af.
- Beskrivelsesfelt indgår **ikke** i sammenligningen.

### 4.2 Normalisering

For både input og eksisterende navne:

1. `trim()`
2. `toLowerCase()` (dansk locale, men enkel lowercasing er tilstrækkelig)
3. Sammenligning sker på det normaliserede navn.

Eksempel: "  renovering  ", "RENovering" og "Renovering" betragtes som identiske.

### 4.3 Algoritme

```text
function isDuplicateProjectName(userId, candidateName, excludeProjectId?):
  normalized = normalize(candidateName)
  for each project in user's owned projects:
    if excludeProjectId and project.id == excludeProjectId: continue
    if normalize(project.name) == normalized: return true
  return false
```

- Klienten har allerede `projects`-listen indlæst via `subscribeToProjects`. Tjekket køres derfor lokalt og øjeblikkeligt ved tryk på **Opret**.
- Tjekket kræver ingen ekstra Firestore-læsninger.

### 4.4 Race-condition / konsistens

Firestore understøtter ikke native unikke indeks på tværs af dokumenter. Derfor:

- **Primær håndhævelse:** app-logik + deaktiveret knap under oprettelse.
- **Sekundær håndhævelse:** `createProject` wrapper oprettelsen i en Firestore **batch write** eller **transaction**. Inden skrivning kan batch'en læse ejerens eksisterende projekter og validere navn. Dette reducerer race-vinduet yderligere, men er ikke 100 % garanteret mod to samtidige klienter.
- **Hvis race opstår** og to dokumenter med samme navn oprettes, vil fremtidig oprettelse af endnu et projekt med det navn blokeres, indtil antallet er reduceret til ét (acceptkriterie 7 i US-006).

---

## 5. Oprettelsesflow

### 5.1 Sekvensdiagram

```text
Bruger trykker Opret
        │
        ▼
[Valider input]
        │
        ├─ Navn tomt? ── Ja ── Vis feltfejl, returnér
        │
        ├─ Dublettjek (lokal) ── Ja ── Vis inline fejl
        │      "Der findes allerede et projekt med dette navn."
        │
        ▼
[Deaktivér Opret-knap]
        │
        ▼
createProject(name, ownerId, email, description)
        │
        ├─ Normalisér navn
        ├─ Generér clientRef (valgfrit: uuid eller timestamp+browser)
        ├─ Batch/transaction:
        │   1. Læs ejerens projekter (valider unikhed igen)
        │   2. addDoc projects
        │   3. setDoc members/{ownerId}
        │   4. commit
        │
        ├─ Fejl? ── Vis inline fejl, behold dialog åben,
        │           nulstil creating-flag, log detaljer
        │
        ▼
Success
        │
        ▼
setActiveProject(project)
setModalVisible(false)
nulstil navn/beskrivelse
router.push("/(tabs)/board")
nulstil creating-flag
```

### 5.2 Idempotens

- `creating`-lokal state sættes til `true` ved oprettelsesstart og til `false` i `finally`.
- **Opret**-knappen er disabled mens `creating == true` eller navn er tomt.
- (Valgfri forstærkning) `clientRef` genereres per oprettelsesforsøg og sendes med som et metadata-felt. Hvis samme `clientRef` allerede findes (f.eks. pga. netværksreplay), returneres det eksisterende projekt. PO har ikke bedt om dette; det tilbydes som fremtidig forstærkning uden at ændre scope.

### 5.3 Fejlhåndtering

| Scenarie | Bruger-feedback | Handling |
|---|---|---|
| Tomt navn | Inline fejl under feltet | Deaktivér Opret |
| Dublet | Inline fejl: "Der findes allerede et projekt med dette navn." | Deaktivér Opret |
| Firestore create fejler | Inline fejl + log | Ingen navigation, dialog forbliver åben |
| Medlems-skrivning fejler | Inline fejl + log | Rollback via batch/transaction |
| Navigation fejler (usandsynlig) | Inline fejl, men projekt oprettet | Tillad bruger at lukke dialog manuelt |

**Vigtigt:** Fejlmeddelelsen `Alert.alert("Fejl", "Kunne ikke oprette projektet.")` fjernes og erstattes af **inline validering/fejl** under navn-feltet. Brugeren skal kunne se og rette problemet uden at lukke dialogen.

### 5.4 Annuller under fejl

Hvis brugeren ser en fejl og trykker **Annuller**, lukkes dialogen. Da projektet enten er oprettet korrekt (og så er brugeren navigeret til board) eller ikke er oprettet (og så findes det ikke), opfyldes acceptkriterie 3: "højst ét projekt med det indtastede navn for brugeren".

---

## 6. Firestore Security Rules

### 6.1 Eksisterende regel (projekter)

Beholdes uændret, men rettes for `members`-array vs `roles` (se nedenfor).

### 6.2 Ny regel for medlems-subcollection

Tilføj under `match /projects/{projectId}`:

```firestore
match /projects/{projectId}/members/{memberId} {
  function projectData() {
    return get(/databases/$(database)/documents/projects/$(projectId)).data;
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

### 6.3 Bemærkning til eksisterende projekt-regel

Den nuværende `allow read` for projekter tjekker:

```firestore
resource.data.ownerId == getUserId()
|| getUserId() in resource.data.members
|| getUserId() in resource.data.roles
```

Feltet `members` findes ikke i `Project`-interfacet; det korrekte felt er `memberEmails` (array). Dette er en eksisterende bug, der skal rettes samtidig:

```firestore
allow read: if isAuthenticated()
             && (resource.data.ownerId == getUserId()
                 || getUserId() in resource.data.memberEmails
                 || getUserId() in resource.data.roles);
```

`memberEmails` er email-baseret, mens `roles` er uid-baseret. Da `getUserId()` returnerer `request.auth.uid`, vil tjekket `getUserId() in resource.data.memberEmails` aldrig være sandt for uid. Dette er bevidst: invitationer er email-baserede, og når en bruger accepterer, skrives uid i `roles`. Indtil da har brugeren ikke læseadgang. PO bør bekræfte, at dette er den ønskede invitationss-flow. Hvis invitationer skal give øjeblikkelig læseadgang baseret på email, kræver reglerne `request.auth.token.email`. Dette er en eksisterende afvigelse, som ikke er en del af US-006, men som bør dokumenteres.

---

## 7. UI/UX

### 7.1 Dialog-tilstande

| Tilstand | Visuel indikation | Opret-knap |
|---|---|---|
| Inaktiv | Standard | Enabled hvis navn ikke tomt |
| Validérer | Inline fejl hvis dublet/tom | Disabled |
| Opretter | Spinner på knap, tekst "Opretter..." | Disabled |
| Fejl | Rød inline besked | Enabled efter rettelse |
| Success | Modal lukker, navigation | — |

### 7.2 Inline fejlplacering

Fejlmeddelelser placeres umiddelbart under projektnavn-inputtet. Eksempelvis:

- "Projektnavn er påkrævet."
- "Der findes allerede et projekt med dette navn."
- "Kunne ikke oprette projektet. Prøv igen."

### 7.3 Keyboard og fokus

- Projektnavn-feltet har `autoFocus` (eksisterende).
- Ved valideringsfejl bevares fokus i navn-feltet.
- Ved success fjernes fokus automatisk når modal lukkes.

---

## 8. Afhængigheder

- `services/projects.ts` — `createProject`, `subscribeToProjects`, ny duplicate-tjek funktion.
- `app/(tabs)/index.tsx` — `handleCreateProject`, modal UI, `creating`-state.
- `contexts/ProjectContext.tsx` — `setActiveProject`.
- `firestore.rules` — ny regel for `members`-subcollection + rettelse af `members` → `memberEmails`.
- `services/roles.ts` — ingen ændringer forventet.

---

## 9. Eksisterende dubletter

### 9.1 PO-beslutning

Gamle dubletter lades være. Fremtidige dubletter forhindres.

### 9.2 Konsekvens for oprettelse

Hvis en bruger allerede har to projekter med navnet "Renovering", kan han/hun **ikke** oprette et tredje projekt med samme navn, før antallet er reduceret til ét. Appen viser dublet-beskeden. Dette opfylder acceptkriterie 7.

### 9.3 Migration

Ingen migrering nødvendig. Hvis PO senere ønsker en oprydning, kræver det en separat opgave og PO-go.

---

## 10. Testbare antagelser

- `subscribeToProjects` returnerer ejerens projekter med `ownerId == currentUser.uid`.
- `createProject` kaldes med gyldig `ownerId` (current user uid) og valgfri `ownerEmail`.
- Firestore-reglerne vil blive rettet før kode-test, da test ellers vil fejle på medlems-subcollection.

---

## 11. Åbne spørgsmål til PO

Ingen åbne spørgsmål. Alle PO-beslutninger er afklarede i US-006.

**Email-baserede invitationer (PO-godkendt):** Invitationer skal give læseadgang til projektet, før brugeren har accepteret invitationen. Firestore-reglerne udvides derfor med `request.auth.token.email in resource.data.memberEmails` i både `projects/{projectId}`-reglen og `members`-subcollection-reglen.

---

## 12. PO-beslutninger (genbekræftet)

| # | Spørgsmål | PO-valg |
|---|---|---|
| 1 | Eksisterende dubletter | A — gamle dubletter lades være; fremtidige dubletter forhindres. |
| 2 | Scope af duplicate-tjek | Kun projekter brugeren ejer. |
| 3 | Beskedtekst | "Der findes allerede et projekt med dette navn." |
| 4 | Beskrivelsesfelt | Kun projektnavn medtages i duplicate-tjek. |

---

## 13. Review-punkter

- [ ] Design dækker alle acceptkriterier i US-006.
- [ ] Root-cause (manglende Firestore-regel for members) er dokumenteret.
- [ ] Duplicate-tjek er trimmet, case-insensitivt og begrænset til ejerens projekter.
- [ ] Oprettelsesflow er idempotent (deaktiveret knap + batch/transaction).
- [ ] UI-fejl er inline, ikke modal Alert.
- [ ] Firestore-regelændringer er specificeret.
- [ ] Eksisterende dubletter håndteres efter PO-beslutning.
