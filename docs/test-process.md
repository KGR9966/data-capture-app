# Data Capture – Testproces

> Hvordan vi tester før vi bruger builds, og hvordan vi undgår "start app → crash → ret fejl → genstart".
> Sidst opdateret: 2026-07-08

---

## Test-niveauer

Vi tester i tre niveauer, fra billigst til dyrest:

| Niveau | Hvad | Værktøj | Build nødvendigt? | Tid |
|---|---|---|---|---|
| **1. Statisk validering** | TypeScript, lint, default exports, native imports | `scripts/pre-test-check.js` | Nej | ~30 sek |
| **2. Lokal test** | Appen kører i simulator/telefon via Metro | `npx expo start --clear` | Nej (hvis dev build installeret) | ~2-5 min |
| **3. Native felttest** | Appen installeret med seneste native ændringer | EAS build + install | Ja | ~10-20 min |

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

## Trin 2: Lokal test i Metro

### Hvad gør vi?
Kør appen mod Metro-serveren. Det kræver at du har en dev build installeret på telefonen (eller bruger simulator).

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
