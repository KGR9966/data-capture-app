# US-005: Context Lists — gemte, søgebaserede lister (v2)

**Status:** Klar til PO-godkendelse.  
**Bidragydere:** PO + Userstoryagent.  
**Scope:** Fase 1 — dokumentation af forskellen mellem dynamiske lister og context-lister, samt krav til gemte søgninger.

---

## Baggrund / hvorfor

Dynamiske lister (US-005) oprettes ud fra en søgning og opdateres løbende, når nye sager matcher eller gamle sager stopper med at matche. En "Context List" er en specialvariant af en dynamisk liste: en gemt søgning med navn, som brugeren kan åbne igen og igen uden at skulle genindtaste søgestrengen.

Denne user story præciserer, hvad der gemmes i en context-liste, og hvordan adskillelsen mellem søgeudtryk og resultatmængde sikrer, at listen forbliver dynamisk og relevant over tid.

---

## Definitioner

| Begreb | Betydning |
|---|---|
| **Dynamisk liste** | En liste genereret ud fra en søgning. Punkter kan komme fra sagers titel, beskrivelse eller noter. Listen opdateres dynamisk, når søgematch ændrer sig. |
| **Context List** | En navngivet, gemt søgning (søgestreng + filtre + sortering). Hver gang brugeren åbner den, genkøres søgningen, og resultaterne vises som listepunkter. |
| **Statisk liste** | En liste med fast indhold, hvor punkterne ikke ændrer sig, medmindre brugeren manuelt tilføjer eller fjerner dem. Ikke en del af fase 1. |

---

## Acceptkriterier (Gherkin)

### Hvad der gemmes

1. **Givet** at brugeren opretter en context-liste fra en søgning.  
   **Så** gemmes følgende:
   - Søgestrengen, præcis som brugeren indtastede den.
   - Aktive filtre (f.eks. `type:billede`, `status:åben`).
   - Valgt sortering (default: alfabetisk med udførte punkter i bunden).
   - Listenavn og projekttilknytning.
   **Og** gemmes IKKE den konkrete resultatmængde som et statisk sæt af punkter.

2. **Givet** at brugeren åbner en eksisterende context-liste.  
   **Så** genkøres den gemte søgning, og listen viser de sager og punkter, der matcher lige nu.

### Dynamisk opførsel

3. **Givet** at en context-liste er oprettet.  
   **Når** en ny sag matcher den gemte søgestreng og filtre.  
   **Så** tilføjes tilsvarende nye punkter automatisk, markeret med "nyt"-badge.

4. **Givet** at en context-liste har punkter.  
   **Når** en kildesag ikke længere matcher den gemte søgestreng og filtre.  
   **Så** gråes de berørte punkter ud med en note om, at kilden ikke længere matcher, og de fjernes ikke automatisk.

5. **Givet** at brugeren redigerer en context-listes søgestreng eller filtre.  
   **Så** genkøres søgningen, og listen opdateres i overensstemmelse med det nye udtryk.  
   **Og** tidligere manuelt afkrydsede punkter bevares, hvis de stadig matcher; ellers gråes de ud.

### Adskillelse fra sag-status

6. **Givet** at brugeren afkrydser et punkt i en context-liste.  
   **Så** gælder de samme regler som for almindelige dynamiske lister: punktet markeres udført, og kildesagens status ændres ikke, medmindre alle punkter fra samme sag er færdige.  
   Se `us-005-dynamic-lists-v2.md` for detaljerede acceptkriterier om punkt-status og afkrydsning.

7. **Givet** at en kildesags status ændres manuelt.  
   **Så** spejles den ændring IKKE automatisk til punktet i context-listen. Punkt-status og sags-status er adskilte.

### Deling

8. **Givet** at brugeren deler en context-liste.  
   **Så** deles enten en tekstoversigt eller et dyb link, der åbner den samme context-liste hos modtageren.  
   **Og** modtageren ser de punkter, der matcher lige nu — ikke det statiske sæt, som afsenderen så på delingstidspunktet.

---

## Forslag til UI/UX

- **Portal-kort:** Viser navn, antal åbne/udførte punkter, seneste opdatering og badge for "Dynamisk / Context".
- **Åbn context-liste:** Genkører søgningen og viser resultater med highlight af matchende ord (se W1 i `us-002-search-v2.md`).
- **Rediger søgning:** Brugeren kan justere søgestreng eller filtre og gemme ændringen i context-listen.
- **"Nyt match"-badge:** Vises indtil brugeren har set listen.
- **Gråede punkter:** Punkter fra tidligere matches vises nedtonet med note.

---

## Afhængigheder

- `us-002-search-v2.md` — krav til søgefunktion, specialtegn, minimumslængde og highlight.
- `us-005-dynamic-lists-v2.md` — krav til afkrydsning, punkt-status, sortering, deduplikering og deling.
- Søgemotor og datalagring for gemte søgninger.

---

## Risici

| Risiko | Sandsynlighed | Konsekvens | Mitigationsforslag |
|---|---|---|---|
| Bruger forventer at en context-liste er statisk | Mellem | Forvirring når punkter ændrer sig | Brug tydelig "Dynamisk / Context"-badge; forklar kort i onboarding eller syntakshjælp |
| Gemt søgestreng med specialtegn genkøres forkert senere | Mellem | Context-listen returnerer ingen eller forkerte resultater | Test persistence af søgestrenge med æøå, &, /, -, tal; gem rå streng uden normalisering |
| Søgeresultater ændrer sig markant mellem åbninger | Lav | Bruger mister overblik | Bevar gråede punkter fra tidligere matches; vis historik eller note |
| Dyb link til context-liste kræver samme projekt-rettigheder | Mellem | Modtagere ser tom eller utilgængelig liste | Tjek rettigheder ved åbning af dyb link; vis forklarende fejlmeddelelse |

---

## Backlog (ikke i fase 1)

- Foruddefinerede context-lister ("Åbne fejl", "Dine idéer", "Uden kategori").
- Manuelle, statiske lister uden søgebinding.
- Offline visning af senest kendte resultater for context-lister.
- Push-notifikationer om nye matches i context-lister.

---

## Åbne spørgsmål til PO

Ingen — alle afklaringer er besluttet i `us-005-dynamic-lists-v2.md` og `plan-search-lists-redesign.md`.
