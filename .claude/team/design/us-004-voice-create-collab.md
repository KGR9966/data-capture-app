# US-004: Ensartet og robust optagelse/oprettelse af sager

**Status:** Klar til PO-godkendelse.  
**Bidragydere:** Userstoryagent + Creative/AI Challenger Agent.  
**Reference:** Felt-for-felt flow-analyse i `us-004-field-flow-analysis.md`.

---

## Baggrund / hvorfor

Data Capture har to primære oprettelsesveje:

- **Optag** (`VoiceCaptureModal`) - tale-til-tekst.
- **+ Tilføj** (manuel formular i `app/(tabs)/board.tsx`).

De skal skabe den samme type sag, men er i dag ikke ensartede og har forskellige felter/validering. Derudover er **auto gem forsvundet** fra Optag, og optagelsen kan stoppe uventet midt i indtalingen.

Denne user story har til formål at:

1. Genetablere en robust auto-gem-funktion i Optag.
2. Sikre at optagelsen ikke stopper under aktiv indtaling.
3. Gøre de to oprettelsesveje ensartede og forudsigelige.
4. Reducere antallet af felter brugeren skal forholde sig til.
5. Lade AI foreslå Type og Kategori, så brugeren sjældent behøver at kategorisere manuelt.

---

## Hvem der har gavn af det

- **Slutbrugeren** får en forudsigelig optageoplevelse, frit valg mellem tale og tastatur og mindre manuel kategorisering.
- **PO / ejer** får en stærk, konsistent kerneoplevelse, der kan bygges videre på.
- **Udviklingsteamet** får én fælles formular-komponent, hvilket reducerer dobbelt vedligehold og regressionsrisiko.

---

## Kreativt / AI-udfordrende perspektiv

- **AI-forslag til Type og Kategori:** Appen kan automatisk foreslå både Type (idé, fejl, observation, notat, foto, stemme, andet) og Kategori ud fra tekstindholdet og eventuelle talekommandoer. Brugeren kan altid overskrive forslaget.
- **Færre felter:** Titel kan udledes automatisk af teksten - f.eks. første sætning eller første 6 ord - og vises som en valgfri redigering. Det reducerer antallet af obligatoriske felter i modalen.
- **Smart optagelse:** En justerbar stilheds-timer, håndtering af OS-timeout og en tydelig optageindikator gør optagelsen mere robust.
- **Fælles formular-komponent:** Et genanvendeligt `CreateItemForm`-grundlag bruges af både Optag og + Tilføj, så felter og rækkefølge altid er identiske.

---

## Anbefaling: felter og rækkefølge i oprettelsesmodalen

Målet er at vise så få felter som muligt i starten og kun vise avancerede felter, når de er relevante.

### Fælles felter for "Optag" og "+ Tilføj" (samme rækkefølge)

| # | Felt | Beskrivelse |
|---|------|-------------|
| 1 | **Type-vælger** | Chips: Idé, Fejl, Observation, Notat, Foto, Stemme, Andet. AI foreslår type ud fra indhold/talekommando; bruger kan altid overskrive. `Fejl` vises i stedet for `Bug`. |
| 2 | **Tekst / beskrivelse** | Stort, primært tekstfelt. Titel auto-udledes fra første linje / første 6 ord. I Optag vises live-transcript; i +Tilføj skriver brugeren direkte. |
| 3 | **Titel** | Valgfri, auto-udledt fra tekstfeltet. Kan redigeres eksplicit via en "Rediger titel"-knap/felt. |
| 4 | **Kategori** | Autocomplete med AI-forslag og projekt-historik. Auto-foreslået ud fra Type + tekst. Bruger kan redigere eller fjerne. |
| 5 | **Foto** | Album- og kamera-knapper med forhåndsvisning. Type kan sættes automatisk til `Foto`, men `Foto` og `Stemme` beholdes også som manuelle valg i +Tilføj. |
| 6 | **OCR-oversættelse** | Kun synlig når foto indeholder genkendt tekst. Både "Kopiér" og "Del" tilgængelige i begge modalers; oversættelse gemmes. |
| 7 | **Ansvarlig** | Kun synlig hvis brugeren har tildelingsrettighed og projektet har medlemmer. Default: "Ingen ansvarlig". |
| 8 | **Handlinger** | Gem / Annuller. |

### Kun i "Optag"

- Header: "Optag".
- Hjælpetekst under header: "Sig punktum, komma, ny linje, skift, slet sidste ord, fortryd eller gem."
- Optageknap med optageindikator og varighed.
- Auto-gem toggle: "Auto-gem efter stilhed".

### Kun i "+ Tilføj"

