# Data Capture US-004 — Build 3 QA-plan og rettelsesstatus

**Dato:** 2026-08-06
**PO:** Kim Grandal
**Master Agent:** Claude
**Scope:** Alle issues fra K1 til L4 + alle sikkerheds- og governance-fund fra QA/Audit review skal med i Build 3.

---

## Rettelser implementeret

| # | Issue | Rettelse | Filer ændret | Status |
|---|-------|----------|--------------|--------|
| K1 | Notifikation fryser for projekt-lister | `createReminder` kaldes med `targetProjectId: checklist.projectId`. `NotificationResponseHandler` forwarder korrekt. Tilføjet `safeGoBack()` i `app/checklist.tsx` så "Tilbage" virker også når appen åbnes fra notifikation. | `app/checklist.tsx`, `services/reminders.ts`, `components/NotificationResponseHandler.tsx` | ✅ Klar til test |
| K2 | Dynamisk liste opdaterer ikke | `app/checklist.tsx` abonnerer på projekt-items og kalder `synchronizeDynamicChecklist` automatisk. | `app/checklist.tsx`, `services/checklists.ts` | ✅ Klar til test |
| H1 | Slette projekt virker ikke | Cloud Function `deleteProject` er reverteret til `recursiveDelete()` (TC-B9.3). Email-fallbacks fjernet (TC-B9.2). Client-side cascade fallback fjernet (TC-B9.6). `RNFBFunctions` tilføjet `forceStaticLinking`. Netværk/cache-håndtering forbedret. Sletning kræver nu netværksforbindelse. | `functions/src/deleteProject.ts`, `functions/src/deleteProject.test.ts`, `services/projects.ts`, `services/firebase.ts`, `services/items.ts`, `app.json`, `app/(tabs)/board.tsx`, `app/(tabs)/index.tsx`, `contexts/ProjectContext.tsx`, `storage.rules`, `firebase.json` | ✅ Klar til gen-test |
| H2 | Invitation via email | `addProjectMemberByEmail` gemmer `roles.{email}` og `members/{email}`. `firestore.rules` opdateret så email-inviterede får den tildelte rolle (admin/editor/viewer), ikke altid editor. | `services/projects.ts`, `firestore.rules`, `services/roles.ts` | ✅ Klar til test |
| H3 | Slette liste virker ikke | `deleteChecklistAndClearCache` gemmer nu `ownerId` i pending-op. `executePendingOp` sender `ownerId` til `deleteChecklist`. `clearCachedItems` kører først efter vellykket online-sletning. | `services/checklistsOffline.ts`, `services/checklists.ts`, `app/checklist.tsx`, `app/(tabs)/checklists.tsx` | ✅ Klar til test |
| M1 | Flueben sync til sag | Fejllogging tilføjet når source-link mangler. Koden synkroniserer eksplicit når link findes. | `services/checklists.ts` | ✅ Klar til test |
| M2 | Punkter uden punktum | `splitTitleContent` deler også på linjeskift. `parseSourceTextIntoPoints` deler på både linjeskift og punktum. | `services/voiceCommands.ts`, `services/checklists.ts` | ✅ Klar til test |
| M3 | Slettet sag i liste | `synchronizeDynamicChecklist` markerer punkter som stale. UI viser "Sagen findes ikke længere" og deaktiverer "Åbn sag". | `services/checklists.ts`, `app/checklist.tsx` | ✅ Klar til test |
| M4 | Flere søgeord med "og" | `parseSearchQuery` filtrerer "og"/"and" fra required ord. | `services/search.ts`, `scripts/test-search-parser.ts` | ✅ Klar til test |
| M5 | Titel-forslag | `suggestListName` i `app/(tabs)/search.tsx` bruger fælles kategori eller længste fælles prefix. | `app/(tabs)/search.tsx` | ✅ Klar til test |
| L1 | "Udført" tekst for svag | Farve ændret til `#15803d` (light) / `#4ade80` (dark), fontWeight `600`. | `app/checklist.tsx` | ✅ Klar til test |
| L2 | Projekt-vælger forvirrende | Label "Gem listen under projekt", hjælpetekst, radio-button visuelt udtryk, accessibility role. | `app/(tabs)/search.tsx` | ✅ Klar til test |
| L3 | Duplikerede "Min personlige liste" | Seed-script idempotens (faste IDs). Cleanup-script har nu `--dry-run` tilstand. | `scripts/cleanup-duplicate-checklists.js` | 🟡 Afventer PO-godkendelse til at køre cleanup |
| L4 | Separat fane for personlige lister | "Lister"-fanen får top-tabs "Projekt" og "Mine / delte". | `app/(tabs)/checklists.tsx` | ✅ Klar til test |
| **SEC-1** | Privilege escalation i `firestore.rules` | `allow update` på `/projects/{projectId}` tillader ikke længere ændring af `ownerId`. Kun owner må tildele `owner`-rolle. Admin må ikke give sig selv eller andre højere rolle end `admin`. | `firestore.rules` | ✅ Testet 122/122 |
| **SEC-2** | Storage datalækage ved projektsletning | Client-side fallback rydder nu `projects/{projectId}/items/` i Storage. Ny `storage.rules` giver ejeren `allow delete`. Cloud Function returnerer `storageCleanupSuccess`. | `services/projects.ts`, `storage.rules`, `firebase.json`, `functions/src/deleteProject.ts` | ✅ Testet |
| **SEC-3** | Batch-limits ved projektsletning | Både Cloud Function og client-side fallback chunker nu alle batch-sletninger i max 400 operationer. | `functions/src/deleteProject.ts`, `services/projects.ts` | ✅ Testet |
| **SEC-4** | Cloud Function kunne ikke deployes pga. forkert dependency | `@firebase/app` ^0.16.0 fjernet fra `functions/package.json`. Functionen deployer nu korrekt. | `functions/package.json` | ✅ Build + lint OK |
| **SEC-5** | Members-subcollection tillod admin at tildele `owner`-rolle | `firestore.rules` for `/projects/{projectId}/members/{memberId}` tillader nu kun owner at skrive `role == "owner"`. | `firestore.rules` | ✅ Testet 122/122 |
| **SEC-6** | Client-side fallback uden paginerede læsninger | `services/projects.ts` paginerer nu items, checklists og nestede subcollections i client-side fallback. | `services/projects.ts` | ✅ Typecheck + lint OK |
| **SEC-7** | Debug logs der kunne lække følsomme data | `console.log` af Storage-stier/URL'er og API-key tilstedeværelse fjernet fra `services/media.ts` og `services/translation.ts`. | `services/media.ts`, `services/translation.ts` | ✅ Lint OK |
| **SEC-8** | Eksponerede API-nøgler i git-trackede filer | `google-services.json` og `GoogleService-Info.plist` er slettet fra working directory og sletningen er staged. `.gitignore` opdateret. `docs/secrets-rotation-guide.md` opdateret med placeholders og instruktioner. PO/ejer skal rotere nøgler og uploade nye konfigurationsfiler untracked. | `.gitignore`, `docs/secrets-rotation-guide.md`, `docs/setup.md` | 🟡 Afventer nøglerotation |
| **SEC-9** | `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` i `.env` | `eas.json` opdateret til at injectere `GOOGLE_TRANSLATE_API_KEY` EAS secret som `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` i preview/production. Guide opdateret. PO/ejer skal oprette EAS secret og rotere nøglen. | `eas.json`, `docs/secrets-rotation-guide.md` | 🟡 Afventer oprettelse/rotation af EAS secret |

