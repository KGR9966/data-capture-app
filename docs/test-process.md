# Data Capture – Testproces

> Hvordan vi tester før vi bruger builds, og hvordan vi undgår "start app → crash → ret fejl → genstart".
> Sidst opdateret: 2026-07-14

---

## Test-niveauer

Vi tester i tre niveauer, fra billigst til dyrest:

| Niveau | Hvad | Værktøj | Build nødvendigt? | Tid |
|---|---|---|---|---|
| **1. Statisk validering** | TypeScript, lint, default exports, native imports | `scripts/pre-test-check.js` | Nej | ~30 sek |
| **2. Lokal test** | Appen kører i simulator/telefon via Metro | `npx expo start --clear` | Nej (hvis dev build installeret) | ~2-5 min |
| **3. Native felttest** | Appen installeret med seneste native ændringer | EAS build + install | Ja | ~10-20 min |

## 0. Læringspunkter fra foto-upload-forløbet

- `npx tsc --noEmit` og lint er **nødvendige, men ikke tilstrækkelige**. De siger intet om auth/project state eller native module linking.
- `expo start --clear` rydder **ikke** alt. Enhedens app-data og EAS build-cache skal også ryddes.
- **Firestore JS SDK + native auth SDK = uautoriserede kald.** Brug én SDK-familie (her: native `@react-native-firebase/*`).
- **Project state skal persisteres**, ellers forsvinder det ved app-restart.
- **Debug overlay giver øjeblikkelig feedback** om auth/project state uden at gætte.
- **Test-trappe forhindrer, at man tester upload mens Board er blankt.**

---

## Trin 1: Statisk validering (før hver test)

### Hvad gør vi?
Kør pre-test check scriptet. Det tjekker:
- TypeScript fejl
- Lint errors
- Pakkeversions-kompatibilitet
- Native module imports (undgår crash ved opstart)
- Deep link helpers
- Default exports på alle routes

### Kommando
```powershell
npm run pre-test-check
```

Eller direkte:
```powershell
node scripts/pre-test-check.js
```

### Mulige resultater

#### ✅ Alt OK
```
✅ OK
⚠️  Warnings: 0
❌ Failures: 0
```
→ Fortsæt til trin 2.

#### ⚠️ Warnings, men ingen failures
```
⚠️  Warnings: 2
❌ Failures: 0
```
→ Du kan fortsætte med forbehold. Læs warnings og vurder om de skal rettes først.

#### 🛑 Failures
```
❌ Failures: 1+
```
→ **Start IKKE appen.** Ret fejlene først.

---

## Trin 2: Clean start-procedure (skal køres før hver testrunde)

1. **Luk alle Expo/Metro-processer.**
   - Kør `npm run start:safe` (dræber porte og starter frisk) — eller genstart PC hvis der er tvivl.
2. **Slet appen på test-enheden.**
   - iPhone: tryk og hold app-ikon → "Fjern app" → "Slet app".
   - Dette fjerner stale native bundles og caches.
3. **Ryd EAS build-cache (kun ved native ændringer).**
   - Hvis du har ændret `app.json`, `package.json`, native plugins eller Firebase-konfiguration:
     ```bash
     eas build --platform ios --profile development --clear-cache
     ```
4. **Verificer `.env`.**
   - Sørg for at alle `EXPO_PUBLIC_FIREBASE_*` værdier matcher det aktive Firebase-projekt.
5. **Byg og installer.**
   - EAS intern distribution: følg installationslink på enheden.
   - Eller lokal udvikling: `npm run start:safe` + scan QR med dev build.

## Trin 3: Test-trappe (bestås i rækkefølge)

> **Regel:** Gå ikke videre til næste trin før det aktuelle trin er bestået. Hvis et trin fejler, noteres fejlbesked præcist, og arbejdet går tilbage til analyse.

### Trin 3.1: Appen starter uden crash
- Forventet: Appen åbner til navneindtastningsskærmen.
- Fejl at notere: hvid skærm, rød fejlbjælke, crash.

