---
name: release-readiness-2026-07-15
description: Release readiness checklist and governance check for Data Capture 2026-07-15 RC1
metadata:
  type: release-readiness
  date: 2026-07-15
  tag: v2026.07.15-rc1
  commit: 93b702b
---

# Release Readiness — 2026-07-15

## Git baseline

| Felt | Værdi |
|---|---|
| Branch | `master` |
| Commit | `c7aeb03` |
| Tag | `v2026.07.15-rc1` |
| Commit message | `docs: add release readiness checklist for 2026-07-15 RC1` |
| Baseline tag | `baseline-chat-feature-2026-07-15` (`9c7b204`) |

---

## Release readiness checklist

| # | Item | Status | Bemærkning |
|---|---|---|---|
| 1 | Code committed and tagged | [x] | Commit `ad34f80`, tag `v2026.07.15-rc1` oprettet. |
| 2 | EAS env variables verified (`EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY`) | [x] | Opdateret 2026-07-15 med ny nøgle `AIzaSyCjfpOQE-7YlVroPbRhx2O4hDbNobAazYI` i production, preview og development. Testet OK mod Cloud Translation API. Gamle nøgle returnerede 403 og bør slettes. |
| 3 | Native prebuild validates | [x] | `npx expo prebuild --no-install` gennemført uden fejl for Android; plugin `react-native-share` konfigureret korrekt. |
| 4 | TypeScript / lint passes | [x] | `npx tsc --noEmit` ✅, `npx expo lint` ✅, `node scripts/release-gate.js` ✅. |
| 5 | Runtime smoke tests pass | [x] | Pre-build automatiserede gates ✅. Fysisk acceptance test afventer PO på nyt build. |
| 5a | 360° midtvejsaudit gennemført | [x] | Fire specialiserede audits udført: process, arkitektur, sikkerhed/App Store, UX/produkt. Master-rapport og skabelon oprettet. |
| 6 | EAS preview build completed | [x] | Android `376a3067-cabb-4afe-b49c-e70467177a93` og iOS `6c3c014c-5f0d-42ca-91b5-3e1b259aff9e` færdige med exit code 0. |
| 6 | Firestore rules deployed and smoke-tested | [ ] | `team-status.md` angiver manuelt deployet og publishet 2026-07-15. Ingen smoke-test-rapport set. `firestore.rules` / `firebase.json` til automatisk CLI-deploy findes ikke i repoet endnu (AUTO-001 åben). |
| 7 | PO approval for build obtained | [x] | PO-go givet 2026-07-15. |
| 8 | Build profile selected | [x] | `preview` til intern test (internal distribution, Android APK + iOS). Build gennemført. |
| 9 | Rollback plan (tag + restore known-good config) | [x] | Tag `v2026.07.15-rc1` + baseline `baseline-chat-feature-2026-07-15` findes. `docs/rollback-plan.md` opdateret 2026-07-15 med `react-native-share` og COPY-001. |

---

## Governance / documentation check

### Repo-dokumentation (`C:\Users\kimgr\data-capture-app\docs\`)

| Fil | Findes | Dækker seneste ændringer | Bemærkning |
|---|---|---|---|
| `docs/backlog.md` | ✅ | Ja | Opdateret: CHAT-001 markeret færdig; COPY-001 markeret færdig i P3; CHECKLIST-001 og GEOFENCE-001 tilføjet under P2. |
| `docs/current-build.md` | ✅ | Ja | Opdateret med `c8f43ed` / `v2026.07.15-rc1`, COPY-001, Google Translate EAS env og CHAT-001 rettelser. |
| `docs/firestore-rules.md` | ✅ | Ja | Indeholder CHAT-001 kommentar-regler og catch-all. Nævner at server-side rate limiting ikke er i v1. |
| `docs/user-guide.md` | ✅ | Delvist | Beskriver kommentarer / roller. Omtaler ikke COPY-001 del/kopiér foto. |
| `docs/privacy-notes.md` | ✅ | Ja | Opdateret med CHAT-001 persondatafelter, opbevaring, synlighed, retention og PO-beslutning om redigering. |
| `docs/rollback-plan.md` | ✅ | Ja | Opdateret 2026-07-15 med `react-native-share` og COPY-001.

### Team-filer (`C:\Users\kimgr\.claude\projects\C--cloud-agent\.claude\team\`)

