# Testplan: Søgning og dynamiske lister — S1–S8 + W1 (v2)

**Dokument:** `.claude/team/test/testplan-search-lists-v2.md`  
**Dato:** 2026-07-15  
**Build:** Efter Task #87 (Developer Agent) og før Task #91 (PO acceptance test)  
**Ansvarlig:** Test Manager Agent  
**Review:** QA Agent + Master Agent  

---

## 1. Overblik

### Scope
Denne testplan dækker rettelserne og forbedringerne for søgning og dynamiske lister, som PO har godkendt i én runde:

- **S1:** "Kunne ikke oprette den dynamiske liste" ved alle forsøg på listeoprettelse fra søgning.
- **S2:** `&` og andre specialtegn (`/`, `-`, tal, æøå) kan ikke indgå i søgning eller bevares i listenavn.
- **S3:** Afkrydsning af ét listepunkt ændrer hele kildesagens status til Done.
- **S4:** Kildesag sat til `in_progress` vises stadig som gennemstreget Done i listen.
- **S5:** Tastatur dækker felter ved "+ Tilføj Punkt" og redigering i liste.
- **S6:** Kommentar-skrivning fjerner "Tilbage" og låser appen.
- **S7:** Kildesag sat til Done opdaterer ikke det tilknyttede listepunkt.
- **S8:** Minimum 2 bogstaver ved søgning håndhæves ikke.
- **W1:** Vis hit/highlight for det ord, der har skabt match.

### Mål
- Verificere at søgningen finder korrekte resultater med specialtegn, tal og æøå.
- Verificere at listeoprettelse fra søgning er stabil og giver specifikke fejlmeddelelser.
- Verificere at listepunkt-status og item-status er adskilte enheder.
- Verificere at UI-fixes (tastatur/scroll og kommentar-layout) ikke låser appen.
- Verificere at matchende ord og sætninger fremhæves visuelt i søgeresultater og lister.
- Verificere at eksisterende funktionalitet ikke er regrederet.

### Teststrategi
- **Niveauer:** Enhedstest af `services/search.ts`, integrationstest i simulator/dev-client, PO acceptance test på fysiske iOS- og Android-enheder.
- **Miljøer:** Firebase Emulator eller staging-projekt med testdata; fysisk enhed med EAS preview build.
- **Tilgang:** For hvert bug/ønske mindst én positiv testcase og én negativ/edge-case testcase. Regressionstest køres efter hver større ændring og som afsluttende gate.
- **Acceptance:** PO gennemfører de markerede "PO"-cases; QA gennemfører resten og skriver `qa-report-search-lists-v2.md`.

---

## 2. Testcases pr. bug/ønske

### S1 — Listeoprettelse fejler ikke

#### TC-S1.1: Opret liste fra søgning med ét projekt
| Felt | Værdi |
|---|---|
| ID | TC-S1.1 |
| Dækker | S1, US-005 / 2 |
| Type | Positiv |
| Forudsætninger | Bruger er logget ind og medlem af ét projekt. Projektet har sager der matcher søgningen "vand". |
| Trin | 1. Gå til Søg-fanen. <br> 2. Indtast "vand". <br> 3. Tryk "Opret liste". <br> 4. Bekræft forudfyldt navn "vand". <br> 5. Vælg kildefelt "Beskrivelse/noter". <br> 6. Tryk "Opret". |
| Forventet resultat | 1. Listen oprettes uden fejl. <br> 2. Brugeren navigeres til den nye liste. <br> 3. Punkter genereres fra søgeresultaterne. <br> 4. Der vises **ikke** generisk besked: "Kunne ikke oprette den dynamiske liste". |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer i Firestore at `checklists/{id}` oprettes med `isDynamic: true`, `searchQuery.raw: "vand"` og `projectId`. |

