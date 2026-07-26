# Plan: US-004 + US-005 redesign + governance-opdatering

**Dato:** 2026-07-15  
**Udløst af:** Build 2 PO-acceptancetest → total NO-GO  
**Godkendt af PO:** _afventer_  

## 1. Baggrund: Hvorfor gik det galt?

### Post-mortem: US-004 / Build 2

Build 2 blev frigivet med QA GO, Audit GO og PO-go til EAS build. Alligevel fejlede næsten alle PO-acceptancetestcases for US-004, og US-005 dynamisk liste-oprettelse fejlede også.

**Rodårsager:**

| # | Rodårsag | Konsekvens |
|---|---|---|
| R1 | **Ingen PO-godkendte eksempler på stemme-input/output.** Reglerne "titel fra stemme", "type fra stemme" og "kategori fra stemme" blev diskuteret abstrakt, men ikke fastlagt med konkrete sætninger. | Developer implementerede en parser, der tog første ord som type, næste ord som titel, og resten som indhold. |
| R2 | **QA fokuserede på tekniske regressioner, ikke brugercentreret funktionalitet.** QA fandt `useCallback`-regressionen, men ikke at "gem" ender i teksten eller at titel bliver "D". | Fejlene nåede helt frem til PO-acceptance. |
| R3 | **Audit godkendte uden at kræve UX-eksempler.** Audit så arkitektur og regler, men ikke konkret input/output-adfærd. | Governance-gaten var for svag på subjektiv UX. |
| R4 | **Master Agent (Claude Code) hoppede over plan-godkendelse under tidspres.** Planen for stemme-redesign blev ikke godkendt med eksempler, før kode blev skrevet. | Der opstod en række fortolkningsfejl. |
| R5 | **PO-acceptance skete på færdig EAS build, ikke på udviklingsbuild.** Da fejl blev fundet, var build allerede brændt af og commit push'et. | Dyr læringscyklus. |
| R6 | **Dynamisk liste-oprettelse blev ikke tilstrækkeligt testet i B/C-redesignet.** Fokus lå på stemme og søgning; listenes oprettelsesflow blev antaget at virke. | Fejlede fra start ved PO-test. |

---

## 2. Governance-opdatering

Følgende nye regler indføres i teamets governance og skal følges fremover:

### Regel G1: PO-UX-eksempel-gate
Ingen kodeændringer, der påvirker brugerinput eller output, må påbegyndes, før PO har godkendt en tabel med **minimum 5 konkrete input/output-eksempler**.

For stemmefunktionalitet skal tabellen indeholde:
- Rå stemmeinput
- Forventet titel
- Forventet indhold
- Forventet type
- Forventet kategori (hvis relevant)
- Kommentar til særlige edge cases

### Regel G2: QA skal teste input/output-par
QA skal ikke kun køre koden teknisk, men verificere de godkendte eksempler fra G1. QA-rapporten skal indeholde en tabel med "Forventet vs. Faktisk" for hvert eksempel.

### Regel G3: Audit skal godkende UX-eksempeltabel
Audit-gate må ikke gives, før audit har bekræftet, at UX-eksempeltabellen er komplet og testbar.

### Regel G4: Master Agent må ikke starte implementering før PO-godkendt plan
Master Agent skal eksplicit bede PO om at godkende planen, før Developer-agent påbegynder kode. Planen skal indeholde:
- Berørte filer
- Konkrete eksempler
- Teststrategi
- Rollback-strategi

### Regel G5: PO-acceptance før EAS build
Ingen EAS production/preview build må startes, før PO har godkendt en udviklingsbuild/simulering. Kun efter PO GO må Audit og QA godkende build.

### Regel G6: Testdokumenter versioneres og committes
Alle testdokumenter med PO-resultater skal committes på en dedikeret branch efter hver testrunde. Untracked dokumenter må ikke være eneste kilde til resultater.

---

## 3. Redesign: US-004 Stemme / opret sag

### 3.1 Overordnet model

Brugeren taler en **overskrift** først, afsluttet med punktum. Derefter kan brugeren nævne **punkter**, ét pr. linje. Stop-kommandoer gemmer sagen uden at ende i teksten.

### 3.2 Konkrete eksempler (PO-godkendt)

