# Testplan: B+C Redo — US-004, US-005, US-006

**Dokument:** `.claude/team/test/testplan-b-c-redo-004-006.md`  
**Dato:** 2026-07-15  
**Build:** Build 2 (US-004 + US-005) efter PO-godkendelse af design-fase (TASK-B-C-REDO-013)  
**Ansvarlig:** Test Manager Agent  
**Review:** QA Agent + Master Agent  

---

## Formål

Denne testplan dækker alle Gherkin-acceptkriterier i US-004 (voice/create), US-005 (dynamiske lister/søgeportal) og US-006 (projektoprettelse og dubletter), samt regressionstest af baseline-funktionalitet, der berøres af de tre US'er.

Planen er designet til både **QA-verifikation** i simulator/dev-client og **PO acceptance test** på fysiske enheder.

---

## Sådan læses planen

| Kolonne | Betydning |
|---|---|
| **ID** | Unikt testcase-id til reference og regressionssporing. |
| **US / Kriterie** | Hvilken user story og acceptkriterie(r) testcasen dækker. |
| **Område** | Funktionsområde til nem sortering. |
| **Regression** | `Ja` hvis casen skal genkøres ved større ændringer på kritisk funktionalitet. |
| **Forudsætninger** | Data, tilladelser og tilstand, der skal være på plads før test. |
| **Trin** | Nummererede handlinger. |
| **Forventet resultat** | Præcis succes-kriterie. |
| **Faktisk resultat** | Udfyldes under test. |
| **Status** | `🟢` OK / `🟡` forbehold / `🔴` fejler / `⚪` ikke testet. |
| **Bemærkninger** | Logs, enhed, edge cases, links til screenshots. |

---

## Testmiljø og data

### Krævede miljøer
1. **iOS-simulator / Android-emulator** med dev-build og Metro.  
2. **Fysisk iPhone** med EAS dev-build.  
3. **Fysisk Android-enhed** med EAS dev-build (valgfrit, men ønsket før PO-go).  
4. **Firebase Emulator eller staging-projekt** med testdata, så Firestore-regler kan testes uden at påvirke produktion.  

### Testdata der skal være tilgængelige
- To separate anonyme testbrugere (`User A`, `User B`).  
- Et projekt ejet af `User A` med navnet **"Renovering"**.  
- Et projekt delt med `User A` men ejet af `User B` — også gerne navngivet **"Renovering"** for at teste dublet-scope.  
- Et projekt med 10–15 sager af forskellige typer (`idé`, `observation`, `fejl`, `notat`, `foto`, `stemme`, `andet`) og kategorier.  
- Et projekt med to eksisterende projekter med identisk navn (for at simulere pre-fix dubletter).  
- Et billede med genkendelig tekst til OCR-tests.  
- App-tilladelser: mikrofon, kamera, fotobibliotek, notifikationer.  

---

## US-006 — Projektoprettelse

### Oversigt
| # | Case | Fokus | Regression |
|---|---|---|---|
| 1 | Gyldig unik oprettelse | Success flow | Ja |
| 2 | Faktisk Firestore-fejl | Fejlhåndtering | Ja |
| 3 | Gentagne klik | Idempotens | Ja |
| 4 | Annuller efter fejl | Ingen dubletter | Ja |
| 5–7 | Dublet-tjek (navn, casing, spaces) | Validering | Ja |
| 8 | Anden brugers projekt med samme navn | Scope af dublet-tjek | Ja |
| 9 | Eksisterende dubletter | Adfærd ved 2+ dubletter | Ja |
| 10 | Tomt navn | Validering | Nej |
| 11 | Inline fejl, ikke Alert | UX | Nej |

### TC-006.1: Gyldig unik projektoprettelse
| Felt | Værdi |
|---|---|
| ID | TC-006.1 |
| US / Kriterie | US-006 / 1 |
| Område | Projektoprettelse |
| Regression | Ja |
| Forudsætninger | Bruger er logget ind. Ingen projekter med navnet "Testprojekt Alpha" findes i ejerens liste. |
| Trin | 1. Gå til Projekter-fanen. <br> 2. Tryk "+ Nyt". <br> 3. Indtast navn: "Testprojekt Alpha". <br> 4. Indtast beskrivelse: "Beskrivelse til test". <br> 5. Tryk "Opret". |
| Forventet resultat | 1. Ingen fejlmeddelelse vises. <br> 2. "Opret"-knappen viser spinner mens oprettelse kører. <br> 3. Dialogen lukker. <br> 4. Det nye projekt sættes som aktivt. <br> 5. Brugeren navigeres til Board. <br> 6. Projektet vises i Projekter-listen med korrekt navn og beskrivelse. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer i Firestore at `projects/{id}` og `projects/{id}/members/{ownerId}` begge er oprettet. |

### TC-006.2: Faktisk Firestore-fejl (netværk / tilladelse)
| Felt | Værdi |
|---|---|
| ID | TC-006.2 |
| US / Kriterie | US-006 / 2 |
| Område | Projektoprettelse |
| Regression | Ja |
| Forudsætninger | Firebase Emulator eller staging er konfigureret til at afvise `projects/{id}/members/{memberId}`-oprettelse, ELLER netværksforbindelsen er deaktiveret. |
| Trin | 1. Gå til Projekter-fanen. <br> 2. Tryk "+ Nyt". <br> 3. Indtast unikt navn: "Netværksfejl Test". <br> 4. Tryk "Opret". |
| Forventet resultat | 1. Inline fejlmeddelelse vises under navn-feltet: "Kunne ikke oprette projektet. Prøv igen." <br> 2. Ingen `projects/{id}`-dokument oprettes i Firestore (batch/transaction rollback). <br> 3. Dialogen forbliver åben. <br> 4. "Opret"-knappen kan trykkes igen efter fejlen. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test både med medlems-regel-afvisning og med flytilstand. Verificer at der ikke opstår delvist oprettede projekter. |

### TC-006.3: Gentagne klik på "Opret" — idempotens
| Felt | Værdi |
|---|---|
| ID | TC-006.3 |
| US / Kriterie | US-006 / 1, 3 (implicit) |
| Område | Projektoprettelse |
| Regression | Ja |
| Forudsætninger | Normal netværksforbindelse. Bruger har ingen projekter med navnet "Idempotens Test". |
| Trin | 1. Åbn "Nyt projekt"-dialogen. <br> 2. Indtast navn: "Idempotens Test". <br> 3. Tryk "Opret" to gange så hurtigt som muligt. |
| Forventet resultat | 1. Kun ét projekt med navnet "Idempotens Test" oprettes. <br> 2. "Opret"-knappen er disabled under oprettelse. <br> 3. Brugeren navigeres til Board. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Søg efter duplikerede `projects/{id}`-dokumenter med samme `ownerId` og normaliseret navn. |

### TC-006.4: Annuller efter fejlmeddelelse
| Felt | Værdi |
|---|---|
| ID | TC-006.4 |
| US / Kriterie | US-006 / 3 |
| Område | Projektoprettelse |
| Regression | Ja |
| Forudsætninger | TC-006.2 er opsat så oprettelse fejler. Bruger har ingen projekter med navnet "Annuller Test". |
| Trin | 1. Åbn "Nyt projekt". <br> 2. Indtast navn: "Annuller Test". <br> 3. Tryk "Opret" og få fejlmeddelelse. <br> 4. Tryk "Annuller". |
| Forventet resultat | 1. Dialogen lukker. <br> 2. Der findes højst ét projekt med navnet "Annuller Test" for brugeren (helst nul, da oprettelse fejlede). |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer i Firestore at intet delvist dokument ligger tilbage. |

