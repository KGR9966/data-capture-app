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
| Commit | `93b702b` |
| Tag | `v2026.07.15-rc1` |
| Commit message | `feat: COPY-001 share/copy photo + CHAT-001 note fixes + Firestore rules update` |
| Baseline tag | `baseline-chat-feature-2026-07-15` (`9c7b204`) |

---

## Release readiness checklist

| # | Item | Status | Bemærkning |
|---|---|---|---|
| 1 | Code committed and tagged | [x] | Commit `93b702b`, tag `v2026.07.15-rc1` oprettet. |
| 2 | EAS env variables verified (`EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY`) | [ ] | Lokal `.env` indeholder nøglen. `project-services-register.md` angiver EAS env oprettet for production/preview/development. Interaktiv EAS CLI-verifikation (`eas env:list`) kunne ikke køres non-interaktivt. |
| 3 | Native prebuild validates | [x] | `npx expo prebuild --no-install` gennemført uden fejl. |
| 4 | TypeScript / lint passes | [x] | `npx tsc --noEmit` ✅, `npx expo lint` ✅. |
| 5 | Runtime smoke tests pass | [ ] | Automatiske gates bestået. Fysiske enheds-smoke-tests (opret projekt, item, kommentar, del foto) er ikke kørt. |
| 6 | Firestore rules deployed and smoke-tested | [ ] | `team-status.md` angiver manuelt deployet og publishet 2026-07-15. Ingen smoke-test-rapport set. `firestore.rules` / `firebase.json` til automatisk CLI-deploy findes ikke i repoet endnu (AUTO-001 åben). |
| 7 | PO approval for build obtained | [ ]] | Afventer PO-go. |
| 8 | Build profile selected | [x] | `preview` anbefales til intern test (internal distribution, Android APK + iOS). Afventer PO-go. |
| 9 | Rollback plan (tag + restore known-good config) | [x] | Tag `v2026.07.15-rc1` + baseline `baseline-chat-feature-2026-07-15` findes. `docs/rollback-plan.md` findes, men er forældet (sidst opdateret 2026-07-08) og dækker ikke COPY-001 / react-native-share. |

---

## Governance / documentation check

### Repo-dokumentation (`C:\Users\kimgr\data-capture-app\docs\`)

| Fil | Findes | Dækker seneste ændringer | Bemærkning |
|---|---|---|---|
| `docs/backlog.md` | ✅ | Delvist | Nævner CHAT-001 og `comment`→`note`. COPY-001 står stadig som ikke-gennemført (P3) trods implementering. |
| `docs/current-build.md` | ✅ | Nej | Reflekterer `a5533db` / CHAT-001 build. Er ikke opdateret med `93b702b` / COPY-001 / ny nøglekonfiguration. |
| `docs/firestore-rules.md` | ✅ | Ja | Indeholder CHAT-001 kommentar-regler og catch-all. Nævner at server-side rate limiting ikke er i v1. |
| `docs/user-guide.md` | ✅ | Delvist | Beskriver kommentarer / roller. Omtaler ikke COPY-001 del/kopiér foto. |
| `docs/privacy-notes.md` | ✅ | Ja | Opdateret med CHAT-001 persondatafelter, opbevaring, synlighed, retention og PO-beslutning om redigering. |
| `docs/rollback-plan.md` | ✅ | Nej | Forældet (2026-07-08); dækker ikke `react-native-share` / COPY-001. |

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

1. **EAS env verification:** `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` er påstået konfigureret, men ikke verificeret via CLI. Hvis nøglen ikke er bundet korrekt, vil oversættelses-API fejle i buildet.
2. **Firestore rules smoke-test:** Reglerne er påstået deployet, men der er ingen dokumenteret smoke-test efter deploy. Anbefalet: opret projekt, opret item, opret kommentar, slet item.
3. **Rollback-plan forældet:** `docs/rollback-plan.md` skal opdateres til at dække `react-native-share` og COPY-001 før release.
4. **PO-go:** Ingen build må køres før PO-go ifølge SOP §2.1.

---

## Konklusion

**Status: NOT READY til build.**

Koden er committed, tagged, og alle automatiske gates er grønne. Men følgende skal på plads før PO-go / build:

- Verificer `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` i EAS (f.eks. via `eas env:list` efter login).
- Smoke-test Firestore Security Rules på en fysisk enhed eller emulator.
- Opdater `docs/current-build.md` med `93b702b` / `v2026.07.15-rc1` og COPY-001 ændringer.
- Opdater `docs/rollback-plan.md` til at dække COPY-001 / react-native-share.
- Få PO-go til build.
