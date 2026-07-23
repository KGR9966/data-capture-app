# US-003: Dynamiske lister / Context Lists

## Baggrund / hvorfor

PO ønsker at kunne fremsøge en gruppe af sager og generere en arbejdsliste baseret på punkter i sagerne. Listen skal kunne afkrydses efterhånden som opgaverne udføres, og den skal opdateres automatisk, når nye sager matcher søgningen. Endelig skal listen kunne deles via SMS og andre kanaler.

Denne funktion er tæt knyttet til søgningen (US-002) og skal designes, så den ikke overlapper med eksisterende sagshåndtering, men i stedet udvider den med en ny listetype.

## Hvem der har gavn af det

- **Slutbrugeren** får en fleksibel arbejdsliste baseret på aktuelle sager, f.eks. en håndværker der skal tjekke alle punkter om "vand" i et projekt.
- **PO / ejer** får en unik funktion, der differentierer appen og støtter arbejdsgange baseret på sager.
- **Udviklingsteamet** får klare rammer for, hvad der gemmes, opdateres og deles.

## Acceptkriterier (målbare)

1. **Gem søgning som dynamisk liste**
   - Givet at brugeren har udført en søgning i US-002's søgefelt.
   - Når brugeren vælger "Gem som liste" / "Opret Context List".
   - Så oprettes en named liste, der er knyttet til søgningen.

2. **Automatisk opdatering ved nye matchende sager**
   - Givet en eksisterende Context List baseret på søgningen `vand`.
   - Når en ny sag oprettes eller redigeres, så den matcher søgningen.
   - Så tilføjes sagens punkter automatisk til listen.

3. **Fjernelse ved ikke længere matchende sager**
   - Givet at en sag i listen ændres, så den ikke længere matcher søgningen.
   - Så fjernes sagens punkter fra listen.
   - PO skal godkende, om allerede afkrydsede punkter skal fjernes eller arkiveres.

4. **Afkrydsning af punkter**
   - Hver Context List viser punkter, der kan afkrydses som "done".
   - Afkrydsningen persisteres (lokal eller sky, afhængigt af arkitektur).
   - En markeret post kan afmarkeres igen.

5. **Listevisning**
   - Listen viser navn, oprettelsesdato og antal punkter / antal færdige.
   - Brugeren kan se, hvilken søgning listen er baseret på.
   - Brugeren kan åbne den underliggende sag fra et punkt.

6. **Deling af liste**
   - Givet at brugeren åbner en Context List.
   - Når brugeren trykker "Del".
   - Så vises systemets share-sheet med mulighed for SMS, e-mail, m.m.
   - Den delte information skal som minimum indeholde listenavn og de enkelte punkter.
   - PO skal godkende, om afkrydsningsstatus også deles, og om delingen er statisk eller dynamisk.

7. **Slet / omdøb liste**
   - Brugeren kan omdøbe eller slette en Context List.
   - Sletning fjerner kun listen, ikke de underliggende sager.

## Forslag til UI/UX

- **Fra søgning til liste:**
  - I søgeresultatvisningen vises en knap "Gem som Context List".
  - Dialog beder om listenavn og viser en forhåndsvisning af antal punkter.
  - Efter oprettelse navigeres brugeren til den nye liste.

- **Context List-skærm:**
  - Top: listenavn og underliggende søgning som tekst.
  - Progress-bar eller tekst: "X af Y punkter færdige".
  - Liste med checkboxes og punkttekst.
  - Hvert punkt er trykbart og åbner sagens detaljeside.
  - Handlinger: "Del", "Omdøb", "Slet".

- **Oversigt over Context Lists:**
  - Separat fane eller sektion i appen, der viser alle gemte lister.
  - Sorteret efter senest opdateret eller alfabetisk — aftales med PO.

- **Share-sheet:**
  - Brug React Native Share API eller tilsvarende.
  - Deling som plain text med listenavn, punkttekster og evt. færdig-status.

## Afhængigheder

- **US-002 Søgning** skal være implementeret og stabil, da Context Lists bygger på gemte søgninger.
- Data-model for Context Lists (navn, søgestreng, ejer, oprettet, opdateret).
- Firestore-sikkerhedsregler, så kun ejeren kan se og redigere sine lister (medmindre PO ønsker deling internt i projektet).
- Eventuel trigger/cloud function eller lokal logik til at opdatere lister, når sager ændres.
- Test Manager Agent skal udarbejde testplan før PO acceptance test.

## Risici

| Risiko | Sandsynlighed | Konsekvens | Mitigationsforslag |
|---|---|---|---|
| Hvordan "punkter" udledes af sagsbeskrivelse/noter er uklart | Høj | Implementering matcher ikke PO's forventning | Aftal parsingregel med PO før design (linjeskift, punkttegn, etc.) |
| Automatisk opdatering kan fjerne brugerens arbejde (afkrydsninger) | Mellem | Brugeren mister overblik / færdige markeringer | Aftal arkiveringspolitik med PO |
| Deling af dynamiske lister kan blive teknisk kompleks | Mellem | Forsinkelse eller begrænset funktionalitet | Start med statisk tekst-delning; dynamisk deling senere hvis ønsket |
| Stor mængde punkter giver performance-problemer | Mellem | Appen føles tung | Paginering eller lazy loading; max punkter per liste |
| Synkronisering af afkrydsninger mellem enheder kan konflikte | Lav | Forkert status på tværs af enheder | Brug Firestore timestamps / last-write-wins; dokumentér begrænsning |

## Åbne spørgsmål til PO

1. Hvordan identificeres et **"punkt"** i en sags beskrivelse/noter?
   - Et linjeskift?
   - En punktformatering (f.eks. `- ` eller `* `)?
   - Hver sætning?
   - Skal brugeren selv markere punkter?
2. Skal Context Lists være **personlige** (kun ejeren) eller **projektdelte** (alle med adgang til projektet kan se dem)?
3. Når en sag ikke længere matcher søgningen, skal listen så:
   - Fjerne punkterne helt?
   - Beholde dem som "inaktive"?
   - Bevare afkrydsningsstatus eller nulstille den?
4. Skal delingen være **statisk** (et snapshot af punkterne lige nu) eller **dynamisk** (modtageren får et link, der opdateres)?
5. Skal der være en **maksimal grænse** for antal Context Lists eller antal punkter per liste?
6. Skal Context Lists have deres egen fane i bundnavigationen, eller placeres de under eksisterende "Projekter" / "Sager"?
7. Skal afkrydsningsstatus vises i den delte tekst, eller deles kun selve opgavebeskrivelserne?
8. Skal brugeren kunne redigere rækkefølgen af punkter i en Context List, eller styres den af søgeresultaternes rækkefølge?