---

## Forudsætninger for at rettelser virker efter deploy

1. **K1 (notifikation):**
   - `expo-notifications` skal have tilladelse på enheden.
   - Appen skal testes på fysisk enhed/simulator med notifikationer aktiveret.
   - Eksisterende reminders uden `targetProjectId` vil stadig fejle — de skal slettes eller genoprettes.

2. **K2 (dynamisk liste):**
   - Dynamiske lister skal have `projectId` og `isDynamic: true` sat korrekt i Firestore.
   - Appen skal have netværksadgang mens listen er åben for at sync kører.

3. **H1 (slet projekt):**
   - Cloud Function `deleteProject` skal deployes. Bemærk: Der var en deployment-fejl forårsaget af en forkert `@firebase/app` dependency i `functions/package.json`. Den er nu fjernet, og functionen deployer korrekt.
   - `storage.rules` skal deployes sammen med `firestore.rules`.
   - Client-side fallback fungerer kun for **projektejere** (rules tillader kun ejere at slette projekt-doc og Storage).
   - Admins skal bruge Cloud Function-stien.
   - Appen viser nu den konkrete fejlmeddelelse fra Cloud Function hvis den fejler.

4. **H2 (invitation):**
   - Den inviteredes email skal findes i `memberEmails` array.
   - Den inviterede skal logge ind med præcis samme emailadresse.
   - Valgt rolle (admin/editor/viewer) respekteres nu i `firestore.rules`.

5. **H3 (slet liste):**
   - Eksisterende pending-ops med gammelt format (kun `checklistId`) vil fejle indtil de slettes fra AsyncStorage.
   - Test sletning af både projekt-scoped, personlig ejet og delt liste.

6. **M1-M5, L1-L2:**
   - Ingen særlige deploy-forudsætninger udover normal EAS build.
   - Voice-parser rettelser kræver test med da-DK dictation.

7. **L3 (cleanup):**
   - `scripts/cleanup-duplicate-checklists.js --dry-run` kan køres først for at se hvad der ville slettes.
   - Produktionskørsel kræver eksplicit PO-godkendelse.

8. **L4 (fane):**
   - Implementeret som sub-tabs i "Lister"-fanen: "Projekt" og "Mine / delte".
   - Test at skift mellem tabs viser korrekte lister.

---

## Testplan før Build 3