### TC-006.5: Dublet-tjek — samme navn
| Felt | Værdi |
|---|---|
| ID | TC-006.5 |
| US / Kriterie | US-006 / 4 |
| Område | Projektoprettelse |
| Regression | Ja |
| Forudsætninger | Bruger ejer allerede et projekt med navnet "Renovering". |
| Trin | 1. Åbn "Nyt projekt". <br> 2. Indtast navn: "Renovering". <br> 3. Tryk "Opret". |
| Forventet resultat | 1. Oprettelse blokeres. <br> 2. Inline fejl vises: "Der findes allerede et projekt med dette navn." <br> 3. Ingen nyt projekt oprettes. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-006.6: Dublet-tjek — forskellig casing
| Felt | Værdi |
|---|---|
| ID | TC-006.6 |
| US / Kriterie | US-006 / 5 |
| Område | Projektoprettelse |
| Regression | Ja |
| Forudsætninger | Bruger ejer allerede "Renovering". |
| Trin | 1. Åbn "Nyt projekt". <br> 2. Indtast navn: "RENovering". <br> 3. Tryk "Opret". |
| Forventet resultat | 1. Oprettelse blokeres. <br> 2. Inline fejl: "Der findes allerede et projekt med dette navn." <br> 3. Ingen nyt projekt oprettes. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Gentag med "renovering" og "ReNoVaTiNg". |

### TC-006.7: Dublet-tjek — leading/trailing spaces
| Felt | Værdi |
|---|---|
| ID | TC-006.7 |
| US / Kriterie | US-006 / 5 |
| Område | Projektoprettelse |
| Regression | Ja |
| Forudsætninger | Bruger ejer allerede "Renovering". |
| Trin | 1. Åbn "Nyt projekt". <br> 2. Indtast navn: "  renovering  ". <br> 3. Tryk "Opret". |
| Forventet resultat | 1. Oprettelse blokeres. <br> 2. Inline fejl: "Der findes allerede et projekt med dette navn." <br> 3. Ingen nyt projekt oprettes. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at navnet trimmes i både input og sammenligning, men at det oprindelige whitespace ikke gemmes som projektnavn. |

### TC-006.8: Anden brugers projekt med samme navn tillades
| Felt | Værdi |
|---|---|
| ID | TC-006.8 |
| US / Kriterie | US-006 / 6 |
| Område | Projektoprettelse |
| Regression | Ja |
| Forudsætninger | `User A` ejer projekt "Renovering". `User B` ejer også et projekt "Renovering". `User A` er medlem af `User B`s projekt (eller omvendt). |
| Trin | 1. Log ind som `User A`. <br> 2. Åbn "Nyt projekt". <br> 3. Indtast navn: "Renovering". <br> 4. Tryk "Opret". |
| Forventet resultat | 1. Oprettelse lykkes — fordi `User A` allerede ejer ét projekt med navnet, skulle denne blokere. <br> 2. For at teste scope korrekt: slet `User A`s eget "Renovering" før test, behold `User A`s medlemskab af `User B`s "Renovering". <br> 3. Opret derefter nyt "Renovering" — det skal nu lykkes. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | To trin: først verificer at eget dublet blokerer, derefter verificer at anden brugers projekt ikke blokerer. |

### TC-006.9: Eksisterende dubletter — blokering af tredje projekt
| Felt | Værdi |
|---|---|
| ID | TC-006.9 |
| US / Kriterie | US-006 / 7 |
| Område | Projektoprettelse |
| Regression | Ja |
| Forudsætninger | Bruger har to eksisterende projekter med navnet "Gammel Dublet" (pre-fix data). |
| Trin | 1. Åbn "Nyt projekt". <br> 2. Indtast navn: "Gammel Dublet". <br> 3. Tryk "Opret". |
| Forventet resultat | 1. Oprettelse blokeres. <br> 2. Inline fejl: "Der findes allerede et projekt med dette navn." <br> 3. Oprettes intet tredje projekt med navnet. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Bruger skal omdøbe/slette én af de eksisterende dubletter før ny oprettelse med samme navn kan lykkes. |

### TC-006.10: Tomt projektnavn
| Felt | Værdi |
|---|---|
| ID | TC-006.10 |
| US / Kriterie | US-006 / 1 (implicit) |
| Område | Projektoprettelse |
| Regression | Nej |
| Forudsætninger | Bruger er logget ind. |
| Trin | 1. Åbn "Nyt projekt". <br> 2. Lad navn-feltet være tomt eller kun whitespace. <br> 3. Tryk "Opret". |
| Forventet resultat | 1. Oprettelse blokeres. <br> 2. Inline fejl: "Projektnavn er påkrævet." <br> 3. "Opret"-knappen er disabled. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-006.11: Inline fejl fremfor Alert
| Felt | Værdi |
|---|---|
| ID | TC-006.11 |
| US / Kriterie | US-006 / 1, 2, 3, 4, 5 |
| Område | Projektoprettelse |
| Regression | Nej |
| Forudsætninger | Alle validerings- og fejlsituationer fra TC-006.1–006.10. |
| Trin | 1. Gennemfør TC-006.2, TC-006.5, TC-006.10. |
| Forventet resultat | 1. Ingen `Alert.alert(...)` med titlen "Fejl" vises for projektoprettelse. <br> 2. Alle fejl vises inline under navn-feltet. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Søg kodebasen for `Alert.alert("Fejl", "Kunne ikke oprette projektet.")` og verificer at det er fjernet. |

---

## US-004 — Voice / Create Item

### Oversigt
| # | Case | Fokus | Regression |
|---|---|---|---|
| 1 | Auto-gem efter 5s stilhed | Success flow | Ja |
| 2 | Auto-gem slået fra | Konfiguration | Ja |
| 3 | Kontinuerlig tale | Optagelsesrobusthed | Ja |
| 4 | Kort OS-timeout | Genoptagelse | Ja |
| 5 | Lang OS-timeout | Brugerfeedback | Ja |
| 6 | Ensartede felter og rækkefølge | UI-konsistens | Ja |
| 7 | Formularen resettes | State | Ja |
| 8–10 | AI-forslag Type/Kategori + override | AI | Ja |
| 11–13 | Stemmekommandoer | Voice parsing | Ja |
| 14–15 | Titel auto-udledes + validering | Validering | Ja |
| 16 | Levende timer | UX | Nej |
| 17 | Tegnsætning | Voice parsing | Nej |
| 18 | Type sættes til Foto | Foto-flow | Ja |
| 19–20 | Regression manuel/voice | Regression | Ja |

### TC-004.1: Auto-gem efter 5 sekunders stilhed
| Felt | Værdi |
|---|---|
| ID | TC-004.1 |
| US / Kriterie | US-004 / 1 |
| Område | Stemmeoptagelse |
| Regression | Ja |
| Forudsætninger | App har mikrofontilladelse. Bruger er på Board. Auto-gem er slået til (default). |
| Trin | 1. Tryk "🎤 Optag". <br> 2. Sig: "Observationsnote fra byggepladsen." <br> 3. Vent 5 sekunder uden at tale. |
| Forventet resultat | 1. Optagelsen stopper automatisk efter 5 sekunders stilhed. <br> 2. Sagen gemmes. <br> 3. Modalen forbliver åben med nulstillet formulær. <br> 4. Den gemte sag vises i Board. |
| Faktisk resultat | | Efter indtalese af beskeden og stilhed i 5 sek. stopper optagelsen og en ny optalese er klar (Annuller er aktiv og Gen er blået ud) Herefter kan man indtale en ny besked. Man skal trykke annuller for at komme ud af indtal vinduet hvilket virker forkert. Efter at have trykket Annuller kommer man tilbage til Board. de 2 oprettede sager.Øverst for den første sag står der Obersavation i en lilla boks og ved siden af Andet i alm tekst. Under den lillae boks står der Ob med store bogstaver med fed skrift. Nedeunder står der fra byggeplads. Når man trykker på sagen står der Obersavation i en grå boks og under den lillae boks står der Ob med store bogstaver med fed skrift. Under OB står der Kategori : Andet. I boksen under der står der fra byggeplads. Mine observationer: Det virker ikke som AI kan sætte korrekt tekst. Obersavation i Lilla boks i Board er fint nok men at der står andet ved siden af i alm. skrift og nedenunder Ob i fed skrift giver ingen mening. Jeg havde forventet en boks men Obersavation(Ok her) en overskrift med "Obersavationsnote fra byggepladsen. Efter de 5 sek. skal beskeden gemmes automatisk (hvad den gør men man ved det ikke og med nuværende design vil man opfatte det som noget gik galt og man skal gentage optagelsen) Der kunne være en kort popup med optagelsen er gemt. En knap der giver muligheden for at kunne komme tilbage  Der bør være en besked om at i dette vindue er det en ny optagelse som fx kunne stå i parentes ved siden af Optag (Ny) eller ligende løsning. Hvis man gentager samme optagelse bliver begge accepteret selv om det var en regl at der ikke må være identiske sager. Der er ingen steder nævnt noget om det er en "note"
| Status | ⚪ | Not Passed.
| Bemærkninger | Tjek at timeren nulstilles ved hvert nyt resultat-event. |

