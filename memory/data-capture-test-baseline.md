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

## 2. Præcis / wildcard-søgning (US-005)

### Oversigt

| # | Case | ID | Regression | Status |
|---|---|---|---|---|
| 1 | Almindelig tekst substring | TC-SRC-001 | Ja | ⚪ |
| 2 | Præcis phrase matcher hele ord | TC-SRC-002 | Ja | ⚪ |
| 3 | Phrase skelner fra delstreng | TC-SRC-003 | Ja | ⚪ |
| 4 | Tegnsætning som word boundary | TC-SRC-004 | Ja | ⚪ |
| 5 | Hele-ord wildcard `*...*` | TC-SRC-005 | Ja | ⚪ |
| 6 | Wildcard kræver sammenhæng i ét ord | TC-SRC-006 | Ja | ⚪ |
| 7 | Kombinationer OR/NOT/substring | TC-SRC-007 | Ja | ⚪ |
| 8 | æøå + normalisering | TC-SRC-008 | Ja | ⚪ |
| 9 | Highlight-intervaller | TC-SRC-009 | Ja | ⚪ |
| 10 | UI-hint for søgesyntaks | TC-SRC-010 | Ja | ⚪ |

---

## 3. Push-påmindelser (US-011 / B4)

### Oversigt

| # | Case | ID | Regression | Status |
|---|---|---|---|---|
| 1 | Opret påmindelse på sag | TC-REM-001 | Ja | ⚪ |
| 2 | Tryk på notifikation åbner sag | TC-REM-002 | Ja | ⚪ |
| 3 | Slet påmindelse inden udløb | TC-REM-003 | Ja | ⚪ |
| 4 | Daglig gentagelse | TC-REM-004 | Ja | ⚪ |
| 5 | Tilladelse nægtet flow | TC-REM-005 | Ja | ⚪ |
| 6 | App dræbt inden udløb | TC-REM-006 | Ja | ⚪ |
| 7 | Ændring af tidspunkt | TC-REM-007 | Ja | ⚪ |
| 8 | Påmindelse på listepunkt | TC-REM-008 | Ja | ⚪ |
| 9 | Slet sag/liste fjerner påmindelser | TC-REM-009 | Ja | ⚪ |

---

## 4. Offline understøttelse af lister (US-005 / B3)

### Oversigt

| # | Case | ID | Regression | Status |
|---|---|---|---|---|
| 1 | Listeoversigt offline | TC-OFL-001 | Ja | ⚪ |
| 2 | Listedetalje offline | TC-OFL-002 | Ja | ⚪ |
| 3 | Afkryds offline | TC-OFL-003 | Ja | ⚪ |
| 4 | Rediger noter offline | TC-OFL-004 | Ja | ⚪ |
| 5 | Genstart app offline | TC-OFL-005 | Ja | ⚪ |
| 6 | Opret punkt på manuel liste offline | TC-OFL-006 | Ja | ⚪ |
| 7 | Slet punkt offline | TC-OFL-007 | Ja | ⚪ |
| 8 | To enheder konflikt | TC-OFL-008 | Ja | ⚪ |
| 9 | Kompaktion af pending queue | TC-OFL-009 | Ja | ⚪ |
| 10 | Pull-to-refresh flush | TC-OFL-010 | Ja | ⚪ |
| 11 | Offline-indikator + deaktiverede handlinger | TC-OFL-011 | Ja | ⚪ |

---

## 5. Slet projekt (US-001 / B9)

### Oversigt

| # | Case | ID | Regression | Status |
|---|---|---|---|---|
| 1 | Slet tomt projekt | TC-DEL-001 | Ja | ⚪ |
| 2 | Slet projekt med sager/checkpoints/kommentarer | TC-DEL-002 | Ja | ⚪ |
| 3 | Slet projekt med checklister | TC-DEL-003 | Ja | ⚪ |
| 4 | Slet projekt med fotos | TC-DEL-004 | Ja | ⚪ |
| 5 | Medlem/admin afvises | TC-DEL-005 | Ja | ⚪ |
| 6 | Annullér i dialog | TC-DEL-006 | Ja | ⚪ |
| 7 | Forkert navn i bekræftelse | TC-DEL-007 | Ja | ⚪ |
| 8 | Aktivt projekt slettes | TC-DEL-008 | Ja | ⚪ |
| 9 | Netværksfejl under sletning | TC-DEL-009 | Ja | ⚪ |

---

