# Build-ready checklist — samlet bug/backlog-runde

> Master-liste over alle aftalte ændringer. Ingen "klar til kodning" før 100% grøn/godkendt.  
> Oprettet: 2026-07-15

---

## Aftalte områder fra PO

| # | Område | ID | Design-fil | Testcase-ref | Status | Bemærkning |
|---|---|---|---|---|---|---|
| 1 | Wildcard/præcis søgning | US-005 | `.claude/team/design/us-005-wildcard-search.md` | TC-S1–TC-S15 | ✅ Design done | Små valg truffet inden for mandat |
| 2 | Push-påmindelser på sager/lister | B4 / US-011 | `.claude/team/design/us-011-push-reminders.md` | TC-01–TC-07 | ✅ Design done | |
| 3 | Offline understøttelse af lister | B3 | `.claude/team/design/us-005-offline-lists.md` | TC-01–TC-08 | ✅ Design done | |
| 4 | Slet projekt | B9 / US-001 | `.claude/team/design/us-001-delete-project.md` | TC-01–TC-09 | ✅ Design done | Hard delete + Cloud Function + tekstbekræftelse |
| 5 | US-006 tomt-navn + server-side dubletter | B8 | `.claude/team/design/us-006-empty-name-server-duplicates.md` | TC-B8-01–TC-B8-09 | ✅ Design done | Cloud Function + client-side validering |
| 6 | Fjern "Åben"/"åbn"-residu efter foto-kommando | D1 | `.claude/team/design/us-004-d1-remove-open-residue.md` | TC-D1.1–D1.M3 | ✅ Design done | Ny `stripPhotoCommand()` + modal-gren simplificeres |
| 7 | Auto-titel bug i tilføj-flow | D3 | `.claude/team/design/us-004-d3-auto-title-bug.md` | TC-D3-01–TC-D3-08 | ✅ Design done | Rettelse allerede implementeret; fokus: verifikation
| 8 | UI/UX-polish: Board-knapper lige store + ansvarlig i liste + kommentar-bug | UI-001 | `.claude/team/ux/ui-review-board-checklist.md` | TBD | ✅ Review done | Afventer kodefase |
| 9 | Firestore-regelrettelse: checkpoints accepterer email-medlemmer | REG-001 | `firestore.rules` | TC-A1 | ✅ Deployet | PO bekræftet deploy 2026-07-15 |
| 10 | Usecase-arkivering | ARCH-001 | `.claude/team/design/usecase-archive.md` | N/A | ✅ Done | D1/D3 referencer rettet |

---

## Gated milestones

| Gate | Krav | Status |
|---|---|---|
| 1. Komplet design | 100% af punkterne har design/review done | ⏳ 7/10 grønne; 3 i gang |
| 2. Opdateret testplan | Test Manager har dækket alle områder | ⏌ Ikke startet |
| 3. Kodefase start | Alle designs + testplan klar | ⏌ Blokeret af gate 1+2 |
| 4. QA-verifikation | TypeScript/lint grøn, tests grønne | ⏌ Ikke startet |
| 5. Audit-gate | Governance-check ok | ⏌ Ikke startet |
| 6. PO-go til build | Skriftligt go fra PO | ⏌ Ikke startet |
| 7. Build & deploy | EAS build + Firestore deploy | ⏌ Ikke startet |

---

## Aktuelle blokere

1. **REG-001** — rettet i kode, men **ikke deployet**. Kræver manuel deploy i Firebase Console.
2. **B8, D1, D3** — design i gang; forventet færdig når agenter rapporterer.
3. **ARCH-001** — usecase-arkivering i gang.

---

## Næste statusupdate

Når alle design-agenter har rapporteret færdig, opdateres denne checkliste til 100% grøn, og testplan-fasen startes.