### Gate G1: Lokal type-check og lint
- [ ] `npx tsc --noEmit`
- [ ] `npx eslint` (ændrede filer — 0 nye fejl)
- [ ] `node scripts/release-gate.js` (0 failures)

### Gate G2: Emulator tests
- [ ] Kør `functions/src/deleteProject.test.js` mod emulator (forventer nu `storageCleanupSuccess: true`).
- [ ] Kør `scripts/test-rules.js` mod emulator (107 tests + nye privilege-escalation negative tests).
- [ ] Kør `scripts/seed-us004-testdata.js` mod emulator.
- [ ] Kør `scripts/reproduce-p1.js` mod emulator.
- [ ] Kør `scripts/verify-voice-parser.ts`.
- [ ] Kør `scripts/test-search-parser.ts`.
- [ ] Kør `scripts/cleanup-duplicate-checklists.js --dry-run` mod emulator.

### Gate G3: Lokal E2E på simulator/dev-client
- [ ] Gennemfør E1-E9 flows fra Build 2.
- [ ] Verificer K1 notifikation på fysisk enhed.
- [ ] Verificer L2 projekt-vælger UI.
- [ ] Verificer L1 kontrast.

### Gate G4: PO acceptance på udviklingsbuild
- [ ] PO tester alle rettelser på dev-client/simulator.
- [ ] PO godkender L4 valg.

### Gate G5: EAS build GO
- [ ] Release Engineer kører EAS preview build.
- [ ] PO installerer og kører smoke test.

---

## GO / NO-GO vurdering før Build 3

| Gate | Resultat | Note |
|------|----------|------|
| G1 Type-check + lint | 🟢 OK | Root `npx tsc --noEmit` ✅, `npx expo lint --quiet` ✅, Functions `tsc --noEmit` ✅. |
| G2 Emulator tests | 🟡 Ikke kørt | `deleteProject.test.ts` er opdateret med TC-B9.1–B9.6-dækning. Emulator-kørsel kræver Java, som ikke er installeret i dette miljø. |
| Deploy Firebase | 🟢 OK | Cloud Function `deleteProject` (reverteret til `recursiveDelete()`), `firestore.rules`, og `storage.rules` deployed til `data-capture-506bd`. |
| G3 Lokal E2E / simulator | 🟡 Ikke kørt | Kræver fysisk enhed/simulator/dev-client. |
| G4 PO acceptance | 🟡 Afventer PO | PO skal teste på dev-client/simulator. |
| G5 EAS build | 🔴 NO-GO | Frigives først efter G2-G4 er OK og SEC-8/SEC-9 nøglerotation/EAS secrets er gennemført. |

**Master Agent anbefaling:** Den reelle root cause for begge K1-fejl er nu adresseret:
- **Projektsletning:** Cloud Function kaldet nåede ikke serveren fordi `RNFBFunctions` manglede i `forceStaticLinking`, og appen arbejdede på forældet cache. Løsning: tilføjet `RNFBFunctions`, reverteret til `recursiveDelete()`, fjernet client-side fallback, og tilføjet server-source seed / netværksforbindelse.
- **Sagsoprettelse hænger/dubletter:** `withTimeout` på ikke-cancellabel `addDoc` skabte phantom writes. Løsning: fjernet timeout, tilføjet `clientMutationId`-idempotens, validerer aktivt projekt mod server, og tjekker netværksstatus før writes.

**Build 3 er stadig 🔴 NO-GO** indtil:
1. PO/ejer har roteret Firebase API-nøgler og oprettet EAS secret `GOOGLE_TRANSLATE_API_KEY` (se `docs/secrets-rotation-guide.md`).
2. Emulator-test af `deleteProject` er kørt og bestået (kræver Java/EAS CI).
3. PO har kørt G3/G4 lokal E2E/acceptance på dev-client/simulator og bekræftet at projektsletning og sagsoprettelse virker.\n
Næste skridt:
1. PO gennemfører SEC-8 + SEC-9.
2. Master Agent kører emulator-test når Java er tilgængeligt (eller via CI).
3. PO kører G3/G4.
4. Først derefter EAS preview build (G5).

---

## Åbne punkter

1. ✅ **L4 besluttet:** Sub-tabs i "Lister"-fanen er implementeret.
2. **L3 cleanup:** Kræver PO-godkendelse før `scripts/cleanup-duplicate-checklists.js` køres mod produktion uden `--dry-run`.
3. ✅ **H1/H2/H3 sikkerhedsrettelser:** Implementeret og re-deployet, afventer PO-gen-test.
4. ✅ **Sagsoprettelse hænger / dubletter:** Root cause rettet (`withTimeout` fjernet + idempotens + server-validering + netværks-tjek), afventer PO-gen-test.
5. **SEC-8 + SEC-9 — secrets:** `google-services.json` / `GoogleService-Info.plist` er staged til sletning og `.gitignore` er opdateret. `eas.json` er opdateret til EAS secret injection. PO/ejer skal rotere nøgler og oprette EAS secret. Se `docs/secrets-rotation-guide.md`.