| # | Input | Titel | Indhold | Type | Kategori | Bemærkning |
|---|---|---|---|---|---|---|
| E1 | "Observationsnote fra byggepladsen punktum vinduet er sprunget komma glasskår overalt punktum gem" | "Observationsnote fra byggepladsen" | "vinduet er sprunget, glasskår overalt." | Observation | Observation | Første sætning er titel; punktum/komma konverteres. |
| E2 | "Fejl login knappen virker ikke punktum nyt afsnit Jeg har prøvet både iOS og Android punktum gem" | "Fejl login knappen virker ikke" | "Jeg har prøvet både iOS og Android." | Fejl | Fejl | Type nøgleord indgår i titlen; nyt afsnit skifter til indhold. |
| E3 | "Idé til forbedring af sagsøversigten nyt afsnit filtre i toppen komma sortering efter dato punktum gem" | "Idé til forbedring af sagsøversigten" | "filtre i toppen, sortering efter dato." | Idé | Idé | Nyt afsnit skiller titel og indhold. |
| E4 | "Notat fra kundemødet punktum aftalt pris 5000 kr komma deadline næste uge punktum gem" | "Notat fra kundemødet" | "aftalt pris 5000 kr, deadline næste uge." | Notat | Notat | Første sætning er titel; resten er indhold. |
| E5 | "Husk at bestille fliser til terrassen punktum gem" | "Husk at bestille fliser til terrassen" | _(tom)_ | Andet | Andet | Kun én sætning → titel, tomt indhold. |
| E6 | "Tag billede af skaden på taget" | "af skaden på taget" | _(tom)_ | Andet | Andet | Stemmekommando til kamera; resten kan bruges som titel. |
| E7 | "Vælg foto fra album til dokumentation" | "fra album til dokumentation" | _(tom)_ | Andet | Andet | Stemmekommando til album; resten kan bruges som titel. |
| E8 | "punktum punktum punktum" | _(tom)_ | _(tom)_ | Andet | Andet | Duplikerede tegnsætningskommandoer kollapser; ingen brugbar tekst. |
| E9 | "Åbn album" | _(tom)_ | _(tom)_ | Andet | Andet | Ren foto-kommando; åbner album. |
| E10 | "Åbn kamera" | _(tom)_ | _(tom)_ | Andet | Andet | Ren foto-kommando; åbner kamera. |
| E11 | "Observationsnote fra byggepladsen" (auto-gem efter 5 sek) | "Observationsnote fra byggepladsen" | _(tom)_ | Observation | Observation | Én sammenhængende sætning uden punktum → titel. |

> **Note om punktuering i titler:** Afsluttende punktum, udråbstegn og spørgsmålstegn fjernes fra titlen for at sikre ensartet visning i lister.

### 3.3 Regler for parser

#### Regel V1: Overskrift = første sætning indtil første punktum / pause
- Overskriften er teksten fra starten af inputtet og indtil første ".", "!", "?", eller en pause på minimum 1,5–2 sekunder, der markerer slutningen på overskriften.
- Brugeren kan også eksplicit sige "punktum" for at afslutte overskriften.
- **Hvis brugeren siger én sammenhængende sætning uden punktum eller pause, bliver hele sætningen titel, og indholdet er tomt.**
- Afsluttende punktum/udråb/spørgsmål fjernes fra den endelige titel.

#### Regel V2: Indhold = resten af teksten efter overskriften
- Hver ny linje/pause i indtalingen bliver en ny linje i indholdet.
- Hvis der kun er én sætning, er indholdet tomt.

#### Regel V3: Type bestemmes ud fra nøgleord
Type vælges ud fra nøgleord i **overskriften først**, derefter i hele teksten. Prioritet: bug → idea → observation → note → other.

| Type | Nøgleord (dansk + engelsk) |
|---|---|
| Fejl | fejl, bug, crash, fejler, virker ikke |
| Idé | idé, ide, idea, forbedring, ønske, feature, forslag |
| Observation | observation, observer, observeret, bemærk, bemærkning |
| Notat | notat, note, spørgsmål, kommentar |
| Andet | (fallback) |

#### Regel V4: Kategori = type-label
Kategori sættes til den danske label for typen, medmindre brugeren aktivt vælger en anden. F.eks. Type=Fejl → Kategori="Fejl". Type=Notat → Kategori="Notat". Type=Andet → Kategori="Andet".

Begrundelse: PO har valgt at droppe AI-kategori og stole på brugerstyret overskrift. Terminologi holdes konsistent med type-labels.

#### Regel V5: Stop-kommandoer fjernes fra tekst
"gem", "opret", "færdig", "ferdig", "done", "save" fjernes altid fra det endelige tekstfelt. De trigger kun gem-handling. De matches kun som hele ord (case-insensitive) for at undgå at fjerne "regime", "gemme", "oprettelse".

#### Regel V6: Tegnsætningskommandoer konverteres
"punktum", "komma", "ny linje", "nyt afsnit", "spørgsmålstegn", "udråbstegn" konverteres til det tilsvarende tegn. De skrives ikke som ord. Duplikerede kommandoer normaliseres (f.eks. "punktum punktum" bliver ét punktum).