### TC-004.2: Auto-gem slået fra
| Felt | Værdi |
|---|---|
| ID | TC-004.2 |
| US / Kriterie | US-004 / 2 |
| Område | Stemmeoptagelse |
| Regression | Ja |
| Forudsætninger | App har mikrofontilladelse. Auto-gem toggle findes. |
| Trin | 1. Åbn "Optag". <br> 2. Slå auto-gem fra. <br> 3. Start optagelse. <br> 4. Sig en sætning og vent 10 sekunder uden at tale. |
| Forventet resultat | 1. Optagelsen fortsætter efter 5 sekunder. <br> 2. Ingen auto-gem sker. <br> 3. Brugeren kan aktivt stoppe og gemme. |
| Faktisk resultat | | Optagelsen fortsætter efter 5 sek. Ingen auto-gem. Samme udfordring med teksten som forig testcase.
| Status | ⚪ | Not Passed
| Bemærkninger | |

### TC-004.3: Kontinuerlig tale stopper ikke optagelsen
| Felt | Værdi |
|---|---|
| ID | TC-004.3 |
| US / Kriterie | US-004 / 3 |
| Område | Stemmeoptagelse |
| Regression | Ja |
| Forudsætninger | App har mikrofontilladelse. |
| Trin | 1. Start optagelse. <br> 2. Tal kontinuerligt i 20–30 sekunder med korte pauser under 5 sekunder. |
| Forventet resultat | 1. Optagelsen stopper ikke af sig selv under aktiv indtaling. <br> 2. Tekst tilføjes løbende. |
| Faktisk resultat | | Denne testcase er Passed
| Status | ⚪ |
| Bemærkninger | Test både i støjfri og let støjende miljø. | Fejl: Auto-Gem er ikke defaul slået til men starter i samme state som sidste optagelse 

### TC-004.4: Kort OS-timeout genoptages automatisk
| Felt | Værdi |
|---|---|
| ID | TC-004.4 |
| US / Kriterie | US-004 / 16 |
| Område | Stemmeoptagelse |
| Regression | Ja |
| Forudsætninger | App har mikrofontilladelse. |
| Trin | 1. Start optagelse. <br> 2. Under optagelse: skift kortvarigt app (f.eks. swipe til hjemmeskærm i under 2 sekunder) eller simuler kort afbrydelse. <br> 3. Returnér til appen. |
| Forventet resultat | 1. Optagelsen genstartes automatisk. <br> 2. Tidligere transcript bevares. <br> 3. Brugeren kan fortsætte indtaling. |
| Faktisk resultat | | Det har ikke været muligt at kunne komme væk i en ny app og tilbage på under 2 sek. Hvis jeg swiper så jeg har 2 vinduer og swiper tilbage til sagen kan jeg fortsætte optagelsen. Ved forsøg(mere end 2 sek.) og få beskeden "Optagelsen afbrudt) og valget mellem Start ny optagelse, Gem, Luk. Ved valg af ny optagelse er teksten bevaret hvilket er godt så man kan huske hvad der tidligere var sagt inden afbrydelsen. Når man taler igen slettes den gamle tekst og den starter
| Status | ⚪ |
| Bemærkninger | Kan være svær at trigge reproducerbart; dokumentér platform og OS-version. | Hvis jeg under optagelsen sige "opret" gemmes sagen. Hvis jeg siger Gem, gemmes sagen men den skriver også gem i Indhold hvilket er en fejl.

### TC-004.5: Lang OS-timeout informerer brugeren
| Felt | Værdi |
|---|---|
| ID | TC-004.5 |
| US / Kriterie | US-004 / 17 |
| Område | Stemmeoptagelse |
| Regression | Ja |
| Forudsætninger | App har mikrofontilladelse. |
| Trin | 1. Start optagelse. <br> 2. Forlad appen i 5+ sekunder (eller simuler lang afbrydelse). <br> 3. Returnér til appen. |
| Forventet resultat | 1. En besked vises: "Optagelsen blev afbrudt. Vil du fortsætte, hvor du slap?" <br> 2. Brugeren kan vælge "Fortsæt" (ny optagelse, gammelt transcript bevaret) eller "Gem" (gem nuværende). |
| Faktisk resultat | |Passed
| Status | ⚪ |
| Bemærkninger | |

### TC-004.6: Ensartede felter og rækkefølge
| Felt | Værdi |
|---|---|
| ID | TC-004.6 |
| US / Kriterie | US-004 / 5, 6 |
| Område | Oprettelsesmodal |
| Regression | Ja |
| Forudsætninger | Bruger er på Board. |
| Trin | 1. Tryk "🎤 Optag" og notér felter og rækkefølge. <br> 2. Luk modal. <br> 3. Tryk "+ Tilføj" og notér felter og rækkefølge. |
| Forventet resultat | 1. Begge modalen viser de samme felte felter i samme rækkefølge: Type-vælger, Tekst/beskrivelse, Titel, Kategori, Foto, OCR-oversættelse (kun ved foto), Ansvarlig (kun hvis rettigheder/medlemmer), Handlinger. <br> 2. Kun "Optag" viser optageknap, auto-gem toggle og hjælpetekst. |
| Faktisk resultat | | Kan ikke forstå testcasen. Skal omskrives.
| Status | ⚪ |
| Bemærkninger | Tag screenshots og sammenlign. |

### TC-004.7: Formularen resettes ved åbning
| Felt | Værdi |
|---|---|
| ID | TC-004.7 |
| US / Kriterie | US-004 / 7 |
| Område | Oprettelsesmodal |
| Regression | Ja |
| Forudsætninger | Bruger har lige oprettet en sag med tekst, foto, kategori og type. |
| Trin | 1. Åbn "Optag". <br> 2. Luk uden at gemme. <br> 3. Åbn "+ Tilføj". <br> 4. Luk uden at gemme. <br> 5. Åbn "Optag" igen. |
| Forventet resultat | 1. Begge modalen åbner med tomme felter: Type = default, Tekst = "", Titel = "", Kategori = "", Foto = ingen, OCR = skjult, Ansvarlig = "Ingen". |
| Faktisk resultat | | Kan ikke test. Testcase er uklar. Det er ikke en option at "lukke" Det er Annuller eller Gem. Testcase skal beriges.
| Status | ⚪ |
| Bemærkninger | Test specifikt at tidligere foto/OCR-tekst ikke ligger tilbage. |

### TC-004.8: AI-forslag til Type
| Felt | Værdi |
|---|---|
| ID | TC-004.8 |
| US / Kriterie | US-004 / 9 |
| Område | AI / Type |
| Regression | Ja |
| Forudsætninger | Bruger er på Board. |
| Trin | 1. Åbn "+ Tilføj". <br> 2. Indtast tekst: "Knappen virker ikke, app crasher." |
| Forventet resultat | 1. Type-vælgeren viser "Fejl" som AI-forslag (visuel indikation). <br> 2. Brugeren kan vælge en anden type. |
| Faktisk resultat | | Blå knap med Idé er aktiv.Tittel er K  Indhold viser teksten der blev indtastet   Kategroi er Idé
| Status | ⚪ | Not Passed
| Bemærkninger | Test også med "Jeg har en idé til ..." → Type = Idé. |

