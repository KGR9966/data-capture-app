# Data Capture — baseline testplan

**Dokument:** `memory/data-capture-test-baseline.md`  
**Dato:** 2026-07-15  
**Formål:** Dynamisk baseline over nuværende funktionalitet med trafiklys-status. Opdateres løbende når nye områder testes eller ændres.  
**Ansvarlig:** Test Manager Agent  

---

## Sådan læses planen

| Kolonne | Betydning |
|---|---|
| **ID** | Unikt testcase-id til reference og regressionssporing. |
| **Område** | Funktionsområde til nem sortering. |
| **Forudsætninger** | Data, tilladelser og tilstand, der skal være på plads før test. |
| **Trin** | Nummererede handlinger. |
| **Forventet resultat** | Præcis succes-kriterie. |
| **Faktisk resultat** | Udfyldes under test. |
| **Status** | `🟢` OK / `🟡` forbehold / `🔴` fejler / `⚪` ikke testet. |
| **Bemærkninger** | Logs, enhed, edge cases, links til screenshots. |

---

## Søgning og lister — redesign v2

### Oversigt

| # | Case | Fokus | Regression |
|---|---|---|---|
| TC-SL-001 | Opret liste fra søgning, ét projekt | S1 | Ja |
| TC-SL-002 | Opret liste med flere projekter | S1, projektvalg | Ja |
| TC-SL-003 | Netværksfejl ved listeoprettelse | S1, fejlmeddelelse | Ja |
| TC-SL-004 | `&` i søgning og listenavn | S2 | Ja |
| TC-SL-005 | `/`, `-`, tal, æøå i søgning | S2 | Ja |
| TC-SL-006 | Afkryds ét punkt — item-status uændret | S3 | Ja |
| TC-SL-007 | Alle punkter færdige — item-status Done | S3 | Ja |
| TC-SL-008 | Item `in_progress` — listepunkt uændret | S4, S7 | Ja |
| TC-SL-009 | Tastatur dækker ikke "Tilføj punkt" | S5 | Ja |
| TC-SL-010 | Tastatur dækker ikke rediger punkt | S5 | Ja |
| TC-SL-011 | Tilbage-knap synlig under kommentar | S6 | Ja |
| TC-SL-012 | Kommentar kan slettes uden lås | S6 | Ja |
| TC-SL-013 | Kommentar afsendes — normal navigation | S6 | Ja |
| TC-SL-014 | Item `done` — listepunkt uændret | S7 | Ja |
| TC-SL-015 | 0/1 bogstav udløser ikke søgning | S8 | Ja |
| TC-SL-016 | ≥2 bogstaver udløser søgning | S8 | Ja |
| TC-SL-017 | Kun tal/specialtegn udløser ikke søgning | S8 | Ja |
| TC-SL-018 | Highlight i søgeresultater | W1 | Ja |
| TC-SL-019 | Highlight i listepunkter | W1 | Ja |
| TC-SL-020 | Highlight af præcis sætning | W1 | Ja |
| TC-SL-021 | Highlight med specialtegn og æøå | W1, S2 | Ja |