#### Regel V7: Stemme-låst type kan ikke overskrives af foto
Hvis type er sat via stemme, forbliver den låst. Foto auto-skifter kun type til "Foto", hvis type endnu ikke er låst. Hvis brugeren først tilføjer foto og derefter siger en type-kommando, skal stemmens type have højere prioritet end foto-auto og låse typen.

#### Regel V8: Auto-gem efter stilhed
- Når auto-gem er slået til, og der er 5 sekunders stilhed:
  1. Stop optagelse.
  2. Gem sagen.
  3. Afspil afdæmpet, særskilt gemt-lyd (eller vibration hvis lyd ikke er tilgængelig).
  4. Vis toast: "Sagen er gemt".
  5. Luk modalen og returnér til Board.
- Efter auto-gem kan brugeren starte en ny optagelse fra Board.
- Feedback bruges også ved manuelt tryk på "Gem", så adfærden er ens.
- Efter brugeren har tilføjet foto via stemme-kommando (Åbn album / Åbn kamera) starter 5-sekunders auto-gem-timeren først, når brugeren er tilbage i optagelsesmodalen.

#### Regel V9: Timer-farver
- 0–44 sek: neutral farve.
- 45+ sek: orange (advarsel), ikke rød.
- Rød først ved 60+ sek eller ved OS-timeout.

#### Regel V10: "Slet alt" rydder kun tekst
"Slet alt" fjerner al tekst i indhold og titel. Vedhæftede fotos bevares, så brugeren stadig kan gemme en sag udelukkende baseret på foto.

#### Regel V11: Stemmekommandoer til foto
Brugeren kan tilføje foto under stemmeoptagelse uden at røre telefonen:

| Kommando | Synonymer | Handling |
|---|---|---|
| "Åbn album" | "Vælg foto", "Album" | Åbner fotoalbum, så brugeren kan vælge et billede. |
| "Åbn kamera" | "Tag billede", "Kamera" | Åbner kameraet, så brugeren kan tage et billede. |

- Efter valgt/taget billede returnerer brugeren til optagelsesmodalen.
- Billedet vises i sagen.
- Auto-gem timer starter først, når brugeren er tilbage i modalen.
- Brugeren kan fortsætte med at indtale punkter eller sige "Gem".
- Overskriften sætter typen; foto overskriver ikke stemme-låst type.

### 3.4 Teknisk implementering

#### Filer der ændres
| Fil | Ændring |
|---|---|
| `services/itemTypes.ts` | Nyt rent type-modul uden native imports, så parser-test kan køre i Node. |
| `services/items.ts` | Importerer `ItemType`/`ItemStatus` fra `itemTypes.ts` og re-eksporterer dem. |
| `services/voiceCommands.ts` | Omskrevet parser med `parseVoiceInput(input): VoiceParseResult`. Tilføjede foto-kommandoer, kollaps af duplikerede tegnsætningskommandoer, og V1-hele-sætning-som-titel. |
| `components/VoiceCaptureModal.tsx` | Brug ny parser. Afspil lyd/vibration ved auto-gem. Luk modal efter auto-gem. Sørg for stemme-lås over foto. Håndter Åbn album / Åbn kamera kommandoer. |
| `components/CreateItemForm.tsx` | Fjern AI-kategori fra stemme. Vis AI-forslag tydeligere (ikke nødvendigt for stemme, men relevant for manuel oprettelse). |
| `scripts/verify-voice-parser.ts` | Nyt automatiseret tjek med 11 PO-godkendte eksempler. Køres som del af `pre-test-check.js`. |
| Nyt: `assets/sounds/saved.mp3` | Afdæmpet gemt-lyd. Fallback til vibration. |

#### Parser-output-interface
```typescript
export interface VoiceParseResult {
  title: string;        // første sætning / overskrift
  content: string;      // resten, med linjeskift
  type: ItemType;       // ud fra nøgleord
  category: string;     // dansk label for type
  command: "save" | "cancel" | "clear" | "undo" | "openAlbum" | "openCamera" | null;
  rawText: string;      // rensede transcript
}
```

---

## 4. Rettelse: US-005 Dynamisk liste-oprettelse

### 4.1 Problemer identificeret

| # | Problem | Årsag |
|---|---|---|
| D1 | "Kunne ikke oprette den dynamiske liste" generisk fejl. | Fejlbeskeden fra `catch` er for generisk; brugeren ved ikke, hvad der gik galt. |
| D2 | `createDynamicChecklistFromSearch` vælger `projectId` fra `items[0].projectId`. | Hvis søgeresultaterne er fra flere projekter, eller hvis items mangler projectId, kan listen tilknyttes forkert projekt. |
| D3 | Hvis søgningen giver 0 resultater, kan knappen stadig aktiveres i et race. | Sikkerhedstjekket er der, men det er ikke tydeligt for brugeren. |
| D4 | Brugeren kan ikke se, hvilke felter der er valgt, før listen oprettes. | UI mangler tydelig feedback. |

