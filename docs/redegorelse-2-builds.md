# Redegørelse: US-004 nåede ikke i mål med max 2 builds

**Dato:** 2026-08-02
**Projekt:** Data Capture — US-004 (Solution B + A + A2)
**PO:** Kim Grandal
**Master Agent:** Claude
**Formål:** Dokumentere hvorfor aftalen om maksimalt 2 EAS iOS preview builds ikke blev holdt, og hvad der skal læres af forløbet.

---

## 1. Baggrund og aftale

For US-004 blev det aftalt, at maksimalt **2 EAS iOS preview builds** måtte anvendes. Build 1 skulle være baseline; Build 2 skulle være den endelige rettelse, hvis nødvendigt.

Aftalen var begrundet i:
- Begrænsede EAS build-credits og overage-omkostninger.
- Ønske om grundig lokal verifikation før hvert build.
- Risiko for at spilde builds på halvfærdige rettelser.

---

## 2. Hvad skete der?

### Build 1

**Dato:** Juli 2026 (første EAS iOS preview build for US-004).

**Resultat:** Kritisk E2E-fejl. Appen bestod ikke de centrale testtrin.

**Faktiske fejl observeret i Build 1:**
- Projekt A og Projekt B blev ikke vist i Projekter-fanen.
- "Listen blev ikke fundet" ved åbning af projekt-scopede dynamiske lister.
- Stemme-dictation fejlbeherskning: type-nøgleord blev titel, danske tegn så ud til at blive vist som ae/oe/aa, linjeskift håndteres uklart.

**Root causes identificeret efter Build 1:**
1. **Testdata mismatch:** Seed-scriptet (`scripts/seed-us004-testdata.js`) brugte hardcoded fake UID (`user_owner`) og fake email (`email_editor@example.com`). I produktions-preview kører appen mod rigtig Firebase Auth, så brugerens UID/email matchede ikke testdata.
2. **Manglende `projectId` i navigation:** Projekt-scopede checklister blev åbnet via `/checklist?id=...` uden `projectId`. `checklist.tsx` læste ikke `projectId`, så `getChecklistById` faldt tilbage til personlig path, som ikke fandtes.
3. **Stemme-parser:** Type-nøgleordet i første sætning ("Bug. Knappen...") blev selv titlen, fordi parseren splittede title/content før nøgleordet blev fjernet.

### Build 2

**Dato:** 2026-08-02.

**Scope ved trigger:** P1 fixes + P2 stemme-parser fix (efter lokal verifikation).

**Resultat:** P1 og P2 blev rettet og verificeret lokalt. Build 2 blev genereret og installeret. Men under E2E-test på enhed opstod nye eller hidtil usete kritiske problemer:

1. **Forkert testbruger ved første test:** Build 2 blev først testet med den anonyme bruger fra Build 1 (`TGOC2qSCANRbSW2PIOVGyvgo3Nn1`), mens testdata var seeded til en ny email-bruger (`test.dc@test.dk`). Dette gav en falsk negativ: Projekt A/B vistes ikke. Fejlen var menneskelig/afstemning, ikke kode.
2. **Re-seed til korrekt bruger:** Efter re-seed med den faktiske anonyme UID blev Projekt A/B synlige, og P1 kunne valideres.
3. **Ny kritisk fejl:** Notifikation/påmindelse på projekt-scopede lister fik appen til at fryse og efter genstart vise "Listen blev ikke fundet". Dette var ikke identificeret før Build 2.
4. **Dynamisk liste opdaterer ikke:** Brugeren konstaterede, at "Dynamisk Liste" ikke opdateres automatisk med nye matches. PO vurderer dette som kritisk.
5. **Øvrige bugs:** Slette projekt, invitation via email, slette liste, flueben sync, søgning med flere ord, etc. (se `docs/us004-build-observations-bugs.md`).

---

## 3. Hvorfor nåede vi ikke i mål?

### A. Scope undervurderet

US-004 Solution B + A + A2 flyttede data til subcollections og introducerede ny navigation, stemme-parser, offline sync, notifikationer, invitationer og dynamiske lister. Kompleksiteten var større end forventet ved aftalen om 2 builds.

### B. Testdata- og miljøkompleksitet

