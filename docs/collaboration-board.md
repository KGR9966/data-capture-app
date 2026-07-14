# Data Capture – Collaboration Board

> Levende dokument for projektstatus, samarbejdsregler og beslutninger.
> Sidst opdateret: 2026-07-14

---

## 📌 Aktuel status (hurtigt overblik)

| Område | Status | Bemærkning |
|---|---|---|
| Foto-upload | 🟡 Klar til build og felttest | Koden er aktiveret; Firebase Storage er nu slået til |
| OCR | 🟡 Klar til build og felttest | Koden er aktiveret; afventer test sammen med foto-upload |
| Deep links / Shortcuts | 🟢 Testet / klar | Filter, link-knap og URL-opbygning er implementeret |
| Handlingslinks | 🔴 Ikke startet | Afventer deep-link test og foto-upload-test |
| Builds tilbage | 🟢 Nok | Brugeren har opgraderet EAS-plan |
| Build-ID på skærmen | 🔴 Ikke implementeret | Påkrævet før næste felttest |
| Firebase Storage | 🟢 Aktiveret | Bucket `data-capture-506bd.firebasestorage.app` oprettet; regler afventer verifikation |

---

## ✅ Aftalte samarbejdsregler

Disse regler gælder for mig og alle agenter, indtil andet er aftalt.

### 1. Ingen kode før godkendt design
- Større features kræver et skriftligt design doc, godkendt af dig.
- Design doc skal indeholde: formål, brugerflow, teknisk valg, testplan, omkostninger, risici.

### 2. Build-disciplin
- Vi bruger **så få EAS builds som muligt**.
- Nye builds startes kun når:
  - Koden er type-checket og lintet.
  - Featuren er testet lokalt så vidt muligt.
  - Du har godkendt planen.
  - Vi har batch-et flere ændringer, hvis det giver mening.

### 3. Feature-aktiveringsrutine
For hver ny feature gennemføres følgende trin:

1. **Brief fra dig** – forretningsønske, edge cases, success-kriterier.
2. **Design & kritik** – løsningsdesign + udfordring fra kritisk/agent.
3. **Godkendelse** – du læser og godkender/justerer designet.
4. **Implementering** – kode skrives.
5. **Lokal test** – test i Expo Go / simulator / dev client.
6. **Build & felttest** – kun hvis lokal test er OK.
7. **Opdatering af status board** – status markeres gennemført.

### 4. Agent-roller
Følgende roller anvendes efter behov:

| Rolle | Ansvar |
|---|---|
| **Project Manager** | Overblik, plan, næste step, opdatering af status board |
| **Solution Designer** | Teknisk design, valg af biblioteker, data model |
| **Risk & Compliance Officer** | GDPR, App Store, permissions, etik |
| **Financial Controller** | Build-omkostninger, drift, tredjeparts-API omkostninger |
| **Tester** | Testscenarier, success-kriterier, reprosteps |
| **Critic** | Udfordrer design og prioritering |
| **Implementer** | Skriver koden |
| **Gate Keeper** | Sidste kontrol før builds/handlinger; tjekker regel-overholdelse |

### 5. Omkostningstransparens
- Hver feature vurdering skal indeholde et skøn over:
  - Antal builds der kan gå tabt.
  - Native moduler der kræver nyt build.
  - Driftomkostninger (Firebase, APIs, osv.).
  - Agent/AI token-forbrug (kvalitativt).

### 6. Statusrapporter
- Statusrapporter leveres i formatet fra `docs/status-agent.md`.
- Rapporter opdateres i dette board efter hver større runde.
- Du kan altid spørge “Hvor er vi?” og få en frisk rapport.

### 7. Ingen “try and error” med builds
- Hvis en feature fejler i felttest, analyseres problemet før nyt build.
- Vi bygger ikke bare igen i håb om at det virker.

### 8. Synlighed / efterprøvelighed
- Compliance Log (`docs/compliance-log.md`) skal opdateres efter hver større handling.
- Gate Keeper Agent skal aktiveres før builds og returnere GO / GO MED FORBEHOLD / STOP.
- Status board og compliance log er det objektive bevis for at processen er fulgt.
- Testproces (`docs/test-process.md`) skal følges før hver test og build.
- Pre-test check (`node scripts/pre-test-check.js`) køres af agenten — **ikke af brugeren**.
- Ved frigivelse til bruger-test skal agenten altid vise en konsolideret **trafiklys-status**.
- Efter ændringer der fjerner native moduler skal agenten rydde `node_modules`, `package-lock.json`, `.expo`, `.metro-cache` og starte med `--clear`. Brugeren skal ikke selv rydde cache.

---

## 🗂️ Aktive opgaver / faser

