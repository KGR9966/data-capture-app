:escalation-us004-po-request

# Eskaleringsdokument — US-004 hotfix-forløb

**Dato:** 2026-08-01  
**Afsender:** PO (Product Owner)  
**Modtager:** Anthropic / Claude Code support / relevant management  
**Emne:** Governance-brud, unødvendige omkostninger og behov for afklaring før fortsat samarbejde

---

## A. Kort eskaleringsbesked

Hej,

Jeg er PO på en app-udvikling, hvor Claude Code anvendes som Master Agent ifølge et SPOC-setup, der blev anbefalet mig. Forventningen var en agent med 360°-ansvar: fra forretningskrav til færdig implementeret løsning, med mig som PO og fysisk tester.

I den aktuelle US-004 hotfix-runde er der opstået følgende kritiske problemer:

1. **Unødvendige EAS-builds:** Der er blevet bestilt flere builds, herunder Android-builds, på trods af at vi eksplicit var enige om iOS-only byggeri.
2. **Manglende kvalitetssikring før build:** En basal fejl (`getProjectRole` kaldt uden `userEmail`) blev ikke fanget af smoke-test eller audit, før build blev godkendt. Det har kostet mig penge i overages.
3. **Regression i basal funktionalitet:** Efter deploy af nye Firestore-regler kan sager stadig oprettes, men vises ikke i appen. Årsagen er en regelstruktur, der ikke understøtter list-queries. Dette burde være fanget i design/review.
4. **Manglende proaktiv styring:** Gentagne løfter om handlinger, der ikke blev fulgt op. Statusrapporter blev leveret, men uden at sikre at gates faktisk var lukket.
5. **Økonomisk impact:** Antallet af builds og overages har givet mig en uforventet regning, som jeg ikke mener, jeg bærer ansvaret for alene.

Jeg beder om:

- En afklaring af, hvad Master Agent-rollen reelt dækker, og hvilke kompetencer/profil der følger med.
- En plan for, hvordan vi undgår unødvendige builds og sikrer smoke-test/QA-gates fremover.
- En drøftelse af økonomisk ansvarlighed for de unødvendige omkostninger, der er genereret.
- En beslutning om, hvordan vi kan fortsætte samarbejdet på en struktureret måde — eventuelt med ekstra agent-roller, opdateret profil eller andre tiltag.

Forløbet er dokumenteret detaljeret i B (post-mortem) nedenfor.

Venlig hilsen,
[PO]

---

## B. Detaljeret post-mortem

### 1. Baggrund og mål

**Runde:** US-004 hotfix + B3/B4/B8/B9/D1/D3 + kendte bugs.  
**Omfatter:** Offline lister, push-påmindelser, projektoprettelses-bugfix, slet projekt, voice-residu-fix og auto-titel-fix.  
**Forventet leverance:** En testbar iOS-build med alle aftalte punkter implementeret, verificeret og klar til PO-acceptance.

### 2. Tidslinje og hændelsesforløb

| Dato | Hændelse | Bemærkning |
|---|---|---|
| 2026-07-15 | PO-godkendelse af runde med punkter B3-B4-B8-B9-D1-D3 + kendte bugs | |
| 2026-07-15 | Master Agent opretter build-ready-checklist | |
| 2026-07-15 | Audit Agent giver GO til build/QA | |
| 2026-07-15 | PO giver go til build | |
| 2026-07-15 | Master Agent bestiller EAS build for **alle platforme** (Android + iOS) | Brud på aftale om iOS-only |
| 2026-07-15 | Android + iOS build færdig | Ekstra omkostning |
| 2026-07-15 | PO installerer build og konstaterer: kan oprette projekter, men ikke sager | Kritisk regression |
| 2026-07-15 | Master Agent finder fejl: `getProjectRole()` kaldes uden `userEmail` i `board.tsx`, `item.tsx`, `VoiceCaptureModal.tsx` og `index.tsx` | Fejlen burde være fanget før build |
| 2026-07-15 | Master Agent retter fejlen og bygger **nyt iOS-only build** | Endnu en build-omkostning |
| 2026-07-15 | PO installerer nyt build og kan oprette sager, men de vises ikke i appen | Ny regression |
| 2026-07-15 | Master Agent analyserer: `firestore.rules` `items read` bruger `get()` på projekt for hvert dokument, hvilket ikke virker med list-queries | Designfejl i regler, burde være fanget |
| 2026-07-15 | Master Agent præsenterer to løsningsmuligheder: A1 (denormalisering) eller B (omlægning til subcollections) | Begge kræver yderligere arbejde og nyt build |

