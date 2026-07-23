# US-004: Ensartet og robust optagelse/oprettelse af sager

## Baggrund / hvorfor

"Optag" (`VoiceCaptureModal`) og "+ Tilføj" (manuel oprettelse i `board.tsx`) er de to primære måder, hvorpå brugeren opretter sager i Data Capture. Begge flows er core-funktionalitet og skal være robuste og forudsigelige.

PO har konstateret følgende problemer:

1. **Auto gem er forsvundet** fra `VoiceCaptureModal`. Funktionen ønskes genetableret, så optagelsen automatisk gemmes, når brugeren holder pause.
2. **Optagelsen "timer ud" under indtaling.** Det virker, som om optagelsen stopper af sig selv, mens brugeren stadig taler. Brugeren forventer, at optagelsen fortsætter, indtil vedkommende aktivt stopper den (eller auto gem gør det ved stilhed).
3. **De to oprettelsesveje er ikke ensartede.** Felterne og rækkefølgen adskiller sig, selvom de skaber den samme type sag.

Ifølge governance-princip 16 må godkendt funktionalitet (herunder auto gem) ikke ændres uden PO-go. Fordi auto gem tidligere var godkendt og nu er væk, skal den enten reetableres eller eksplicit aftales fjernet.

## Hvem der har gavn af det

- **Slutbrugeren** får en forudsigelig optageoplevelse uventede stop og kan frit vælge mellem tale og manuel indtastning uden at skulle forholde sig til forskellige formularer.
- **PO / ejer** får en stærk, konsistent kerneoplevelse, der kan bygges videre på med tillid til, at eksisterende godkendt funktionalitet bevares.
- **Udviklingsteamet** får ét fælles grundlag for de to oprettelsesveje, hvilket reducerer dobbelt vedligehold og regressionsrisiko.

## Acceptkriterier (målbare)

### Auto gem i Optag
1. **Givet** at brugeren åbner "Optag" og slår auto gem til.  
   **Når** optagelsen har været inaktiv (stilhed) i det aftalte tidsrum.  
   **Så** stopper optagelsen, og sagen gemmes automatisk uden yderligere brugerhandling.

2. **Givet** at brugeren slår auto gem fra.  
   **Når** der er stilhed i længere tid.  
   **Så** fortsætter optagelsen stadig, indtil brugeren aktivt trykker på stop eller lukker modalen.

### Optagelse stopper ikke under aktiv indtaling
3. **Givet** at brugeren taler kontinuerligt under optagelse.  
   **Når** der kommer nye talegenkendelsesresultater med rimelig mellemrum.  
   **Så** stopper optagelsen **ikke** af sig selv.

4. **Givet** at optagelsen stopper af en ekstern årsag (f.eks. OS-niveau timeout eller manglende tilladelse).  
   **Så** vises en klar besked, og brugeren kan nemt genstarte eller gemme det, der allerede er indfanget.

### Ensartethed mellem Optag og + Tilføj
5. **Givet** en sammenligning af "Optag" og "+ Tilføj".  
   **Så** indeholder begge modalen de samme redigerbare felter:
   - Type-vælger (idé, observation, bug, notat, foto, stemme, andet).
   - Beskrivelse / noter (tekstfelt).
   - Titel.
   - Kategori.
   - Foto (album/kamera) med forhåndsvisning og OCR.
   - OCR-oversættelse (vises når et foto med tekst er valgt).
   - Ansvarlig (hvis brugeren har rettighed og der er medlemmer).

6. **Givet** at modalen er "Optag".  
   **Så** vises følgende ekstra elementer, som **ikke** findes i "+ Tilføj":
   - Toggle for auto gem.
   - Start / stop optagelse-knap.
   - Forklarende tekst ved optagelse, f.eks. "Sig punktum, komma, ny linje...".

7. **Givet** at modalen er "+ Tilføj".  
   **Så** vises **hverken** auto gem-toggle, optageknap eller optage-hjælpetekst.

### Robusthed og fejlhåndtering
8. **Givet** at optagelsen startes uden mikrofontilladelse.  
   **Så** vises en klar besked med mulighed for at åbne indstillinger / prøve igen.

9. **Givet** at brugeren åbner en oprettelsesmodal.  
   **Så** resettes formularen, så der ikke ligger gammel tekst, gammelt billede eller tidligere tildeling fra forrige gang.

10. **Givet** at brugeren gemmer en sag via en af de to veje.  
    **Så** vises sagen øjeblikkeligt i board-listen, og de øvrige felter (type, kategori, foto, ansvarlig) bevares korrekt.

## Forslag til UI/UX