- Header: "Nyt indlæg".
- Ingen optageknap, auto-gem toggle eller optage-hjælpetekst.

### Relation mellem Type og Kategori

- **Type** = sagens karakter / input-kanal. Fast sæt af værdier, farvekodet.
- **Kategori** = emne / bucket. Frit tekstfelt med autocomplete over projektets kategorier og AI-forslag.
- **Sammenhæng:** Type sætter kun et udgangspunkt for Kategori. De er ikke 1:1. F.eks. kan Type "Idé" få Kategori "Feature", "Process" eller "Andet".

---

## Acceptkriterier (Gherkin)

### Auto gem og robust optagelse

1. **Givet** at brugeren åbner "Optag" med auto-gem slået til (default).  
   **Når** der har været stilhed i 5 sekunder.  
   **Så** gemmes sagen automatisk, optagelsen stopper, og modalen forblive åben klar til næste optagelse.

2. **Givet** at brugeren slår auto-gem fra.  
   **Når** der er længerevarende stilhed.  
   **Så** fortsætter optagelsen indtil brugeren aktivt trykker stop.

3. **Givet** at brugeren taler kontinuerligt under optagelse.  
   **Når** der kommer nye talegenkendelsesresultater med rimelige mellemrum.  
   **Så** stopper optagelsen ikke af sig selv.

4. **Givet** at optagelsen afsluttes af en ekstern årsag (OS-timeout eller manglende tilladelse).  
   **Så** vises en klar besked, og brugeren kan genoptage eller gemme det allerede optagede.

### Ensartethed mellem Optag og + Tilføj

5. **Givet** en sammenligning af "Optag" og "+ Tilføj".  
   **Så** indeholder begge modalen de samme fælles felter i samme rækkefølge.

6. **Givet** at brugeren gemmer en sag via "Optag".  
   **Så** oprettes sagen med samme felter som fra "+ Tilføj" (type, tekst/titel, kategori, foto, ansvarlig).

7. **Givet** at brugeren åbner en oprettelsesmodal.  
   **Så** resettes formularen, så der ikke ligger gammel tekst, billede eller tildeling fra tidligere.

8. **Givet** at brugeren gemmer en sag via en af de to veje.  
   **Så** vises sagen øjeblikkeligt i board-listen, og alle felter bevares korrekt.

### AI-hjælp og validering

9. **Givet** at brugeren indtaler "Fejl ..." eller skriver tekst der tydeligt peger på en fejl.  
   **Så** foreslår appen Type = Fejl og Kategori = Fejl, men brugeren kan overskrive.

10. **Givet** at brugeren gemmer uden at have angivet indhold.  
    **Så** udledes en titel automatisk fra indholdet, og sagen gemmes kun, hvis der er mindst én af felterne tekst/titel eller foto udfyldt.

### Stemmekommandoer

11. **Givet** at brugeren siger "gem" under optagelse.  
    **Så** gemmes sagen, optagelsen stopper, og modalen lukkes.

12. **Givet** at brugeren siger "slet alt" under optagelse.  
    **Så** ryddes tekstfeltet, men originalteksten gemmes og kan kopieres eller deles.

13. **Givet** at brugeren starter optagelsen med "Silvan punktum ...".  
    **Så** sættes Kategori til "Silvan", ordet fjernes fra tekstfeltet, og resten af teksten vises som beskrivelse/noter.

14. **Givet** at brugeren har sagt en kategori eksplicit.  
    **Når** AI foreslår en anden kategori.  
    **Så** vinder brugerens stemme-kategori over AI-forslaget.

### Timer og OS-timeout

15. **Givet** at optagelsen er aktiv.  
    **Så** vises en levende timer med optagelsens varighed.

16. **Givet** at optagelsen afbrydes af en ekstern årsag.  
    **Når** afbrydelsen er ultra kort.  
    **Så** genoptages optagelsen automatisk.

17. **Givet** at optagelsen afbrydes af en ekstern årsag.  
    **Når** afbrydelsen er længerevarende.  
    **Så** informeres brugeren, og der tilbydes at starte en ny optagelse med det allerede indtagede bevaret.

---

## Forslag til UI/UX

- Træk fælles felter ud i en genanvendelig komponent `CreateItemForm`.
- "Optag"-modal:
  - Header: "Optag".
  - Kort hjælpetekst under headeren.
  - Tydelig optageknap: "Start optagelse" / "Stop optagelse" med optageindikator og varighed.
  - Auto-gem-toggle ved siden af eller lige under optageknap.
  - Derefter de fælles felter: Type, Tekst (med auto-udledt titel), Kategori, Foto, OCR, Ansvarlig.