#### TC-S1.2: Opret liste med flere projekter kræver projektvalg
| Felt | Værdi |
|---|---|
| ID | TC-S1.2 |
| Dækker | S1, US-005 / 2, PO-beslutning #3 |
| Type | Positiv / validering |
| Forudsætninger | Bruger er medlem af mindst to projekter. Begge projekter har sager der matcher "vand". |
| Trin | 1. Gå til Søg-fanen. <br> 2. Indtast "vand". <br> 3. Tryk "Opret liste". <br> 4. Se projekt-vælger. <br> 5. Vælg det projekt, hvor brugeren har editor/owner/admin rolle. <br> 6. Bekræft oprettelse. |
| Forventet resultat | 1. Projekt-vælger vises med nuværende projekt forvalgt. <br> 2. Oprettelse lykkes i det valgte projekt. <br> 3. Listen gemmes med det valgte `projectId`. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test også at oprettelse fejler specifikt, hvis brugeren vælger et projekt hvor de kun har viewer-rolle. |

#### TC-S1.3: Specifik fejlmeddelelse ved netværksfejl
| Felt | Værdi |
|---|---|
| ID | TC-S1.3 |
| Dækker | S1, US-005 / 2 |
| Type | Negativ |
| Forudsætninger | Søgningen "vand" returnerer resultater. Netværksforbindelsen deaktiveres inden oprettelse. |
| Trin | 1. Gå til Søg-fanen. <br> 2. Indtast "vand". <br> 3. Tryk "Opret liste". <br> 4. Vælg projekt og kildefelt. <br> 5. Bekræft oprettelse med netværk fra. |
| Forventet resultat | 1. Oprettelse fejler. <br> 2. Der vises specifik fejl: "Tjek netværket og prøv igen." eller lignende. <br> 3. Der vises **ikke** "Kunne ikke oprette den dynamiske liste". <br> 4. Brugeren kan prøve igen. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test også Firestore-regel-afvisning: fejlen skal angive rettigheder, ikke generisk tekst. |

---

### S2 — Specialtegn i søgning

#### TC-S2.1: `&` bevares og matcher
| Felt | Værdi |
|---|---|
| ID | TC-S2.1 |
| Dækker | S2, US-002 / 5 |
| Type | Positiv |
| Forudsætninger | Projektet har en sag med titel eller beskrivelse "Jem & Fix". |
| Trin | 1. Gå til Søg-fanen. <br> 2. Indtast "Jem & Fix". |
| Forventet resultat | 1. Sagen med "Jem & Fix" vises i resultaterne. <br> 2. Listenavn-forslaget ved oprettelse er "Jem & Fix" (ikke blot "Jem"). <br> 3. Søgningen `Jem &` finder sager der indeholder "Jem &" (f.eks. "Jem & Fix", "Jem & Co"). |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at `&` ikke behandles som AND-operator og ikke fjernes af tokenizer. |

#### TC-S2.2: `/`, `-`, tal og æøå matcher
| Felt | Værdi |
|---|---|
| ID | TC-S2.2 |
| Dækker | S2, US-002 / 5 |
| Type | Positiv |
| Forudsætninger | Projektet har sager med: "50 mm rør", "Silvan/Bauhaus", "håndværker-tilbud", "æseløse ål". |
| Trin | 1. Søg efter "50 mm rør". <br> 2. Søg efter "Silvan/Bauhaus". <br> 3. Søg efter "håndværker-tilbud". <br> 4. Søg efter "æseløse". |
| Forventet resultat | 1. Hver søgning returnerer det forventede match. <br> 2. Specialtegn og tal bevares i søgestrengen og i listenavn. <br> 3. Der returneres ikke forkerte matches pga. fjernede tegn. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test også at søgningen "50" alene ikke udføres (kræver ≥2 bogstaver, se TC-S8.3). |

#### TC-S2.3: Specialtegn ændrer ikke søgeadfærden
| Felt | Værdi |
|---|---|
| ID | TC-S2.3 |
| Dækker | S2, US-002 / 5 |
| Type | Negativ / validering |
| Forudsætninger | Projektet har sager med "Jem Fix" (uden `&`) og "Jem & Fix" (med `&`). |
| Trin | 1. Søg efter "Jem & Fix". <br> 2. Søg efter "Jem Fix". |
| Forventet resultat | 1. "Jem & Fix" finder kun sager med `&` (eller også "Jem Fix" hvis sagen indeholder begge). <br> 2. "Jem Fix" finder sager med "Jem Fix" og også "Jem & Fix" fordi "Fix" matcher. <br> 3. Begge søgninger returnerer fornuftige, forskellige resultatmængder. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Dokumentér hvordan tokenizer behandler `&` så det kan testes konsistent. |

