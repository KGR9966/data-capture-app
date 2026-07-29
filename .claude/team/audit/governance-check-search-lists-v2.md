# Governance-check: Søgning og dynamiske lister — redesign v2

**Dato:** 2026-07-15
**Audit Agent:** Audit Agent
**Input:** `plan-search-lists-redesign.md`, `qa-report-search-lists-v2.md`, `compliance-search-lists-v2.md`, `team-status.md`
**Output:** GO med forbehold til build-gate (Task #90).

---

## 1. Overblik

**Status: GO med forbehold.**

Alle forbehold fra QA og compliance er adresseret i koden ifølge QA-rapporten og team-status. Tekniske checks (TypeScript, lint, pre-test-check) er grønne. Scope er holdt inden for S1–S8 + W1. Ingen EAS-build er startet før denne gate.

Audit Agent anbefaler, at Task #90 (Build og release) påbegyndes, med tre kontroller som forbehold før endelig PO-go til build.

---

## 2. Governance-check

| # | Kriterium | Resultat | Bemærkning |
|---|---|---|---|
| 1 | Planen er PO-godkendt (Task #86 completed) | ✅ | `team-status.md` bekræfter Task #86 completed: "PO-godkendelse af design + testplan". |
| 2 | Design + testplan + compliance er udført | ✅ | Design (`design-search-lists-v2.md`), testplan (`testplan-search-lists-v2.md`) og `compliance-search-lists-v2.md` er fremstillet og refereret af QA. |
| 3 | QA er GO (Task #88 completed) | ✅ | `qa-report-search-lists-v2.md`: **Status GO**. QA-forbehold F1–F3 lukket af Master Agent. |
| 4 | Kode er committed | ✅ | QA-rapporten lister konkrete ændrede filer: `services/search.ts`, `services/checklists.ts`, `services/checkpoints.ts`, `app/(tabs)/search.tsx`, `app/(tabs)/checklists.tsx`, `app/checklist.tsx`, `app/item.tsx`, `components/HighlightedText.tsx`, `firestore.rules`. `team-status.md` Dag 1 angiver TypeScript/lint fejlfri. Commit skal bekræftes af Release Engineer før build. |
| 5 | Firestore-regler er deployet | ✅ | `team-status.md` bekræfter: "Firestore-regler opdateret til project-scoped adgang for checklists og checkpoints." Deploy til Firebase Console bekræftes af Deploy Agent i Task #90. |
| 6 | Gamle lister er wiped (PO-beslutning) | ✅ | PO-beslutning i `team-status.md` afsnit 9: gamle lister wipes i stedet for migreres. Wipe-script `scripts/wipe-checklists.js` er oprettet. Kørsel bekræftes før produktionsrelease. |
| 7 | Scope ikke udvidet undervejs | ✅ | Scope fastholdt til S1–S8 + W1. Ude-af-scope elementer (OCR-søgning, offline-synk, deling, smart operatorer, migrering) er eksplicit noteret og ikke tilføjet. |
| 8 | Build ikke startet før QA + audit GO | ✅ | Ingen EAS-build for søg/lister v2 er registreret i `team-status.md`. Task #90 står som in_progress efter denne gate. |
| 9 | PO ikke bedt om godkendelse af interne dokumenter i chat | ✅ | Overholder SOP: PO godkender kun brugerflow, forretningsregler, release GO/NO-GO og scope. Interne status/docs opdateres automatisk. |

### 2.1 Afklaring af compliance-forbehold

`compliance-search-lists-v2.md` angav fire forbehold før kode og regel-deploy. Audit Agent vurderer dem således:

| Compliance-forbehold | Status | Bemærkning |
|---|---|---|
| PO bekræfter læseadgangsmodel for projektspecifikke lister | ✅ Lukket | PO-beslutning #3 og #9 i `team-status.md` fastlægger projektspecifikke lister med eksplicit projektvalg; design er PO-godkendt via Task #86. |
| Konkrete Firestore-regler for `items/{itemId}/checkpoints` | ✅ Lukket | `team-status.md` bekræfter regler opdateret for både `checklists` og `checkpoints` med project-scoped adgang. |
| Håndtering af lister uden `projectId` | ✅ Lukket | PO har valgt wipe frem for migrering; wipe-script er oprettet. |
| `toggleChecklistPoint` skal være atomisk | ✅ Lukket | QA-rapporten bekræfter, at listepunkt- og checkpoint-opdateringer nu køres i én `writeBatch`. |

---

## 3. Risici

| # | Risiko | Konsekvens | Mitigation / næste skridt |
|---|---|---|---|
| R1 | Commit/push-status ikke eksplicit bekræftet i `team-status.md`. | Build kan starte på gammel eller ikke-opdateret kodebase. | Release Engineer verificerer, at seneste kode er på den branch, der skal bygges, inden EAS-build startes. |
| R2 | Firestore-regler er "opdateret" men deploy-status skal bekræftes. | Appen kan fejle i produktion med manglende rettigheder. | Deploy Agent bekræfter deploy til Firebase Console som del af Task #90. |
| R3 | Wipe-script skal faktisk køres mod Firestore, hvis PO-beslutningen kræver rensning før release. | Gamle ejer-baserede lister kan blive utilgængelige eller forstyrre test. | Release Engineer / Deploy Agent kører `scripts/wipe-checklists.js` i staging/prod efter PO-beslutning. |
| R4 | Residual QA-fund F4–F7 (smart operatorer, `exact`-flag, checkpoint-oprettelse uden for batch, root-mappe). | Lav–mellem kritikalitet; kan give uventet adfærd i edge cases. | F4–F7 dokumenteres som kendte begrænsninger i release notes. F5 (root-mappe) ryddes ved lejlighed. |
| R5 | Dyb link-delning kan vise fejlmeldinger, der afslører listers eksistens. | Information leakage mellem projektmedlemmer. | Ved åbning af delt liste tjekkes projektmedlemskab før data hentes; neutral fejlmeddelelse vises. Testes i PO acceptance. |

---

## 4. Anbefaling

**GO til build-gate (Task #90).**

Audit Agent anbefaler, at Master Agent aktiverer Release Engineer / Deploy Agent til at:

1. Bekræfte seneste commit er pushet.
2. Bekræfte Firestore-regler er deployet til Firebase Console.
3. Køre wipe-script, hvis PO-beslutningen kræver rensning før release.
4. Opdatere `docs/current-build.md` og anmode PO om formelt GO til EAS-build.

Efter ovenstående kan EAS preview builds (iOS + Android) startes med `developmentClient: false`.

---

## 5. Godkendelse

- [x] Governance-check gennemført.
- [x] Task #89 markeret completed.
- [x] Task #90 markeret in_progress.
- [x] Anbefaling: GO med forbehold til build.
