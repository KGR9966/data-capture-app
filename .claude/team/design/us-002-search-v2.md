# US-002: Søgning med fuzzy-substring og smart-søgning (v2)

## Baggrund / hvorfor

Nuværende søgning i Data Capture-appen finder kun hele ord. PO's test viste, at søgning efter "vand" ikke fandt "Vandkande" eller "vandslange". Dette matcher ikke brugerens naturlige forventning.

Samtidig ønsker PO en avanceret "smart-søgning" som supplement, så erfarne brugere kan præcisere søgninger med filtre og særlig syntaks.

Efter B+C hotfix-runden er følgende nye krav tilføjet på baggrund af PO-feedback:

- Søgning skal håndtere specialtegn (`&`, `/`, `-`, tal, æøå mv.) robustt, så virksomhedsnavne, adresser og fagudtryk findes korrekt.
- Søgning skal først udføres, når brugeren har indtastet mindst 2 bogstaver; indtil da vises en prompt eller tom tilstand.
- Matchende ord og sætninger skal fremhæves visuelt i søgeresultater og i lister, så brugeren kan se, hvorfor et resultat matcher.

Denne user story definerer søgeoplevelsen, så den understøtter både dagligdags substring-søgning og valgfri avanceret syntaks.

## Hvem der har gavn af det

- **Slutbrugeren** finder hurtigere relevante sager uden at skulle huske det nøjagtige ord.
- **PO / ejer** får en søgefunktion, der matcher forventningerne og kan danne grundlag for Context Lists (US-003 / US-005).
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

3. **Minimumslængde før søgning (S8)**
   - Givet at brugeren har indtastet 0 eller 1 bogstav.
   - Så udføres søgningen ikke, og der vises en prompt eller tom tilstand.
   - Givet at brugeren har indtastet mindst 2 bogstaver.
   - Så udføres søgningen, og resultater vises.
   - Et enkelt tal eller ét specialtegn tæller ikke som et bogstav.

4. **Søgning i relevante felter**
   - Søgningen skal som minimum dække sagens titel, beskrivelse og noter.
   - PO skal godkende, om også OCR-tekst, projektnavn eller andre felter skal medtages.

5. **Robust håndtering af specialtegn (S2)**
   - Givet søgningen `Jem & Fix`.
   - Så findes sager der indeholder den præcise tekst "Jem & Fix".
   - Givet søgningen `Jem &`.
   - Så findes sager der indeholder "Jem &" (f.eks. "Jem & Fix", "Jem & Co").
   - Givet søgninger der indeholder `/`, `-`, tal, æøå eller andre almindelige specialtegn.
   - Så returneres korrekte matches uden at tegnene bliver fjernet, omskrevet eller afgrænser søgningen forkert.
   - Givet søgningen `50 mm rør`.
   - Så findes sager der indeholder "50", "mm" og "rør" i vilkårlig rækkefølge.

### Smart-søgning (supplement, ikke erstatning)

6. **Helordsmodifikator `*ord*`**
   - Givet søgningen `*vand*`.
   - Så findes kun sager hvor hele ordet "vand" forekommer.
   - "Vandkande" og "vandslange" findes IKKE.

7. **Nøjagtig sætning `"frase"`**
   - Givet søgningen `"vand i kælderen"`.
   - Så findes kun sager hvor den præcise sætning "vand i kælderen" findes.

8. **Negation `-ord`**
   - Givet søgningen `vand -kælder`.
   - Så findes sager der indeholder "vand" men IKKE "kælder".

9. **Alternativ `OR`**
   - Givet søgningen `vand OR varme`.
   - Så findes sager der indeholder enten "vand" eller "varme" (eller begge).

10. **Filtre**
    - Følgende filtre skal understøttes:
      - `type:<værdi>` (f.eks. `type:billede`)
      - `kategori:<værdi>`
      - `status:<værdi>`
      - `ansvarlig:<værdi>`
      - `projekt:<værdi>`
      - `has:photo`
    - Filtre kan kombineres med fritekst og andre operatorer.

11. **Tilgængelig syntakshjælp**
    - Brugeren skal kunne åbne en kort hjælpetekst eller tooltip, der forklarer smart-søgningens operatorer.

### Highlight af matches (W1)

12. **Highlight i søgeresultater**
    - Givet at en søgning har returneret resultater.
    - Så fremhæves de matchende ord eller sætninger visuelt i hvert resultat.
    - Hvis søgningen er `Jem & Fix`, fremhæves "Jem", "&" og "Fix" i resultaterne.
    - Hvis søgningen er `"vand i kælderen"`, fremhæves hele den matchende sætning.