---

### S3 — Afkrydsning af ét punkt påvirker kun det pågældende punkt i sagen

#### TC-S3.1: Afkryds ét listepunkt — item-status uændret
| Felt | Værdi |
|---|---|
| ID | TC-S3.1 |
| Dækker | S3, US-005 / 10, PO-beslutning #2 |
| Type | Positiv |
| Forudsætninger | Liste oprettet fra søgning. En kildesag har to eller flere checkpoints/listepunkter. Kildesagens status er "new" eller "in_progress". |
| Trin | 1. Åbn listen. <br> 2. Afkryd ét punkt fra en kildesag med flere punkter. <br> 3. Gå til Board og åbn kildesagen. |
| Forventet resultat | 1. Listepunktet markeres udført og flyttes til bunden. <br> 2. Kildesagens overordnede status forbliver uændret (ikke Done). <br> 3. Kun det matchende checkpoint i kildesagen markeres Done. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer i Firestore at `items/{id}.status` ikke er ændret, mens `items/{id}/checkpoints/{cp}.status` er `done`. |

#### TC-S3.2: Alle punkter fra samme sag færdige — item-status Done
| Felt | Værdi |
|---|---|
| ID | TC-S3.2 |
| Dækker | S3, US-005 / 10, PO-beslutning #2 |
| Type | Positiv |
| Forudsætninger | En kildesag har checkpoints der svarer til to listepunkter. Begge listepunkter er åbne. |
| Trin | 1. Afkryd det første punkt fra kildesagen. <br> 2. Afkryd det andet punkt fra samme kildesag. <br> 3. Gå til Board og åbn kildesagen. |
| Forventet resultat | 1. Efter første punkt: item-status uændret. <br> 2. Efter andet punkt: item-status sættes automatisk til Done (PO-beslutning B). <br> 3. Begge checkpoints er Done. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Hvis PO ønsker manuel handling i stedet, skal dette testcase justeres inden kode. |

---

### S4 — Item `in_progress` spejles ikke automatisk til liste

#### TC-S4.1: Kildesag sættes til `in_progress` — listepunkt uændret
| Felt | Værdi |
|---|---|
| ID | TC-S4.1 |
| Dækker | S4, S7, US-005 / 12, PO-beslutning #3 |
| Type | Positiv |
| Forudsætninger | Liste har et afkrydset listepunkt fra en kildesag. Kildesagens status er sat til Done (f.eks. via TC-S3.2). |
| Trin | 1. Åbn kildesagen fra listen. <br> 2. Sæt item-status til "in_progress" manuelt. <br> 3. Gå tilbage til listen. |
| Forventet resultat | 1. Listepunktets afkrydsningsstatus forbliver uændret (udført). <br> 2. Punktet flyttes ikke tilbage blandt åbne punkter. <br> 3. Der vises ingen overordnet liste-status der spejler item-status. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at adskillelsen mellem listepunkt-status og item-status overholdes. |

---

### S5 — Tastatur dækker ikke inputfelter

#### TC-S5.1: Tilføj punkt — inputfelt synligt over tastatur
| Felt | Værdi |
|---|---|
| ID | TC-S5.1 |
| Dækker | S5, US-005 / 21 |
| Type | Positiv |
| Forudsætninger | Bruger er i en dynamisk liste på mobilenhed (iOS eller Android). Listen har mindst ét punkt. |
| Trin | 1. Åbn listen. <br> 2. Scroll til bunden. <br> 3. Tryk "+ Tilføj Punkt". <br> 4. Begynd at skrive tekst. |
| Forventet resultat | 1. Tastaturet åbnes. <br> 2. Inputfeltet scroller automatisk opad, så det er synligt over tastaturet. <br> 3. Brugeren kan se hele teksten mens den indtastes. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test både portræt og landskab, samt på Android og iOS. |