### 4.2 Regler for dynamisk liste-oprettelse

#### Regel L1: Projektafgrænsning
En dynamisk liste tilhører **ét projekt**. Hvis søgeresultaterne kommer fra flere projekter, skal brugeren vælge, hvilket projekt listen skal tilhøre.

#### Regel L2: Hvis kun ét projekt er repræsenteret i resultaterne
Brug dette projekt automatisk.

#### Regel L3: Hvis ingen resultater eller intet projekt
Vis brugervenlig fejl: "Søgningen gav ingen resultater. Opret nogle sager først."

#### Regel L4: Tydelig fejlhåndtering
I stedet for generisk "Kunne ikke oprette den dynamiske liste", vis den specifikke fejl til brugeren, f.eks.:
- "Du skal være logget ind."
- "Søgningen gav ingen resultater."
- "Vælg ét projekt for listen."
- "Ingen internetforbindelse."

#### Regel L5: Forhåndsvis valgte felter
Før brugeren trykker "Opret", skal UI vise:
- Navn på listen
- Kildefelter (Titel, Indhold, Kategori)
- Sortering
- Status-synk ja/nej
- Antal punkter der vil blive oprettet

### 4.3 Teknisk implementering

| Fil | Ændring |
|---|---|
| `app/(tabs)/search.tsx` | Vis projekt-valg hvis resultater spænder flere projekter. Forbedret fejlhåndtering med specifikke beskeder. Forhåndsvis konfiguration. |
| `services/checklists.ts` | Opdater `createDynamicChecklistFromSearch` til at kræve `projectId` eksplicit. Forbedret validering og fejlbeskeder. |

---

## 5. Teststrategi

### 5.1 Udviklings-test før EAS build

1. **Automatiseret parser-test:** `npx tsx scripts/verify-voice-parser.ts` validerer 11 PO-godkendte eksempler og integreres i `scripts/pre-test-check.js`.
2. **TypeScript + lint:** `npx tsc --noEmit` og `npx expo lint` skal passere.
3. **Manuel simulator-test:** Kør app i udviklingsbuild med de 11 PO-godkendte eksempler, inklusive foto-kommandoer.
4. **Dynamisk liste-test:** Opret lister fra søgninger med 1 projekt, flere projekter, og 0 resultater.

### 5.2 QA-gate

QA skal verificere:
- [ ] Alle 11 eksempler fra afsnit 3.2 giver korrekt titel, indhold, type, kommando.
- [ ] Auto-gem lukker modal, afspiller lyd/vibration, viser toast.
- [ ] "Gem", "opret", "punktum" ender ikke i teksten.
- [ ] Type låst af stemme forbliver låst ved foto.
- [ ] "Åbn album" / "Åbn kamera" åbner fotoalbum/kamera og vender tilbage til optagelse.
- [ ] Auto-gem timer starter først efter tilbagevenden fra foto-kommando.
- [ ] Dynamisk liste kan oprettes fra søgning med ét projekt.
- [ ] Bruger får specifik fejl ved flere projekter eller 0 resultater.

### 5.3 Audit-gate

Audit skal godkende:
- [ ] Parser er deterministisk, dokumenteret og valideret af automatiserede eksempler.
- [ ] Fejlhåndtering ikke eksponerer tekniske detaljer.
- [ ] Lyd/vibration ikke forstyrrer.
- [ ] Governance-opdatering er skrevet og PO-godkendt.

### 5.4 PO-acceptance

PO tester først på **udviklingsbuild** (Expo Go / simulator / development build). Først efter PO GO startes EAS build.

---

## 6. Implementeringsrækkefølge

1. **Fase 1:** Governance-opdatering + post-mortem (1 dokument + team-møde).
2. **Fase 2:** Omskriv stemme-parser + `VoiceCaptureModal` (US-004 redesign).
3. **Fase 3:** Ret dynamisk liste-oprettelse (US-005 fix).
4. **Fase 4:** QA-review af parser-eksempler + dynamisk liste.
5. **Fase 5:** Audit-gate.
6. **Fase 6:** PO-acceptance på udviklingsbuild.
7. **Fase 7:** EAS build kun efter PO GO.

---

## 7. Godkendelsekrav

Før implementering skal PO godkende:
- [ ] Post-mortem og governance-opdatering.
- [ ] De 11 eksempler i afsnit 3.2.
- [ ] Regler V1–V11 for stemme-parser.
- [ ] Regler L1–L5 for dynamisk liste.
- [ ] Teststrategi og rækkefølge.
