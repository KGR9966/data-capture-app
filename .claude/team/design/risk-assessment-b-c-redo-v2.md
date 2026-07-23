# Risikovurdering — B+C redo v2 (US-004, US-005, US-006)

**Dokument:** `risk-assessment-b-c-redo-v2.md`  
**Status:** Opdateret med fokus på projektoprettelsesfejl, voice-timeout, parser-kompleksitet, parsing af punkter, eksisterende dubletter, dynamisk opdatering og læseomkostninger.  
**Metode:** Sandsynlighed og konsekvens vurderes på skalaen Lav / Mellem / Høj. Risici er sorteret efter samlet alvorlighed (konsekvens × sandsynlighed).

---

## 1. Risiko-skala

| Sandsynlighed | Beskrivelse |
|---|---|
| Lav | Kan ske, men usandsynlig under normal brug. |
| Mellem | Kan opstå under specifikke forhold eller for en del af brugerne. |
| Høj | Vil sandsynligvis opstå for mange brugere eller ved almindelig brug. |

| Konsekvens | Beskrivelse |
|---|---|
| Lav | Mindre gener; kan omgås af brugeren. |
| Mellem | Forringelse af kerneoplevelsen; kræver arbejdsrunde. |
| Høj | Kritisk fejl, data-tab, sikkerhedsbrud eller blocker for frigivelse. |

---

## 2. Identificerede risici

| # | Risiko | Relateret US | Sandsynlighed | Konsekvens | Mitigation | Ejer i kodefasen |
|---|---|---|---|---|---|---|
| 1 | **Den falske "Kunne ikke oprette projektet"-fejl fortsætter**, fordi root-cause (manglende Firestore-regel for members-subcollection) ikke identificeres korrekt, eller reglerne ikke deployes samtidig med koden. | US-006 | Høj | Høj | Design dokumenterer præcis root-cause og påkrævede regelændringer. QA tester oprettelse på frisk emulator/staging før build. Master Agent bekræfter regel-deploy. | Developer Agent + QA Agent |
| 2 | **Gentagne klik på "Opret" skaber dubletter**, fordi idempotens ikke håndhæves under netværksforsinkelse. | US-006 | Mellem | Høj | Deaktivér knap under oprettelse (`creating`-state). Overvej batch/transaction og clientRef. Test langsomt netværk og hurtige dobbeltklik. | Developer Agent |
| 3 | **Eksisterende projektdubletter gør unikhedsregel inkonsistent** — brugere undrer sig over, at gamle dubletter findes, mens nye blokeres. | US-006 | Mellem | Mellem | Kommunikér tydeligt i UI: "Fremtidige dubletter forhindres." PO har valgt at lade gamle dubletter være. Dokumentér beslutning. | Developer Agent + PO |
| 4 | **OS hard timeout på stemmeoptagelse** (især iOS) stopper optagelsen uventet, selv med design. | US-004 | Mellem | Høj | 50-sekunders max-varighed timer + sammenkædnings-logik ved afbrydelse. Brugerbesked ved længere afbrydelser. Dokumentér platformbegrænsninger. | Developer Agent |
| 5 | **Auto-gem gemmer for tidligt** (f.eks. mens brugeren tænker i 5 sekunder), og der oprettes ufuldstændige sager. | US-004 | Mellem | Mellem | Auto-gem er default slået til (PO-valg), men kan slås fra. Modal forblive åben, så brugeren kan fortsætte. Mulighed for at redigere/slette efterfølgende. | Developer Agent |
| 6 | **Fælles `CreateItemForm` ødelægger eksisterende funktionalitet** (OCR, oversættelse, deling, fotoalbum, tildeling). | US-004 | Mellem | Høj | Hold UI-sammensætning adskilt fra servicekald. Stærk regressionstest af alle oprettelsesveje og OCR-flow. | Developer Agent + QA Agent |
| 7 | **AI-forslag til Type/Kategori fejler på dansk eller specifikke domæner**, så brugeren får forkerte forslag. | US-004 | Lav | Mellem | Fail-safe: forslag er ikke-tvingende. Bruger kan altid overskrive. Stemme-kategori vinder over AI. | Developer Agent |
| 8 | **Smart-søgning og parser-kompleksitet** giver forkerte resultater eller uventet adfærd (f.eks. `-`, `OR`, `*` fortolkes forkert). | US-005 | Mellem | Mellem | Start med substring som default; begræns smart syntaks til veldokumenterede operatorer. Udfør parser-enhedstest. | Developer Agent |
| 9 | **Parsing af punkter fra sagsbeskrivelse** matcher ikke PO's forventning (f.eks. sætninger deles forkert, bullet-listers ignoreres). | US-005 | Høj | Høj | Aftal parser med PO (linjeskift + `- `/`* `-præfiks). Vis forhåndsvisning før listen oprettes. Mulighed for at redigere/slette punkter efter oprettelse. | Developer Agent + PO |
| 10 | **Dynamisk opdatering gråer ud / tilføjer punkter uventet**, fordi match-definitionen ændres eller items slettes. | US-005 | Mellem | Mellem | Kør synkronisering kun ved åbning. `isStale`-flag bevarer punktet. Bruger kan slette uønskede punkter. | Developer Agent |
| 11 | **Firestore læseomkostninger ved mange dynamiske lister** bliver for høj. | US-005 | Mellem | Mellem | Maks 50 lister per bruger, synkronisér kun ved åbning, unsubscribe når skjult. Overvåg under QA. | Developer Agent |
| 12 | **Dyb link deling kræver rettighedshåndtering** — modtagere uden projektadgang kan ikke åbne listen, eller værre, får vist indhold. | US-005 | Mellem | Høj | App-level tjek af projektadgang før visning. Compliance-dokument specificerer regelændringer. Test med bruger uden adgang. | Developer Agent + QA Agent |
| 13 | **Semantisk deduplikering markerer forkerte punkter** som "måske dublet" og forvirrer brugeren. | US-005 | Mellem | Lav | Brug konservativ tærskel (Levenshtein-ratio > 0,85). Marker kun, slet aldrig automatisk. Bruger kan afvise/slette. | Developer Agent |
| 14 | **Scope creep** mellem de tre US'er (AI, notifikationer, offline, global lister, PDF). | US-004 / US-005 | Høj | Mellem | Hold faseplan fast. Alle scope-ændringer kræver PO-go. Backlog markeret tydeligt. | Master Agent + PO |
| 15 | **Regression i projektoprettelse efter ændring af Firestore-regler** (f.eks. members-regel for streng, invitations-flow brudt). | US-006 | Mellem | Høj | Deploy regler til staging først. Test oprettelse, invitation og medlemslæsning. | QA Agent |