#### TC-S5.2: Rediger punkt — inputfelt synligt over tastatur
| Felt | Værdi |
|---|---|
| ID | TC-S5.2 |
| Dækker | S5, US-005 / 21 |
| Type | Positiv |
| Forudsætninger | Bruger er i en dynamisk liste på mobilenhed. |
| Trin | 1. Åbn listen. <br> 2. Tryk rediger på et eksisterende punkt. <br> 3. Begynd at skrive tekst. |
| Forventet resultat | 1. Redigeringsfeltet bliver synligt over tastaturet. <br> 2. Tekst kan redigeres uden at feltet forsvinder bag tastaturet. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at andre modals (f.eks. oprettelse af sag) ikke er regrederet. |

---

### S6 — Kommentar låser ikke appen

#### TC-S6.1: "Tilbage"-knap synlig under kommentar
| Felt | Værdi |
|---|---|
| ID | TC-S6.1 |
| Dækker | S6, US-005 / 22 |
| Type | Positiv |
| Forudsætninger | Bruger er logget ind og har adgang til en sag med kommentarfunktion. |
| Trin | 1. Åbn en sag fra Board eller liste. <br> 2. Tryk kommentar-feltet. <br> 3. Begynd at skrive en kommentar. |
| Forventet resultat | 1. "Tilbage"-knappen forbliver synlig og trykkbar i toppen. <br> 2. Appen låser ikke. <br> 3. Kommentar-inputbaren er synlig over tastaturet. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Tag screenshot hvis Tilbage-knap forsvinder. |

#### TC-S6.2: Kommentar kan slettes uden at låse appen
| Felt | Værdi |
|---|---|
| ID | TC-S6.2 |
| Dækker | S6, US-005 / 22 |
| Type | Positiv |
| Forudsætninger | En sag har en eksisterende kommentar skrevet af den aktuelle bruger. |
| Trin | 1. Åbn sagen. <br> 2. Tryk "Slet" ved en kommentar. <br> 3. Bekræft sletning (hvis dialog vises). |
| Forventet resultat | 1. Kommentaren slettes. <br> 2. Appen vender tilbage til sagsvisning. <br> 3. Ingen deadlock eller skjult Tilbage-knap. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test også sletning mens tastaturet er åbent. |

#### TC-S6.3: Kommentar afsendes — normal navigation tilbage
| Felt | Værdi |
|---|---|
| ID | TC-S6.3 |
| Dækker | S6, US-005 / 22 |
| Type | Positiv |
| Forudsætninger | Bruger er i kommentar-input til en sag. |
| Trin | 1. Skriv en kommentar. <br> 2. Tryk "Send". <br> 3. Tryk "Tilbage". |
| Forventet resultat | 1. Kommentaren gemmes. <br> 2. Brugeren vender tilbage til sagsvisning eller listen. <br> 3. Navigation fungerer normalt; ingen tab af app-state. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test offline-håndtering hvis relevant: specifik fejlmeddelelse, Tilbage stadig synlig. |

---

### S7 — Item `done` spejles ikke automatisk til liste

#### TC-S7.1: Kildesag sat til Done — listepunkt uændret
| Felt | Værdi |
|---|---|
| ID | TC-S7.1 |
| Dækker | S7, US-005 / 12, PO-beslutning #3 |
| Type | Positiv |
| Forudsætninger | Liste har et åbent listepunkt fra en kildesag. |
| Trin | 1. Åbn kildesagen. <br> 2. Sæt item-status til "Done" manuelt. <br> 3. Gå tilbage til listen. |
| Forventet resultat | 1. Listepunktet forbliver åbent. <br> 2. Punktet flyttes ikke automatisk til bunden eller markeres udført. <br> 3. Item-status og listepunkt-status er adskilte. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Kombineres med TC-S4.1 for at verificere begge retninger af adskillelse. |

---

### S8 — Minimum 2 bogstaver før søgning