## 6. Tomt projektnavn + dubletter (B8 / US-006)

### Oversigt

| # | Case | ID | Regression | Status |
|---|---|---|---|---|
| 1 | Tomt navn client-side | TC-PRJ-001 | Ja | ⚪ |
| 2 | Whitespace-only navn | TC-PRJ-002 | Ja | ⚪ |
| 3 | Dublet eksakt match | TC-PRJ-003 | Ja | ⚪ |
| 4 | Dublet case/mellemrum | TC-PRJ-004 | Ja | ⚪ |
| 5 | Anden brugers projekt med samme navn | TC-PRJ-005 | Ja | ⚪ |
| 6 | Cloud Function afviser tomt navn | TC-PRJ-006 | Ja | ⚪ |
| 7 | Cloud Function afviser dublet | TC-PRJ-007 | Ja | ⚪ |
| 8 | Eksisterende dubletter håndteres | TC-PRJ-008 | Ja | ⚪ |
| 9 | Vellykket oprettelse | TC-PRJ-009 | Ja | ⚪ |
| 10 | `updateProject` validerer navn | TC-PRJ-010 | Ja | ⚪ |

---

## 7. Voice — fjern "Åben"/"åbn"-residu (US-004 D1)

### Oversigt

| # | Case | ID | Regression | Status |
|---|---|---|---|---|
| 1 | Kun "Åbn kamera" | TC-VRC-001 | Ja | ⚪ |
| 2 | "Åben kamera" | TC-VRC-002 | Ja | ⚪ |
| 3 | "Åbne kamera" fjerner præfiks | TC-VRC-003 | Ja | ⚪ |
| 4 | Tekst efter album-kommando | TC-VRC-004 | Ja | ⚪ |
| 5 | "Tag billede af..." | TC-VRC-005 | Ja | ⚪ |
| 6 | "Vælg foto fra..." | TC-VRC-006 | Ja | ⚪ |
| 7 | Observationsnote + kamera | TC-VRC-007 | Ja | ⚪ |
| 8 | Modal-flow med foto + tekst | TC-VRC-008 | Ja | ⚪ |
| 9 | Regression E1–E13 parser tests | TC-VRC-009 | Ja | ⚪ |

---

## 8. Auto-titel må ikke overskrive manuel titel (US-004 D3)

### Oversigt

| # | Case | ID | Regression | Status |
|---|---|---|---|---|
| 1 | Auto-titel fra beskrivelse | TC-ATT-001 | Ja | ⚪ |
| 2 | Manuel titel overskrives ikke | TC-ATT-002 | Ja | ⚪ |
| 3 | Slettet manuel titel fallback ved gem | TC-ATT-003 | Ja | ⚪ |
| 4 | Titel før beskrivelse | TC-ATT-004 | Ja | ⚪ |
| 5 | Modal nulstilles | TC-ATT-005 | Ja | ⚪ |
| 6 | Voice-mode påvirkes ikke | TC-ATT-006 | Ja | ⚪ |
| 7 | Gem med kun beskrivelse | TC-ATT-007 | Ja | ⚪ |
| 8 | Gem med kun titel | TC-ATT-008 | Ja | ⚪ |

---

## 9. UI/UX Review: Board, checklist og item-kommentar

### Oversigt

| # | Case | ID | Regression | Status |
|---|---|---|---|---|
| 1 | Board-knapper ens bredde | TC-UXR-001 | Ja | ⚪ |
| 2 | Board-knapper accessibility | TC-UXR-002 | Ja | ⚪ |
| 3 | Ansvarlig vises i checklist-item | TC-UXR-003 | Ja | ⚪ |
| 4 | Ansvarlig fallback skjuler tom linje | TC-UXR-004 | Ja | ⚪ |
| 5 | "Tilbage" synlig under kommentar | TC-UXR-005 | Ja | ⚪ |
| 6 | Kommentar + tastatur + navigation | TC-UXR-006 | Ja | ⚪ |

---

## Ændringslog

| Dato | Version | Ændring | Ansvarlig |
|---|---|---|---|
| 2026-07-15 | 1.0 | Oprettet sektion "Søgning og lister — redesign v2" med 21 testcases for S1–S8 + W1. | Test Manager Agent |
| 2026-07-15 | 1.1 | Tilføjet sektioner 2–9 for comprehensive bug/backlog-round: søgning, reminders, offline lists, delete project, project name validation, voice residue, auto-title, UI/UX review. | Test Manager Agent |