### TC-SL-001: Opret liste fra søgning med ét projekt
| Felt | Værdi |
|---|---|
| ID | TC-SL-001 |
| Område | Søgning og lister — S1 |
| Forudsætninger | Bruger er medlem af ét projekt. Projektet har sager der matcher "vand". |
| Trin | 1. Gå til Søg. <br> 2. Indtast "vand". <br> 3. Tryk "Opret liste". <br> 4. Bekræft navn og vælg kildefelt. <br> 5. Tryk "Opret". |
| Forventet resultat | Listen oprettes uden fejl. Bruger navigeres til listen. Der vises ikke "Kunne ikke oprette den dynamiske liste". |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-002: Opret liste med flere projekter kræver projektvalg
| Felt | Værdi |
|---|---|
| ID | TC-SL-002 |
| Område | Søgning og lister — S1 |
| Forudsætninger | Bruger er medlem af mindst to projekter. Begge projekter matcher "vand". |
| Trin | 1. Søg "vand". <br> 2. Tryk "Opret liste". <br> 3. Se projekt-vælger. <br> 4. Vælg projekt med editor/admin/owner rolle. <br> 5. Bekræft. |
| Forventet resultat | Projekt-vælger vises. Oprettelse lykkes i valgt projekt. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-003: Netværksfejl ved listeoprettelse giver specifik fejl
| Felt | Værdi |
|---|---|
| ID | TC-SL-003 |
| Område | Søgning og lister — S1 |
| Forudsætninger | Søgning giver resultater. Netværk deaktiveres inden oprettelse. |
| Trin | 1. Søg "vand". <br> 2. Tryk "Opret liste". <br> 3. Vælg projekt og kildefelt. <br> 4. Bekræft uden netværk. |
| Forventet resultat | Specifik fejl vises, f.eks. "Tjek netværket og prøv igen." Generisk "Kunne ikke oprette den dynamiske liste" vises ikke. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-004: `&` bevares i søgning og listenavn
| Felt | Værdi |
|---|---|
| ID | TC-SL-004 |
| Område | Søgning og lister — S2 |
| Forudsætninger | Projektet har sag med tekst "Jem & Fix". |
| Trin | 1. Søg "Jem & Fix". <br> 2. Opret liste fra søgningen. |
| Forventet resultat | Sagen med "Jem & Fix" findes. Listenavn-forslag er "Jem & Fix", ikke "Jem". `&` er ikke AND-operator. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-005: `/`, `-`, tal og æøå matcher
| Felt | Værdi |
|---|---|
| ID | TC-SL-005 |
| Område | Søgning og lister — S2 |
| Forudsætninger | Projektet har sager med "50 mm rør", "Silvan/Bauhaus", "rødgrød", "håndværker-tilbud". |
| Trin | 1. Søg efter hver tekst. <br> 2. Verificer resultater. |
| Forventet resultat | Hver søgning returnerer forventede matches. Specialtegn og tal bevares. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-006: Afkryds ét punkt — item-status uændret
| Felt | Værdi |
|---|---|
| ID | TC-SL-006 |
| Område | Søgning og lister — S3 |
| Forudsætninger | Liste har punkt fra sag med to+ checkpoints. Sagens status er new/in_progress. |
| Trin | 1. Åbn liste. <br> 2. Afkryd ét punkt. <br> 3. Åbn kildesag. |
| Forventet resultat | Kun det matchende checkpoint er Done. Sagens overordnede status forbliver uændret. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-007: Alle punkter færdige — item-status Done
| Felt | Værdi |
|---|---|
| ID | TC-SL-007 |
| Område | Søgning og lister — S3 |
| Forudsætninger | Sag har to listepunkter. Begge er åbne. |
| Trin | 1. Afkryd første punkt. <br> 2. Afkryd andet punkt fra samme sag. <br> 3. Åbn kildesag. |
| Forventet resultat | Efter andet punkt sættes sagens status automatisk til Done (PO-beslutning B). |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-008: Item `in_progress` — listepunkt uændret
| Felt | Værdi |
|---|---|
| ID | TC-SL-008 |
| Område | Søgning og lister — S4, S7 |
| Forudsætninger | Listepunkt er afkrydset. Kildesag er Done. |
| Trin | 1. Åbn kildesag. <br> 2. Sæt status til in_progress. <br> 3. Gå tilbage til listen. |
| Forventet resultat | Listepunkt forbliver afkrydset. Ingen overordnet liste-status spejler item-status. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-009: Tastatur dækker ikke "Tilføj punkt"
| Felt | Værdi |
|---|---|
| ID | TC-SL-009 |
| Område | Søgning og lister — S5 |
| Forudsætninger | Mobil enhed. Bruger er i dynamisk liste. |
| Trin | 1. Åbn liste. <br> 2. Tryk "+ Tilføj Punkt". <br> 3. Skriv tekst. |
| Forventet resultat | Inputfelt scroller op og er synligt over tastaturet. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-010: Tastatur dækker ikke rediger punkt
| Felt | Værdi |
|---|---|
| ID | TC-SL-010 |
| Område | Søgning og lister — S5 |
| Forudsætninger | Mobil enhed. Bruger er i dynamisk liste. |
| Trin | 1. Åbn liste. <br> 2. Tryk rediger på et punkt. <br> 3. Skriv tekst. |
| Forventet resultat | Redigeringsfelt er synligt over tastaturet. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-011: Tilbage-knap synlig under kommentar
| Felt | Værdi |
|---|---|
| ID | TC-SL-011 |
| Område | Søgning og lister — S6 |
| Forudsætninger | Bruger har adgang til en sag. |
| Trin | 1. Åbn sag. <br> 2. Tryk kommentar-felt. <br> 3. Skriv kommentar. |
| Forventet resultat | Tilbage-knap forbliver synlig og trykkbar. App låser ikke. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-012: Kommentar kan slettes uden lås
| Felt | Værdi |
|---|---|
| ID | TC-SL-012 |
| Område | Søgning og lister — S6 |
| Forudsætninger | Sag har eksisterende kommentar af brugeren. |
| Trin | 1. Åbn sag. <br> 2. Slet kommentar. <br> 3. Bekræft. |
| Forventet resultat | Kommentar slettes. App vender tilbage uden deadlock. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-013: Kommentar afsendes — normal navigation
| Felt | Værdi |
|---|---|
| ID | TC-SL-013 |
| Område | Søgning og lister — S6 |
| Forudsætninger | Bruger er i kommentar-input til en sag. |
| Trin | 1. Skriv kommentar. <br> 2. Tryk Send. <br> 3. Tryk Tilbage. |
| Forventet resultat | Kommentar gemmes. Navigation tilbage til sag/liste fungerer normalt. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-014: Item `done` — listepunkt uændret
| Felt | Værdi |
|---|---|
| ID | TC-SL-014 |
| Område | Søgning og lister — S7 |
| Forudsætninger | Liste har åbent punkt fra en sag. |
| Trin | 1. Åbn kildesag. <br> 2. Sæt status til Done. <br> 3. Gå tilbage til listen. |
| Forventet resultat | Listepunkt forbliver åbent. Punkt-status og item-status er adskilte. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-015: 0 eller 1 bogstav udløser ikke søgning
| Felt | Værdi |
|---|---|
| ID | TC-SL-015 |
| Område | Søgning og lister — S8 |
| Forudsætninger | Bruger er på Søg-fanen. |
| Trin | 1. Indtast "v". <br> 2. Indtast "1". <br> 3. Indtast "&". |
| Forventet resultat | Ingen søgning udføres. Prompt vises: "Skriv mindst 2 tegn for at søge." |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-016: ≥2 bogstaver udløser søgning
| Felt | Værdi |
|---|---|
| ID | TC-SL-016 |
| Område | Søgning og lister — S8 |
| Forudsætninger | Projektet har sager der matcher "va". |
| Trin | 1. Indtast "va". <br> 2. Vent på debounce. |
| Forventet resultat | Søgning udføres og resultater vises. Antal resultater vises under søgefeltet. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-017: Kun tal og specialtegn udløser ikke søgning
| Felt | Værdi |
|---|---|
| ID | TC-SL-017 |
| Område | Søgning og lister — S8 |
| Forudsætninger | Bruger er på Søg-fanen. |
| Trin | 1. Indtast "50". <br> 2. Indtast "&&". <br> 3. Indtast "50 mm". |
| Forventet resultat | "50" og "&&" udløser ikke søgning. "50 mm" udløser søgning (2 bogstaver: "mm"). |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-018: Highlight i søgeresultater
| Felt | Værdi |
|---|---|
| ID | TC-SL-018 |
| Område | Søgning og lister — W1 |
| Forudsætninger | Projektet har sag med tekst "Jem & Fix". |
| Trin | 1. Søg "Jem & Fix". |
| Forventet resultat | "Jem", "&" og "Fix" fremhæves visuelt i titel/beskrivelse. Layout brydes ikke. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-019: Highlight i listepunkter
| Felt | Værdi |
|---|---|
| ID | TC-SL-019 |
| Område | Søgning og lister — W1 |
| Forudsætninger | Liste oprettet fra søgning "Jem & Fix". |
| Trin | 1. Åbn listen. |
| Forventet resultat | Matchende søgeord fremhæves i hvert listepunkt. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-020: Highlight af præcis sætning
| Felt | Værdi |
|---|---|
| ID | TC-SL-020 |
| Område | Søgning og lister — W1 |
| Forudsætninger | Projektet har sag med tekst "vand i kælderen". |
| Trin | 1. Søg `"vand i kælderen"`. |
| Forventet resultat | Hele sætningen "vand i kælderen" fremhæves i resultaterne. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-SL-021: Highlight med specialtegn og æøå
| Felt | Værdi |
|---|---|
| ID | TC-SL-021 |
| Område | Søgning og lister — W1, S2 |
| Forudsætninger | Projektet har sager med æøå og specialtegn. |
| Trin | 1. Søg "rødgrød". <br> 2. Søg "Jem & Fix". <br> 3. Søg "50 mm rør". |
| Forventet resultat | Highlight vises korrekt for alle tokens uden crash eller layout-fejl. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

---

## Ændringslog

| Dato | Version | Ændring | Ansvarlig |
|---|---|---|---|
| 2026-07-15 | 1.0 | Oprettet sektion "Søgning og lister — redesign v2" med 21 testcases for S1–S8 + W1. | Test Manager Agent |