### TC-004.9: AI-forslag til Kategori
| Felt | Værdi |
|---|---|
| ID | TC-004.9 |
| US / Kriterie | US-004 / 9 |
| Område | AI / Kategori |
| Regression | Ja |
| Forudsætninger | Bruger er på Board. Projektet har eksisterende kategorier. |
| Trin | 1. Åbn "+ Tilføj". <br> 2. Indtast tekst: "Silvan har ikke varen på lager." |
| Forventet resultat | 1. Kategori-feltet foreslår "Silvan" eller lignende. <br> 2. Forslag markeres visuelt som AI-forslag. |
| Faktisk resultat | | Ide i grå boks.   Kategori Ide  Tittel S   
| Status | ⚪ | Not Passed
| Bemærkninger | Test at projekt-historik fylder dropdown med eksisterende kategorier. |

### TC-004.10: Bruger kan overskrive AI-forslag
| Felt | Værdi |
|---|---|
| ID | TC-004.10 |
| US / Kriterie | US-004 / 9 |
| Område | AI / Type / Kategori |
| Regression | Ja |
| Forudsætninger | AI har foreslået Type og Kategori. |
| Trin | 1. Åbn "+ Tilføj". <br> 2. Indtast tekst der foreslår "Fejl" / "Bug". <br> 3. Vælg manuelt Type = "Idé". <br> 4. Indtast manuelt Kategori = "Andet". <br> 5. Gem. |
| Forventet resultat | 1. Sagen gemmes med Type = "Idé" og Kategori = "Andet". <br> 2. AI-forslag vises ikke længere som valgt. |
| Faktisk resultat | | Ved valg af + Tilføj virker AI ikke ved oprettelse og gen. Ved oprettelse kommer AI med noget tekst i Tittel men det virker den blot tager starten af sætningen med en begrænset antal karakter
| Status | ⚪ | Not Passed
| Bemærkninger | Verificer i Firestore at `type` og `category` stemmer overens med brugerens valg. |

### TC-004.11: Stemmekommando — gem
| Felt | Værdi |
|---|---|
| ID | TC-004.11 |
| US / Kriterie | US-004 / 11 |
| Område | Stemmekommandoer |
| Regression | Ja |
| Forudsætninger | App har mikrofontilladelse. |
| Trin | 1. Åbn "Optag". <br> 2. Start optagelse. <br> 3. Sig: "Dette er en testnote punktum gem." |
| Forventet resultat | 1. Optagelsen stopper. <br> 2. Sagen gemmes. <br> 3. Modalen lukker. <br> 4. Sagen vises i Board med tekst "Dette er en testnote." |
| Faktisk resultat | | teknikken virkede med tekst er forkert/mangelfuldt.  Type: Andet i grå boks   Tittel: Dette  Indhold : Gem  Kategori : Andet
| Status | ⚪ |Not passed
| Bemærkninger | Test også synonymer: "opret", "færdig", "ferdig". |

### TC-004.12: Stemmekommando — slet alt
| Felt | Værdi |
|---|---|
| ID | TC-004.12 |
| US / Kriterie | US-004 / 12 |
| Område | Stemmekommandoer |
| Regression | Ja |
| Forudsætninger | App har mikrofontilladelse. |
| Trin | 1. Åbn "Optag". <br> 2. Start optagelse. <br> 3. Sig: "Første linje. Anden linje." <br> 4. Sig: "Slet alt." <br> 5. Tryk på evt. "Kopiér original"-knap. |
| Forventet resultat | 1. Tekstfeltet ryddes. <br> 2. Original tekst gemmes og kan kopieres/deles. <br> 3. Brugeren kan fortsætte optagelse eller gemme tomt (hvis foto ikke er tilknyttet, skal "Gem" være disabled). |
| Faktisk resultat | | Kommando "slet alt" virker. Kopiér virker ikke når alt tekst er slettet.
| Status | ⚪ | Not Passed
| Bemærkninger | |

### TC-004.13: Stemmekommando — kategori
| Felt | Værdi |
|---|---|
| ID | TC-004.13 |
| US / Kriterie | US-004 / 13, 14 |
| Område | Stemmekommandoer |
| Regression | Ja |
| Forudsætninger | App har mikrofontilladelse. |
| Trin | 1. Åbn "Optag". <br> 2. Start optagelse. <br> 3. Sig: "Silvan punktum varen er udsolgt." |
| Forventet resultat | 1. Kategori sættes til "Silvan". <br> 2. Ordet "Silvan" fjernes fra tekstfeltet. <br> 3. Tekstfeltet viser "varen er udsolgt." |
| Faktisk resultat | | Type
| Status | ⚪ |Viser Type: Begge Passed
| Bemærkninger | Test også kategori + type: "Fejl punktum knappen virker ikke." → Type = Fejl, Kategori = Fejl. |

### TC-004.14: Titel auto-udledes
| Felt | Værdi |
|---|---|
| ID | TC-004.14 |
| US / Kriterie | US-004 / 10 |
| Område | Oprettelsesmodal |
| Regression | Ja |
| Forudsætninger | Bruger er på Board. |
| Trin | 1. Åbn "+ Tilføj". <br> 2. Indtast tekst: "Dette er en lang beskrivelse af en observationsnote fra i går." <br> 3. Gem. |
| Forventet resultat | 1. Titlen auto-udledes fra første linje / første 6 ord. <br> 2. Sagen gemmes med både titel og tekst. |
| Faktisk resultat | | Idé i blå knap   Tittel D   Indhold = indtastet tekst.  kategiri Idé
| Status | ⚪ | Not Passed
| Bemærkninger | Verificer at titel kan redigeres eksplicit uden at miste tekst. |

### TC-004.15: Gem kun hvis tekst eller foto er udfyldt
| Felt | Værdi |
|---|---|
| ID | TC-004.15 |
| US / Kriterie | US-004 / 10 |
| Område | Validering |
| Regression | Ja |
| Forudsætninger | Bruger er på Board. |
| Trin | 1. Åbn "+ Tilføj". <br> 2. Lad alle felter være tomme. <br> 3. Se "Gem"-knappen. <br> 4. Indtast tekst. <br> 5. Slet tekst igen og tilføj foto. |
| Forventet resultat | 1. "Gem" er disabled når både tekst og foto er tomme. <br> 2. "Gem" aktiveres ved tekst. <br> 3. "Gem" aktiveres ved foto. |
| Faktisk resultat | | 
| Status | ⚪ | Passed
| Bemærkninger | |

### TC-004.16: Levende timer
| Felt | Værdi |
|---|---|
| ID | TC-004.16 |
| US / Kriterie | US-004 / 15 |
| Område | Stemmeoptagelse |
| Regression | Nej |
| Forudsætninger | App har mikrofontilladelse. |
| Trin | 1. Åbn "Optag". <br> 2. Start optagelse. <br> 3. Hold øje med timeren. <br> 4. Fortsæt optagelse i 45+ sekunder. |
| Forventet resultat | 1. Timeren vises som `00:23` og tæller op. <br> 2. Ved 45 sekunder skiftes farve til advarsel (orange). |
| Faktisk resultat | | Not Passed
| Status | ⚪ | Timer fortsætter med rød tekst efter 45 sek.
| Bemærkninger | |

