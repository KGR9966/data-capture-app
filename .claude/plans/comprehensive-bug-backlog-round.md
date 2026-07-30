# Plan: Samlet bug- og backlog-runde — Data Capture

**Dato:** 2026-07-15  
**Planlagt af:** Master Agent / Claude Code  
**Mål:** Rette alle tilbageværende kendte bugs + B3, B4, B8, B9, D1, D3 i én samlet runde, arkivere governance-dokumenter, gennemføre alle mulige tests FØR build, og undgå unødvendige builds.

---

## 1. Scope — hvad skal med i denne runde

### 1.1 Kendte bugs (skal rettes)

| ID | Fejl | Kritikalitet | Teknisk tilgang |
|---|---|---|---|
| A1 | Listeoprettelse fejler med rettighedsfejl for e-mail-inviterede medlemmer | **Høj** | Rettet i `firestore.rules` — skal deployes og testes |
| A2 | Søgning på "Liseleje" finder også "Liselejevej" — ønske om præcis/wildcard-søgning | Mellem | Udvid `services/search.ts` med præcis-ord-matching, f.eks. `"Liseleje"` eller `*liselej*` |
| A5 | Ansvarlig fremgår ikke i sagen i listen | Lav | Vis `assignedToName` i checklist-item-card |
| D1 | Photo "Åben"-tekst residue | Lav | Tjek `VoiceCaptureModal` / foto-flow for tilbageværende tekst |
| D3 | Tilføj auto-title bug | Mellem | Undersøg `deriveTitle` / `CreateItemForm` for auto-titel fejl |

### 1.2 Backlog-punkter (skal med)

| ID | Backlog | Kritikalitet | Teknisk tilgang |
|---|---|---|---|
| B3 | Offline redigering og synkronisering af lister | Mellem | Lokal cache / optimistic updates for checkliste-punkter |
| B4 | Push-notifikationer / påmindelser om åbne listepunkter | Mellem | Brug `expo-notifications`, planlagt reminder ved åbne punkter |
| B8 | US-006 forbedringer: tomt-navn-feedback og server-side dublet-revalidering | Mellem | Inline validering i `createProject` + Firestore-regel for dubletter |
| B9 | Slet projekt + tilhørende sager | Mellem | UI i projekt-liste + `deleteProject`-service + slet items/subcollections atomisk |

### 1.3 UI/UX-polish (skal med)

| ID | Ønske | Teknisk tilgang |
|---|---|---|
| A4 | Tilføj-knap i Board skal have samme størrelse som Optag | Justér `styles.addButton` / `styles.voiceButton` i `app/(tabs)/board.tsx` |

### 1.4 Governance / dokumentation

| Opgave | Hvad |
|---|---|
| Arkiver usecase | Opdatere / arkivere US-005 / US-006 usecase-dokumenter |
| UI/UX Agent | Inddrage UI/UX Agent til review af Board-knapper og item/liste-UI |
| Testplan | Opdatere testplan med cases for alle rettelser |
| Audit | Audit-gate før build-go |

---

## 2. Arbejdsmetode — test før build

### 2.1 For hver rettelse:
1. **Forstå** — læs relevant kode og dokumentation.
2. **Design** — beskriv ændring og testcases.
3. **Implementér** — kodeændringer.
4. **Test lokalt** — TypeScript, lint, web/simulator hvor muligt, isolerede scripts.
5. **Commit** — med beskrivende besked.
6. **Ingen build** før alle rettelser er samlet og testet.

### 2.2 Før EAS-build:
- Alle rettelser committed.
- TypeScript + Expo lint grønne.
- Pre-test-check grøn.
- QA Agent review gennemført.
- UI/UX Agent review gennemført.
- Audit-gate GO.
- PO eksplicit go til build.

---

## 3. Faseplan

### Fase 1 — Forberedelse og analyse
**Varighed:** 1 dag

| Agent | Opgave | Output |
|---|---|---|
| Userstoryagent | Berig / opdater usecases for wildcard-søgning, slet-projekt, offline/push | `.claude/team/design/us-005-wildcard-search.md`, `.claude/team/design/us-009-delete-project.md`, `.claude/team/design/us-010-offline-lists.md`, `.claude/team/design/us-011-push-reminders.md` |
| Flowagent | Design brugerflows for slet projekt, offline, push, præcis-søgning | `.claude/team/design/flow-delete-project.md`, etc. |
| UI/UX Agent | Review af Board-knapper, item-detail, checklist-item-card | `.claude/team/design/ui-review-board-checklist.md` |
| Solution Design Agent | Arkitektur for offline-cache, push-notifikationer, wildcard-parser | `.claude/team/design/architecture-comprehensive-round.md` |
| Compliance/Security Agent | Vurder slet-projekt (data retention), push-notifikationer (permissions/privacy), offline (lokal lagring) | `.claude/team/compliance/compliance-comprehensive-round.md` |