| Fil | Findes | Dækker seneste ændringer | Bemærkning |
|---|---|---|---|
| `.claude/team/tasks/CHAT-001-spec.md` | ✅ | Ja | Dækker `comment`→`note`, regler, data-model. |
| `.claude/team/tasks/CHAT-001-fixes.md` | ✅ | Ja | Dækker QA-findings og rettelser inkl. Firestore rules. |
| `.claude/team/tasks/CHAT-001-bugfix.md` | ❌ | — | Findes ikke. Måske dækket af `CHAT-001-fixes.md` / `CHAT-001-dev-status.md`. |
| `.claude/team/tasks/COPY-001-spec.md` | ✅ | Ja | Dækker share/copy foto, react-native-share, UI-knapper. |
| `.claude/team/tasks/AUTO-001-firestore-rules-deploy.md` | ✅ | Ja | Kræver `firestore.rules` + `firebase.json` + PO-go. Endnu ikke gennemført i repoet. |
| `.claude/team/design/CHAT-001-design.md` | ✅ | Ja | Dækker data-model, regler, UI-flow, `comment`→`note`. Status `draft`. |
| `.claude/team/design/COPY-001-design.md` | ✅ | Ja | Dækker UI, dependencies, roller. |
| `.claude/team/compliance/CHAT-001-compliance.md` | ✅ | Ja | Opdateret med PO-beslutning om udskudt redigering, retention, App Store-vurdering. |
| `.claude/team/qa/qa-report-CHAT-001-bugfix.md` | ✅ | Ja | Verificerer rettelser og oversættelses-API eskalering. |
| `.claude/team/qa/qa-report-COPY-001.md` | ✅ | Ja | Verificerer COPY-001 implementation. |
| `.claude/team/status/team-status.md` | ✅ | Ja | Angiver Firestore rules manuelt deployet, build-ID'er, baseline. |
| `.claude/team/status/CHAT-001-build-status.md` | ✅ | Delvist | Reflekterer `a5533db`. Ikke opdateret med `93b702b`. |
| `.claude/team/status/CHAT-001-dev-status.md` | ✅ | Ja | Dækker QA-fixes, PO-acceptance rettelser, oversættelses-API afventer PO-go. |
| `.claude/team/status/COPY-001-dev-status.md` | ✅ | Ja | Dækker implementation, QA-observationer rettet, checks grønne. |
| `.claude/team/docs/SOP-PO-approvals.md` | ✅ | Ja | PO-godkendt SOP, dækker build, deploy, sikkerhed, secrets, API-nøgler, Firestore rules. |
| `.claude/team/docs/project-services-register.md` | ✅ | Ja | Angiver Cloud Translation API enabled og `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` oprettet i EAS env. |
| `memory/collaboration-structure.md` | ✅ | Ja | Dækker governance, faser, SOP-reference. |

---

## Anbefalet build-kommando

Når PO-go er givet til intern test:

```bash
cd C:\Users\kimgr\data-capture-app
eas build --profile preview --platform all
```

Alternativt per platform:

```bash
# iOS først (typisk længst byggetid)
eas build --profile preview --platform ios

# Android
 eas build --profile preview --platform android
```

> **Bemærk:** `preview` anbefales frem for `production`, fordi det bruger internal distribution og ikke kræver App Store / Google Play review, hvilket matcher behovet for et internt testbart build. `react-native-share` er en ny native dependency, så et nyt native build er påkrævet — OTA (`eas update`) er ikke tilstrækkeligt.

---

## Risikoer og blockers

1. **Runtime smoke-test:** Afventer resultat fra lokal/physical-device smoke-test af kommentar-afsendelse, "Ingen ansvarlig" redigering, COPY-001 del/kopiér foto og oversættelse.
2. **Firestore rules smoke-test:** Reglerne er deployet, men der er ingen dokumenteret smoke-test efter deploy. Anbefalet: opret projekt, opret item, opret kommentar, slet item.
3. **360° audit P0-fund:** Firestore catch-all regel, Google Translate API-nøgle i bundle, manglende privacy policy og Firebase config i git er kritiske blockere for produktionsrelease — skal adresseres, men blokkerer ikke nødvendigvis et preview build til intern test. PO bør godkende, at preview build køres nu, mens P0 actions påbegyndes parallelt.
4. **PO-go:** Ingen build må køres før PO-go ifølge SOP §2.1.

---

## Konklusion

**Status: NOT READY til build.**

Koden er committed, tagged, og alle automatiske gates er grønne. Men følgende skal på plads før PO-go / build:

- PO installerer nyt build på fysiske enheder.
- PO kører acceptance test baseret på `.claude/team/qa/CHAT-001-testcases.md` + COPY-001 + oversættelse.
- Smoke-test Firestore Security Rules på en fysisk enhed (opret projekt, item, kommentar, slet item).
- PO afgør, om P0 audit-fund (catch-all Firestore-regel, privacy policy, Firebase config i git) skal adresseres før produktionsrelease.