### Trin 3.2: Auth gate
- Indtast navn og tryk "Fortsæt".
- Forventet:
  - `DebugOverlay` viser en `uid` og et navn.
  - Brugeren lander på Projekter-fanen.
- Fejl at notere: spinner uendeligt, "Der skete en fejl", debug overlay viser `Auth: none`.

### Trin 3.3: Project gate
- Opret et nyt projekt.
- Vælg projektet.
- Forventet:
  - Board viser projektnavnet.
  - `DebugOverlay` viser `Project: <navn> (<id>)`.
- Fejl at notere: Board siger "Vælg et projekt først", projektlisten er tom, spinner.

### Trin 3.4: Project persistence gate
- Luk appen helt (swipe away).
- Genåbn appen.
- Forventet:
  - Board viser stadig det sidst valgte projekt.
- Fejl at notere: man skal vælge projekt igen.

### Trin 3.5: Permissions gate
- Tryk "+ Tilføj" på Board.
- Tryk "Album" eller "Kamera".
- Forventet:
  - iOS viser permission-dialog.
  - Efter tilladelse åbner billedvælger/kamera.
- Fejl at notere: dialog dukker ikke op, app fryser.

### Trin 3.6: Media picker gate
- Vælg eller tag et billede.
- Forventet:
  - Preview vises i modal.
  - Debug overlay viser stadig aktivt projekt.
- Fejl at notere: preview er blank, app crasher, returnerer til Board.

### Trin 3.7: Firebase Storage gate
- Tryk "Gem" efter at have vedhæftet et billede.
- Forventet:
  - Item oprettes.
  - Der står "📎 Foto vedhæftet" i Board.
  - Billedet vises i item-detaljen.
  - Firebase Storage-konsollen viser filen under `projects/<projectId>/items/`.
- Fejl at notere: "Kunne ikke oprette notatet", billede vises ikke, Storage er tomt.

### Trin 3.8: OCR gate
- Opret et nyt item med et billede der indeholder tekst.
- Tryk "🔍 Læs tekst".
- Forventet:
  - Tekst indsættes i beskrivelsesfeltet.
- Fejl at notere: "Kunne ikke læse tekst", ingen tekst indsættes.

### Trin 3.9: Voice gate (hvis aktiveret)
- Tryk "🎤 Optag" på Board.
- Tal en kort observation.
- Forventet:
  - Tekst konverteres.
  - Item gemmes.
- Fejl at noteres: optagelse starter ikke, ingen tekst, gem fejler.

## Trin 4: Lokal test i Metro

### Anbefalet kommando (sikker start)
```powershell
npm run start:safe
```

Denne kommando kører først `pre-test-check`, og starter kun Metro hvis der ikke er failures.

### Manuel kommando
Hvis du allerede har kørt `pre-test-check`:
```powershell
npx expo start --clear
```

### Forventede QR-scenarier
| Scanner du med | Resultat |
|---|---|
| Expo Go | Appen starter i Expo Go. **Native moduler virker IKKE her.** Brug kun til rene JS-ændringer. |
| iPhone kamera-app (dev build installeret) | Appen starter i DC dev build. **Denne skal bruges til native features.** |

### Hvad skal du være opmærksom på?
- Hvis appen crasher **med det samme** = sandsynligvis native import eller syntax-fejl.
- Hvis appen crasher **når du trykker på en funktion** = sandsynligvis runtime-fejl i den funktion.
- Hvis appen viser rød skærm = læs fejlen og rapporter den præcist.

---

## Trin 3: Native felttest (kun ved native ændringer)

### Hvornår?
- Når vi tilføjer/fjerner native moduler.
- Når vi ændrer `app.json` permissions eller plugins.
- Når vi retter noget der kræver native kode (fx Firebase Storage, OCR).

### Kommando
```powershell
eas build --platform ios --profile development
```

### Hvordan undgår vi spildte builds?
1. Batch ændringer: samle flere native features i ét build.
2. Test så meget som muligt i Metro først.
3. Brug Gate Keeper før build.
4. Kun bygge når pre-test check er grøn/gul.

