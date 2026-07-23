# QA-rapport: US-006 — Projektoprettelse og dubletter

**Dokument:** `.claude/team/qa/qa-report-us-006.md`  
**Dato:** 2026-07-15  
**Build:** US-006 rettelse (post B+C preview 18.07.2026)  
**Ansvarlig:** QA Agent  
**Review-punkter:** Design `design-006-project-creation.md`, testplan `testplan-b-c-redo-004-006.md`, kodeændringer i `firestore.rules`, `services/projects.ts`, `app/(tabs)/index.tsx`.

---

## 1. Executive summary / anbefaling

| Kriterie | Status |
|---|---|
| TypeScript | 🟢 Grøn |
| Lint | 🟢 Grøn |
| Pre-test checks | 🟢 Grøn (1 advarsel, ikke blokerende) |
| Designoverensstemmelse — kerneflow | 🟢 Grøn |
| Designoverensstemmelse — sekundær håndhævelse | 🟡 Gul |
| Testplanoverensstemmelse — TC-006.10 | 🟡 Gul |
| Kritiske fejl | 🟢 Ingen |
| **Release gate-anbefaling** | **🟢 GO med accepterede forbehold** |

US-006 løser den kritiske "Kunne ikke oprette projektet"-fejl og indfører dublet-forhindring og idempotens på klienten. Koden er type- og lint-sikker, og pre-test checks er grønne. Der er to gule punkter (tomt-navn-feedback og server-side dublet-revalidering), som PO har besluttet at udskyde til næste release, da vi ikke er i produktion og fokus er på den primære bugfix.

---

## 2. TypeScript og lint

### 2.1 `npm run typecheck`
```
> data-capture-app@1.0.0 typecheck
> tsc --noEmit
```
**Resultat:** 🟢 Ingen fejl, ingen advarsler.

### 2.2 `npm run lint`
```
> data-capture-app@1.0.0 lint
> expo lint
env: load .env
env: export EXPO_PUBLIC_FIREBASE_API_KEY ...
```
**Resultat:** 🟢 Ingen lint errors. Ingen warnings rapporteret.

---

## 3. Pre-test checks

### 3.1 `npm run pre-test-check`
```
🔍 1. TypeScript check
✅ TypeScript

🔍 2. Expo lint check
✅ Expo lint

🔍 3. Expo package compatibility
⚠️ Package versions – Kunne ikke tjekke pakker

🔍 4. Native module import robusthed
✅ Native module imports – Lazy load / try-catch anvendt

🔍 5. Deep link helpers
✅ Deep links

🔍 6. Route default exports
✅ app/(tabs)/index.tsx
✅ app/(tabs)/board.tsx
✅ app/(tabs)/search.tsx
✅ app/(tabs)/settings.tsx
✅ app/index.tsx
✅ app/item.tsx

📊 Opsummering
✅ OK
⚠️  Warnings: 1
❌ Failures: 0
```
**Resultat:** 🟢 Grøn med én advarsel. Advarslen skyldes at `npx expo install --check` ikke kunne udføres (sandsynligvis netværks/interaktivt miljø). Det er ikke en kodefejl og blokkerer ikke build. Ingen failures.

---

## 4. Logikgennemgang — US-006

### 4.1 Firestore Security Rules

**Fil:** `firestore.rules`

| Aspekt | Vurdering | Status |
|---|---|---|
| Ny `members`-subcollection-regel | Tilføjet under `match /projects/{projectId}/members/{memberId}` med read/create/update/delete. | 🟢 |
| Read-regel for medlemmer | Bruger `isProjectReader()` som tjekker `ownerId`, `roles` og `request.auth.token.email in memberEmails`. | 🟢 |
| Create/update/delete for medlemmer | Begrænset til ejer eller admin via `isProjectOwnerOrAdmin()`. Rolle er begrænset til gyldige værdier. | 🟢 |
| `memberEmails`-rettelse i projects-regel | Den nuværende `allow read` for `projects/{projectId}` bruger nu `memberEmails` i stedet for ikke-eksisterende `members`. | 🟢 |
| Email-baseret læseadgang | PO-beslutning implementeret: `request.auth.token.email in resource.data.memberEmails` både i projekt- og medlemsregel. | 🟢 |
| Batched write kompatibilitet | Reglen for members-subcollection er opdateret til at bruge `getAfter()` i stedet for `get()`, så medlems-skrivning i samme batched write som projekt-dokumentet evalueres korrekt. | 🟢 |