#### TC-S8.1: 0 eller 1 bogstav udløser ikke søgning
| Felt | Værdi |
|---|---|
| ID | TC-S8.1 |
| Dækker | S8, US-002 / 3 |
| Type | Negativ / validering |
| Forudsætninger | Bruger er på Søg-fanen. Projektet har mange sager. |
| Trin | 1. Indtast "v" i søgefeltet. <br> 2. Indtast "1" i søgefeltet. <br> 3. Indtast "&" i søgefeltet. |
| Forventet resultat | 1. Ingen søgning udføres. <br> 2. Der vises prompt: "Skriv mindst 2 tegn for at søge." eller tilsvarende tom tilstand. <br> 3. Ingen loading spinner eller resultater vises. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer både UI og søgelogik — søgning må ikke køre i baggrunden. |

#### TC-S8.2: ≥2 bogstaver udløser søgning
| Felt | Værdi |
|---|---|
| ID | TC-S8.2 |
| Dækker | S8, US-002 / 3 |
| Type | Positiv |
| Forudsætninger | Projektet har sager med tekst der matcher "va". |
| Trin | 1. Indtast "va" i søgefeltet. <br> 2. Vent på debounce (ca. 300 ms). |
| Forventet resultat | 1. Søgning udføres. <br> 2. Resultater vises. <br> 3. Antal resultater vises under søgefeltet. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test også at søgning på "væ", "ør" og "ål" virker med æøå som bogstaver. |

#### TC-S8.3: Kun tal og specialtegn udløser ikke søgning
| Felt | Værdi |
|---|---|
| ID | TC-S8.3 |
| Dækker | S8, US-002 / 3 |
| Type | Negativ / validering |
| Forudsætninger | Bruger er på Søg-fanen. |
| Trin | 1. Indtast "50" i søgefeltet. <br> 2. Indtast "&&" i søgefeltet. <br> 3. Indtast "50 mm" (vent kort). |
| Forventet resultat | 1. "50" og "&&" udløser ikke søgning; prompt vises. <br> 2. "50 mm" udløser søgning fordi der er 2 bogstaver ("mm"). <br> 3. Resultater for "50 mm" matcher sager med "50", "mm" og "rør"-lignende tokens. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Tjek at `hasEnoughSearchLetters` tæller bogstaver, ikke tegn. |

---

### W1 — Highlight af matchende ord/sætninger

#### TC-W1.1: Highlight i søgeresultater
| Felt | Værdi |
|---|---|
| ID | TC-W1.1 |
| Dækker | W1, US-002 / 12 |
| Type | Positiv |
| Forudsætninger | Projektet har en sag med tekst "Jem & Fix". |
| Trin | 1. Gå til Søg-fanen. <br> 2. Indtast "Jem & Fix". |
| Forventet resultat | 1. Resultater vises. <br> 2. "Jem", "&" og "Fix" fremhæves visuelt i titel/beskrivelse. <br> 3. Highlight bryder ikke tekst-layout eller HTML/markup. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at `HighlightedText`-komponenten bruges og ikke indsætter HTML. |

#### TC-W1.2: Highlight i listepunkter
| Felt | Værdi |
|---|---|
| ID | TC-W1.2 |
| Dækker | W1, US-005 / 6 |
| Type | Positiv |
| Forudsætninger | Liste oprettet fra søgningen "Jem & Fix" med kildefelt "Beskrivelse/noter". |
| Trin | 1. Åbn listen. <br> 2. Se punkterne. |
| Forventet resultat | 1. De matchende søgeord fremhæves i hvert listepunkt, hvor de forekommer. <br> 2. "Jem", "&" og "Fix" markeres hver for sig. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test også med æøå og tal i søgestrengen. |

#### TC-W1.3: Highlight af præcis sætning
| Felt | Værdi |
|---|---|
| ID | TC-W1.3 |
| Dækker | W1, US-002 / 12 |
| Type | Positiv |
| Forudsætninger | Projektet har sager med teksten "vand i kælderen" og "vand i køkkenet". |
| Trin | 1. Gå til Søg-fanen. <br> 2. Indtast `"vand i kælderen"`. |
| Forventet resultat | 1. Hele sætningen "vand i kælderen" fremhæves i de sager, der matcher. <br> 2. Sager uden den præcise sætning vises ikke. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at phrase-tokenet ikke splitter ved mellemrum. |