**Gate:** PO-godkendelse af design og scope. Ingen kode før godkendt.

### Fase 2 — Testplan
**Varighed:** 0,5 dag

| Agent | Opgave | Output |
|---|---|---|
| Test Manager Agent | Opdater testplan med cases for alle rettelser | `.claude/team/test/testplan-comprehensive-round.md` |

**Gate:** Testplan reviewet af Master Agent.

### Fase 3 — Kode
**Varighed:** 2–3 dage

| Agent | Opgave | Filer |
|---|---|---|
| Developer Agent | Wildcard/præcis-søgning | `services/search.ts`, `app/(tabs)/search.tsx` |
| Developer Agent | Vis ansvarlig i liste | `app/checklist.tsx` |
| Developer Agent | Board-knap-størrelse | `app/(tabs)/board.tsx` |
| Developer Agent | Slet projekt + sager | `services/projects.ts`, `app/(tabs)/index.tsx`, Firestore-regler |
| Developer Agent | US-006 tomt-navn + server-side dubletter | `services/projects.ts`, `app/(tabs)/index.tsx`, Firestore-regler |
| Developer Agent | Offline liste-redigering | `services/checklists.ts`, `services/checkpoints.ts`, evt. AsyncStorage |
| Developer Agent | Push-reminders | `services/notifications.ts`, `app/_layout.tsx` eller relevant, `services/checklists.ts` |
| Developer Agent | Photo "Åben" residue + auto-title bug | `components/VoiceCaptureModal.tsx`, `components/CreateItemForm.tsx`, `services/items.ts` |

**Gate:** TypeScript + lint grønne. Pre-test-check grøn.

### Fase 4 — QA-verifikation
**Varighed:** 0,5 dag

| Agent | Opgave | Output |
|---|---|---|
| QA Agent | Gennemgå kode, kør tests, verificer rettelser | `.claude/team/qa/qa-report-comprehensive-round.md` |

**Gate:** QA GO.

### Fase 5 — UI/UX review
**Varighed:** 0,5 dag

| Agent | Opgave | Output |
|---|---|---|
| UI/UX Agent | Review af alle UI-ændringer | `.claude/team/ux/ux-review-comprehensive-round.md` |

**Gate:** UX GO.

### Fase 6 — Audit-gate
**Varighed:** 0,5 dag

| Agent | Opgave | Output |
|---|---|---|
| Audit Agent | Governance-check: tests før build, scope, ingen solo-arbejde | `.claude/team/audit/governance-check-comprehensive-round.md` |

**Gate:** Audit GO.

### Fase 7 — Build (kun efter PO-go)
**Varighed:** 1 dag (byggetid + PO-test)

| Agent | Opgave | Output |
|---|---|---|
| Release Engineer | Byg iOS preview (evt. Android hvis PO ønsker) | Build-ID, installationslink |

**Gate:** PO-go til build.

### Fase 8 — PO acceptance test
**Varighed:** 1–2 dage

| Deltager | Opgave |
|---|---|
| PO | Test alle rettelser på fysisk enhed |
| Test Manager Agent | Følg op, registrer resultater | `.claude/team/test/po-acceptance-comprehensive-round.md` |

---

## 4. Risici og mitigations

| Risiko | Mitigation |
|---|---|
| Offline/push er større end forventet | Del op: først lokal optimistic update, push senere hvis komplekst |
| Push-notifikationer kræver ekstra tilladelser/test | Test med fysisk enhed; dokumenter begrænsninger |
| Slet projekt kan slette forkert data | Brug `writeBatch`, test på udviklingsprojekt først |
| Wildcard-parser ødelægger eksisterende søgning | Behold substring som fallback; præcis som tilvalg |
| Mange rettelser øger risiko for regression | Stærk QA + fokuserede tests per rettelse |

---

## 5. Beslutninger der skal tages af PO

1. **Skal push-notifikationer (B4) deles op** i lokal reminder nu + server push senere?
2. **Skal offline (B3) begrænses** til checkliste-punkter (ikke hele appen)?
3. **Skal Android-build også med**, eller fortsætte iOS-only indtil videre?
4. **Skal vi arkivere** eksisterende S1–S8-dokumenter som "løst" efter denne runde?

---

## 6. Statusrapportering

- Hver 3. time: kort status til PO.
- Straks ved behov for afklaring eller beslutning.
- Ingen godkendelses-anmodninger inden for Master Agents mandat — kun PO-beslutninger om scope, design og build-go.