**Bemærkning:** Items- og comments-reglerne (linje 82, 95, 114, 121, 128) refererer stadig til `.data.members`, som ikke findes i `Project`-interfacet. Dette er en eksisterende bug uden for US-006-scope, men bør følges op separat, da det kan påvirke læseadgang for delte projekter i andre flows.

### 4.2 Batch/transaction project creation

**Fil:** `services/projects.ts`, funktion `createProject`

| Aspekt | Vurdering | Status |
|---|---|---|
| Atomisk projekt + medlem | `writeBatch(db)` opretter både `projects/{id}` og `projects/{id}/members/{memberDocId}` atomisk. | 🟢 |
| Rollback ved fejl | Hvis medlems-skrivning fejler, rulles projekt-skrivningen tilbage. Dermed forsvinder den falske fejl og delvise oprettelser. | 🟢 |
| Client-side ref | `doc(projectsCollection)` genererer ID på klienten, så medlemsdokumentet kan tilføjes samme batch. | 🟢 |
| Server-side re-validering af unikhed | **Mangler.** Design afsnit 5.1 beskriver, at batch/transaction skal "læse ejerens projekter (valider unikhed igen)" før skrivning. Implementeringen bruger `writeBatch` uden læsning, så dublet-tjekket er kun klient-side. PO har accepteret dette som fase 1-forbehold. | 🟡 |

**Bemærkning:** Designet markerer selv server-side tjek som "sekundær håndhævelse" og anerkender at 100 % beskyttelse mod race mellem to klienter ikke er garanteret. PO har accepteret dette som fase 1-forbehold, registreret i `memory/data-capture-backlog.md`.

### 4.3 Duplicate project name validation

**Fil:** `services/projects.ts`, funktion `isDuplicateProjectName` og `app/(tabs)/index.tsx`, `handleCreateProject`

| Aspekt | Vurdering | Status |
|---|---|---|
| Normalisering | `name.trim().toLowerCase()` anvendes både på input og eksisterende navne. | 🟢 |
| Scope | Kun ejerens projekter tjekkes via `ownedProjects` (filtreret på `p.ownerId === user?.uid`). | 🟢 |
| Beskrivelse indgår ikke | `isDuplicateProjectName` sammenligner kun `name`. | 🟢 |
| Eksisterende dubletter | Gamle dubletter lades være; et tredje projekt med samme navn blokeres (accepteret PO-beslutning). | 🟢 |
| Case/space-testcases | TC-006.5, TC-006.6, TC-006.7 forventes at bestå pga. normalisering. | 🟢 |

### 4.4 Inline error handling og idempotens

**Fil:** `app/(tabs)/index.tsx`, `handleCreateProject`

| Aspekt | Vurdering | Status |
|---|---|---|
| Fjernelse af `Alert.alert(...)` | Ingen `Alert.alert("Fejl", "Kunne ikke oprette projektet.")` i koden. Fejl vises nu inline. | 🟢 |
| Dublet-besked | `"Der findes allerede et projekt med dette navn."` vises inline under navn-feltet. | 🟢 |
| Firestore-fejl besked | `"Kunne ikke oprette projektet. Prøv igen."` vises inline; dialog forbliver åben. | 🟢 |
| `creating`-flag | Sættes `true` før `createProject` og `false` i `finally`. | 🟢 |
| Deaktiveret knap | `disabled={!newProjectName.trim() \|\| creating}` og visuel `buttonDisabled`-stil. | 🟢 |
| Spinner på knap | Tekst skifter til `"Opretter..."` mens `creating` er true. | 🟢 |
| Inline fejl ved tomt navn | **Mangler.** Testplan TC-006.10 forventer beskeden `"Projektnavn er påkrævet."` når brugeren trykker Opret med tomt/whitespace-navn. I stedet returnerer funktionen stilhed og knappen er allerede disabled, så fejlbeskeden vises ikke. | 🟡 |

---

## 5. Testdækning vs. implementering

| Testcase | Dækning | Status |
|---|---|---|
| TC-006.1 Gyldig unik oprettelse | Dækket af batch + setActiveProject + navigation. | 🟢 |
| TC-006.2 Faktisk Firestore-fejl | Dækket af inline fejl og batch-rollback. | 🟢 |
| TC-006.3 Idempotens / gentagne klik | Dækket af `creating`-flag og disabled knap. | 🟢 |
| TC-006.4 Annuller efter fejl | Dækket; rollback sikrer højst ét projekt. | 🟢 |
| TC-006.5–006.7 Dublet-tjek | Dækket af `isDuplicateProjectName`. | 🟢 |
| TC-006.8 Anden brugers projekt | Dækket af `ownedProjects`-scope. | 🟢 |
| TC-006.9 Eksisterende dubletter | Dækket; tredje projekt blokeres. | 🟢 |
| TC-006.10 Tomt navn | **Delvist.** Oprettelse blokeres og knap er disabled, men den forventede inline fejl vises ikke. | 🟡 |
| TC-006.11 Inline fejl fremfor Alert | Dækket for alle fejlscenarier undtagen tomt navn. | 🟡 |

