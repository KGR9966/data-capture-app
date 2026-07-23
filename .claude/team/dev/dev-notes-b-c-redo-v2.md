# Udvikler-noter — B+C redo v2

**Dato:** 2026-07-15  
**Forløb:** US-006 Build 1 — projektoprettelses-bugfix og dubletforhindring  
**Ansvarlig:** Developer Agent / Master Agent

---

## 1. US-006 — Projektoprettelse

### Root-cause

`createProject` i `services/projects.ts` udførte to separate asynkrone skrivninger:

1. `addDoc(projectsCollection, ...)` — oprettede `projects/{id}`.
2. `setDoc(membersSubcollection(...), ...)` — oprettede `projects/{id}/members/{memberId}`.

`firestore.rules` tilladte oprettelse af `projects/{id}` (linje 24), men havde **ingen regel for `members`-subcollection**. Standardreglen er `deny`, så medlemsskrivningen fejlede.

Fordi skrivningerne ikke var atomiske, blev projekt-dokumentet liggende i Firestore, mens appen fangede fejlen og viste:

```
Alert.alert("Fejl", "Kunne ikke oprette projektet.")
```

Gentagne klik kunne derefter skabe flere identiske projekter.

### Løsning

#### 1.1 Atomisk oprettelse

`createProject` bruger nu `writeBatch(db)` fra `@react-native-firebase/firestore`:

- Klient-genereret `projectRef` via `doc(projectsCollection)`.
- `memberRef` tilføjes samme batch.
- `await batch.commit()` sikrer, at begge skrivninger enten lykkes eller rulles tilbage.

#### 1.2 Firestore-regler

- Tilføjet regel for `/projects/{projectId}/members/{memberId}`.
- Rettet `resource.data.members` til `resource.data.memberEmails` i `projects/{projectId}`-reglen.
- Tilføjet email-baseret læseadgang via `request.auth.token.email in resource.data.memberEmails` (PO-godkendt).
- **Vigtigt:** Members-subcollection-reglen bruger `getAfter()` i stedet for `get()`. Dette er nødvendigt fordi medlemsdokumentet oprettes i samme batched write som projekt-dokumentet. `get()` ser pre-commit-tilstanden og ville nægte skrivningen; `getAfter()` ser tilstanden efter batchen og tillader den.

#### 1.3 Emulator-test

Firebase Emulator kunne ikke køre i dette miljø pga. manglende Java. Den tekniske risiko ved `get()` vs. `getAfter()` er håndteret ved kodeændring. Emulatortest bør gennemføres i udviklingsmiljøet før build, eller build testes grundigt på fysisk enhed i staging.

#### 1.4 Dubletforhindring

- `isDuplicateProjectName(name, ownedProjects)` tjekker trimmet, case-insensitivt navn mod brugerens egne projekter.
- `handleCreateProject` i `app/(tabs)/index.tsx` viser inline fejl:
  - `"Der findes allerede et projekt med dette navn."`
  - `"Kunne ikke oprette projektet. Prøv igen."`
- `creating`-flag deaktiverer "Opret"-knappen og viser "Opretter..." under oprettelse.

### Kendte begrænsninger (accepterede af PO)

1. **Tomt-navn-feedback:** Når brugeren trykker "Opret" med tomt/whitespace-navn, returnerer funktionen stille og knappen er disabled. Testplan TC-006.10 forventer inline fejlen `"Projektnavn er påkrævet."`. Dette er udskudt til næste release.
2. **Server-side dublet-revalidering:** Dublet-tjek er kun klient-side. Race-vindue mellem to samtidige enheder kan teoretisk tillade to projekter med samme navn. PO har accepteret dette som fase 1-forbehold.

Begge punkter er registreret i `memory/data-capture-backlog.md`.

---

## 2. Eksisterende bugs uden for US-006-scope

- `items`- og `comments`-reglerne refererer stadig til `.data.members` i stedet for `.data.memberEmails`. Dette kan påvirke læseadgang for delte projekter i andre flows. Bør følges op separat.

---

## 3. Git-commits

| Commit | Beskrivelse |
|---|---|
| (kommer) | fix(US-006): atomisk projektoprettelse, members-regler, dublet-tjek |

---

## 4. Testnoter

- TypeScript og lint grønne.
- Pre-test checks grønne (1 miljøadvarsel).
- Firebase Emulator-test af batch + members-regel skal gennemføres før build.

---

## 5. Næste trin

- Emulator-test af `writeBatch` + members-subcollection-regel.
- Commit af US-006 ændringer.
- PO-go til Build 1.