### 3. Identificerede fejl og brud

#### Tekniske fejl
1. **`getProjectRole` uden email** — email-inviterede medlemmer og i dette tilfælde også ejer-adgang i visse flows blev ikke genkendt, fordi koden ikke sendte `user.email` med.
2. **`items read`-regel bruger `get()` i list-query** — Firestore afviser/returnerer tom liste, når regler skal slå andre dokumenter op pr. dokument i et query-resultat.
3. **Manglende lokal smoke-test af kritisk sti** før build-go.

#### Governance-brud
1. **Android-build bestilt trods iOS-only aftale.**
2. **Smoke-test gate ikke lukket før build-go.**
3. **Audit Agent GO accepteret uden Master Agent-verifikation af basal funktionalitet.**
4. **Gentagne statusrapporter uden faktisk fremdrift løsning.**

### 4. Økonomisk impact

| Build | Platform | Bemærkning |
|---|---|---|
| 1c732b2f... | Android | Unødvendig — aftalt iOS-only |
| dd237df8... | iOS | Fejlet pga. getProjectRole-bug |
| 9942452b... | iOS | Fejlet pga. items read-regel |
| (evt. kommende) | iOS | Kræves for at rette regler/arkitektur |

**Overages ifølge EAS-output:** $44+ ved seneste build. Yderligere builds vil øge beløbet.

### 5. Hvorfor governance ikke holdt

- **Aftaler var procedurer i dialogen, ikke håndfaste gates.** Ingen tvangspunkter der forhindrede build, før smoke-test var gennemført.
- **Master Agent accepterede Audit Agent's GO uden selv at verificere kritisk sti.**
- **Ingen stop-mekanisme for platformbegrænsning.** Build-kommandoen blev kørt med `--platform all` trods aftale.
- **Agenternes output blev brugt som substitut for faktisk test.**

### 6. Forslag til forbedring

#### Strammere gates før build
1. Design-gate: 100% af punkter har design-fil.
2. Kode-gate: typecheck/lint grøn.
3. **Smoke-test-gate: lokal test af login, projektvalg, sag-oprettelse, liste-oprettelse, afkrydsning.**
4. Audit-gate: uafhængig gennemgang.
5. **Master Agent skal skriftligt bekræfte, at alle gates er lukket.**
6. PO-go til build.
7. **Platform-gate: specifik bekræftelse af aftalte platforme før build-kommando.**

#### Klare roller
- **Master Agent:** Planlægger, koordinerer, lukker gates, rapporterer. Må ikke selv skrive kode/committe.
- **Dev Agent:** Skriver kode, kører unit-tests.
- **QA Agent:** Skriver testplan, udfører/gennemfører fysisk test.
- **Audit Agent:** Uafhængig gennemgang af kode og regler.

#### Økonomisk ansvarlighed
- Etablér pr. runde et maksimalt antal builds.
- Kræv PO-go for hvert build, der ikke er første planlagte build.
- Dokumentér begrundelse for hvert build.

#### Arkitektur
- Flyt items/checkpoints/comments under `projects/{projectId}/...` subcollections for at undgå cross-collection `get()` i regler.
- Etablér regel-review som obligatorisk gate, ikke kun audit.

### 7. Anmodning

PO anmoder om:
1. En officiel afklaring fra Anthropic/Claude Code management af Master Agent-konceptet, dets begrænsninger og ansvarsfordeling.
2. En plan for, hvordan fremtidige samarbejdsrunder struktureres, så unødvendige builds og lignende fejl undgås.
3. Drøftelse af kompensation eller kreditering for de unødvendige omkostninger, der er påløbet.
4. Aftalt grundlag før videre teknisk arbejde på US-004 eller andre opgaver.

---

## Bilag: Relevante filer og commits

- Branch: `fix/us004-voice-redesign`
- Seneste commits:
  - `99a20f8 fix: send user email til getProjectRole overalt`
  - `1970042 docs: opdater build-ready-checkliste og QA-testplan for US-004`
  - `d295dd8 fix(firestore.rules): checkpoints create brugte resource.data.projectId`
  - `4a0f9f9 feat(US-005/B3 + US-011/B4): offline lister og push-påmindelser`
- Dokumentation:
  - `.claude/team/status/build-ready-checklist.md`
  - `.claude/team/test/qa-testplan-us004.md`
  - `.claude/team/status/escalation-us004-po-request.md` (denne fil)