Build 1 fejlede ikke primært pga. kode, men pga. **testdata der ikke matchede den rigtige Firebase-bruger**. Dette tog tid at diagnosticere. Derefter blev der oprettet en ny testbruger, men den første Build 2-test blev kørt med den forkerte bruger, hvilket skabte forvirring.

### C. Nye fejl dukkede op under runtime

Selvom P1 og P2 var lokaltestet, opstod der **nye kritiske runtime-fejl**, som ikke kunne reproduceres i emulator/scripts:
- Notifikation/deeplink freeze.
- Dynamisk liste-opdatering.
- Slette-liste pending-ops adfærd.

Dette viser, at lokal gates og emulator-tests ikke fanger alle enhedsspecifikke og integrationsmæssige fejl.

### D. Stemme-parsing og søgning har mange edge cases

P2/P3 afslørede, at stemme-parseren og søge-/checkpoint-logikken har mange subtile tilfælde, der kræver iterativ afklaring med PO. Det var ikke muligt at lukke alle indenfor 2 builds.

### E. Aftalen om 2 builds blev taget før fuld root-cause analyse

Aftalen blev indgået med forventning om, at Build 2 ville være tilstrækkelig. Først efter Build 1 blev det klart, hvor dybt problemerne sad.

---

## 4. Hvad blev gjort rigtigt?

- **Grundig root-cause analyse** før Build 2.
- **Lokal verifikation:** G1-G5 gates, P1 reproduktion, stemme-parser regression tests.
- **Stram governance undervejs:** P2/P3 blev først analyseret, før de blev taget med i Build 2.
- **Dokumentation:** QA-rapport, bugliste, og nu denne redegørelse.
- **Stop-loss:** Da det stod klart, at 2 builds ikke var nok, blev der ikke bare bygget blindt videre.

---

## 5. Hvad kunne være gjort bedre?

| # | Læringspunkt | Forslag til fremtid |
|---|--------------|---------------------|
| 1 | Testdata skal matche den faktiske preview-bruger fra starten. | Fastlæg testbruger UID/email før Build 1 og parameteriser seed-scriptet. |
| 2 | Lokale tests fanger ikke enhedsspecifikke fejl. | Indfør smoke-test på fysisk enhed før EAS build, eller brug TestFlight/internal distribution med hurtig feedback. |
| 3 | Stemme-parser og søgning har for mange edge cases til 2 builds. | Afsæt separat runde/spike til stemme/søgning før hoved-US. |
| 4 | Max 2 builds-aftalen var for rigidt for dette scope. | Estimer scope + risici før build-aftale; brug "max N builds med GO/NO-GO efter hvert build". |
| 5 | Flere parter/roller kan skabe forvirring om testbruger. | Dokumentér tydeligt: "Test udføres med bruger X, seed køres med bruger X". |

---

## 6. Status pr. 2026-08-02

- **Build 1:** Brugt. Fejlede P1/P2/P3.
- **Build 2:** Brugt. P1 og P2 rettet og delvist verificeret på enhed. Nye kritiske fejl (K1, K2) og høje fejl (H1-H3) identificeret.
- **Build 3:** Ikke genereret. Kræver PO-beslutning.

### P1 verificeret i Build 2
- Projekter vises for korrekt bruger.
- Projekt-scopede lister kan oprettes fra Søg og åbnes.
- Personlige lister kan åbnes.

### P2 verificeret i Build 2
- Stemme-parser fjerner type-nøgleord fra titel.

### Ikke verificeret / fejler stadig
- Notifikation/påmindelse på projekt-lister (K1).
- Dynamisk liste-opdatering (K2).
- Slette projekt, invitation, slette liste (H1-H3).
- M1-M5 og L1-L4 (se bugliste).

---

## 7. Anbefalinger til næste skridt

1. **PO beslutter:** Build 3 ja/nej og scope (anbefales: K1+K2 som minimum).
2. **Hvis Build 3 nej:** Accepter Build 2 som baseline, luk US-004, og flyt resterende til backlog.
3. **Uanset beslutning:** Implementer læringspunkterne før næste store US, så "max 2 builds"-type aftaler bliver realistiske.

---

## 8. Bilag

- `docs/qa-report-build2.md` — QA-rapport for Build 2.
- `docs/us004-build-observations-bugs.md` — Samlet bugliste fra Build 1+2.
- `scripts/reproduce-p1.js` — P1 reproduktionsscript.
- `scripts/reproduce-p2p3.js` — P2/P3 reproduktionsscript.
