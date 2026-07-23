# US-002: Søgning med fuzzy-substring og smart-søgning

## Baggrund / hvorfor

Nuværende søgning i Data Capture-appen finder kun hele ord. PO's test viste, at søgning efter "vand" ikke fandt "Vandkande" eller "vandslange". Dette matcher ikke brugerens naturlige forventning.

Samtidig ønsker PO en avanceret "smart-søgning" som supplement, så erfarne brugere kan præcisere søgninger med filtre og særlig syntaks.

Denne user story definerer søgeoplevelsen, så den understøtter både dagligdags substring-søgning og valgfri avanceret syntaks.

## Hvem der har gavn af det

- **Slutbrugeren** finder hurtigere relevante sager uden at skulle huske det nøjagtige ord.
- **PO / ejer** får en søgefunktion, der matcher forventningerne og kan danne grundlag for Context Lists (US-003).
- **Udviklingsteamet** får klare krav til søgeadfærd og -syntaks, før design og implementering påbegyndes.

## Acceptkriterier (målbare)

### Standard substring / fuzzy søgning

1. **Substring-matching som standard**
   - Givet søgningen `vand`.
   - Så findes sager der indeholder "vandkande", "vandslange", "vandhane" og "vand".
   - Søgningen er case-insensitive.

2. **Flerordsinput**
   - Givet søgningen `vand slange`.
   - Så findes sager der indeholder begge ord (implicit AND) i vilkårlig rækkefølge.

3. **Søgning i relevante felter**
   - Søgningen skal som minimum dække sagens titel, beskrivelse og noter.
   - PO skal godkende, om også OCR-tekst, projektnavn eller andre felter skal medtages.

### Smart-søgning (supplement, ikke erstatning)

4. **Helordsmodifikator `*ord*`**
   - Givet søgningen `*vand*`.
   - Så findes kun sager hvor hele ordet "vand" forekommer.
   - "Vandkande" og "vandslange" findes IKKE.

5. **Nøjagtig sætning `"frase"`**
   - Givet søgningen `"vand i kælderen"`.
   - Så findes kun sager hvor den præcise sætning "vand i kælderen" findes.

6. **Negation `-ord`**
   - Givet søgningen `vand -kælder`.
   - Så findes sager der indeholder "vand" men IKKE "kælder".

7. **Alternativ `OR`**
   - Givet søgningen `vand OR varme`.
   - Så findes sager der indeholder enten "vand" eller "varme" (eller begge).

8. **Filtre**
   - Følgende filtre skal understøttes:
     - `type:<værdi>` (f.eks. `type:billede`)
     - `kategori:<værdi>`
     - `status:<værdi>`
     - `ansvarlig:<værdi>`
     - `projekt:<værdi>`
     - `has:photo`
   - Filtre kan kombineres med fritekst og andre operatorer.

9. **Tilgængelig syntakshjælp**
   - Brugeren skal kunne åbne en kort hjælpetekst eller tooltip, der forklarer smart-søgningens operatorer.

## Forslag til UI/UX

- **Søgefelt (øverst i listevisning):**
  - Placeholder: "Søg i sager...".
  - Clear-knap (X) når der er input.
  - Lille ikon/knap til syntakshjælp ved siden af feltet.

- **Søgeresultater:**
  - Live opdatering mens brugeren skriver (med debounce, f.eks. 300 ms).
  - Antal resultater vist under søgefeltet.
  - Highlight af matchende tekst i resultaterne, hvis teknisk muligt uden store performance-tab.

- **Syntakshjælp (modal eller accordion):**
  - Kort tabel med eksempler:
    - `vand` - finder alt med "vand" (også "vandkande")
    - `*vand*` - kun hele ordet "vand"
    - `"vand i kælderen"` - præcis sætning
    - `vand -kælder` - "vand" men ikke "kælder"
    - `vand OR varme` - enten "vand" eller "varme"
    - `projekt:Renovering status:åben` - filtre

- **Tom søgetilstand:**
  - Vis alle sager eller en prompt om at begynde at søge — aftales med PO.

## Afhængigheder

- Data-model for sager (items/cases): hvilke felter der findes og kan søges i.
- Evt. Firestore indeksering eller lokal søgeindex, afhængigt af valgt arkitektur.
- US-003 Dynamiske lister / Context Lists, hvis søgninger skal kunne gemmes.
- Test Manager Agent skal udarbejde testplan før PO acceptance test.

## Risici

| Risiko | Sandsynlighed | Konsekvens | Mitigationsforslag |
|---|---|---|---|
| Performance-problemer på store datasæt ved fuzzy-substring | Høj | Appen føles langsom | Aftal maks. datasæt med PO; overvej index/debounce; mål søgetid |
| Kompleksitet i parseren for smart-søgning giver fejl | Mellem | Forkerte søgeresultater | Start med substring + 2-3 operatorer; udvid efter PO-go |
| Brugerne forstår ikke smart-søgning | Mellem | Funktionen ikke brugt | Tilbyd syntakshjælp og tydelige eksempler |
| Case-sensitivity eller specialtegn giver uventede resultater | Mellem | Tillidsbrud til søgning | Dokumentér og test edge cases |
| Søgning i OCR-tekst kræver ekstra ressourcer | Lav | Forlænget udviklingstid | Hold OCR udenfor første runde medmindre PO kræver det |

## Åbne spørgsmål til PO

1. Skal søgning køre **lokalt på enheden** eller **server-side / i Firestore**? Dette påvirker performance, offline-understøttelse og kompleksitet.
2. Skal søgning dække **OCR-tekst / original tekst** fra VoiceCaptureModal, eller kun titel, beskrivelse og noter?
3. Skal der være **søgehistorik** eller gemte søgninger? (Context Lists antyder ja, men skal bekræftes.)
4. Skal smart-søgningens operatorer implementeres **alle i første omgang**, eller foretrækker PO en gradvis udbygning?
5. Skal filtre have **autocomplete** (f.eks. viser projektnavne mens man skriver `projekt:`)?
6. Hvad skal ske, hvis en søgning **ikke matcher noget** — vises tom liste med tekst, eller en specifik "ingen resultater"-skærm?
7. Skal søgningen vise **alle projekter/sager** som udgangspunkt, eller først når brugeren skriver noget?