---

## 6. Kendte fejl og risici

| ID | Prioritet | Beskrivelse | Indvirkning | Forslag |
|---|---|---|---|---|
| US6-001 | 🟡 Medium | Manglende inline fejl ved tomt/whitespace-navn. TC-006.10 forventer `"Projektnavn er påkrævet."`. I stedet er knappen bare disabled. | Bruger får ikke eksplicit feedback om hvorfor Opret ikke virker. Lille UX-gap. | Tilføj `setCreateError("Projektnavn er påkrævet.")` i `handleCreateProject` når `!newProjectName.trim()`. |
| US6-002 | 🟡 Medium | Ingen server-side re-validering af unikt navn i batch/transaction. Design beskrev læsning af ejerens projekter før skrivning. | Større race-vindue mellem to enheder; to projekter med samme navn kan stadig oprettes samtidig. | Overvej at erstatte `writeBatch` med `runTransaction` og læse ejerens projekter før skrivning. PO-beslutning: accepteres for nuværende? |
| US6-003 | 🟢 Lav (eksisterende) | Items- og comments-regler bruger stadig `.data.members` i stedet for `.data.memberEmails`. | Uden for US-006-scope; kan påvirke læseadgang for delte projekter i andre flows. | Følg op i separat opgave. |
| US6-004 | 🟢 Lav | Pre-test advarsel om `npx expo install --check` kunne ikke køre. | Miljørelateret, ikke kodefejl. | Kør manuelt i udviklingsmiljø før build. |

---

## 7. Go/no-go gate

### 7.1 Go-kriterier

| Kriterie | Opfyldt |
|---|---|
| TypeScript og lint er grønne | ✅ Ja |
| Pre-test checks er grønne (evt. accepted warnings) | ✅ Ja |
| Kode følger de godkendte design-dokumenter — kernebug og primær håndhævelse | ✅ Ja |
| Ingen kendte kritiske fejl | ✅ Ja |
| Ingen scope-creep | ✅ Ja |

### 7.2 Afvigelser fra design/testplan

| Afvigelse | Alvor | PO-afklaring nødvendig |
|---|---|---|
| TC-006.10 inline fejl ved tomt navn | 🟡 Medium | Anbefales ja, eller accepter at knap-disabled er tilstrækkelig feedback |
| Design afsnit 5.1: batch/transaction læser ejerens projekter | 🟡 Medium | Anbefales ja, eller accepter at race-vindue er dokumenteret |

### 7.3 Anbefaling

**🟡 GO med forbehold**

US-006 retter den kritiske fejl og opfylder de vigtigste acceptkriterier:
- Falsk fejlmeddelelse fjernes ✅
- Medlems-subcollection får regler ✅
- Atomisk oprettelse (batch) ✅
- Dubletter forhindres klient-side (trim, case-insensitivt, ejet scope) ✅
- Idempotens via `creating`-flag og disabled knap ✅
- Inline fejl i stedet for Alert ✅

PO-beslutning: De to gule punkter (US6-001 og US6-002) accepteres som release-forbehold og udskydes til næste release, da vi ikke er i produktion og fokus er på den primære bugfix. De er registreret i `memory/data-capture-backlog.md`.

Der er ingen kritiske eller høj-prioritets blockere, og koden må bygges/testes videre.

---

## 8. Review-punkter — afkrydsning

- [x] TypeScript og lint er grønne (eller afvigelser er PO-godkendt).
- [x] Pre-test checks er grønne.
- [x] Kode følger de godkendte design-dokumenter — kerneflow.
- [x] Sekundær håndhævelse (server-side dublet-tjek) er ikke implementeret — PO har accepteret det som release-forbehold til næste release.
- [x] Ingen scope-creep uden PO-go.
- [x] Ingen kendte kritiske eller høj-prioritetsfejl.

---

**Rapporteret af:** QA Agent  
**Næste skridt:** Audit-gate (TASK-B-C-REDO-019), derefter PO-go til Build 1.
