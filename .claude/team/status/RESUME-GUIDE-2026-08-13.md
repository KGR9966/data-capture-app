# Genetableringsguide — US-004 Build Next (2026-08-13)

> Hvis Claude Code-sessionen lukker ned, brug denne fil til at komme ind i projektet igen og fortsætte fra det aktuelle standpunkt.

---

## 1. Projektets aktuelle stand

- **Branch:** `fix/us004-items-subcollection`
- **Seneste commit:** `1856b0a` — `fix(us004-build-next): TC-008 æøå, TC-006 delete-guard, GEO-002/003 fixes, prognose 95%`
- **Repository:** `https://github.com/KGR9966/data-capture-app`
- **Push-status:** Commit pushed til remote.
- **Samlet prognose for næste build:** **95 %**
- **PO-beslutning:** GO givet. Næste skridt er EAS build + deploy.

---

## 2. Opgaveoversigt

| # | Opgave | Status | Næste handling |
|---|---|---|---|
| 1 | TC-008 æøå rettelse i stemmeparser | ✅ Done | Parser-tests 33/33 passed |
| 2 | TC-006 delete-guard i detalje-visning | ✅ Done | Skjul delete-knap for ikke-ejere |
| 3 | GEO-002 stedforslag normalisering | ✅ Done | Testscript 6/6 passed |
| 4 | GEO-003 geofence notifikations-dedup | ✅ Done | Param-clearing + ref-guard |
| 5 | TC-005/TC-007 code review | ✅ Done | Ingen nye race-vinduer fundet |
| 6 | Opdater prognose til 95 % | ✅ Done | Dokumenteret i statusfiler |
| 7 | Commit + push rettelser | ✅ Done | `1856b0a` pushed |
| 8 | EAS build + deploy | ✅ Done | Build `68b0773f-bcf3-454b-b861-d6560941dfae` færdig |
| 9 | Fysisk iOS test | ⏳ **Næste** | Installer på iPhone/iPad og kør TC-005/TC-007/TC-008 tests |

---

## 3. Hvordan kommer man ind i projektet igen

### 3.1 Åbn projektmappen

```powershell
cd C:\Users\kimgr\data-capture-app
```

### 3.2 Sørg for korrekt branch

```powershell
git fetch origin
git checkout fix/us004-items-subcollection
git pull origin fix/us004-items-subcollection
```

### 3.3 Installer afhængigheder

```powershell
npm install
cd functions
npm install
cd ..
```

### 3.4 Sørg for Java 21

```powershell
$env:Path += ";C:\tools\jdk-21.0.12+8\bin"
java -version
```

---

## 4. Vigtige dokumenter / filer

### Status og beslutninger

| Fil | Formål |
|---|---|
| `.claude/team/status/working-state-us004.md` | Hoved-status: prognose, testresultater, genetableringsnoter |
| `.claude/team/status/US004-BUILD-NEXT-IMPROVEMENT-PLAN-2026-08-13.md` | Detaljeret forbedringsplan og gennemførte aktiviteter |
| `.claude/team/status/US004-BUILD-NEXT-PO-GODKENDELSE-2026-08-13.md` | PO-godkendelsespakke med konklusion GO @ 95 % |
| `.claude/team/status/RESUME-GUIDE-2026-08-13.md` | Denne genetableringsguide |

### Tekniske rettelser (kode)

| Fil | Ændring |
|---|---|
| `services/voiceCommands.ts` | `stripPhotoCommand` bevarer æøå/casing efter foto-kommando |
| `scripts/verify-voice-parser.ts` | 33 parser-testcases inkl. TC008 |
| `app/checklist.tsx` | Delete-knap kun for ejer; geofence param-clearing + ref-guard |
| `services/geofence.ts` | Normalisering af keywords før matching |
| `scripts/test-geofence-suggestions.ts` | 6 testcases for smarte stedforslag |

### Testplaner

| Fil | Formål |
|---|---|
| `.claude/team/test/qa-testplan-us004-items-subcollection.md` | Testplan med PO-resultater fra build `92247ec7` |
| `.claude/team/test/testplan-comprehensive-round.md` | Omfattende testplan inkl. TC-DEL-001–009 |
| `.claude/team/test/e2e-runbook-us004-items-subcollection.md` | E2E runbook med TC-001 fejl/rettelse |

### Sikkerhed / Cloud Functions

| Fil | Formål |
|---|---|
| `functions/src/deleteProject.test.ts` | Cloud Function integration tests |
| `scripts/test-rules.js` | Firestore security rules emulator tests (122/122) |

---

## 5. Nøglekommandoer til genoptagelse

### Automatiserede checks

```powershell
cd C:\Users\kimgr\data-capture-app
npm run typecheck
npm run lint
npx tsx scripts/verify-voice-parser.ts
npx tsx scripts/test-search-parser.ts
npx tsx scripts/test-geofence-suggestions.ts
```

### Emulator-tests

```powershell
$env:Path += ";C:\tools\jdk-21.0.12+8\bin"
npx firebase emulators:exec --only firestore --project data-capture-us004 "node scripts/test-rules.js"
cd functions
npm test
cd ..
```

### EAS build

```powershell
cd C:\Users\kimgr\data-capture-app
eas build --platform ios --profile preview
# eller Android:
# eas build --platform android --profile preview
```

### Installer build på iOS

Åbn dette link på iOS-enheden:
`https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/68b0773f-bcf3-454b-b861-d6560941dfae`

---

## 6. Kontekst der skal huskes

- **TC-001** er confirmed fixed: PO har bekræftet at projektsletning virker efter IAM-rettelse.
- **TC-008** er PO-afklaret: splitting beholdes som før, men æøå skal bevares konsekvent.
- **TC-005/TC-007** er analyseret færdigt via code review — ingen kode-ændringer nødvendige før build, men fysisk race-test anbefales på første build.
- **GO er givet** til build/deploy. Risiko på ~5 % accepteres.

---

*Sidste opdatering: 2026-08-13.*