#### TC-W1.4: Highlight med specialtegn og æøå
| Felt | Værdi |
|---|---|
| ID | TC-W1.4 |
| Dækker | W1, S2, US-002 / 12 |
| Type | Positiv |
| Forudsætninger | Projektet har sager med tekst der indeholder æøå og specialtegn. |
| Trin | 1. Søg efter "rødgrød". <br> 2. Søg efter "Jem & Fix". <br> 3. Søg efter "50 mm rør". |
| Forventet resultat | 1. Highlight vises korrekt uden at specialtegn eller æøå ødelægger rendering. <br> 2. Hver token markeres som forventet. <br> 3. Ingen crash eller visuel fejl. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Tjek at highlight er case-insensitiv og normaliserer æøå. |

---

## 3. Regressionstest

Følgende eksisterende funktionalitet skal testes for at sikre, at rettelserne af søgning og lister ikke har introduceret regressionsfejl. Hver testcase angives med fokusområde; detaljerede trin genbruges fra baseline eller tidligere testplaner.

| ID | Område | Hvad der skal testes | Regression |
|---|---|---|---|
| REG-SL.1 | Voice-oprettelse | Opret sag via stemme; verificer at optagelse, auto-gem, titel-udledning og voice-kommandoer stadig fungerer. | Ja |
| REG-SL.2 | Projektoprettelse | Opret nyt projekt; verificer at unikhedstjek, inline fejl og navigation stadig virker. | Ja |
| REG-SL.3 | Board og projektvisning | Skift projekt, pull-to-refresh, scroll; verificer at board viser sager korrekt. | Ja |
| REG-SL.4 | Deling / kopiér / slet i lister | Del liste via share-sheet, kopiér punkt, slet punkt; verificer at kildesager ikke påvirkes utilsigtet. | Ja |
| REG-SL.5 | Kommentarer i items | Opret, send og slet kommentar i en sag; verificer at navigation og Tilbage-knap fungerer. | Ja |
| REG-SL.6 | Foto / album | Opret sag med foto fra album og kamera; verificer upload, OCR, oversættelse og formularens reset. | Ja |
| REG-SL.7 | Manuelle Aktionslister | Opret manuel liste, tilføj punkter, afkryds; verificer at "Aktionslister"-fanen ikke er ødelagt af US-005. | Ja |
| REG-SL.8 | Dyb link | Åbn dyb link til liste og board; verificer at rettighedstjek og navigation stadig virker. | Ja |
| REG-SL.9 | RBAC / rettigheder | Test som editor og viewer; verificer at oprettelse/ændring af lister og punkter håndteres korrekt. | Ja |

---

## 4. Edge cases

### EC-001: Søgning med specialtegn `&`, `/`, `-`, æøå, tal og mellemrum
| Felt | Værdi |
|---|---|
| ID | EC-001 |
| Dækker | S2, W1, US-002 / 5 |
| Forudsætninger | Projektet har sager med tekster: "Jem & Fix", "Silvan/Bauhaus", "50 mm rør", "rødgrød med fløde", "håndværker-tilbud". |
| Trin | 1. Søg efter hver af teksterne ovenfor. <br> 2. Opret liste fra hver søgning. |
| Forventet resultat | 1. Hver søgning returnerer de forventede matches uden at specialtegn fjernes. <br> 2. Listenavn bevarer specialtegn og mellemrum. <br> 3. Highlight viser alle tokens korrekt. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Fokus på `&` som ikke må tolkes som AND-operator. |

### EC-002: 0 resultater
| Felt | Værdi |
|---|---|
| ID | EC-002 |
| Dækker | S1, US-002 / 6, US-005 / 2 |
| Forudsætninger | Projektet har sager, men ingen med teksten "xyzqwerty12345". |
| Trin | 1. Gå til Søg-fanen. <br> 2. Indtast "xyzqwerty12345". |
| Forventet resultat | 1. Der vises en "Ingen resultater"-tilstand. <br> 2. Knappen "Opret liste" er deaktiveret eller skjult. <br> 3. Brugeren kan rydde søgningen. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test at prompten for <2 bogstaver ikke forveksles med 0 resultater. |

