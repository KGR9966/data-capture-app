# US-006: Ret "Kunne ikke oprette projektet"-fejl og forhindr dubletter

**Status:** Klar til PO-godkendelse.  
**Bidragydere:** Userstoryagent.  
**Scope:** Kritisk bugfix + validering af projektnavne for den aktuelle bruger.

---

## Baggrund / hvorfor

Under B+C preview-testen d. 18.07.2026 blev følgende kritisk fejl observeret i projektoprettelsen (`app/(tabs)/index.tsx`):

- Appen viser fejlmeddelelsen **"Fejl. Kunne ikke oprette projektet."**, selvom projektet faktisk bliver oprettet i Firestore.
- Hvis brugeren derefter trykker **Opret** igen eller **Annuller**, kan der opstå **to identiske projekter** med samme navn.
- Det er i dag muligt at oprette flere projekter med identiske navne for samme bruger.

Denne user story dækker både:

1. Fejlsøgning og rettelse af den falske fejlmeddelelse, så brugeren får korrekt feedback.
2. Indførelse af validering, der forhindrer oprettelse af projekter med samme navn for den aktuelle bruger.

---

## Hvem der har gavn af det

- **Slutbrugeren** får ikke længere fejlagtigt indtryk af, at projektet ikke er oprettet, og undgår at sidde med dubletter.
- **PO / ejer** får en kritisk blocker fra B+C løst, så videre test og frigivelse kan fortsætte.
- **Udviklingsteamet** får klarere fejlhåndtering og valideringsregler for projektoprettelse.

---

## Nuværende fejlforløb (fra B+C observation)

1. Bruger trykker **Opret** i "Nyt projekt"-dialogen.
2. `createProject` i `services/projects.ts` skriver `projects/{id}` og `members`-subcollection til Firestore.
3. Appen viser alligevel `Alert.alert("Fejl", "Kunne ikke oprette projektet.")`.
4. Bruger trykker **Annuller** — dialogen lukker, men projektet findes nu i projektlisten.
5. Hvis brugeren trykker **Opret** igen, vises fejlen på ny, og der kan ende med to identiske projekter.

Hypotese: Firestore-skrivningen lykkes, men appen fejler i et efterfølgende trin (navigation, state-opdatering eller rettighedstjek), hvilket fanger fejlen i `catch`.

---

## Acceptkriterier (Gherkin)

### Korrekt feedback ved oprettelse

1. **Givet** at brugeren indtaster et gyldigt, unikt projektnavn og trykker **Opret**.  
   **Når** Firestore-skrivningen lykkes.  
   **Så** vises ingen fejlmeddelelse, det nye projekt sættes som aktivt, dialogen lukker, og brugeren navigeres til board.

2. **Givet** at brugeren trykker **Opret**.  
   **Når** Firestore-skrivningen faktisk fejler (netværksfejl, tilladelse, validering).  
   **Så** vises fejlmeddelelsen "Kunne ikke oprette projektet.", og der oprettes intet projekt i Firestore.

3. **Givet** at brugeren har trykket **Opret** og ser fejlmeddelelsen.  
   **Når** brugeren trykker **Annuller**.  
   **Så** lukkes dialogen, og der findes højst ét projekt med det indtastede navn for brugeren.

### Forhindring af dubletter

4. **Givet** at brugeren allerede ejer et projekt med navnet "Renovering".  
   **Når** brugeren forsøger at oprette et nyt projekt med navnet "Renovering".  
   **Så** blokeres oprettelsen, og der vises beskeden "Der findes allerede et projekt med dette navn.".

5. **Givet** at brugeren ejer et projekt med navnet "Renovering".  
   **Når** brugeren forsøger at oprette et projekt med navnet "  renovering  " eller "RENovering".  
   **Så** blokeres oprettelsen (sammenligning er trimmet og case-insensitiv).

6. **Givet** at brugeren har adgang til et projekt ejet af en anden bruger med navnet "Renovering".  
   **Når** brugeren opretter sit eget projekt med navnet "Renovering".  
   **Så** tillades oprettelsen, fordi duplicate-tjek kun gælder projekter, som brugeren selv ejer.

7. **Givet** at to eksisterende projekter allerede har samme navn for brugeren (før valideringen indføres).  
   **Når** brugeren forsøger at oprette endnu et projekt med det navn.  
   **Så** blokeres oprettelsen indtil antallet af dubletter er reduceret til ét.

---

## Forslag til UI/UX

- Vis valideringsfejlen direkte under projektnavn-feltet, når brugeren trykker **Opret**.
- Deaktiver **Opret**-knappen mens oprettelse er i gang (`creating = true`).
- Efter vellykket oprettelse: luk modal, nulstil navn/beskrivelse, sæt aktivt projekt og naviger til board.
- Hvis der opstår en ukendt fejl midt i flowet, tilbageskridt så vidt muligt: slet delvist oprettet projekt, eller vis en klar besked med mulighed for at prøve igen.

---

## Afhængigheder

- `services/projects.ts` — `createProject`, `subscribeToProjects` og evt. ny hjælpefunktion til duplicate-tjek.
- `app/(tabs)/index.tsx` — modal og `handleCreateProject`.
- Firestore Security Rules for `projects` og `members`.
- `useProject()` context for at sætte aktivt projekt.
- Evt. migration/rensning af eksisterende dubletter før valideringen træder i kraft.

---

## Risici

| Risiko | Sandsynlighed | Konsekvens | Mitigationsforslag |
|---|---|---|---|
| Fejlen skyldes en race-tilstand mellem Firestore-skrivning og navigation/state-opdatering. | Mellem | Fejlmeddelelsen fortsætter selv efter rettelse. | Log hvert trin i `handleCreateProject`; sørg for at `setActiveProject` og `router.push` kun kører efter bekræftet skrivning. |
| Eksisterende dubletter gør det umuligt at oprette nye projekter med navne, brugeren allerede har. | Lav | Bruger blokeret ved oprettelse. | Ryd eksisterende dubletter før deploy; eller tillad én per navn frem til rensning. |
| Case-insensitivt tjek kræver ekstra indexering eller klient-side gennemløb. | Lav | Dårlig performance ved mange projekter. | Brug eksisterende `subscribeToProjects` data i klienten; tjek er lokalt og kun ved oprettelse. |

---

## PO-beslutninger

| # | Spørgsmål | PO-valg |
|---|---|---|
| 1 | Eksisterende dubletter | A — gamle dubletter lades være; fremtidige dubletter forhindres. |
| 2 | Scope af duplicate-tjek | Kun projekter brugeren ejer. |
| 3 | Beskedtekst | "Der findes allerede et projekt med dette navn." (godkendt). |
| 4 | Beskrivelsesfelt | Kun projektnavn medtages i duplicate-tjek. |

## Release-strategi

- **Build 1:** US-006 — projektoprettelses-bugfix og dubletforhindring (isoleret).
- **Build 2:** US-004 + US-005 — ensartet voice/create og dynamiske lister/søgeportal (samlet).

Release-strategien er PO-godkendt. Build-omkostninger er 0 kr. i udviklingsfasen; to builds reducerer risiko og giver klarere testfokus.
