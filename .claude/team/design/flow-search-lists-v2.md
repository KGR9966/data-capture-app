# Flow-design: Søgning og dynamiske lister (v2)

**Status:** Klar til Solution Design.  
**Primær agent:** Flowagent.  
**Input:** `us-002-search-v2.md`, `us-005-dynamic-lists-v2.md`, `us-005-context-lists-v2.md`, `team-status.md` afsnit 9.1–9.5, `plan-search-lists-redesign.md` fase 2.  
**Output til:** Solution Design Agent (Task #83).

---

## 0. Overordnet flow

```mermaid
flowchart TD
    A[Åbn Søg-fane] --> B{≥2 gyldige tegn?}
    B -->|Nej| C[Tom tilstand / prompt]
    B -->|Ja| D[Søg med substring + smart syntaks]
    D --> E{0 resultater?}
    E -->|Ja| F[Ingen resultater-skærm]
    E -->|Nej| G[Søgeresultater med highlight]
    G --> H[Bruger trykker Opret liste]
    H --> I{Flere projekter?}
    I -->|Ja| J[Vælg projekt]
    I -->|Nej| K[Opret liste med udledt navn]
    J --> K
    K --> L{Oprettelse OK?}
    L -->|Nej| M[Fejlhåndtering uden S1]
    L -->|Ja| N[Åbn liste]
    N --> O[Listepunkter med afkrydsning + highlight]
    O --> P[Afkryds punkt]
    P --> Q[Kun det matchende punkt markeres færdigt]
    O --> R[Åbn kildesag]
    R --> S[Rediger item-status manuelt]
    S --> T[Tilbage til liste – punkt-status uændret]
    O --> U[+ Tilføj punkt / rediger]
    U --> V[Inputfelt scrolles over tastatur]
    O --> W[Del / kopiér / slet]
    R --> X[Skriv kommentar – Tilbage-knap synlig]
```

---

## 1. Søgning

### 1.1 Skærm: Søg-fane

| # | Aktion | Systemreaktion | Edge case / fejl |
|---|---|---|---|
| 1.1 | Bruger åbner "Søg"-fane. | Søgefelt vises øverst med placeholder **"Søg i sager…"**.  <br>Clear-knap (X) er skjult indtil der er input.  <br>Ikon til syntakshjælp vises ved siden af feltet.  <br>Tilstand er tom: vis enten alle sager eller prompt **"Start din søgning"** — afhænger af PO-valg (se US-002 åbne spørgsmål). | Hvis netværk offline: vis offline-tilstand. |
| 1.2 | Bruger trykker i søgefeltet. | Tastatur åbnes.  <br>Cursor placeres i feltet.  <br>Syntakshjælp-ikon forblives synlig. | — |
| 1.3 | Bruger indtaster 0 eller 1 gyldigt bogstav. | Søgning **udføres ikke**.  <br>Der vises prompt: **"Skriv mindst 2 tegn for at søge."**  <br>Tom listevisning; ingen loading. | Ét tal eller ét specialtegn tæller **ikke** som et gyldigt bogstav (S8). F.eks. input `&` alene viser prompten. |
| 1.4 | Bruger indtaster ≥2 gyldige tegn. | Debounce (300 ms).  <br>Søgning udføres: substring/fuzzy i titel, beskrivelse og noter.  <br>Antal resultater vises under søgefeltet. | Hvis input kun består af specialtegn/tal uden mindst 2 bogstaver: prompten vises stadig. |
| 1.5 | Bruger indtaster `Jem & Fix`. | Søgestrengen sendes råt til parseren.  <br>Specialtegn `&` behandles som en del af token, **ikke** som AND-operator (S2).  <br>Resultater indeholder sager med teksten "Jem & Fix". | `&`, `/`, `-`, tal, æøå bevares og afgrænser ikke søgningen forkert. |
| 1.6 | Søgeresultater returneres. | Hvert resultat viser:  <br>- Item-titel  <br>- Beskrivelse / note-udsnit  <br>- Matchende ord/sætninger fremhæves med highlight (W1).  <br>For `Jem & Fix` fremhæves "Jem", "&" og "Fix" hver for sig.  <br>For `"vand i kælderen"` fremhæves hele den præcise sætning. | Hvis resultatet matcher i OCR-tekst (hvis scope): marker kildefeltet. |
| 1.7 | Bruger åbner syntakshjælp. | Modal/accordion åbner med tabel:  <br>`vand` → finder "vandkande"  <br>`*vand*` → kun hele ord  <br>`"vand i kælderen"` → præcis frase  <br>`vand -kælder` → uden "kælder"  <br>`vand OR varme` → enten/eller  <br>`projekt:Renovering` → filter  <br>`Jem & Fix` → specialtegn bevares | Hjælp kan lukkes med tilbage-knap eller swipe-down. |
| 1.8 | Søgning giver 0 resultater. | Skærmen viser **"Ingen resultater for 'Jem & Fix'"**.  <br>Knappen **"Opret liste"** er **deaktiveret** eller skjult (listen kræver resultater).  <br>Bruger kan rydde søgning eller justere input. | Hvis 0 pga. specialtegn-parserfejl: logges ikke brugervendt; S2 skal forhindre dette. |

### 1.2 State-diagram for søgefelt

```mermaid
stateDiagram-v2
    [*] --> Tom: Åbn søg
    Tom --> Prompt: <2 gyldige tegn
    Prompt --> Tom: ryddet
    Prompt --> Søger: ≥2 tegn
    Søger --> Resultater: matches
    Søger --> IngenResultater: 0 matches
    Resultater --> Søger: ny input
    IngenResultater --> Søger: ny input
    Resultater --> [*]: Opret liste
```

---

## 2. Opret dynamisk liste fra søgning

### 2.1 Skærm: Søgeresultater → Opret liste

| # | Aktion | Systemreaktion | Edge case / fejl |
|---|---|---|---|
| 2.1 | Bruger trykker **"Opret liste"** fra søgeresultater. | Dialog vises med:  <br>- Forudfyldt listenavn (udledt fra søgestreng).  <br>- Valg af felter der bliver til punkter (titel, beskrivelse/noter, kategori).  <br>- Hvis flere projekter: projekt-vælger. | Knappen vises kun når der er ≥1 resultat. |
| 2.2 | System udleder listenavn. | Søgestrengen bruges **præcis** som indtastet, inkl. `&` og specialtegn.  <br>Eksempel: søgning `Jem & Fix` → navneforslag **"Jem & Fix"**.  <br>Hvis navnet er for langt: afkort med ellipses, men gemmer fuld streng. | Tal og æøå bevares. |
| 2.3 | Bruger har flere projekter. | Projekt-vælger vises med nuværende projekt forvalgt.  <br>Bruger **skal** vælge projekt (PO-beslutning #9). | Hvis kun ét projekt: trin springes over. |
| 2.4 | Bruger bekræfter oprettelse. | System genererer punkter ud fra valgte felter.  <br>Streng deduplikering kører automatisk.  <br>Liste gemmes med: søgestreng, filtre, sortering, navn, projekt.  <br>Bruger navigeres til listen. | S1: Hvis oprettelse fejler, vises **ikke** "Kunne ikke oprette den dynamiske liste". I stedet: specifik fejlmeddelelse og mulighed for at prøve igen. |
| 2.5 | Oprettelse mislykkes. | Fejlvisning:  <br>- Hvis netværk: **"Tjek netværk og prøv igen."**  <br>- Hvis rettigheder: **"Du har ikke rettigheder til at oprette liste i dette projekt."**  <br>- Hvis validering: marker problemfelt.  <br>Bruger forbliver i dialog; input bevares. | Ingen generisk fejl. |
| 2.6 | Oprettelse lykkes. | Navigation til listen.  <br>Listevisning indlæser punkter.  <br>Highlight af søgeord vises med det samme (W1). | — |

### 2.2 Listeoprettelses-flow

```mermaid
sequenceDiagram
    participant U as Bruger
    participant S as Søg-skærm
    participant D as Opret-liste-dialog
    participant FS as Firestore
    participant L as Listevisning

    U->>S: Trykker "Opret liste"
    S->>D: Åbn dialog
    D->>U: Vis navn, feltvalg, projektvælger
    U->>D: Bekræft
    D->>FS: Gem liste + søgestreng
    alt OK
        FS->>D: success
        D->>L: Naviger
        L->>U: Vis punkter med highlight
    else Fejl
        FS->>D: error
        D->>U: Specifik fejl + prøv igen
    end
```

---

## 3. Listevisning

### 3.1 Skærm: Listevisning

| # | Aktion | Systemreaktion | Edge case / fejl |
|---|---|---|---|
| 3.1 | Liste åbnes fra portal eller efter oprettelse. | System genkører gemt søgning.  <br>Punkter vises med checkbox foran.  <br>Udførte punkter gråes ud, gennemstreger og placeres i bunden.  <br>"Nyt match"-badge vises på punkter tilføjet siden sidste åbning.  <br>"Måske duplikat"-badge vises på semantiske dubletter. | Hvis kildesag er slettet: punkt gråes ud med note **"Kildesag ikke længere tilgængelig"**. |
| 3.2 | Punkter stammer fra forskellige sager. | Hvert punkt viser sit kildesags-id eller titel som sekundær tekst.  <br>Punkter fra samme sag grupperes visuelt (valgfri collapsible gruppe) eller adskilles med subtile divider. | Hvis mange sager: virtualisering eller paginering; maks. datasæt aftales med PO. |
| 3.3 | Fritekst-punkt vs. item-reference-punkt. | **Item-reference-punkt:** Punkt er hentet fra et item-felt.  <br>Viser kilde-item-titel som metadata.  <br>Afkrydsning opdaterer det matchende punkt i item.  <br>**Fritekst-punkt:** Bruger-oprettet punkt uden item-reference.  <br>Viser ikke kilde-metadata.  <br>Afkrydsning opdaterer kun listepunktet. | Hvis item-reference er brudt (item slettet/rettigheder): punkt gråes ud. |
| 3.4 | Søgeord highlightes i listen (W1). | Matcher fra søgestrengen fremhæves i hvert listepunkt, hvor ordene forekommer.  <br>For `Jem & Fix` fremhæves alle tre tokens.  <br>For `"vand i kælderen"` fremhæves hele frasen. | Highlight må ikke bryde tekst-layout eller HTML-lignende markup. |
| 3.5 | Bruger vælger sortering. | Muligheder: alfabetisk, dato, prioritet.  <br>Default: alfabetisk med udførte punkter i bunden.  <br>Valg huskes for den pågældende liste. | — |
| 3.6 | Dynamisk opdatering ved åbning. | Hvis ny sag matcher: nyt punkt tilføjes med "nyt"-badge.  <br>Hvis kildesag ikke længere matcher: punkt gråes ud med note **"Kilden matcher ikke længere søgningen"**; fjernes ikke automatisk. | — |

### 3.2 Listevisningens struktur

```mermaid
flowchart LR
    A[Header: listenavn + sortering + del] --> B[Punkter fra matches]
    B --> C[Åbne punkter sorteret]
    C --> D[Udførte punkter i bunden]
    B --> E[Gråede punkter: kilden matcher ikke]
    B --> F[Nyt-match-badge]
    B --> G[Måske duplikat-badge]
```

---

## 4. Afkrydsning af punkt

### 4.1 Skærm: Listevisning → Afkryds punkt

| # | Aktion | Systemreaktion | Edge case / fejl |
|---|---|---|---|
| 4.1 | Bruger trykker checkbox ved punkt. | Punkt markeres som udført (visuel: flueben + gennemstreget + grå).  <br>Punkt flyttes til bunden af listen (default sortering). | Hvis offline: markering lokal; synkroniseres når online. |
| 4.2 | Punkt er item-reference-punkt. | System opdaterer **kun** det matchende punkt/checkpoint i kildesagen (S3).  <br>Hele item-status ændres **ikke** automatisk. | Punktet i item identificeres entydigt via tekst-snippet + item-id. |
| 4.3 | Alle punkter fra samme sag er færdige. | System kan opdatere item-status til `done` (PO-beslutning B).  <br>Dette sker **automatisk** kun hvis alle item-punkter er udførte. | Hvis PO ønsker manuel handling: springes dette trin over; afhænger af endelig Solution Design. |
| 4.4 | Bruger fjerner afkrydsning. | Punkt markeres som åbent igen.  <br>Hvis item-reference: det matchende punkt i item åbnes igen.  <br>Item-status påvirkes ikke. | — |
| 4.5 | Ingen overordnet liste-status. | Der vises **ingen** samlet status for hele listen der spejler sags-status (PO-beslutning A, S4/S7). | — |

### 4.2 Afkrydsningsregler

```mermaid
flowchart TD
    A[Bruger afkrydser punkt] --> B{Punkt-type}
    B -->|Item-reference| C[Opdater kun det matchende punkt i item]
    B -->|Fritekst| D[Opdater kun listepunktet]
    C --> E{Alle item-punkter færdige?}
    E -->|Ja| F[Item-status kan sættes til done]
    E -->|Nej| G[Item-status uændret]
    D --> H[Listepunktet udført]
    F --> H
    G --> H
```

---

## 5. Åbn kildesag fra liste

### 5.1 Skærm: Listevisning → Item-detalje

| # | Aktion | Systemreaktion | Edge case / fejl |
|---|---|---|---|
| 5.1 | Bruger trykker på punkt eller **"Åbn sag"**. | Item-detaljevisning åbnes for kildesagen.  <br>Fokus placeres på det matchende punkt/checkpoint (scroll til det). | Hvis item er slettet: vis fejlmeddelelse og tilbyd at fjerne punkt fra liste. |
| 5.2 | Bruger ændrer item-status manuelt. | Item-status opdateres (f.eks. `in_progress`, `done`).  <br>Ændringen **spejles ikke** automatisk tilbage til listepunktet (S4/S7). | Bruger kan stadig se item-status i detaljevisning. |
| 5.3 | Bruger trykker **Tilbage**. | App vender tilbage til listevisning.  <br>Listepunktets afkrydsningsstatus forbliver uændret.  <br>Liste genindlæses (nye matches kan vises). | Hvis app-state er tabt: genåbnes listen fra dyb link/portal. |
| 5.4 | Bruger ændrer et punkt/checkpoint i item. | Ændringen opdaterer item.  <br>Listepunktet opdateres **ikke** automatisk, medmindre det er det samme punkt og der eksplicit er valgt synk (PO-beslutning A: adskilt). | Hvis checkpoint-tekst ændres så den ikke længere matcher søgning: punkt gråes ud ved næste genindlæsning. |

### 5.2 Kildesag-flow

```mermaid
sequenceDiagram
    participant U as Bruger
    participant L as Listevisning
    participant I as Item-detalje
    participant FS as Firestore

    U->>L: Trykker punkt / "Åbn sag"
    L->>I: Åbn item med scroll til punkt
    U->>I: Ændrer item-status manuelt
    I->>FS: Gem item-status
    U->>I: Trykker Tilbage
    I->>L: Vend tilbage
    Note over L: Listepunkt-status uændret
```

---

## 6. Tilføj nyt punkt / rediger punkt

### 6.1 Skærm: Listevisning → Tilføj/rediger punkt

| # | Aktion | Systemreaktion | Edge case / fejl |
|---|---|---|---|
| 6.1 | Bruger trykker **"+ Tilføj Punkt"**. | Inputfelt / inline editor åbnes i bunden eller som modal.  <br>Cursor placeres i feltet.  <br>Tastatur åbnes. | — |
| 6.2 | Tastatur åbnes. | Skærmen scroller automatisk, så inputfeltet bliver synligt over tastaturet (S5).  <br>Brug `KeyboardAvoidingView` eller `ScrollView` med `scrollTo`. | På Android og iOS skal højdejustere håndteres forskelligt. |
| 6.3 | Bruger indtaster tekst. | Tekst vises løbende.  <br>Max-længde valideres (f.eks. 500 tegn). | — |
| 6.4 | Bruger gemmer nyt punkt. | System opretter automatisk en ny sag (item) der matcher listens søgning (PO-beslutning #11).  <br>Punktet tilføjes listen.  <br>Item-reference oprettes mellem punkt og ny sag.  <br>Liste sorteres på ny. | Hvis oprettelse af item fejler: specifik fejl; punkt gemmes ikke. |
| 6.5 | Bruger redigerer eksisterende punkt. | Inline editor åbnes med eksisterende tekst.  <br>Tastatur-håndtering som i 6.2.  <br>Ved gem: opdateres listepunkt.  <br>Hvis item-reference: opdateres også det matchende punkt i item (PO-beslutning A tillader dette; afklares i Solution Design). | Hvis redigering fjerner match mod søgning: punkt gråes ud ved genindlæsning. |
| 6.6 | Bruger annullerer. | Editor lukkes.  <br>Ingen ændringer gemmes.  <br>Tastatur lukkes. | — |

### 6.2 Tastatur/scroll-løsning

```mermaid
flowchart TD
    A[Bruger åbner input] --> B[Tastatur åbner]
    B --> C[Mål inputfeltets position]
    C --> D[Scroll/pad så feltet er synligt]
    D --> E[Bruger skriver]
    E --> F[Bruger gemmer / annullerer]
    F --> G[Tastatur lukkes]
    G --> H[Scroll reset / liste opdateres]
```

---

## 7. Kommentar-flow (S6)

### 7.1 Skærm: Item-detalje → Kommentar

| # | Aktion | Systemreaktion | Edge case / fejl |
|---|---|---|---|
| 7.1 | Bruger åbner item og vælger at skrive kommentar. | Kommentar-input vises.  <br>**Tilbage**-knappen forbliver synlig og funktionel.  <br>Tastatur åbnes; inputfelt scroller over tastatur. | App må ikke låse sig; navigation skal fungere. |
| 7.2 | Bruger skriver kommentar. | Tekst vises løbende.  <br>Send-/gem-knap aktiveres ved input. | — |
| 7.3 | Bruger sender kommentar. | Kommentar gemmes på item.  <br>Input ryddes.  <br>Bruger vender tilbage til sagsvisning eller liste. | Offline: gemmes lokalt/kø til synkronisering. |
| 7.4 | Bruger sletter kommentar. | Slet bekræftes (valgfri).  <br>Kommentar fjernes fra item.  <br>App låser ikke. | — |
| 7.5 | Bruger trykker Tilbage under kommentar. | Hvis kommentar er tom eller gemt: gå tilbage.  <br>Hvis kommentar er ændret men ikke gemt: vis **"Gem ændringer?"**-dialog.  <br>Tilbage-knap forbliver altid synlig. | App må ikke fryse eller skjule Tilbage. |
| 7.6 | Kommentar sendes/lukkes. | Navigation vender normalt tilbage.  <br>Ingen deadlock. | Hvis fejl ved gem: specifik fejlmeddelelse; Tilbage stadig synlig. |

### 7.2 Kommentar-flow

```mermaid
flowchart TD
    A[Åbn item] --> B[Åbn kommentar-input]
    B --> C[Tilbage-knap synlig]
    C --> D[Skriv kommentar]
    D --> E{Bruger trykker Tilbage}
    E -->|Ændringer usaved| F[Dialog: gem/annuller]
    E -->|Tom eller gemt| G[Tilbage til sagsvisning]
    D --> H[Send / slet kommentar]
    H --> G
    F -->|Gem| G
    F -->|Annuller| G
```

---

## 8. Del / kopiér / slet punkt

### 8.1 Skærm: Listevisning → handlinger på punkt

| # | Aktion | Systemreaktion | Edge case / fejl |
|---|---|---|---|
| 8.1 | Bruger vælger **Del** for en liste. | Native share-sheet åbnes.  <br>Tekstoversigt: listenavn, antal udførte/total, åbne punkter.  <br>Mulighed for dyb link der åbner listen hos modtager. | Modtager skal have rettigheder til projektet; ellers vises forklarende fejl. |
| 8.2 | Bruger vælger **Kopiér** punkt. | Kopie af punkt oprettes i samme liste.  <br>Hvis item-reference: kopien kan pege på samme item eller være fritekst — afklares i Solution Design.  <br>Streng deduplikering kører; identiske punkter markeres. | — |
| 8.3 | Bruger vælger **Slet** item-reference-punkt. | Kun listepunktet fjernes.  <br>Kildesagen (item) påvirkes **ikke**.  <br>Bruger får ikke advarsel om sletning af sag. | Hvis punktet er det eneste fra en sag: sag forbliver intakt. |
| 8.4 | Bruger vælger **Slet** fritekst-punkt. | Kun listepunktet fjernes.  <br>Ingen kildesag eksisterer; intet andet påvirkes. | — |
| 8.5 | Bruger vælger **Slet** fra item-detalje. | Hvis punkt også findes i liste: punkt i liste gråes ud ved næste genindlæsning med note **"Kilden er slettet"**.  <br>Fjernes ikke automatisk. | — |

### 8.2 Sletningsregler

```mermaid
flowchart TD
    A[Bruger trykker slet på punkt] --> B{Punkt-type}
    B -->|Item-reference| C[Fjern kun listepunkt]
    B -->|Fritekst| D[Fjern kun listepunkt]
    C --> E[Kildesag påvirkes ikke]
    D --> F[Inten kildesag at påvirke]
```

---

## 9. Data-adskillelse og status-håndtering

### 9.1 Principper

| Begreb | Definition | Adfærd |
|---|---|---|
| **Listepunkt-status** | Checkbox-state i listen | Uafhængig af item-status. Kan afkrydses/fravælges. |
| **Item-status** | Sags-status i item-detalje | Ændres manuelt i item. Påvirker ikke listepunkt automatisk. |
| **Item-punkt / checkpoint** | Del-element i item (f.eks. parsed fra beskrivelse) | Opdateres når listepunkt afkrydses (kun det matchende punkt). |

### 9.2 Status-matrix

| Event | Listepunkt | Item-status | Item-punkt |
|---|---|---|---|
| Bruger afkrydser listepunkt (item-reference) | Done | Uændret | Matchende punkt Done |
| Bruger afkrydser listepunkt (fritekst) | Done | — | — |
| Bruger ændrer item-status manuelt | Uændret | Ny status | — |
| Alle item-punkter bliver Done | Done | Kan sættes Done (PO-beslutning B) | Done |
| Item slettes | Grået ud | Slettet | Slettet |
| Sag matcher ikke længere søgning | Grået ud | Uændret | Uændret |

---

## 10. Edge cases og fejlhåndtering

| # | Scenario | Håndtering |
|---|---|---|
| E1 | Søgning med `&` eller specialtegn | Parser bevarer tegn; søgning udføres; highlight viser tokens. |
| E2 | Søgning med <2 tegn | Ingen søgning; prompt vises. |
| E3 | 0 søgeresultater | Ingen resultater-skærm; "Opret liste" deaktiveret. |
| E4 | Oprettelse fejler | Specifik fejlmeddelelse; ingen generisk S1-fejl; mulighed for genforsøg. |
| E5 | Flere projekter | Projektvalg påkrævet før oprettelse. |
| E6 | Afkrydsning af ét punkt | Kun det matchende punkt i item opdateres; item-status uændret. |
| E7 | Item-status ændres manuelt | Listepunkt-status uændret. |
| E8 | Tastatur dækker input | Auto-scroll/padding; felt synligt. |
| E9 | Kommentar-lås | Tilbage-knap synlig; slet-kommentar tilgængelig; ingen deadlock. |
| E10 | Slet item-reference-punkt | Kun listepunktet fjernes; item bevares. |
| E11 | Offline | Handlinger køes; vis synk-status. |
| E12 | Item slettet efter listeoprettelse | Punkt gråes ud; fjernes ikke automatisk. |

---

## 11. Åbne punkter til Solution Design

1. Søgning kører **lokalt, server-side eller hybrid**? Påvirker offline, performance og indeksering.
2. Hvilke felter indgår i søgningen udover titel, beskrivelse og noter? OCR-tekst, projektnavn?
3. Skal item-reference-punkter oprettes som entydige id'er eller tekst-match? Påvirker S3.
4. Hvordan håndteres migrering af eksisterende lister med gammel status-model?
5. Skal kopiering af item-reference-punkt være reference eller fritekst?
6. Hvordan implementeres highlight robust for specialtegn og æøå (W1/S2)?
7. Skal alle smart-søgeoperatorer implementeres i første runde, eller gradvis?

---

## 12. Relaterede filer

- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-002-search-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-005-dynamic-lists-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-005-context-lists-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\status\team-status.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\plans\plan-search-lists-redesign.md`