### TC-004.17: Tegnsætning og formatering
| Felt | Værdi |
|---|---|
| ID | TC-004.17 |
| US / Kriterie | US-004 / 11, 13 (implicit) |
| Område | Stemmekommandoer |
| Regression | Nej |
| Forudsætninger | App har mikrofontilladelse. |
| Trin | 1. Start optagelse. <br> 2. Sig: "Hej komma dette er en test punktum ny linje anden linje." |
| Forventet resultat | 1. Tekstfeltet viser "Hej, dette er en test.\nanden linje" (eller tilsvarende). |
| Faktisk resultat | | viser Type : Andet i grå knap   Tittel Hej   Indhold: dette er en test. På næste linje står: Anden linje Kategori Andet
| Status | ⚪ |Not Passed
| Bemærkninger | Test også "slet sidste ord" og "fortryd". |

### TC-004.18: Type sættes automatisk til Foto ved foto
| Felt | Værdi |
|---|---|
| ID | TC-004.18 |
| US / Kriterie | US-004 / 8 (implicit) |
| Område | Foto / Type |
| Regression | Ja |
| Forudsætninger | Bruger er på Board. |
| Trin | 1. Åbn "+ Tilføj". <br> 2. Vælg Type = "Idé". <br> 3. Tryk "Album" og vælg et billede. |
| Forventet resultat | 1. Type ændres automatisk til "Foto" medmindre brugeren aktivt har låst et andet valg. <br> 2. Design siger: "medmindre brugeren allerede har valgt noget andet aktivt" — verificer præcis adfærd. |
| Faktisk resultat | |
| Status | ⚪ | Passed
| Bemærkninger | Åbent spørgsmål: Skal foto altid tvinge Type = Foto, eller kun når Type stadig er default/AI-forslag? Dokumentér faktisk resultat. |

### TC-004.19: Manuel oprettelse bevarer samme felter og data
| Felt | Værdi |
|---|---|
| ID | TC-004.19 |
| US / Kriterie | US-004 / 6, 8 |
| Område | Manuel oprettelse |
| Regression | Ja |
| Forudsætninger | Bruger er på Board. |
| Trin | 1. Åbn "+ Tilføj". <br> 2. Vælg Type = "Observation". <br> 3. Indtast tekst og titel. <br> 4. Vælg Kategori = "Byggeplads". <br> 5. Tilknyt foto. <br> 6. Vælg Ansvarlig. <br> 7. Gem. |
| Forventet resultat | 1. Sagen vises i Board med korrekt type-badge, titel, kategori, foto, ansvarlig. <br> 2. Item-detalje viser alle felter korrekt. |
| Faktisk resultat | | Kan ikke manuelt rette tittel og Kategori. Feltet tvinger teksten til System teksten
| Status | ⚪ |Not Passed
| Bemærkninger | |

### TC-004.20: Voice-oprettelse bevarer samme felter og data
| Felt | Værdi |
|---|---|
| ID | TC-004.20 |
| US / Kriterie | US-004 / 6, 8 |
| Område | Voice-oprettelse |
| Regression | Ja |
| Forudsætninger | App har mikrofontilladelse. |
| Trin | 1. Åbn "Optag". <br> 2. Start optagelse. <br> 3. Sig: "Fejl punktum Vandrør utæt." <br> 4. Tilknyt foto. <br> 5. Sig: "gem". |
| Forventet resultat | 1. Sagen vises i Board med type-badge "Fejl", titel, tekst, kategori, foto. <br> 2. Item-detalje viser alle felter korrekt. |
| Faktisk resultat | | 1-4 ok   5. ikke muligt. Type er Foto og ikke Fejl. Efter tilknytning af billede forsvinder Teksten i feltet  beskrivelse
| Status | ⚪ | Not Passed
| Bemærkninger | |

---

## US-005 — Dynamiske lister og søgeportal

### Oversigt
| # | Case | Fokus | Regression |
|---|---|---|---|
| 1–6 | Søgning (substring, smart syntaks) | Søgemotor | Ja |
| 7–8 | Opret liste fra søgning + felter | Listecreation | Ja |
| 9–11 | Punkter, strenge/semantiske dubletter | Deduplikering | Ja |
| 12–15 | Sortering | Visning | Ja |
| 16–18 | Afkrydsning + status-synk | State | Ja |
| 19–20 | Dynamisk opdatering | Synk | Ja |
| 21–22 | Portal | Navigation | Ja |
| 23–25 | Redigering, sletning, egne punkter | CRUD | Ja |
| 26–28 | Deling, dyb link | Deling | Ja |

### TC-005.1: Substring/fuzzy-søgning som standard
| Felt | Værdi |
|---|---|
| ID | TC-005.1 |
| US / Kriterie | US-005 / 1 (implicit), PO-beslutning 1 |
| Område | Søgning |
| Regression | Ja |
| Forudsætninger | Projektet har sager med titel/beskrivelse: "Vandkande", "vandslange", "koldt vand", "Silvan". |
| Trin | 1. Gå til Søg-fanen. <br> 2. Indtast "vand". |
| Forventet resultat | 1. Resultaterne inkluderer "Vandkande", "vandslange" og "koldt vand". <br> 2. "Silvan" vises ikke. <br> 3. Søgning er case-insensitiv og normaliserer æøå. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Sørg for at gammel `*vand*`-adfærd (kun hele ord) er erstattet. |

### TC-005.2: Smart syntaks — `*ord*`
| Felt | Værdi |
|---|---|
| ID | TC-005.2 |
| US / Kriterie | US-005 / 1 (implicit) |
| Område | Søgning |
| Regression | Nej |
| Forudsætninger | Projektet har sager med ordet "vand" som helt ord og "vandkande". |
| Trin | 1. Gå til Søg. <br> 2. Indtast "*vand*". |
| Forventet resultat | 1. Kun sager hvor det normaliserede ord "vand" optræder som helt ord matches. <br> 2. "Vandkande" matches ikke. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.3: Smart syntaks — `"frase"`
| Felt | Værdi |
|---|---|
| ID | TC-005.3 |
| US / Kriterie | US-005 / 1 (implicit) |
| Område | Søgning |
| Regression | Nej |
| Forudsætninger | Projektet har sager med teksten "koldt vand" og "vand er koldt". |
| Trin | 1. Gå til Søg. <br> 2. Indtast `"koldt vand"`. |
| Forventet resultat | 1. Kun sager med eksakt substring "koldt vand" matches. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.4: Smart syntaks — `-negation`
| Felt | Værdi |
|---|---|
| ID | TC-005.4 |
| US / Kriterie | US-005 / 1 (implicit) |
| Område | Søgning |
| Regression | Nej |
| Forudsætninger | Projektet har sager med "vand" og "kande". |
| Trin | 1. Gå til Søg. <br> 2. Indtast "vand -kande". |
| Forventet resultat | 1. Resultaterne indeholder "vand" men ikke "kande". |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.5: Smart syntaks — `OR`
| Felt | Værdi |
|---|---|
| ID | TC-005.5 |
| US / Kriterie | US-005 / 1 (implicit) |
| Område | Søgning |
| Regression | Nej |
| Forudsætninger | Projektet har sager med "vand" og "flaske" men ikke begge dele i samme sag. |
| Trin | 1. Gå til Søg. <br> 2. Indtast "vand OR flaske". |
| Forventet resultat | 1. Resultaterne inkluderer sager med mindst ét af ordene "vand" eller "flaske". |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.6: Smart syntaks — filtre
| Felt | Værdi |
|---|---|
| ID | TC-005.6 |
| US / Kriterie | US-005 / 1 (implicit) |
| Område | Søgning |
| Regression | Nej |
| Forudsætninger | Projektet har sager af type "fejl", kategori "Silvan", status "new", sager med foto og sager tildelt Kim. |
| Trin | 1. Gå til Søg. <br> 2. Test filtre: `type:fejl`, `kategori:silvan`, `status:ny`, `has:foto`, `ansvarlig:kim`. |
| Forventet resultat | 1. Hvert filter returnerer kun sager der matcher det specifikke felt. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at danske labels mappes korrekt (f.eks. `type:fejl` → `bug`). |

