# Build-ready checklist — US-004 hotfix + B3/B4/B8/B9/D1/D3

> Master-liste over alle aftalte ændringer. Ingen "klar til build" før 100% grøn/godkendt.  
> Opdateret: 2026-07-15  
> Branch: `fix/us004-voice-redesign`  
> Seneste commit: `1970042 docs: opdater build-ready-checkliste og QA-testplan for US-004`

---

## Aftalte punkter fra PO

| # | Område | ID | Implementeret | Test/QA | Audit | Bemærkning |
|---|---|---|---|---|---|---|
| 1 | Offline understøttelse af lister | B3 / US-005 | ✅ Done | ✅ Plan klar | ✅ Go | `services/checklistsOffline.ts`, NetInfo-sync, offline afkrydsning |
| 2 | Push-påmindelser på sager/lister | B4 / US-011 | ✅ Done | ✅ Plan klar | ✅ Go | `services/reminders.ts`, `ReminderModal.tsx`, `NotificationResponseHandler.tsx` |
| 3 | US-006 tomt-navn + server-side dubletter | B8 | ✅ Done | ✅ Plan klar | ✅ Go | Cloud Function + client validering |
| 4 | Slet projekt | B9 / US-001 | ✅ Done | ✅ Plan klar | ✅ Go | Hard delete + Cloud Function + tekstbekræftelse |
| 5 | Fjern "Åben"/"åbn"-residu efter foto-kommando | D1 / US-004 | ✅ Done | ✅ Plan klar | ✅ Go | `stripPhotoCommand()` + modal simplificeret |
| 6 | Auto-titel bug i tilføj-flow | D3 / US-004 | ✅ Done | ✅ Plan klar | ✅ Go | Rettelse implementeret |
| 7 | Firestore-regelrettelse: checkpoints + lister accepterer email-medlemmer | REG-001 | ✅ Done/deployet | ✅ Plan klar | ✅ Go | PO bekræftede deploy 2026-07-15; checkpoint create-fix i `d295dd8` |

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
| 3. QA-testplan | Dækker alle aftalte punkter | ✅ Grøn |
| 4. Typecheck/lint | Ingen blockers | ✅ Grøn |
| 5. Audit-gate | Governance-check + uafhængig kodegennemgang | ✅ Go |
| 6. PO-go til build | Skriftligt go fra PO | ✅ Modtaget |
| 7. Build & deploy | EAS build + Firestore deploy | ⏳ Igang / afventer credentials |
| 8. Fysisk QA | P0-cases testet på iOS + Android | ⏌ Ikke startet |

---

## Næste handlinger

1. **EAS build** — kræver login. Kommando:
   ```bash
   cd /c/Users/kimgr/data-capture-app
   npx eas login
   npx eas build --platform all --profile preview --non-interactive
   ```
   PO eller en med EAS-adgang skal køre dette.

2. **Firestore deploy** — kommando:
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **QA start** — når build + deploy er klar, startes QA Agent på fysisk test ifølge `.claude/team/test/qa-testplan-us004.md`.

---

## Aktuelle blokere

Ingen kritiske blokere.
