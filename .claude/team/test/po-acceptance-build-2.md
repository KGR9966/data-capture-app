# PO Acceptance Test — Build 2 (US-004 + US-005)

**Dato:** 2026-07-15  
**Build:** Build 2  
**Scope:** US-004 (Voice / Create Item redesign) + US-005 (Dynamiske lister og søgeportal)  
**Branch:** `v2026.07.15-build2-us004-us005`  
**Commit:** `3bb094c`  

## Build-links

| Platform | Build-ID | Installationslink |
|---|---|---|
| Android | `ef4584ac-51ed-4ab6-b01a-250decf2eecf` | [Åbn Android build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/ef4584ac-51ed-4ab6-b01a-250decf2eecf) |
| iOS | `93baa590-75e4-4166-b560-d65d526fbbb4` | [Åbn iOS build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/93baa590-75e4-4166-b560-d65d526fbbb4) |

## Sådan rapporteres resultater

For hver testcase:
1. Marker **Status** med `🟢`, `🟡`, `🔴` eller `⚪`.
2. Udfyld **Faktisk resultat** med kort beskrivelse.
3. Tilføj **Bemærkninger** — f.eks. enhed, screenshots, fejlbesked.

Hvis du finder en fejl, skriv:
- Hvad du gjorde (trin)
- Hvad du forventede
- Hvad der skete
- Enhed og OS-version
- Gerne screenshot

---

## Testcases — US-004 Voice / Create Item

### TC-004.1: Auto-gem efter stilhed
| Felt | Værdi |
|---|---|
| **ID** | TC-004.1 |
| **Trin** | 1. Åbn "Optag". <br> 2. Sig: "Observationsnote fra byggepladsen." <br> 3. Vent 5 sekunder uden at tale. |
| **Forventet** | Optagelsen stopper automatisk. Sagen gemmes. Modalen lukker IKKE, formularen nulstilles. Sagen vises i Board. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-004.2: Auto-gem slået fra
| Felt | Værdi |
|---|---|
| **ID** | TC-004.2 |
| **Trin** | 1. Åbn "Optag". <br> 2. Slå auto-gem fra. <br> 3. Start optagelse og tal. <br> 4. Vent 10 sekunder uden at tale. |
| **Forventet** | Optagelsen fortsætter efter 5 sekunder. Der gemmes ikke automatisk. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-004.3: Ensartede felter og rækkefølge
| Felt | Værdi |
|---|---|
| **ID** | TC-004.3 |
| **Trin** | 1. Åbn "Optag" og notér felter/rækkefølge. <br> 2. Luk. <br> 3. Åbn "+ Tilføj" og notér felter/rækkefølge. |
| **Forventet** | Begge modalen viser samme felter i samme rækkefølge: Type-vælger, Tekst, Titel, Kategori, Foto, Ansvarlig, Gem/Annuller. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | Tag gerne screenshots og sammenlign. |

### TC-004.4: AI type-forslag
| Felt | Værdi |
|---|---|
| **ID** | TC-004.4 |
| **Trin** | 1. Åbn "+ Tilføj". <br> 2. Indtast: "Knappen virker ikke, app crasher." |
| **Forventet** | Type skifter automatisk til "Fejl". Brugeren kan vælge en anden type. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | Test også "Jeg har en idé til..." → Type = Idé. |

### TC-004.5: Stemmekommando — gem
| Felt | Værdi |
|---|---|
| **ID** | TC-004.5 |
| **Trin** | 1. Åbn "Optag". <br> 2. Start optagelse. <br> 3. Sig: "Dette er en testnote punktum gem." |
| **Forventet** | Optagelsen stopper. Sagen gemmes. Modalen lukker. Sagen vises i Board med teksten "Dette er en testnote." |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-004.6: Stemmekommando — slet alt
| Felt | Værdi |
|---|---|
| **ID** | TC-004.6 |
| **Trin** | 1. Åbn "Optag". <br> 2. Sig: "Første linje. Anden linje." <br> 3. Sig: "Slet alt." |
| **Forventet** | Tekstfeltet ryddes. Original tekst kan kopieres/deles. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-004.7: Stemmekommando — fortryd
| Felt | Værdi |
|---|---|
| **ID** | TC-004.7 |
| **Trin** | 1. Åbn "Optag". <br> 2. Sig: "Første linje. Anden linje." <br> 3. Sig: "Fortryd." |
| **Forventet** | Sidste sætning/ord fjernes — teksten viser nu kun "Første linje." |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-004.8: Lang OS-timeout — Gem-knap
| Felt | Værdi |
|---|---|
| **ID** | TC-004.8 |
| **Trin** | 1. Åbn "Optag". <br> 2. Start optagelse. <br> 3. Forlad appen i 5+ sekunder. <br> 4. Returnér til appen. |
| **Forventet** | Alert vises med knapperne "Start ny optagelse", "Gem" og "Luk". "Gem" gemmer den nuværende tekst. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-004.9: Type sættes automatisk til Foto — regel C
| Felt | Værdi |
|---|---|
| **ID** | TC-004.9 |
| **Trin** | 1. Åbn "+ Tilføj". <br> 2. Vælg Type = "Idé". <br> 3. Tilføj foto fra album. |
| **Forventet** | Type ændres automatisk til "Foto". |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | Åbent spørgsmål Q-001 er afklaret med regel C. |

