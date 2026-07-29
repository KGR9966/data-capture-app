# US-005: Dynamiske lister og søgeportal (v2)

**Status:** Klar til PO-godkendelse.  
**Bidragydere:** PO + Userstoryagent + Creative/AI Challenger Agent.  
**Scope:** Fase 1 — grundlæggende dynamiske lister, søgeportal, deling og afkrydsning, med PO-feedback fra B+C hotfix-runden indarbejdet.

---

## Baggrund / hvorfor

PO ønsker, at Data Capture kan indsamle information relativt ustruktureret og derefter gøre data søgbart og struktureret. En søgning skal kunne omdannes til en arbejdsliste med punkter fra sagers beskrivelse og noter. Listen skal:

- Sorteres alfabetisk (og senere efter dato/prioritet).
- Lade brugeren redigere og slette punkter.
- Fjerne strenge dubletter automatisk og fremhæve semantiske dubletter til manuel gennemgang.
- Kunne afkrydses som done.
- Flytte done-punkter til bunden.
- Være dynamisk — opdateres når nye sager matcher søgningen.
- Vises på en ny "Lister"-fane / portal.
- Kunne deles via SMS/share-sheet og dyb link.

Efter B+C hotfix-runden er følgende yderligere krav tilføjet:

- Listeoprettelse fra søgning må ikke fejle med "Kunne ikke oprette den dynamiske liste".
- Afkrydsning af ét listepunkt må ikke automatisk ændre hele kildesagens status.
- Listepunkt-status og sags-status skal være adskilte enheder.
- Tastaturet må ikke dække inputfelter ved tilføjelse/redigering af punkter.
- Kommentar-skrivning i en sag må ikke fjerne "Tilbage"-knap eller låse appen.
- Matchende søgeord skal fremhæves i listepunkterne.

Denne user story definerer oplevelsen for dynamiske lister og søgeportalen.

---

## PO-beslutninger

| # | Emne | PO-valg | Bemærkning |
|---|---|---|---|
| 1 | Søgning først | Ja | Søge-redesign (substring/fuzzy standard + smart syntaks som supplement) er del af US-005. |
| 2 | Portalplacering | A | Ny "Lister"-fane. Eksisterende "Aktionslister" forstyrres ikke. |
| 3 | Scope | B | Projektspecifikke lister (rettigheder og sager er projektbaserede). Global scope udskudt til backlog. |
| 4 | Foruddefinerede søgninger | B | Kun brugeroprettede lister i første fase. Faste oversigter udskudt til backlog. |
| 5 | Felter til punkter | C | Brugeren vælger, når listen oprettes. **Default:** listen får et navn/kategori, og punkterne hentes fra matchende sagers beskrivelse/noter. Titel kan også medtages. **Parsing af punkter:** linjeskift og `- `/`* `-præfiks bliver separate punkter. |
| 6 | Deduplikering | A + B | Streng deduplikering fjerner identiske punkter automatisk. Semantiske dubletter markeres som "måske duplikat" med mulighed for brugeren at slette. |
| 7 | Sortering | C + B | Brugeren vælger per liste blandt alfabetisk, dato og prioritet. Default er alfabetisk med udførte punkter i bunden. |
| 8 | Nye matches | A | Nye matches markeres med "ny"-badge, indtil brugeren har set listen. |
| 9 | Fjernelse af matches | B | Hvis en sag ikke længere matcher, bevares punktet men gråes ud med note. |
| 10 | Status-synkronisering | **B + A** | **Opdateret efter hotfix-runden:** Afkrydsning af ét listepunkt opdaterer kun det pågældende punkt i kildesagen. Hele sagen påvirkes ikke, medmindre alle punkter fra sagen er færdige. Listepunkt-status og sags-status er adskilte; ændring af sags-status spejles ikke automatisk til listepunktet, og omvendt. |
| 11 | Egne punkter | B | Brugeren kan tilføje punkter; der oprettes automatisk en sag, der matcher listens søgning. |
| 12 | Deling | C | Både tekst/SMS via share-sheet og dyb link tilbage til appen. |
| 13 | Offline / notifikationer | Nej nu | Begge dele er vigtig fremtidig funktionalitet og skrives på backlog. |

---

## Acceptkriterier (Gherkin)

### Søgning og generering af liste

