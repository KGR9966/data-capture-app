# Build-ready checklist — US-004 hotfix + B3/B4/B8/B9/D1/D3

> Master-liste over alle aftalte ændringer. Ingen "klar til build" før 100% grøn/godkendt.  
> Opdateret: 2026-07-15  
> Branch: `fix/us004-voice-redesign`  
> Seneste commit: `d295dd8 fix(firestore.rules): checkpoints create brugte resource.data.projectId`

---

## Aftalte punkter fra PO

| # | Område | ID | Implementeret | Test/QA | Audit | Bemærkning |
|---|---|---|---|---|---|---|
| 1 | Offline understøttelse af lister | B3 / US-005 | ✅ Done | ✅ Plan klar | ⏳ Venter re-audit | `services/checklistsOffline.ts`, NetInfo-sync, offline afkrydsning |
| 2 | Push-påmindelser på sager/lister | B4 / US-011 | ✅ Done | ✅ Plan klar | ⏳ Venter re-audit | `services/reminders.ts`, `ReminderModal.tsx`, `NotificationResponseHandler.tsx` |
| 3 | US-006 tomt-navn + server-side dubletter | B8 | ✅ Done | ✅ Plan klar | ⏳ Venter re-audit | Cloud Function + client validering |
| 4 | Slet projekt | B9 / US-001 | ✅ Done | ✅ Plan klar | ⏳ Venter re-audit | Hard delete + Cloud Function + tekstbekræftelse |
| 5 | Fjern "Åben"/"åbn"-residu efter foto-kommando | D1 / US-004 | ✅ Done | ✅ Plan klar | ⏳ Venter re-audit | `stripPhotoCommand()` + modal simplificeret |
| 6 | Auto-titel bug i tilføj-flow | D3 / US-004 | ✅ Done | ✅ Plan klar | ⏳ Venter re-audit | Rettelse implementeret |
| 7 | Firestore-regelrettelse: checkpoints + lister accepterer email-medlemmer | REG-001 | ✅ Done/deployet | ✅ Plan klar | ⏳ Venter re-audit | PO bekræftede deploy 2026-07-15; `getProjectRole` bruger nu `memberEmails`; checkpoint create-fix committed i `d295dd8` |

---

## Kendte bugs uden for denne runde

| # | Område | ID | Status | Bemærkning |
|---|---|---|---|---|
| 1 | Geofencing / Geo-fence | BACKLOG | 🔵 Uændret på backlog | Ikke en del af B3-B4-B8-B9-D1-D3-runden. Tages stilling til senere. |
| 2 | UI/UX-polish: Board-knapper lige store + ansvarlig i liste + kommentar-bug | UI-001 | 🔵 Uændret | Var på review-listen, men ikke eksplicit inkluderet i PO's go. Afventer prioritering. |

---

## Gated milestones

| Gate | Krav | Status |
|---|---|---|
| 1. Komplet design | 100% af punkterne har design/review done | ✅ Grøn |
| 2. Kodefase | Alle aftalte punkter implementeret og committed | ✅ Grøn |
| 3. QA-testplan | Dækker alle aftalte punkter | ✅ Grøn — `qa-testplan-us004.md` oprettet |
| 4. Typecheck/lint | Ingen blockers | ⏳ Igang — re-audit agent verificerer |
| 5. QA-verifikation | Manuel/kritisk sti testet | ⏌ Ikke startet |
| 6. Audit-gate | Governance-check + uafhængig kodegennemgang | ⏳ Re-audit igang |
| 7. PO-go til build | Skriftligt go fra PO | ⏌ Ikke startet |
| 8. Build & deploy | EAS build + Firestore deploy | ⏌ Ikke startet |

---

## Aktuelle blokere

Ingen kritiske blokere.

**Lukkede blockers:**
1. **Listecreation permissions** — løst via Firestore-rules deploy + `memberEmails`-logik i `services/roles.ts`.
2. **Offline-afkrydsning + reminder-annullering** — løst ved at fjerne `!online` fra disabled-prop og lade `toggleChecklistPoint`/`toggleChecklistItemComplete` delegerer til `setChecklistPointCompleted`.
3. **Checkpoint create permission-denied** — løst i `d295dd8`: checkpoints-reglen brugte `resource.data.projectId` ved create, men `resource.data` findes ikke før dokumentet er oprettet. Nu bruges `request.resource.data.projectId` ved create.

---

## Næste statusupdate

Audit Agent (re-run) rapporterer tilbage med go/no-go.  
- Hvis **go**: QA-verifikation startes, derefter PO-go til build.  
- Hvis **no-go**: Master Agent delegerer rettelser til Dev Agent uden yderligere godkendelser inden for mandat, og der gives ny status hurtigst muligt.