### TC-004.10: Type låses, når brugeren vælger type EFTER foto
| Felt | Værdi |
|---|---|
| **ID** | TC-004.10 |
| **Trin** | 1. Åbn "+ Tilføj". <br> 2. Tilføj foto. <br> 3. Type skifter til "Foto". <br> 4. Tryk manuelt på "Fejl". |
| **Forventet** | Type ændres til "Fejl" og forbliver låst som "Fejl". |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-004.11: Voice-kommando låser type
| Felt | Værdi |
|---|---|
| **ID** | TC-004.11 |
| **Trin** | 1. Åbn "Optag". <br> 2. Sig: "Fejl punktum Vandhane utæt." <br> 3. Tilføj foto. <br> 4. Gem. |
| **Forventet** | Type forbliver "Fejl" selvom foto tilføjes. Sagen gemmes som Fejl med foto. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-004.12: OCR bevares i fælles formular
| Felt | Værdi |
|---|---|
| **ID** | TC-004.12 |
| **Trin** | 1. Åbn "+ Tilføj". <br> 2. Tilføj foto med tekst. <br> 3. Tryk "Læs tekst". <br> 4. Brug oversat/original tekst. |
| **Forventet** | OCR-tekst indsættes i tekstfeltet. Oversættelse og kopiér/dele virker. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

---

## Testcases — US-005 Dynamiske lister og søgeportal