1. **Givet** at brugeren har foretaget en søgning.  
   **Når** der er resultater.  
   **Så** kan brugeren trykke "Opret liste", angive listens navn og vælge, hvilke felter der bliver til listepunkter (titel, beskrivelse/noter, kategori).

2. **Givet** at brugeren trykker "Opret liste" fra en søgning.  
   **Så** oprettes listen uden fejlmeddelelsen "Kunne ikke oprette den dynamiske liste", og brugeren navigeres til listen eller portalen. (S1)

3. **Givet** at en liste oprettes med beskrivelse/noter som kilde.  
   **Så** genereres ét eller flere punkter per sag baseret på det valgte felt.

4. **Givet** at listen oprettes.  
   **Så** fjernes identiske punkter automatisk (normaliseret tekst).

5. **Givet** at listen oprettes.  
   **Så** fremhæves semantisk lignende punkter med et "måske duplikat"-badge, som brugeren kan slette manuelt.

6. **Givet** at brugeren opretter en liste fra en søgning.  
   **Så** fremhæves de matchende søgeord i listepunkterne, hvor ordene forekommer. (W1)

### Sortering og visning

7. **Givet** at listen vises.  
   **Så** sorteres punkter efter brugerens valg (alfabetisk, dato eller prioritet), og udførte punkter placeres i bunden.

8. **Givet** at brugeren har valgt en sortering.  
   **Så** huskes valget for den pågældende liste.

### Afkrydsning og status

9. **Givet** at brugeren afkrydser et listepunkt.  
   **Så** markeres punktet som udført og flyttes til bunden.

10. **Givet** at brugeren afkrydser et listepunkt.  
    **Så** opdateres kun det pågældende punkt i kildesagen, og kildesagens samlede status ændres ikke, medmindre alle punkter fra samme sag er færdige. (S3)

11. **Givet** at brugeren fjerner afkrydsningen på et punkt.  
    **Så** markeres punktet som åbent igen, og kildesagens status påvirkes ikke.

12. **Givet** at en kildesags status ændres manuelt (f.eks. til `in_progress` eller `done`).  
    **Så** spejles den ændring IKKE automatisk til det tilknyttede listepunkt. Listepunktets afkrydsningsstatus forbliver uændret. (S4 / S7)

13. **Givet** at et listepunkt er afkrydset.  
    **Så** ændres kildesagens status IKKE automatisk til `done` på grund af det enkelte punkt.

14. **Givet** at brugeren åbner en liste.  
    **Så** vises en afkrydsningsboks pr. listepunkt, og der vises ingen overordnet "liste-status" der spejler sags-status.

### Dynamisk opdatering

15. **Givet** at en liste er oprettet fra en gemt søgning.  
    **Når** en ny sag matcher søgningen.  
    **Så** tilføjes punktet automatisk, sorteres ind blandt åbne punkter og markeres med "nyt"-badge.

16. **Givet** at en dynamisk liste har punkter.  
    **Når** en kildesag ikke længere matcher søgningen.  
    **Så** gråes punktet ud med en note om, at kilden ikke længere matcher, og det fjernes ikke automatisk.

### Portal

17. **Givet** at brugeren åbner "Lister"-fanen.  
    **Så** vises brugerens gemte dynamiske lister med antal åbne/udførte punkter og seneste opdatering.

18. **Givet** at brugeren trykker på en liste i portalen.  
    **Så** åbnes listen med alle punkter og indikation af eventuelle nye matches.

### Redigering og egne punkter

19. **Givet** at brugeren ser et listepunkt.  
    **Så** kan brugeren redigere titel/noter eller slette punktet.

20. **Givet** at brugeren vil tilføje et nyt punkt til en dynamisk liste.  
    **Så** oprettes en ny sag, der matcher listens søgning, og punktet tilføjes listen.

21. **Givet** at brugeren åbner "+ Tilføj Punkt" eller redigerer et listepunkt på en mobilenhed.  
    **Så** rykker skærmen/fokusfeltet automatisk opad, så tastaturet ikke dækker inputfeltet, og brugeren kan se, hvad der skrives. (S5)

### Kommentar (S6)

22. **Givet** at brugeren skriver en kommentar i en sag.  
    **Så** forsvinder "Tilbage"-knappen ikke, og appen låser ikke.  
    **Når** kommentaren lukkes eller sendes.  
    **Så** vender brugeren tilbage til sagsvisningen eller listen, og navigationen fungerer normalt.

### Deling