### EC-003: Stort antal resultater
| Felt | Værdi |
|---|---|
| ID | EC-003 |
| Dækker | US-002 performance, US-005 / 15 |
| Forudsætninger | Projektet har ≥100 sager der matcher en almindelig søgning (f.eks. "rør"). |
| Trin | 1. Gå til Søg-fanen. <br> 2. Indtast "rør". <br> 3. Mål tid til resultater vises. <br> 4. Opret liste og åbn den. |
| Forventet resultat | 1. Søgeresultater vises inden for acceptabel tid (aftales med PO, foreslået ≤1 sekund). <br> 2. Listen indlæses uden crash. <br> 3. Scroll og sortering er flydende. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Dokumentér antal items og målt tid. Hvis >1 sekund: eskalér til PO før go. |

### EC-004: Offline
| Felt | Værdi |
|---|---|
| ID | EC-004 |
| Dækker | US-005 / 13 (ude af scope men skal håndteres) |
| Forudsætninger | Brugeren har tidligere åbnet appen og hentet items. Netværk er nu fra. |
| Trin | 1. Deaktivér netværk. <br> 2. Gå til Søg-fanen. <br> 3. Indtast en søgning der tidligere gav resultater. <br> 4. Prøv at oprette liste. <br> 5. Prøv at afkrydse et punkt i en eksisterende liste. |
| Forventet resultat | 1. Søgning på cachede items viser resultater (hvis implementeret). <br> 2. Oprettelse af liste viser specifik offline-fejl. <br> 3. Afkrydsning håndteres graceful: enten køet til synk eller specifik fejlmeddelelse. <br> 4. Appen låser ikke. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Offline-synk er eksplicit ude af scope; test fokuserer på graceful degradering. |

### EC-005: Item slettet efter listeoprettelse
| Felt | Værdi |
|---|---|
| ID | EC-005 |
| Dækker | US-005 / 16, design afsnit 2.5 |
| Forudsætninger | Dynamisk liste har et punkt fra en kildesag. |
| Trin | 1. Åbn kildesagen. <br> 2. Slet sagen. <br> 3. Gå tilbage til listen. |
| Forventet resultat | 1. Det tilknyttede listepunkt gråes ud. <br> 2. Der vises note: "Kildesag ikke længere tilgængelig" eller lignende. <br> 3. Punktet fjernes ikke automatisk fra listen. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at sletning af item ikke sletter listepunktet i Firestore, men kun markerer det. |

### EC-006: Afkrydsning uden netværk
| Felt | Værdi |
|---|---|
| ID | EC-006 |
| Dækker | S3, US-005 / 10, offline-degradering |
| Forudsætninger | Bruger er i en dynamisk liste. Netværk deaktiveres. |
| Trin | 1. Deaktivér netværk. <br> 2. Afkryd et listepunkt. <br> 3. Fjern afkrydsningen. <br> 4. Aktivér netværk igen. |
| Forventet resultat | 1. Afkrydsning vises lokalt. <br> 2. Ingen crash eller låsning. <br> 3. Når netværk genoprettes, synkroniseres tilstanden (hvis offline-kø understøttes), eller der vises synk-status/fejl. <br> 4. Kildesagens status påvirkes ikke under offline-perioden. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Hvis offline-kø ikke implementeres, skal appen vise tydelig fejl uden at låse. |

### EC-007: Flere projekter — projektvalg ved oprettelse
| Felt | Værdi |
|---|---|
| ID | EC-007 |
| Dækker | S1, PO-beslutning #3 |
| Forudsætninger | Bruger er medlem af to projekter. Søgning giver resultater i begge projekter. |
| Trin | 1. Søg efter tekst der matcher begge projekter. <br> 2. Tryk "Opret liste". <br> 3. Forsøg at bekræfte uden at vælge projekt. <br> 4. Vælg ét projekt og bekræft. |
| Forventet resultat | 1. Oprettelse uden projektvalg blokeres med fejl: "Vælg et projekt for listen." <br> 2. Efter valg oprettes listen i det valgte projekt. <br> 3. Kun resultater fra det valgte projekt medtages i listen. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at default-projektet er forvalgt. |