### TC-005.7: Opret liste fra søgeresultater
| Felt | Værdi |
|---|---|
| ID | TC-005.7 |
| US / Kriterie | US-005 / 1 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Søgningen "vand" returnerer resultater. |
| Trin | 1. Gå til Søg. <br> 2. Indtast "vand". <br> 3. Tryk "Opret liste". <br> 4. Angiv listenavn: "Vand-sager". <br> 5. Vælg kildefelter. <br> 6. Vælg sortering. <br> 7. Bekræft oprettelse. |
| Forventet resultat | 1. Listen oprettes. <br> 2. Brugeren navigeres til listen. <br> 3. Punkter genereres fra søgeresultaterne. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at listen gemmes i Firestore med `isDynamic: true`, `searchQueryRaw` og `projectId`. |

### TC-005.8: Vælg kildefelter
| Felt | Værdi |
|---|---|
| ID | TC-005.8 |
| US / Kriterie | US-005 / 1 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Projektet har sager med både titel og beskrivelse/noter. |
| Trin | 1. Opret liste fra søgning. <br> 2. Vælg kun "Titel" som kildefelt. <br> 3. Opret ny liste. <br> 4. Vælg kun "Beskrivelse/noter". <br> 5. Vælg begge. |
| Forventet resultat | 1. Kun titel: ét punkt per sag. <br> 2. Kun beskrivelse: ét eller flere punkter per sag baseret på linjeskift/bullets. <br> 3. Begge: punkter samles, deduplikeres, sorteres. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.9: Generering af punkter fra beskrivelse/noter
| Felt | Værdi |
|---|---|
| ID | TC-005.9 |
| US / Kriterie | US-005 / 2, 5 (PO-beslutning) |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | En sag har beskrivelse: "- Punkt 1\n- Punkt 2\n- Punkt 3". |
| Trin | 1. Opret liste med kildefelt "Beskrivelse/noter". |
| Forventet resultat | 1. Listen får tre separate punkter: "Punkt 1", "Punkt 2", "Punkt 3". |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test også med `*` præfiks og almindeligt afsnit uden bullets. |

### TC-005.10: Strenge dubletter fjernes automatisk
| Felt | Værdi |
|---|---|
| ID | TC-005.10 |
| US / Kriterie | US-005 / 3 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | To sager har identisk tekst i det valgte kildefelt, f.eks. "Bestil rør". |
| Trin | 1. Opret liste fra søgning der matcher begge sager. <br> 2. Vælg relevant kildefelt. |
| Forventet resultat | 1. Punktet "Bestil rør" vises kun én gang efter normalisering. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test at normalisering (case, æøå, whitespace) anvendes ved sammenligning. |

### TC-005.11: Semantiske dubletter markeres
| Felt | Værdi |
|---|---|
| ID | TC-005.11 |
| US / Kriterie | US-005 / 4 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | To sager har næsten identisk tekst, f.eks. "Bestil rør" og "bestil rørene". |
| Trin | 1. Opret liste der matcher begge sager. |
| Forventet resultat | 1. Begge punkter vises. <br> 2. Det nyeste eller korteste markeres med badge "Måske duplikat". <br> 3. Bruger kan slette manuelt. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Dokumentér præcis algoritme (Levenshtein-ratio > 0,85 eller substring). |

### TC-005.12: Sortering — alfabetisk
| Felt | Værdi |
|---|---|
| ID | TC-005.12 |
| US / Kriterie | US-005 / 5 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Listen har punkter: "Alfa", "Delta", "Bravo". |
| Trin | 1. Åbn liste. <br> 2. Vælg sortering "Alfabetisk". |
| Forventet resultat | 1. Punkter vises i rækkefølgen "Alfa", "Bravo", "Delta". <br> 2. Udførte punkter placeres i bunden. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.13: Sortering — dato
| Felt | Værdi |
|---|---|
| ID | TC-005.13 |
| US / Kriterie | US-005 / 5 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Listen har punkter fra sager oprettet på forskellige tidspunkter. |
| Trin | 1. Åbn liste. <br> 2. Vælg sortering "Dato". |
| Forventet resultat | 1. Punkter sorteres efter kildesag oprettet/ændret tidspunkt. <br> 2. Udførte punkter i bunden. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.14: Sortering — prioritet
| Felt | Værdi |
|---|---|
| ID | TC-005.14 |
| US / Kriterie | US-005 / 5 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Listen har punkter fra sager med status: new, in_progress, done, archived. |
| Trin | 1. Åbn liste. <br> 2. Vælg sortering "Prioritet". |
| Forventet resultat | 1. Rækkefølge: new → in_progress → done → archived, derefter dato. <br> 2. Udførte punkter stadig i bunden. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.15: Udførte punkter i bunden
| Felt | Værdi |
|---|---|
| ID | TC-005.15 |
| US / Kriterie | US-005 / 5 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Listen har både åbne og udførte punkter. |
| Trin | 1. Åbn liste. <br> 2. Afkryds ét punkt. |
| Forventet resultat | 1. Punktet markeres som udført. <br> 2. Punktet flyttes til bunden. <br> 3. Punktet er grået ud og gennemstreget. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test med alle tre sorteringsvalg. |

### TC-005.16: Afkrydsning
| Felt | Værdi |
|---|---|
| ID | TC-005.16 |
| US / Kriterie | US-005 / 7 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Listen har mindst ét åbent punkt. |
| Trin | 1. Åbn liste. <br> 2. Tryk checkbox foran et punkt. <br> 3. Tryk checkbox igen. |
| Forventet resultat | 1. Første tryk: punktet markeres udført, flyttes til bunden. <br> 2. Andet tryk: punktet markeres åbent igen, flyttes tilbage. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.17: Status-synkronisering slået til
| Felt | Værdi |
|---|---|
| ID | TC-005.17 |
| US / Kriterie | US-005 / 8 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Listen er oprettet med status-synkronisering = true. Kildesag har status "new". |
| Trin | 1. Åbn liste. <br> 2. Afkryds punkt. <br> 3. Gå til Board og åbn kildesagen. |
| Forventet resultat | 1. Kildesagens status opdateres til "done"/"archived". <br> 2. Fjern afkrydsning: kildesagens status tilbageføres til "new" (eller forrige status). |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer i Firestore at `items/{id}.status` ændres. |

### TC-005.18: Status-synkronisering slået fra
| Felt | Værdi |
|---|---|
| ID | TC-005.18 |
| US / Kriterie | US-005 / 9 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Listen er oprettet med status-synkronisering = false. |
| Trin | 1. Åbn liste. <br> 2. Afkryds punkt. <br> 3. Gå til Board og åbn kildesagen. |
| Forventet resultat | 1. Kun listepunktets egen status ændres. <br> 2. Kildesagens status forbliver uændret. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.19: Dynamisk opdatering — nyt match
| Felt | Værdi |
|---|---|
| ID | TC-005.19 |
| US / Kriterie | US-005 / 10 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Liste "Vand-sager" er oprettet fra søgning "vand". Listen har eksisterende punkter. |
| Trin | 1. Gå til Board. <br> 2. Opret en ny sag med tekst "Vandhane utæt i køkkenet." <br> 3. Gå til "Lister"-fanen. <br> 4. Åbn "Vand-sager". |
| Forventet resultat | 1. Det nye punkt vises i listen. <br> 2. Punktet har badge "Nyt". <br> 3. Portal-kortet viser badge "Nye matches". <br> 4. Når brugeren har set listen, fjernes "Nyt"-badget. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test at sorteringen genberegnes og nye punkter placeres korrekt blandt åbne punkter. |