13. **Highlight i lister**
    - Givet at brugeren opretter en dynamisk liste eller context-liste fra en søgning.
    - Så fremhæves de matchende søgeord i listepunkterne, hvor de forekommer.

## Forslag til UI/UX

- **Søgefelt (øverst i listevisning):**
  - Placeholder: "Søg i sager...".
  - Clear-knap (X) når der er input.
  - Lille ikon/knap til syntakshjælp ved siden af feltet.

- **Søgeresultater:**
  - Live opdatering mens brugeren skriver (med debounce, f.eks. 300 ms), men kun når mindst 2 bogstaver er indtastet.
  - Antal resultater vist under søgefeltet.
  - Highlight af matchende tekst i resultaterne.

- **Syntakshjælp (modal eller accordion):**
  - Kort tabel med eksempler:
    - `vand` - finder alt med "vand" (også "vandkande")
    - `*vand*` - kun hele ordet "vand"
    - `"vand i kælderen"` - præcis sætning
    - `vand -kælder` - "vand" men ikke "kælder"
    - `vand OR varme` - enten "vand" eller "varme"
    - `projekt:Renovering status:åben` - filtre
    - `Jem & Fix` - finder "Jem & Fix" uden at "&" afbryder søgningen

- **Tom søgetilstand:**
  - Vis alle sager eller en prompt om at begynde at søge — aftales med PO.

## Afhængigheder

- Data-model for sager (items/cases): hvilke felter der findes og kan søges i.
- Evt. Firestore indeksering eller lokal søgeindex, afhængigt af valgt arkitektur.
- US-003 / US-005 Dynamiske lister / Context Lists, hvis søgninger skal kunne gemmes.
- Test Manager Agent skal udarbejde testplan før PO acceptance test.

## Risici

| Risiko | Sandsynlighed | Konsekvens | Mitigationsforslag |
|---|---|---|---|
| Performance-problemer på store datasæt ved fuzzy-substring | Høj | Appen føles langsom | Aftal maks. datasæt med PO; overvej index/debounce; mål søgetid |
| Kompleksitet i parseren for smart-søgning giver fejl | Mellem | Forkerte søgeresultater | Start med substring + 2-3 operatorer; udvid efter PO-go |
| Brugerne forstår ikke smart-søgning | Mellem | Funktionen ikke brugt | Tilbyd syntakshjælp og tydelige eksempler |
| Case-sensitivity eller specialtegn giver uventede resultater | Mellem | Tillidsbrud til søgning | Dokumentér og test edge cases |
| Søgning i OCR-tekst kræver ekstra ressourcer | Lav | Forlænget udviklingstid | Hold OCR udenfor første runde medmindre PO kræver det |
| **Valg af tokenizer fjerner eller splitter specialtegn forkert (S2)** | **Høj** | **"Jem & Fix" findes ikke; søgning afbrydes ved "&"** | **Test tokenizer eksplicit med &, /, -, tal, æøå; vælg strategy der bevarer specialtegn som en del af tokens uden at lade dem betyde AND/OR** |
| **Minimumslængde (S8) håndhæves kun visuelt men ikke i søgelogik** | **Mellem** | **Appen søger på ét bogstav og giver uforudsigelige resultater** | **Klart krav: søgning udføres først ved ≥2 bogstaver; validering både i UI og søgemotor** |
| **Highlight brydes af specialtegn eller HTML-lignende markup (W1)** | **Mellem** | **Tekst vises forkert eller uden highlighting** | **Brug token-baseret highlight; test med æøå og specialtegn** |

## Åbne spørgsmål til PO

1. Skal søgning køre **lokalt på enheden** eller **server-side / i Firestore**? Dette påvirker performance, offline-understøttelse og kompleksitet.
2. Skal søgning dække **OCR-tekst / original tekst** fra VoiceCaptureModal, eller kun titel, beskrivelse og noter?
3. Skal der være **søgehistorik** eller gemte søgninger? (Context Lists antyder ja, men skal bekræftes.)
4. Skal smart-søgningens operatorer implementeres **alle i første omgang**, eller foretrækker PO en gradvis udbygning?
5. Skal filtre have **autocomplete** (f.eks. viser projektnavne mens man skriver `projekt:`)?
6. Hvad skal ske, hvis en søgning **ikke matcher noget** — vises tom liste med tekst, eller en specifik "ingen resultater"-skærm?
7. Skal søgningen vise **alle projekter/sager** som udgangspunkt, eller først når brugeren skriver noget?