- "+ Tilføj"-modal:
  - Header: "Nyt indlæg".
  - De samme fælles felter som i "Optag".
  - Ingen optageknap, auto-gem eller optage-hjælpetekst.
- Gem-knap aktiveres, når der er mindst indhold i tekstfeltet eller et foto tilknyttet.
- Annuller-knap lukker modalen og rydder formularen.

---

## Afhængigheder

- `hooks/useVoiceRecognition.ts` (stilheds-timer, start/stop, tilladelser).
- `expo-speech-recognition` og platformspecifikke begrænsninger for iOS/Android.
- `components/VoiceCaptureModal.tsx` (Optag-modal).
- `app/(tabs)/board.tsx` ("+ Tilføj"-modal og listevisning).
- `services/items.ts`, `services/media.ts`, `services/ocr.ts`, `services/translation.ts`, `services/categories.ts`, `services/roles.ts`.
- Ny fælles formular-komponent.
- Testplan fra Test Manager Agent, før PO acceptance test påbegyndes.
- Eventuel godkendelse fra Solution Design / Compliance Agent hvis data-flow ændres.

---

## Risici

| Risiko | Sandsynlighed | Konsekvens | Mitigationsforslag |
|---|---|---|---|
| OS eller `expo-speech-recognition` har en hård timeout, som appen ikke kan omgå. | Mellem | Brugeren oplever stadig, at optagelsen stopper. | Dokumentér platformbegrænsningerne tydeligt for PO; overvej varighedsvisning og mulighed for at genoptage/sammenkæde optagelser. |
| Auto-gem ved stilhed gemmer for tidligt, mens brugeren tænker. | Mellem | Ufuldstændige eller uønskede sager. | Gør timeout konfigurerbart; kræv `isFinal`-resultat før auto-gem. |
| Omlægning til fælles formular-komponent ødelægger eksisterende OCR, oversættelse, deling eller tildeling. | Mellem | Regression i allerede godkendt funktionalitet. | Lav stærkt regressionstest-setup; rør kun UI-sammensætning, ikke servicekald. |
| Kombinere titel og tekst i ét felt forvirrer brugeren. | Lav | Misforståelse af formularen. | Aftal med PO; vis auto-udledt titel tydeligt som forslag. |
| Type/Kategori-forslag fejler på dansk eller specifikke domæner. | Lav | Forkerte kategori/type. | Fail-safe: behold brugerens tekst, vis forslag som ikke-tvingende. |

---

## Afklarede beslutninger fra PO

| # | Spørgsmål | Beslutning |
|---|---|---|
| 1 | Titel vs. tekst | Ét primært tekstfelt med auto-udledt titel. |
| 2 | Type visning | AI forhåndsudvælger, men chips vises. |
| 3 | Kategori | Autocomplete med AI-forslag og redigerbart. |
| 4 | Type vs. Kategori | Type er sagens karakter; Kategori er emne/bucket; Type sætter kun default-kategori. |
| 5 | Auto-gem timeout | 5 sekunders stilhed; auto-gem er default slået til. |
| 6 | Efter auto-gem | Modalen forblive åben klar til næste optagelse. |
| 7 | OS-timeout | Kort timeout → fortsæt automatisk. Længere timeout → informér og tilbyd ny optagelse. |
| 8 | Foto/Stemme i +Tilføj | Beholdes som valgbare. Type kan også sættes automatisk fra input-kanal. |
| 9 | Validering | Mindst tekstindhold eller foto skal være udfyldt for at kunne gemme. |
| 10 | Ansvarlig default | Ingen ansvarlig. |
| 11 | OCR | Både Kopiér og Del i begge modalers; oversættelse gemmes. |
| 12 | Type-label `bug` | Vises som "Fejl" i stedet for "Bug". |
| 13 | "Gem"-kommando | Sagen gemmes, og modalen lukkes. |
| 14 | "Slet alt"-kommando | Ryd al tekst i feltet. Original tekst gemmes og kan kopieres/deles. |
| 15 | Kategori fra stemme | Første ord/udsagn bruges som kategori og fjernes fra tekstfeltet. |
| 16 | Stemme vs AI-kategori | Stemme-kategori vinder over AI-forslag, når brugeren aktivt angiver den. |
| 17 | Hjælpetekst | "Sig punktum, komma, ny linje, skift, slet sidste ord, fortryd, slet alt eller gem." |
| 18 | Levende timer | Ja — vis f.eks. 00:23 under optagelse. |

## Åbne spørgsmål til PO

Ingen. Afklaringerne er komplette, og user story er klar til PO-godkendelse.