---

## 3. Risikomatricer

### 3.1 Samlet risikoniveau

| Niveau | Antal risici | Risici-numre |
|---|---|---|
| Høj (Høj × Høj eller Høj × Mellem) | 5 | 1, 2, 4, 9, 15 |
| Mellem | 7 | 3, 5, 6, 7, 8, 10, 11, 12, 13 |
| Lav | 1 | 14 (scope creep har lav teknisk konsekvens, men høj sandsynlighed) |

### 3.2 Høj-prioritetsrisici (skal mitigeres før build)

1. **Risiko 1:** Falsk fejlmeddelelse fortsætter.
2. **Risiko 2:** Dubletter ved gentagne klik.
3. **Risiko 4:** OS-timeout på stemmeoptagelse.
4. **Risiko 6:** Regression i fælles formular.
5. **Risiko 9:** Forkert punkt-parsing.
6. **Risiko 12:** Dyb link sikkerhed.
7. **Risiko 15:** Regressions ved Firestore-regelændringer.

---

## 4. Mitigations per fase

### 4.1 Designfase (nuværende)

- [x] Root-cause for US-006 identificeret og dokumenteret.
- [x] Idempotent oprettelsesflow designet.
- [x] Unikhedsregel og duplicate-håndtering dokumenteret.
- [x] Voice-timeout og sammenkædnings-strategi dokumenteret.
- [x] Fælles formular designet med regressions-mitigation.
- [x] Punkt-parser designet efter PO-beslutning.
- [x] Firestore-regelændringer specificeret.
- [x] Dyb link rettighedstjek specificeret.

### 4.2 Testplan-fase (TASK-B-C-REDO-014)

- Regressionstest af projektoprettelse under langsomt netværk.
- Test af stemmeoptagelse i 60+ sekunder på fysisk enhed.
- Parser-enhedstest med repræsentative danske sætninger og bullet-lister.
- Test af dyb link med brugere med og without projektadgang.
- Performance-test med 500+ items per projekt.

### 4.3 Kodefase (TASK-B-C-REDO-015 til 017)

- Implementér `creating`-flag og batch/transaction i `createProject`.
- Implementér 50s max timer og optagelses-sammenkædning.
- Hold servicekald uændret i `CreateItemForm`.
- Implementér parser med unit tests.
- Implementér app-level rettighedstjek for dyb link.

### 4.4 QA-fase (TASK-B-C-REDO-018)

- Verificér Firestore-regler på emulator.
- Verificér TypeScript, lint, pre-test checks.
- Logikgennemgang af projektoprettelse, voice-recognition, auto-gem, søgning, lister, deling.

---

## 5. Åbne risici der kræver PO-afklaring

Ingen åbne risici. Alle mitigations er enten tekniske eller allerede PO-godkendte (f.eks. auto-gem default on, 5 sekunder stilhed, lade gamle dubletter være).

**Bemærkning til PO:** Hvis oplevelsen af auto-gem viser sig at gemme for tidligt under acceptance test, kan PO beslutte at ændre timeout eller default-værdi. Dette kræver PO-go.

---

## 6. Godkendelse

**Solution Design Agent vurdering:** Risikovurderingen er komplet. Høj-prioritetsrisici er identificeret med konkrete mitigations. Designet kan gå videre til PO-review og testplan.