23. **Givet** at brugeren åbner en liste.  
    **Så** kan brugeren dele listen via native share-sheet med tekstoversigt: navn, antal udførte/total og åbne punkter.

24. **Givet** at brugeren vælger at dele med dyb link.  
    **Så** genereres et link, der åbner listen direkte i appen hos modtageren (forudsat rettigheder til projektet).

---

## Forslag til UI/UX

- **Ny fane:** "Lister" med plus-knap til at oprette ny liste fra en søgning.
- **Søgeresultater:** Knappen "Opret liste" vises, når der er resultater.
- **Listevisning:**
  - Checkbox foran hvert punkt.
  - Udførte punkter grået ud, gennemstreget og i bunden.
  - "Nyt match"-badge på punkter tilføjet siden sidste åbning.
  - "Måske duplikat"-badge med slet-knap.
  - Mulighed for at redigere/slette punkter.
  - "Tilføj punkt"-knap, der opretter en sag.
  - Highlight af matchende søgeord i punkterne.
- **Portal-kort:** Listenavn, antal åbne/udførte, sidst opdateret, badge for "Dynamisk".
- **Deling:** Native share-sheet med tekst + dyb link.
- **Sortering:** Vælger over listen (alfabetisk, dato, prioritet).

---

## Afhængigheder

- Søgemotor i `services/search.ts` (substring/fuzzy + smart syntaks).
- `services/checklists.ts` og `services/items.ts`.
- `services/share.ts` / `react-native-share`.
- Dyb link håndtering i `app/(tabs)/_layout.tsx` eller `app/+native-intent.ts`.
- Firestore Security Rules for `checklists` og `checklists/{id}/items`.
- `app/(tabs)/search.tsx`, `app/(tabs)/checklists.tsx`, `app/checklist.tsx`.
- Testplan fra Test Manager Agent før PO acceptance test.

---

## Risici

| Risiko | Sandsynlighed | Konsekvens | Mitigationsforslag |
|---|---|---|---|
| Scope creep (AI, notifikationer, templates, global scope) | Høj | Forlænget levering og kompleksitet. | Faseopdeling; første fase kun valgte punkter. |
| Firestore læseomkostninger ved mange dynamiske lister | Mellem | Høj regning eller dårlig performance. | Begræns antal dynamiske lister, kun synkronisering ved åbning. |
| Dyb link deling kræver rettighedshåndtering | Mellem | Modtagere kan ikke åbne listen. | Tjek projekt-rettigheder ved åbning af dyb link. |
| Semantisk deduplikering kan forveksle punkter | Mellem | Brugerforvirring. | Fase 2 — først strenge dubletter + manuel markering. |
| **Data-model adskillelse mellem listepunkt og sag kræver migrering af eksisterende lister** | **Høj** | **Eksisterende lister kan miste afkrydsningsstatus eller knække, hvis de lagrer status ét sted** | **Analysér eksisterende `checklists`-skema før design; lav migreringsstrategi og regressionstest med gamle lister** |
| **Afkrydsning pr. punkt uden status-synk kan forvirre brugere, der forventede at sags-status ændredes** | **Mellem** | **Bruger undrer sig over at sagen ikke bliver grøn** | **Kommunikér ændring tydeligt i UI; overvej indikator for "alle punkter fra denne sag færdige"** |
| **Tastatur/scrolling-fejl (S5) påvirker andre modals eller forms** | **Mellem** | **Regression i create-item eller kommentar** | **Isoler KeyboardAvoidingView/scroll-løsning; regressionstest kommentar og create flow** |
| **Kommentar-bug (S6) viser sig at være uafhængig af søg/lister og kræver egen rodårsagsanalyse** | **Mellem** | **Fejlen bliver ikke rettet i denne runde** | **Analysér først; hvis separat rodårsag, opdel task og informér PO** |

---

## Backlog (ikke i fase 1)

- Global dynamisk liste (tværs over projekter).
- Foruddefinerede portal-søgninger ("Åbne fejl", "Dine idéer", "Uden kategori").
- Offline redigering og synkronisering af lister.
- Push-notifikationer / påmindelser om åbne listepunkter.
- AI-genereret opdeling af beskrivelse/OCR i separate punkter.
- PDF-eksport af lister.

---

## Åbne spørgsmål til PO

Ingen — alle afklaringer er besluttet ovenfor og noteret i backlog.