### TC-005.20: Dynamisk opdatering — forsvundet match
| Felt | Værdi |
|---|---|
| ID | TC-005.20 |
| US / Kriterie | US-005 / 11 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Liste "Vand-sager" har punkter fra en sag der matcher "vand". |
| Trin | 1. Åbn kildesagen. <br> 2. Rediger tekst så "vand" ikke længere findes. <br> 3. Gem. <br> 4. Åbn listen igen. |
| Forventet resultat | 1. Punktet gråes ud. <br> 2. Der vises note: "Kilden matcher ikke længere søgningen." <br> 3. Punktet fjernes ikke automatisk fra listen. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.21: Portal — viser lister
| Felt | Værdi |
|---|---|
| ID | TC-005.21 |
| US / Kriterie | US-005 / 12 |
| Område | Lister-portal |
| Regression | Ja |
| Forudsætninger | Brugeren har mindst én dynamisk liste. Eksisterende "Aktionslister"-fane findes stadig. |
| Trin | 1. Gå til "Lister"-fanen. |
| Forventet resultat | 1. Brugerens gemte dynamiske lister vises. <br> 2. Tom tilstand vises hvis ingen lister. <br> 3. Eksisterende "Aktionslister"-fane er uændret. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer at tab-titlen for eksisterende liste-fane er ændret til "Aktionslister". |

### TC-005.22: Portal — kort med antal og seneste opdatering
| Felt | Værdi |
|---|---|
| ID | TC-005.22 |
| US / Kriterie | US-005 / 12, 13 |
| Område | Lister-portal |
| Regression | Ja |
| Forudsætninger | Brugeren har en dynamisk liste med 3 åbne og 2 udførte punkter. |
| Trin | 1. Gå til "Lister"-fanen. |
| Forventet resultat | 1. Hvert kort viser listens navn. <br> 2. Antal åbne / udførte punkter vises. <br> 3. Seneste opdatering vises. <br> 4. Badge "Dynamisk" vises. <br> 5. Badge "Nye matches" vises hvis relevant. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.23: Redigering af punkter
| Felt | Værdi |
|---|---|
| ID | TC-005.23 |
| US / Kriterie | US-005 / 14 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Listen har mindst ét punkt. |
| Trin | 1. Åbn liste. <br> 2. Rediger titel og notes på et punkt. <br> 3. Gem. <br> 4. Gå til Board og åbn kildesagen. |
| Forventet resultat | 1. Listepunktet opdateres. <br> 2. Kildesagen berøres ikke. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Test redigering via swipe, lang-tryk eller rediger-knap. |

### TC-005.24: Sletning af punkter
| Felt | Værdi |
|---|---|
| ID | TC-005.24 |
| US / Kriterie | US-005 / 14 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Listen har mindst ét punkt. |
| Trin | 1. Åbn liste. <br> 2. Slet et punkt. <br> 3. Gå til Board og åbn kildesagen. |
| Forventet resultat | 1. Punktet fjernes fra listen. <br> 2. Kildesagen berøres ikke. <br> 3. Ved næste synk gendannes det slettede punkt ikke automatisk (medmindre kilden stadig matcher og listen ikke husker deletion). |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Dokumentér om slettede punkter markeres `isDeleted` eller fjernes permanent. |

### TC-005.25: Tilføj egne punkter opretter sag
| Felt | Værdi |
|---|---|
| ID | TC-005.25 |
| US / Kriterie | US-005 / 15 |
| Område | Dynamiske lister |
| Regression | Ja |
| Forudsætninger | Bruger har en dynamisk liste med søgning "vand". |
| Trin | 1. Åbn liste. <br> 2. Tryk "Tilføj punkt". <br> 3. Indtast tekst: "Ny vandhane skal bestilles." <br> 4. Gem. |
| Forventet resultat | 1. En ny `CaptureItem` oprettes i projektet med tekst der matcher søgningen. <br> 2. Et nyt listepunkt tilføjes listen. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Verificer i Firestore at `items/{id}` er oprettet og indeholder søgeord/tag. |

### TC-005.26: Deling — share-sheet tekst
| Felt | Værdi |
|---|---|
| ID | TC-005.26 |
| US / Kriterie | US-005 / 16 |
| Område | Deling |
| Regression | Ja |
| Forudsætninger | Listen har navn, åbne og udførte punkter. |
| Trin | 1. Åbn liste. <br> 2. Tryk "Del". <br> 3. Vælg en delingskanal (f.eks. Notes eller Messenger). |
| Forventet resultat | 1. Tekstoversigt genereres: `{listenavn}\n\n{X} af {Y} punkter udført\n\n1. {åbent punkt 1}\n2. {åbent punkt 2}...\n\nDelt fra Data Capture`. <br> 2. Oversigten deles uden personlige data ud over listeindhold. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-005.27: Dyb link med rettigheder
| Felt | Værdi |
|---|---|
| ID | TC-005.27 |
| US / Kriterie | US-005 / 17 |
| Område | Deling / Deep links |
| Regression | Ja |
| Forudsætninger | Bruger A deler et dyb link til listen med Bruger B, som har læseadgang til projektet. |
| Trin | 1. Bruger A åbner liste og kopierer dyb link. <br> 2. Bruger B åbner linket på sin enhed. |
| Forventet resultat | 1. Appen åbnes. <br> 2. Bruger B er logget ind. <br> 3. Rettighedstjek gennemføres. <br> 4. Listen åbnes. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Linkformat: `datacapture://checklist?id={checklistId}&projectId={projectId}`. |

### TC-005.28: Dyb link uden rettigheder afvises
| Felt | Værdi |
|---|---|
| ID | TC-005.28 |
| US / Kriterie | US-005 / 17 |
| Område | Deling / Deep links |
| Regression | Ja |
| Forudsætninger | Bruger A deler et dyb link til listen med Bruger C, som ikke har adgang til projektet. |
| Trin | 1. Bruger C åbner linket på sin enhed. |
| Forventet resultat | 1. Appen åbnes. <br> 2. Bruger C er logget ind. <br> 3. Fejlmeddelelse vises: "Du har ikke adgang til det projekt, denne liste hører til." |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Sikkerhed: verificer at manipuleret link med andet `projectId` også afvises. |

---

## Regressionstest — områder berørt af US-004 / US-005 / US-006

Disse cases skal genkøres for at sikre at de tre US'er ikke har introduceret regressionsfejl i eksisterende funktionalitet.

### TC-REG.1: Opret projekt (baseline opdateret)
| Felt | Værdi |
|---|---|
| ID | TC-REG.1 |
| Baseline reference | TC-C.1, TC-006.1–006.11 |
| Område | Projektoprettelse |
| Regression | Ja |
| Trin | 1. Gå til Projekter. <br> 2. Opret nyt unikt projekt. <br> 3. Verificer success flow. |
| Forventet resultat | 1. Projekt oprettes. <br> 2. Dialog lukker. <br> 3. Board åbnes. <br> 4. Ingen falsk fejlmeddelelse. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Erstatter/opdaterer TC-C.1 med ny UX og validering. |

### TC-REG.2: Projektliste og projektskift
| Felt | Værdi |
|---|---|
| ID | TC-REG.2 |
| Baseline reference | TC-C.2, TC-C.3 |
| Område | Projekter |
| Regression | Ja |
| Trin | 1. Gå til Projekter. <br> 2. Verificer at egne og delte projekter vises. <br> 3. Vælg et projekt. |
| Forventet resultat | 1. Liste vises korrekt. <br> 2. Aktivt projekt skiftes. <br> 3. Board opdateres. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-REG.3: Optagelse og manuel oprettelse af sager
| Felt | Værdi |
|---|---|
| ID | TC-REG.3 |
| Baseline reference | TC-D.1, TC-F.1–F.4, TC-004.1–004.20 |
| Område | Board / Voice |
| Regression | Ja |
| Trin | 1. Opret sag via "+ Tilføj". <br> 2. Opret sag via "Optag". <br> 3. Verificer felter i Board og item-detalje. |
| Forventet resultat | 1. Begge veje fungerer. <br> 2. Samme feltrækkefølge. <br> 3. Sager vises korrekt. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-REG.4: Board-listevisning
| Felt | Værdi |
|---|---|
| ID | TC-REG.4 |
| Baseline reference | TC-D.2 |
| Område | Board |
| Regression | Ja |
| Trin | 1. Gå til Board. <br> 2. Scroll, pull-to-refresh. |
| Forventet resultat | 1. Indlæg vises med badge, titel, dato, forfatter, status, ansvarlig. <br> 2. Ingen crash ved opdatering. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-REG.5: Søgning (gammel adfærd erstattes)
| Felt | Værdi |
|---|---|
| ID | TC-REG.5 |
| Baseline reference | TC-G.1, TC-G.2 |
| Område | Søgning |
| Regression | Ja |
| Trin | 1. Gå til Søg. <br> 2. Indtast "vand". <br> 3. Verificer substring-match. <br> 4. Test stemmesøgning. |
| Forventet resultat | 1. Substring-søgning som default. <br> 2. Resultater vises sorteret. <br> 3. Stemmesøgning fungerer stadig. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | Vigtigt: gammel `*ord*`-kun-hele-ord adfærd må ikke regressere. |