### TC-005.1: Substring-søgning
| Felt | Værdi |
|---|---|
| **ID** | TC-005.1 |
| **Trin** | 1. Gå til Søg-fanen. <br> 2. Indtast "vand". |
| **Forventet** | Resultater inkluderer "Vandkande", "vandslange", "koldt vand". "Silvan" vises ikke. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.2: Smart syntaks — filtre
| Felt | Værdi |
|---|---|
| **ID** | TC-005.2 |
| **Trin** | 1. Gå til Søg. <br> 2. Test filtre: `type:fejl`, `kategori:silvan`, `status:ny`, `has:foto`. |
| **Forventet** | Hvert filter returnerer kun sager der matcher det specifikke felt. `type:fejl` virker med dansk label. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.3: Opret liste fra søgning
| Felt | Værdi |
|---|---|
| **ID** | TC-005.3 |
| **Trin** | 1. Gå til Søg. <br> 2. Søg "vand". <br> 3. Tryk "Opret liste". <br> 4. Angiv navn, vælg kildefelter og sortering. <br> 5. Opret. |
| **Forventet** | Listen oprettes. Navigeres til listen. Punkter genereres fra søgeresultaterne. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.4: Punkt-parsing
| Felt | Værdi |
|---|---|
| **ID** | TC-005.4 |
| **Trin** | 1. Opret en sag med beskrivelse: "- Punkt 1\n- Punkt 2\n- Punkt 3". <br> 2. Opret liste med kildefelt "Beskrivelse/noter". |
| **Forventet** | Listen får tre punkter: "Punkt 1", "Punkt 2", "Punkt 3". |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.5: Strenge dubletter fjernes
| Felt | Værdi |
|---|---|
| **ID** | TC-005.5 |
| **Trin** | 1. Opret to sager med samme tekst i kildefeltet, f.eks. "Bestil rør". <br> 2. Opret liste der matcher begge. |
| **Forventet** | Punktet "Bestil rør" vises kun én gang. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.6: Sortering — alfabetisk
| Felt | Værdi |
|---|---|
| **ID** | TC-005.6 |
| **Trin** | 1. Åbn liste med punkter: "Alfa", "Delta", "Bravo". <br> 2. Vælg "Alfabetisk". |
| **Forventet** | Rækkefølgen bliver "Alfa", "Bravo", "Delta". Udførte punkter i bunden. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.7: Afkrydsning og status-synk
| Felt | Værdi |
|---|---|
| **ID** | TC-005.7 |
| **Trin** | 1. Opret liste med status-synk = true. <br> 2. Afkryds et punkt. <br> 3. Åbn kildesagen i Board. <br> 4. Fjern afkrydsning i listen. <br> 5. Tjek kildesagen igen. |
| **Forventet** | Ved afkrydsning: kildesag sættes til "Færdig". Ved fjernelse af afkrydsning: kildesag tilbageføres til forrige status (f.eks. "Ny"). |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.8: Status-synk slået fra
| Felt | Værdi |
|---|---|
| **ID** | TC-005.8 |
| **Trin** | 1. Opret liste med status-synk = false. <br> 2. Afkryds et punkt. <br> 3. Tjek kildesagen. |
| **Forventet** | Kun listepunktets status ændres. Kildesagen forbliver uændret. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.9: Dynamisk opdatering — nyt match
| Felt | Værdi |
|---|---|
| **ID** | TC-005.9 |
| **Trin** | 1. Opret liste fra søgning "vand". <br> 2. Gå til Board og opret ny sag med tekst "Vandhane utæt i køkkenet." <br> 3. Gå til Lister og åbn listen. |
| **Forventet** | Det nye punkt vises i listen med badge "Nyt". Portal-kortet viser badge "Nye matches". Efter åbning fjernes "Nyt"-badget. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.10: Dynamisk opdatering — forsvundet match
| Felt | Værdi |
|---|---|
| **ID** | TC-005.10 |
| **Trin** | 1. Åbn kildesag for et punkt i listen. <br> 2. Rediger tekst så søgeordet "vand" ikke længere findes. <br> 3. Gem. <br> 4. Åbn listen igen. |
| **Forventet** | Punktet gråes ud. Note vises: "Kilden matcher ikke længere søgningen." |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.11: Portal viser lister
| Felt | Værdi |
|---|---|
| **ID** | TC-005.11 |
| **Trin** | 1. Gå til "Lister"-fanen. |
| **Forventet** | Brugerens gemte dynamiske lister vises. Hver kort viser navn, antal åbne/udførte, seneste opdatering, "Dynamisk"-badge og evt. "Nye matches". |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-005.12: Deling af liste
| Felt | Værdi |
|---|---|
| **ID** | TC-005.12 |
| **Trin** | 1. Åbn en liste. <br> 2. Tryk "Del". <br> 3. Vælg en delingskanal. |
| **Forventet** | Tekstoversigt deles: navn, antal udførte, åbne punkter, dyb link. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

---

## Regressionstest

### TC-REG.1: Projektoprettelse (Build 1-funktionalitet)
| Felt | Værdi |
|---|---|
| **ID** | TC-REG.1 |
| **Trin** | 1. Opret nyt unikt projekt. <br> 2. Prøv at oprette projekt med samme navn igen. |
| **Forventet** | Projekt oprettes. Dublet blokeres med inline fejl. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-REG.2: Manuelle aktionslister
| Felt | Værdi |
|---|---|
| **ID** | TC-REG.2 |
| **Trin** | 1. Gå til "Aktionslister"-fanen. <br> 2. Opret manuel liste, tilføj punkter, afkryds. |
| **Forventet** | Manuelle lister fungerer uændret. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

### TC-REG.3: Fotoalbum, kamera, OCR
| Felt | Værdi |
|---|---|
| **ID** | TC-REG.3 |
| **Trin** | 1. Opret sag med foto fra album. <br> 2. Opret sag med foto fra kamera. <br> 3. Læs OCR, oversæt, kopiér. |
| **Forventet** | Foto uploades. OCR og oversættelse virker. |
| **Faktisk** | |
| **Status** | ⚪ |
| **Bemærkninger** | |

---

## Kendte begrænsninger

- ESLint-warnings og package-version warning i pre-test-check er non-blocker teknisk gæld.
- Type-vs-foto-lås er afklaret og godkendt med regel C.
- Pre-existing secrets i `.env`, `google-services.json`, `GoogleService-Info.plist` bør håndteres før produktionsrelease.

---

## Samlet vurdering

| # | Spørgsmål | Svar |
|---|---|---|
| 1 | Er US-004 funktionalitet acceptable? | 🟢 / 🟡 / 🔴 |
| 2 | Er US-005 funktionalitet acceptable? | 🟢 / 🟡 / 🔴 |
| 3 | Er regressionstest acceptable? | 🟢 / 🟡 / 🔴 |
| 4 | **Samlet Build 2 godkendelse?** | **🟢 GO / 🔴 NO-GO** |

**Bemærkninger / bugs:**