---

## Frigivelses-gate (udenfor bruger-test)

Før Claude Code / implementer-agent beder brugeren om at teste, skal følgende gennemføres **automatisk af agenten**:

### Kommando (køres af agenten)
```powershell
node scripts/release-gate.js
```

### Tjekpunkter
- [ ] `npm run pre-test-check` er OK
- [ ] `npx tsc --noEmit` er grøn
- [ ] `npx expo lint` har ingen errors
- [ ] Native imports er lazy-loaded / try-catch beskyttet
- [ ] `docs/collaboration-board.md` er opdateret
- [ ] `docs/compliance-log.md` er opdateret

### Præsentation for brugeren
Agenten skal altid vise en konsolideret **trafiklys-status**:

```markdown
# 🚦 Frigivelses-status

| Område | Status | Kommentar |
|---|---|---|
| TypeScript | 🟢 | Ingen fejl |
| Lint | 🟢 / 🟡 | Ingen errors, X warnings |
| Native imports | 🟢 | Lazy load / try-catch OK |
| Dokumentation | 🟢 | Opdateret |
| Samlet | 🟢 Klar til test | / 🟡 Med forbehold / 🔚 Ikke klar |
```

### Resultat
- 🟢 **Godkendt** → Bruger-test kan starte.
- 🟡 **Med forbehold** → Vurder om warnings skal rettes først.
- 🔴 **Afvist** → Ret fejl før bruger-test.

---

## Test-checkliste per feature

### Deep links + Shortcuts
- [ ] Pre-test check kørt uden failures.
- [ ] App startet i **DC dev build** (ikke Expo Go).
- [ ] Safari-link åbner app: `datacapture://tabs/board?category=DINKATEGORI`
- [ ] Filter-bjælke vises øverst i Board.
- [ ] Listen filtreres korrekt.
- [ ] Nulstil-knap fjerner filteret.
- [ ] 🔗-knappen på en sag kopierer linket.
- [ ] Shortcuts-automation kan oprettes med linket.
- [ ] Automation udløses ved ankomst (test i felten).

### Foto-upload (kræver nyt build)
- [ ] Nyt EAS build installeret.
- [ ] Kamera-knap tager foto og uploader.
- [ ] Album-knap vælger billede og uploader.
- [ ] Delte billeder kan uploades.
- [ ] Billede vises i sagens detalje.

### OCR (kræver nyt build)
- [ ] Nyt EAS build installeret.
- [ ] "Læs tekst"-knap findes på billeder.
- [ ] Tekst læses fra billede.
- [ ] Tekst indsættes i beskrivelse.
- [ ] Kategori opdateres efter OCR-tekst.

---

## Roller i testprocessen

| Rolle | Ansvar |
|---|---|
| **Bruger (dig)** | Kører appen på telefon, rapporterer observationsnøjagtigt, tester Shortcuts i felten. |
| **Implementer (mig)** | Sørger for at pre-test check er grøn, retter fejl, opdaterer test-dokumentation. |
| **Tester agent** | Definerer testscenarier før implementering, vurderer om testdækning er tilstrækkelig. |
| **Gate Keeper** | Godkender om vi er klar til build baseret på testresultater. |

---

## Dokumentation der skal opdateres efter test

1. `docs/test-process.md` – denne fil, hvis processen ændres.
2. `docs/compliance-log.md` – log testresultater.
3. `docs/collaboration-board.md` – opdater feature-status.

---

## Hurtig reference: Hvad skal køres hvornår?

| Situation | Kommando |
|---|---|
| Før hver test / build | `npm run pre-test-check` |
| Sikker start af app | `npm run start:safe` |
| Start app til lokal test (manuel) | `npx expo start --clear` |
| Installer packages | `npx expo install <package>` |
| Ret pakkeversions-advarsler | `npx expo install --fix` |
| Byg iOS development | `eas build --platform ios --profile development` |
| Lint | `npx expo lint` |
| Type check | `npx tsc --noEmit` |