### TC-REG.6: Deling / kopiér fra item-detalje
| Felt | Værdi |
|---|---|
| ID | TC-REG.6 |
| Baseline reference | TC-B.1, TC-I.3 |
| Område | Deling |
| Regression | Ja |
| Trin | 1. Åbn item-detalje. <br> 2. Tryk del/kopiér. <br> 3. Åbn Board-filter via dyb link. |
| Forventet resultat | 1. Del/kopiér fungerer. <br> 2. Dyb link åbner Board korrekt. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-REG.7: Fotoalbum / kamera og OCR
| Felt | Værdi |
|---|---|
| ID | TC-REG.7 |
| Baseline reference | TC-E.1–E.5, TC-E.4a–E.4c, TC-004.18 |
| Område | Foto / OCR |
| Regression | Ja |
| Trin | 1. Opret sag med foto fra album. <br> 2. Opret sag med foto fra kamera. <br> 3. Læs OCR. <br> 4. Oversæt og brug oversat tekst. <br> 5. Kopiér original/oversat. |
| Forventet resultat | 1. Foto uploades. <br> 2. OCR virker. <br> 3. Oversættelse virker. <br> 4. Kopiér virker. <br> 5. Formularen nulstilles ved annuller. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-REG.8: RBAC og ansvarlige i ny formular
| Felt | Værdi |
|---|---|
| ID | TC-REG.8 |
| Baseline reference | TC-R.1–R.5, TC-AS.1–AS.3 |
| Område | RBAC |
| Regression | Ja |
| Trin | 1. Log ind som editor/viewer. <br> 2. Verificer at "+ Tilføj"/"Optag" håndteres korrekt. <br> 3. Verificer ansvarlig-vælger. |
| Forventet resultat | 1. Viewer kan kun se. <br> 2. Editor kan oprette men ikke administrere medlemmer. <br> 3. Ansvarlig-visning fungerer. |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

### TC-REG.9: Eksisterende Aktionslister berøres ikke
| Felt | Værdi |
|---|---|
| ID | TC-REG.9 |
| Baseline reference | Nyt — sikrer at US-005 ikke ødelægger manuelle lister |
| Område | Aktionslister |
| Regression | Ja |
| Trin | 1. Gå til "Aktionslister"-fanen. <br> 2. Opret manuel liste. <br> 3. Tilføj punkter. <br> 4. Afkryds punkter. |
| Forventet resultat | 1. Eksisterende manuelle lister fungerer uændret. <br> 2. Tab-titel er ændret til "Aktionslister". |
| Faktisk resultat | |
| Status | ⚪ |
| Bemærkninger | |

---

## Risici og edge cases

| ID | Risiko / Edge case | Betydning | Mitigation i test |
|---|---|---|---|
| R-001 | OS hard timeout kan stadig afbryde optagelse trods 50s timer. | Bruger mister data. | TC-004.4, TC-004.5, TC-004.16. Test på flere fysiske enheder. |
| R-002 | Auto-gem gemmer ufuldstændig sag mens bruger tænker. | Dårlig datakvalitet. | TC-004.1, TC-004.2. Test med toggle og 5s stilhed. |
| R-003 | Fælles `CreateItemForm` introducerer regression i OCR/oversættelse/tildeling. | Eksisterende funktionalitet ødelægges. | TC-REG.7, TC-REG.8, TC-004.6–004.7. |
| R-004 | Dublet-tjek er kun klient-side; race mellem to enheder kan skabe dublet. | Datakonsistens. | TC-006.3, TC-006.9. Dokumentér begrænsning. |
| R-005 | Anden brugers projekt med samme navn kan fejlagtigt blokere. | Bruger kan ikke oprette eget projekt. | TC-006.8. Verificer `ownerId`-scope. |
| R-006 | Eksisterende dubletter forhindrer ny oprettelse med samme navn. | Bruger blokeret. | TC-006.9. PO har accepteret dette. |
| R-007 | Dynamiske lister kan generere mange Firestore-læsninger. | Høj regning / dårdig performance. | TC-005.19, TC-005.21. Overvåg antal læsninger. |
| R-008 | Semantisk deduplikering kan forveksle forskellige punkter. | Brugerforvirring. | TC-005.11. Verificer at bruger kan slette manuelt. |
| R-009 | Dyb link deling uden rettigheder kan lække listeindhold. | Sikkerhed. | TC-005.28. Test både loggede og uloggede modtagere. |
| R-010 | Søgning redesign kan ændre gammel adfærd uventet. | Bruger vender tilbage til forkert funktionalitet. | TC-005.1, TC-REG.5. |

---

## Åbne spørgsmål til PO / design

| # | Spørgsmål | Hvorfor det er vigtigt | Status |
|---|---|---|---|
| Q-001 | Skal foto automatisk tvinge Type = `Foto`, eller kun når brugeren ikke aktivt har valgt en anden type? | Design-004 siger "medmindre brugeren allerede har valgt noget andet aktivt", men det er uklart hvornår et valg betragtes som "aktivt". | ÅBEN |
| Q-002 | Hvad er den præcise tærskel for "kort" vs "lang" OS-timeout? | Påvirker TC-004.4 og TC-004.5. Design nævner 2 sekunder, men PO afklaring nævner "ultra kort". | ÅBEN |
| Q-003 | Skal status-synkronisering ved fjern afkrydsning altid tilbageføre til `new`, eller huske forrige status? | Design-005 siger fase 1 bruger "new", men acceptkriterie 9 siger "tilbageføres". | ÅBEN |
| Q-004 | Skal invitationer baseret på email give øjeblikkelig læseadgang før brugeren accepterer? | Berører Firestore-regler, men er ude af scope for US-006. Bør dokumenteres. | ÅBEN |
| Q-005 | Skal RC3 (nuværende rettet build) testes separat før US-004/005/006, eller springes over? | B+C-status.md nævner at rc3 afventer PO-godkendelse. | ÅBEN |

---

## Go/no-go gate

### Go-kriterier
- [ ] Alle Gherkin-acceptkriterier i US-004, US-005 og US-006 er dækket af mindst én testcase.
- [ ] Regressionstest fokuserer på de områder, der berøres af de tre US'er.
- [ ] Edge cases er beskrevet (dubletter, OS-timeout, store datasæt, dybe links uden rettigheder).
- [ ] Testplan er gennemførlig på både simulator/dev-client og fysiske enheder.
- [ ] QA Agent har reviewet og godkendt planen.

### No-go-kriterier
- [ ] Manglende testdækning af kritiske acceptkriterier.
- [ ] Urealistisk testscope givet tidsramme.

---

## Ændringslog

| Dato | Version | Ændring | Ansvarlig |
|---|---|---|---|
| 2026-07-15 | 1.0 | Oprettet testplan for US-004, US-005, US-006 med cases, forventede resultater, faktiske resultatfelter, status og bemærkninger. | Test Manager Agent |