- **Fælles formular-layout:** Overvej at trække de fælles felter ud i en genanvendelig komponent, så begge modalen viser identiske inputfelter, billedhåndtering og OCR-rækkefølge.
- **"Optag"-modal:**
  - Header: "Optag".
  - Kort hjælpetekst lige under headeren, f.eks.:  
    "Sig punktum, komma, ny linje, skift, slet sidste ord, fortryd eller gem."
  - Tydelig optageknap: "Start optagelse" / "Stop optagelse".
  - Optageindikator (f.eks. pulserende rød prik + varighed i sekunder), mens der optages.
  - Auto gem-toggle med label: "Auto-gem efter stilhed".
  - Derefter de fælles felter: type, beskrivelse, titel, kategori, foto, OCR, ansvarlig.
- **"+ Tilføj"-modal:**
  - Header: "Nyt indlæg".
  - De samme fælles felter som i "Optag".
  - Ingen optageknap, ingen auto gem-toggle, ingen optage-hjælpetekst.
- **Gem-knap:** Aktiveres, når der er mindst titel eller indhold. Viser loading-tekst under gem.
- **Annuller-knap:** Lukker modalen og rydder formularen.

> Bemærk: Præcis placering af auto gem-toggle, tekst og knapafstand afklares med PO under designfasen.

## Afhængigheder

- `hooks/useVoiceRecognition.ts` (stilheds-timer, start/stop, tilladelser).
- `expo-speech-recognition` og platformspecifikke begrænsninger for iOS/Android.
- `components/VoiceCaptureModal.tsx` (Optag-modal).
- `app/(tabs)/board.tsx` ("+ Tilføj"-modal og listevisning).
- `services/items.ts`, `services/media.ts`, `services/ocr.ts`, `services/translation.ts`, `services/roles.ts`.
- Test Manager Agent skal udarbejde testplan, før PO acceptance test påbegyndes.
- Eventuel godkendelse fra Solution Design / Compliance Agent, hvis der indføres en fælles formular-komponent eller ændres i data-flow.

## Risici

| Risiko | Sandsynlighed | Konsekvens | Mitigationsforslag |
|---|---|---|---|
| OS eller `expo-speech-recognition` har en hård timeout, som appen ikke kan omgå. | Mellem | Brugeren oplever stadig, at optagelsen stopper. | Dokumentér platformbegrænsningerne tydeligt for PO; overvej varighedsvisning og mulighed for at genoptage/sammenkæde optagelser. |
| Auto gem ved stilhed gemmer for tidligt, mens brugeren tænker. | Mellem | Ufuldstændige eller uønskede sager. | Gør timeout konfigurerbart og test med forskellige værdier; kræv `isFinal`-resultat før auto gem. |
| Omlægning til fælles formular-komponent ødelægger eksisterende OCR, oversættelse, deling eller tildeling. | Mellem | Regression i allerede godkendt funktionalitet. | Lav stærkt regressionstest-setup; rør kun UI-sammensætning, ikke servicekald. |
| Mikrofontilladelser på iOS/Android håndteres forskelligt efter ændringer. | Lav | Optagelse kan ikke starte. | Test tilladelsesflow på begge platforme. |
| "+ Tilføj" kræver i dag titel, mens "Optag" kan gemme uden titel. | Lav | Inkonsistent validering. | Aftal fælles regel med PO (se åbne spørgsmål). |

## Åbne spørgsmål til PO

1. **Placering af auto gem-toggle:** Skal den sidde i Optag-headeren, ved siden af optageknappen, eller i en indstillingssektion i modalen?
2. **Ønsket auto gem-timeout:** Efter hvor mange sekunders stilhed skal optagelsen auto-gemmes? (f.eks. 3, 5 eller 10 sekunder?)
3. **Timeout under optagelse:** Hvis optagelsen stopper pga. en OS- eller platformbegrænsning (som appen ikke selv kan forhindre), hvad skal der så ske? Skal appen informere brugeren, genoptage automatisk, eller give mulighed for at fortsætte i en ny optagelse?
4. **Auto gem som standard:** Skal auto gem være slået til eller fra som standard, når modalen åbnes?
5. **Hjælpetekst:** Hvilken præcis tekst ønsker PO under optageknappen? (f.eks. "Sig punktum, komma, ny linje, skift, slet sidste ord, fortryd eller gem." eller en kortere variant?)
6. **Fælles validering:** I dag kræver "+ Tilføj" en titel, mens "Optag" kan gemme uden. Skal begge veje kræve titel **eller** indhold, eller beholdes den nuværende forskel?
7. **Optagelsesvarighed:** Skal brugeren se en levende timer (f.eks. 00:23), mens der optages?
8. **Gentagen auto gem / fortsættelse:** Hvis brugeren taler igen efter et auto gem, skal der så oprettes en ny sag, eller skal modalen lukke efter auto gem?