### EC-008: Slet punkt fra liste påvirker ikke kildesag
| Felt | Værdi |
|---|---|
| ID | EC-008 |
| Dækker | S3, S4, US-005 / 14 |
| Forudsætninger | Dynamisk liste har et item-reference-punkt. |
| Trin | 1. Åbn listen. <br> 2. Slet et punkt. <br> 3. Gå til Board og åbn kildesagen. |
| Forventet resultat | 1. Punktet fjernes fra listen. <br> 2. Kildesagen og dens checkpoints berøres ikke. <br> 3. Der vises ikke advarsel om sletning af selve sagen. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test både item-reference-punkt og fritekst-punkt. |

---

## 5. Acceptkriterier for hele runden

For at PO kan give GO til at gå videre til QA-verifikation og build skal følgende være opfyldt:

1. **S1 — Listeoprettelse**  
   - TC-S1.1 og TC-S1.2 er "🟢 OK".  
   - TC-S1.3 viser specifik fejlmeddelelse og **aldrig** den generiske tekst "Kunne ikke oprette den dynamiske liste".  
   - Listenavn bevarer specialtegn (testes i TC-S2.1).

2. **S2 — Specialtegn**  
   - TC-S2.1 og TC-S2.2 er "🟢 OK" for `&`, `/`, `-`, tal og æøå.  
   - TC-S2.3 viser fornuftig adskillelse mellem søgning med og uden specialtegn.

3. **S3/S4/S7 — Status-adskillelse**  
   - TC-S3.1, TC-S4.1, TC-S7.1 er "🟢 OK".  
   - TC-S3.2 er "🟢 OK" eller justeret efter endelig PO-beslutning om "alle punkter færdige".  
   - Der findes ingen overordnet liste-status der automatisk spejler item-status.

4. **S5 — Tastatur/scroll**  
   - TC-S5.1 og TC-S5.2 er "🟢 OK" på både iOS og Android.

5. **S6 — Kommentar**  
   - TC-S6.1, TC-S6.2 og TC-S6.3 er "🟢 OK".  
   - "Tilbage"-knap er altid synlig; app låser ikke; kommentar kan sendes/slettes.

6. **S8 — Minimumslængde**  
   - TC-S8.1 og TC-S8.2 er "🟢 OK".  
   - TC-S8.3 viser at kun tal/specialtegn ikke udløser søgning.

7. **W1 — Highlight**  
   - TC-W1.1, TC-W1.2, TC-W1.3 og TC-W1.4 er "🟢 OK".  
   - Highlight vises korrekt i både søgeresultater og listepunkter.

8. **Regression**  
   - Alle REG-SL.1–REG-SL.9 er "🟢 OK" eller "🟡 forbehold" med PO-godkendt afvigelse.  
   - Ingen "🔴 fejler" i regression uden plan for rettelse i samme runde.

9. **Edge cases**  
   - EC-001, EC-002, EC-005, EC-007 og EC-008 er "🟢 OK".  
   - EC-003 og EC-004/EC-006 dokumenteres med forbehold, hvis performance eller offline-håndtering ikke opfylder målet.

---

## 6. Åbne spørgsmål / afhængigheder

| # | Spørgsmål | Hvorfor det er vigtigt | Status |
|---|---|---|---|
| Q-001 | Hvad er maksimalt acceptabelt antal items og søgetid for klient-side søgning? | Påvirker EC-003 og go/no-go. | Afventer PO / QA benchmark. |
| Q-002 | Skal item-status altid sættes til Done når alle checkpoints er Done, eller skal brugeren gøre det manuelt? | Påvirker TC-S3.2. | PO-beslutning B; verificer under test. |
| Q-003 | Skal smart-søgeoperatorer (`*ord*`, `"frase"`, `-ord`, `OR`, filtre) implementeres i én omgang? | Påvirker scope og testdækning. | Design siger alle; verificer under test. |
| Q-004 | Hvordan håndteres migrering af eksisterende manuelle lister med gammel status-model? | Påvirker REG-SL.7. | Lazy migration; test med gamle lister. |

---

## 7. Ændringslog

| Dato | Version | Ændring | Ansvarlig |
|---|---|---|---|
| 2026-07-15 | 1.0 | Oprettet testplan for S1–S8 + W1 med cases, regression, edge cases og acceptkriterier. | Test Manager Agent |
