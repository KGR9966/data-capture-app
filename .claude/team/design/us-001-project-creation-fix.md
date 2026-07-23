# US-001: Rettelse af projektoprettelse og forhindring af dubletter

## Baggrund / hvorfor

Under test af B+C preview build (rc2) blev der observeret en kritisk fejl i projektoprettelsen:

- Appen viser fejlmeddelelsen "Fejl. Kunne ikke oprette projektet." selv når projektet faktisk er oprettet i baggrunden.
- Hvis brugeren trykker "Opret" igen og derefter "Annuller", opstår der to identiske projekter.
- Det er i dag muligt at oprette flere projekter med samme navn, hvilket skaber forvirring og potentielt datarod.

Denne user story skal rette den underliggende fejl og sikre, at brugeren får troværdig feedback. Samtidig skal der indføres enighedskontrol, så to enslydende projekter ikke kan oprettes.

## Hvem der har gavn af det

- **Slutbrugeren** får en pålidelig oplevelse uden falske fejlmeddelelser og uventede dubletter.
- **PO / ejer** undgår supporthenvendelser og dataoprydning forårsaget af dubletter.
- **Udviklingsteamet** får en afgrænset, veldefineret rettelse, der kan gennemføres via fast track eller normal fase-rytme afhængigt af omfang.

## Acceptkriterier (målbare)

1. **Ingen falsk fejlmeddelelse**
   - Givet at brugeren indtaster et unikt, gyldigt projektnavn og trykker "Opret".
   - Når projektet faktisk er oprettet i backend.
   - Så vises der IKKE fejlmeddelelsen "Fejl. Kunne ikke oprette projektet.".
   - I stedet lukkes dialogen, og det nye projekt vises øjeblikkeligt i projektlisten.

2. **Forhindring af dubletter ved oprettelse**
   - Givet at brugeren allerede har et projekt med navnet "Renovering".
   - Når brugeren forsøger at oprette et nyt projekt med navnet "Renovering".
   - Så blokeres oprettelsen, og der vises en klar besked: "Der findes allerede et projekt med dette navn."

3. **Idempotens ved gentagne forsøg**
   - Givet at en oprettelse er i gang eller netop er gennemført.
   - Når brugeren trykker "Opret" flere gange i træk.
   - Så oprettes der højst ét projekt.

4. **Case-insensitive sammenligning (som minimum)**
   - "Renovering" og "renovering" behandles som enslydende, medmindre PO eksplicit ønsker case-sensitivity.

5. **Eksisterende projekter påvirkes ikke**
   - Hvis der allerede findes dubletter i databasen, skal rettelsen ikke slette eller omdøbe dem automatisk uden PO-godkendelse.

## Forslag til UI/UX

- **Opret-projekt-dialog:**
  - Tekstfelt med placeholder "Projektnavn".
  - "Opret"-knap deaktiveret, indtil navnet er mindst 1 karakter ( eller det minimum PO beslutter).
  - Loading-indikator på knappen mens oprettelse kører.
  - Inline fejlbesked under tekstfeltet ved dublet: "Der findes allerede et projekt med dette navn."
  - Ingen generisk toast "Fejl. Kunne ikke oprette projektet." ved vellykket oprettelse.

- **Projektlisten:**
  - Nyt projekt vises øverst eller på den naturlige plads straks efter oprettelse.
  - Pull-to-refresh bør stadig virke, men skal ikke være nødvendig for at se det nye projekt.

## Afhængigheder

- Firestore projektsamling og eksisterende oprettelseslogik.
- Autentificeret brugerkontekst (hvem der ejer / er medlem af projektet).
- Evt. eksisterende `members`-subcollection eller rettighedstjek i oprettelsesflowet.
- Test Manager Agent skal udarbejde testplan før PO acceptance test.

## Risici

| Risiko | Sandsynlighed | Konsekvens | Mitigationsforslag |
|---|---|---|---|
| Eksisterende dubletter i databasen gør reglen svær at håndhæve | Mellem | Bruger kan stadig se gamle dubletter | Dokumentér eksisterende dubletter og spørg PO om oprydning |
| Case-sensitivity eller specialtegn (f.eks. mellemrum) skaber uventet afvisning | Mellem | Brugeren oplever inkonsistent validering | Aftal præcis sammenligningsregel med PO |
| Oprettelsesfejlen skyldes en efterfølgende operation (members, rettigheder), der stadig fejler | Høj | Rettes lappen ikke den reelle årsag | Fejlsøg hele flowet før kodeændring |
| Ændring påvirker andre flows (f.eks. redigering af projektnavn) | Lav | Regression | Inkluder redigering i testplan |

## Åbne spørgsmål til PO

1. Skal sammenligning af projektnavne være **case-insensitive** eller case-sensitive?
2. Skal førende/bagvedstående mellemrum trimmes før sammenligning?
3. Hvad gør vi med **eksisterende dubletter** i databasen? Skal de beholdes, markeres eller omdøbes?
4. Skal brugeren have mulighed for at omdøbe et eksisterende projekt, eller er det uden for denne user story?
5. Hvad er minimumslængden for et projektnavn? (1 karakter, 2 karakterer, andet?)
6. Skal unikheden gælde **globalt** eller kun **for den aktuelle bruger / organisation**?