### Fase 1: Deep links + Shortcuts (🟢 KLAR TIL TEST)
**Mål:** Gør det muligt for Apple Shortcuts at åbne DC direkte på et bestemt emne.

- [x] Implementer deep link parsing i board.
- [x] Filtrér board-liste baseret på `?category=...` og `?status=...`.
- [x] Tilføj “Kopier Shortcuts-link” på emner med kategori.
- [ ] Guide brugeren i at oprette Shortcuts-automation (kan tilføjes senere).
- [x] Kode frigivet efter gate-godkendelse.
- [ ] Lokal test uden nyt build.

**Status:** Gate ✅ — afventer din test i eksisterende dev build.

---

### Fase 2: Handlingslinks på emner/sager
**Mål:** Åbn eksterne apps (G4S, Tapo, osv.) fra en sag.

- [ ] Tilføj handlingslinks i data model.
- [ ] UI til at tilføje/redigere links på en sag.
- [ ] Åbn links med `expo-linking`.
- [ ] Fallback hvis app ikke er installeret.
- [ ] Lokal test.

**Status:** Ikke startet. Afhængig af Fase 1.

---

### Fase 3: Foto-upload + OCR (🟡 Klar til build og felttest)
**Mål:** Billeder kan tages/vælges og uploades; tekst kan læses fra billeder.

- [x] Skift til `@react-native-firebase/storage`.
- [x] Tilføj `expo-mlkit-ocr`.
- [x] “Læs tekst”-knap på billeder.
- [x] Firebase Storage aktiveret i Firebase Console.
- [ ] Verificer Storage-regler i Firebase Console.
- [ ] Kør EAS build.
- [ ] Felttest foto-upload og OCR.

**Status:** Koden er aktiveret i `services/media.ts`, `services/ocr.ts`, `board.tsx` og `VoiceCaptureModal.tsx`. Afventer verifikation af Storage-regler og Gate Keeper-godkendelse før build.

---

### Fase 4: “Min dag” / fokus-liste
**Mål:** Hurtigt overblik over dagens aktive sager.

- [ ] Design doc.
- [ ] Implementering.
- [ ] Test.

**Status:** Ikke startet.

---

### Fase 5: Forbedret redigering af sager
**Mål:** Nemmere at rette titel, tekst, kategori, status, links.

- [ ] Design doc.
- [ ] Implementering.
- [ ] Test.

**Status:** Ikke startet.

---

### Fase 6: Obsidian-export
**Mål:** Eksportér sager som Markdown.

- [ ] Design doc.
- [ ] Implementering.
- [ ] Test med din Obsidian vault.

**Status:** Ikke startet.

---

## 💰 Løbende omkostningsoversigt

| Post | Aktuelt niveau | Estimat ved produktion | Kommentar |
|---|---|---|---|
| EAS builds | Free plan, næsten opbrugt | EAS Production Plan ~$29-99/md | Overvej opgradering snart |
| Firebase | Spark (gratis) | Blaze (forbrugsbaseret) | Lavt forbrug forventet |
| Apple Developer | $99/år | $99/år | Påkrævet til App Store |
| Google Play | $25 engangs | $25 engangs | Påkrævet til Play Store |
| Tredjeparts APIs | $0 | $0-50/md hvis cloud-OCR | On-device OCR undgår dette |
| Agent/AI tokens | Inkluderet i Claude Code | Inkluderet i Claude Code | Variabelt |
| Web/domæne | $0 | ~$10-20/år | Til privacy policy side |

---

## 📋 Beslutningslog

| Dato | Beslutning | Konsekvens |
|---|---|---|
| 2026-07-08 | Drop native baggrunds-geofence; brug Apple Shortcuts + deep links | Ingen location permissions, færre builds, bedre batteri |
| 2026-07-08 | Skift Firebase Storage til `@react-native-firebase/storage` | Løser Blob-fejl, kræver nyt build |
| 2026-07-08 | Indfør Project Status Agent og samarbejdsregler | Bedre planlægning, færre spildte builds |

---

## 🚀 Næste handling

**Aktuelt næste step:** Verificer Storage-regler i Firebase Console, og godkend byggeplan.

Ansvarlig: Bruger (verificer regler) + Claude Code (Gate Keeper).
Godkendt af: Gate Keeper / Claude Code.
Build krævet: **Ja** — nyt EAS iOS build skal bygges for at teste foto-upload og OCR.

### Sådan finder du dit build-ID
Dev build-ID’et kan ses i EAS Dashboard under projektet → Builds. Det skal tilføjes på appens Indstillinger-skærm, så du nemt kan aflæse det fremover — planlagt som separat opgave efter foto-upload-test.
