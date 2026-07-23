# Design: US-004 — Ensartet og robust optagelse/oprettelse af sager

**Dokument:** `design-004-voice-create.md`  
**Status:** Klar til PO-review  
**Forudsætning:** PO har godkendt US-004 og alle 18 afklaringer (felt-rækkefølge, auto-gem, stemmekommandoer, type/kategori, OCR, validering m.v.).  
**Scope:** Oprettelsesmodalen for både "Optag" og "+ Tilføj". Eksisterende sagsoverblik (board-liste) berøres kun af, at nye sager oprettes med samme felter fra begge veje.

---

## 1. Overordnet mål

1. Én fælles `CreateItemForm`-komponent, der bruges af både `VoiceCaptureModal` og `+ Tilføj`-modalen.
2. Identiske felter og rækkefølge i begge modalers.
3. Robust auto-gem efter 5 sekunders stilhed, default slået til.
4. Optagelse genoptages eller sammenkædes ved eksterne afbrydelser (OS-timeout, tilladelses-popup).
5. Stemmekommandoer for tegnsætning, linjeskift, gem, slet alt og kategori.
6. AI-forslag til Type og Kategori; brugerens stemme-kategori vinder over AI.
7. OCR, oversættelse, deling og fotoalbum/kamera integreres i den fælles formular.

---

## 2. Fælles formular: `CreateItemForm`

### 2.1 Komponentansvar

`CreateItemForm` er en præsentations- og tilstandskomponent, der håndterer alle fælles inputfelter og deres logik, men **ikke** selv persisterer til Firestore. Den modtager callbacks:

- `onSave(item)` — kaldes når brugeren aktivt gemmer.
- `onAutoSave(item)` — kaldes når auto-gem udløses.
- `onCancel()` — kaldes når brugeren annullerer.
- `initialMode: 'voice' | 'manual'` — bestemmer om optage-kontroller vises.

### 2.2 Felter og rækkefølge (PO-godkendt)

| # | Felt | Type | Synlighed | AI-involvering |
|---|---|---|---|---|
| 1 | **Type-vælger** | Chips | Altid | AI forhåndsudvælger ud fra tekst/kommando; bruger kan overskrive |
| 2 | **Tekst / beskrivelse** | Stort tekstfelt | Altid | Titel udledes automatisk herfra |
| 3 | **Titel** | Tekst-input | Valgfrit / auto-udledt | Kan redigeres eksplicit |
| 4 | **Kategori** | Autocomplete tekst | Altid | AI-forslag + projekt-historik; bruger kan redigere/fjerne |
| 5 | **Foto** | Album + kamera knapper | Altid | Type sættes automatisk til `Foto`, hvis foto tilføjes |
| 6 | **OCR-oversættelse** | Panel | Kun ved foto med genkendt tekst | Oversættelse gemmes |
| 7 | **Ansvarlig** | Chips | Kun ved tildelingsrettighed og projektmedlemmer | Default "Ingen ansvarlig" |
| 8 | **Handlinger** | Gem / Annuller | Altid | Gem aktiveres ved tekst eller foto |

### 2.3 Felt-detaljer

#### Type-vælger

Chips: `Idé`, `Observation`, `Fejl` (vises som "Fejl", gemmes som `bug`), `Notat`, `Foto`, `Stemme`, `Andet`.

- Rækkefølge: `Andet`, `Observation`, `Fejl`, `Idé`, `Notat`, `Foto`, `Stemme` — eller den rækkefølge PO har godkendt. For konsistens med nuværende UI beholdes rækkefølgen: `Andet`, `Observation`, `Fejl`, `Idé`, `Notat` som primære, med `Foto` og `Stemme` som input-kanal-markører.
- Farvekodning bevares.
- AI-forslag markeres visuelt (f.eks. stiplet omrids eller badge "Forslag"), indtil bruger aktivt vælger en type.

#### Tekst / beskrivelse

- Primært tekstområde med flere linjer.
- I Optag vises live-transkription her.
- I +Tilføj skriver brugeren direkte.
- Titel udledes automatisk fra første linje / første 6 ord.

#### Titel

- Visning: enten et inline felt eller en "Rediger titel"-knap, der udvider et tekstfelt.
- Default collapsed, så formularen ser kort ud.
- Hvis brugeren redigerer titlen, beholdes den eksplicit, indtil formularen nulstilles.

#### Kategori

- Tekstinput med autocomplete-dropdown over projektets eksisterende kategorier.
- AI-forslag vises som første valg med badge "Forslag".
- Bruger kan slette feltet (tom kategori).

#### Foto

- To knapper: "Album" og "Kamera".
- Forhåndsvisning af valgt foto.
- Mulighed for at fjerne foto.
- Når et foto tilføjes, sættes Type automatisk til `Foto`, **kun hvis brugeren ikke har foretaget et aktivt Type-valg** (dvs. Type stadig viser AI-forslag eller default `Andet`). Hvis brugeren aktivt har trykket på en Type-chip, respekteres det valg.

#### OCR-oversættelse

- Kun synlig, når `ocrOriginal` ikke er tom.
- Viser original OCR-tekst (read-only) med **Kopiér** og **Del**.
- Oversættelsesafsnit vises efter oversættelse med **Kopiér**, **Del**, **Brug original**, **Brug oversat**.
- Oversat tekst kan redigeres af brugeren.

#### Ansvarlig

- Kun synlig hvis `canAssignItems(projectRole)` er sandt og der er medlemmer at vælge imellem (inkl. "Ingen").
- Default: "Ingen ansvarlig".
- Hvis brugeren ikke har `canAssignOthers`, kan han/hun kun vælge sig selv eller "Ingen".

#### Handlinger

- **Gem**: aktiveret når `content.trim() || title.trim() || mediaUrl` er sandt.
- **Annuller**: lukker modal og nulstiller formularen.

### 2.4 Nulstilling af formularen

Hver gang modalen åbnes:

- `itemType` = `other`
- `text` = `""`
- `title` = `""`
- `category` = `""`
- `mediaUrl` = `null`
- `mediaUri` = `null`
- `ocrOriginal` = `""`
- `ocrTranslated` = `""`
- `assignedTo` = `""`
- AI-forslagsflag nulstilles.
- Eventuelt live-transcript nulstilles.

---

## 3. Optagelsesflow (kun "Optag")

### 3.1 Oversigt

```text
Bruger åbner Optag
        │
        ▼
Formularen er nulstillet
        │
        ▼
Bruger trykker Start optagelse
        │
        ▼
useVoiceRecognition.startRecording()
        │
        ▼
Live-transcript vises i Tekst-feltet
Type/Kategori opdateres løbende af AI/voice-parser
        │
        ▼
Stilhed i 5 sekunder?
        ├─ Ja ── auto-gem (hvis auto-gem er slået til)
        └─ Nej ── fortsæt optagelse
        │
        ▼
Bruger siger "gem"
        └─ Stop optagelse, gem, luk modal
```

### 3.2 Auto-gem

#### Krav

- Default **slået til**.
- Udløses efter **5 sekunders stilhed** (ingen nye transcript-resultater).
- Gemmer sagen, **stopper optagelsen**, men **lader modalen være åben** klar til næste optagelse.
- Hvis brugeren slår det fra, fortsætter optagelsen, indtil brugeren aktivt trykker stop.

#### Teknisk design

- `useVoiceRecognition` udvides med `autoStopMs` (default 5000 ms for auto-gem) og en `autoSaveEnabled`-tilstand, der styres af `CreateItemForm`.
- Silence-timeren nulstilles på **hvert** `result`-event (både `isFinal == false` og `isFinal == true`), fordi ethvert nyt resultat indikerer aktiv indtaling.
- Auto-gem udføres kun, når:
  1. Der er gået 5 sekunder uden nyt resultat.
  2. `autoSaveEnabled == true`.
  3. Der er indhold at gemme (`content || mediaUrl`).
- Efter auto-gem kaldes `stopRecording()` og `onAutoSave(item)`. Formularen nulstilles delvist (tekst/titel/kategori), men modalen forbliver åben, så brugeren kan optage næste sag med det samme.

#### Risiko for for-tidlig gem

Mitigation:

- Timeout er konfigurerbar (5s PO-godkendt).
- Bruger kan slå auto-gem fra.
- Auto-gem kræver et `isFinal == true` resultat inden for de seneste 5 sekunder? Diskussion: Hvis vi kræver `isFinal`, kan auto-gem udsættes unødigt. PO har valgt 5 sekunder stilhed. Vi lader auto-gem udløse ved 5 sekunders stilhed uden nyt resultat. Hvis brugeren tænker i 5 sekunder, gemmes der — det er en bevidst afvejning for at reducere tabt data.

### 3.3 OS-timeout og genoptagelse

#### Observerede platformbegrænsninger

- iOS `SFSpeechRecognizer` har en hård grænse på ca. 60 sekunders optagelse i nogle tilfælde, eller stopper ved fokusskift/tilladelsespop-up.
- Android varierer efter enhed og OS-version.
- `expo-speech-recognition` rapporterer `error` eller `end`-event ved afbrydelse.

#### Design

- **Max-varighed timer:** Appen starter en 50-sekunders timer, når optagelsen begynder. Ved 50 sekunder stopper appen optagelsen "blødt", gemmer det optagede, og tilbyder straks at starte en ny optagelse. Dette undgår OS-timeout og tab af lyd.
- **Ekstern afbrydelse:**
  - Hvis `end`-event modtages, men brugeren ikke har sagt stop, registreres afbrydelsen.
  - Hvis afbrydelsen varer under **2 sekunder** (kort tærskel, PO-besluttet), genstartes optagelsen automatisk. Tidligere transcript bevares.
  - Hvis afbrydelsen varer **2 sekunder eller længere** (lang afbrydelse), vises en besked: "Optagelsen blev afbrudt. Vil du fortsætte, hvor du slap?"
  - Brugeren kan vælge **Fortsæt** (ny optagelse, gammelt transcript bevaret) eller **Gem** (gem nuværende).
- **Sammenkædning:** Hver optagelsessegments transcript tilføjes til det samlede tekstfelt. Segmenterne adskilles automatisk med mellemrum.

### 3.4 Timer-visning

- Under optagelse vises en levende timer: `00:23`.
- Timeren nulstilles ved hver ny optagelse (manuel start eller auto-genstart).
- Ved 45 sekunder skiftes timer-farve til advarsel (orange).

---

## 4. Stemmekommandoer

### 4.1 Kommandoer (PO-godkendt)

| Kommando | Handling | Implementering |
|---|---|---|
| `punktum` / `punkt` | Indsæt `.` | `voiceCommands.ts` |
| `komma` | Indsæt `,` | `voiceCommands.ts` |
| `ny linje` / `nylinje` / `skift` / `linjeskift` | Indsæt `\n` | `voiceCommands.ts` |
| `slet sidste ord` / `fjern sidste ord` | Slet sidste ord | `voiceCommands.ts` |
| `fortryd` / `undo` | Ryd seneste ændring? **PO: "slet alt" ryd teksten, "fortryd" beholdes som kommando.** | `voiceCommands.ts` |
| `slet alt` | Ryd alt tekst i feltet. Original tekst gemmes og kan kopieres/deles. | `voiceCommands.ts` + state |
| `gem` / `opret` / `færdig` / `ferdig` | Stop optagelse, gem, luk modal | `voiceCommands.ts` |
| `annuller` / `abort` / `cancel` | Stop optagelse, luk modal uden at gemme | `voiceCommands.ts` |
| Kategori-command (første ord f.eks. "Silvan punktum ...") | Sæt Kategori til første ord; fjern det fra tekstfeltet | `parseVoiceCommand` + state |

### 4.2 Stemme-kategori vs AI-kategori

- Hvis brugeren eksplicit starter med et kategori-ord (f.eks. "Silvan ..."), vinder stemme-kategorien over AI-forslag.
- Hvis brugeren ikke angiver kategori, foreslår AI en kategori ud fra tekst og type.
- Hvis brugeren senere redigerer kategorien manuelt, vinder manuel redigering over begge.

### 4.3 Kategori-udtrækning

Udvid `parseVoiceCommand` (eller tilsvarende logik) med følgende regler:

1. Tjek først for kendte type-kommandoer (`Fejl`, `Idé`, `Observation`, `Notat`, `Spørgsmål`). Hvis match, sæt Type og Kategori fra mapping.
2. Hvis intet kendt type-match, tjek første 1–3 ord som brugerdefineret kategori:
   - Maks. 25 tegn.
   - Må ikke indeholde almindelige fyldord (`en`, `et`, `den`, `det`, `der`, `som`, `og`, `i`, `på`, `med`, `af`, `til`).
   - Hvis gyldigt, fjernes kategori-ordet fra transcript og vises som Kategori.
3. Ellers: ingen stemme-kategori; AI-forslag anvendes.

---

## 5. Type og Kategori — AI-interaktion

### 5.1 Type

- AI forhåndsudvælger Type ud fra:
  - Stemme-kommando (hvis brugeren sagde "Fejl ..." → `Fejl`).
  - Tekstindhold (ord som "bug", "fejl", "crash" → `Fejl`; "idé", "forbedring" → `Idé`; osv.).
- Bruger kan altid overskrive via Type-chips.
- Hvis brugeren vælger Type manuelt, opdateres Kategori-forslag kun hvis Kategori-feltet stadig er tomt eller var et AI-forslag.

### 5.2 Kategori

- AI-forslag genereres af `suggestCategory({ title, content, type })`.
- Autocomplete-dropdown fyldes med unikke kategorier fra projektets eksisterende sager.
- Forslag sorteres: AI-forslag øverst, derefter historik alfabetisk.
- Hvis Type ændres og Kategori er tomt eller markeret som AI-forslag, regenereres Kategori-forslag.
- Hvis brugeren har redigeret Kategori eksplicit, beholdes brugerens valg ved Type-ændring.

### 5.3 Relation

- **Type** = sagens karakter / input-kanal.
- **Kategori** = emne / bucket.
- Type påvirker Kategori **kun** som default-forslag. De er ikke 1:1.

---

## 6. Integration med eksisterende funktioner

### 6.1 OCR

- OCR-panel vises kun når foto er tilknyttet og tekst er genkendt.
- "Læs tekst"-knap findes på foto-forhåndsvisningen.
- Genkendt tekst tilføjes til Tekst-feltet.
- Oversættelse gemmes i sagens state (ikke som separat felt i Firestore medmindre bruger trykker "Brug oversat").

### 6.2 Oversættelse

- Oversættelse er lokal tilstand i modalen.
- Brugeren kan kopiere eller dele oversat/original tekst.
- Hvis brugeren trykker "Brug oversat", indsættes oversat tekst i Tekst-feltet og behandles som brugerredigeret tekst.

### 6.3 Fotoalbum / kamera

- Album- og kamera-knapper er en del af `CreateItemForm`.
- Upload-status vises ("Uploader..." / forhåndsvisning).
- Fejl håndteres med inline fejl eller Alert ved kritiske tilladelsesfejl.

### 6.4 Deling

- Deling er ikke en del af sag-oprettelsesflowet, men OCR-tekst kan kopieres/deles fra formularen.
- Ingen ændringer i appens generelle delelogik.

---

## 7. Komponent-arkitektur

### 7.1 Komponent-træ (foreslået)

```text
app/(tabs)/board.tsx
  └── VoiceCaptureModal
        └── CreateItemForm (mode="voice")
        └── (optageknap, timer, auto-gem toggle)

  └── +Tilføj Modal
        └── CreateItemForm (mode="manual")

components/CreateItemForm.tsx
  ├── TypeSelector
  ├── PrimaryTextInput
  ├── TitleInput (collapsible)
  ├── CategoryAutocomplete
  ├── PhotoPicker
  ├── OcrPanel
  └── AssigneeSelector
```

### 7.2 State-håndtering

- `CreateItemForm` holder al lokal formular-tilstand.
- `VoiceCaptureModal` holder optagelses-tilstand (recording, auto-gem, segmenter, OS-timeout-håndtering).
- `board.tsx` holder projekt/medlemmer og kalder `createItem` med det endelige payload.

### 7.3 Callback-kontrakt

`CreateItemForm` returnerer et item-objekt til forælder-komponenten:

```typescript
interface CreateItemPayload {
  type: ItemType;
  title: string;
  content: string;
  category: string;
  mediaUrl?: string;
  assignedTo?: string;
  assignedToName?: string;
}
```

`VoiceCaptureModal` og `+ Tilføj`-modalen bruger samme callback-form.

---

## 8. Tekniske ændringer i hooks

### 8.1 `useVoiceRecognition`

Udvidelser:

- `autoStopMs` fortsat konfigurerbar (default 5000 ms).
- Eksponer `recordingDuration` (levende timer).
- Eksponer `lastResultAt` (timestamp for sidste resultat) til brug for auto-gem-logik.
- Eksponer `errorType` så forælder kan skelne mellem timeout, tilladelse og andre fejl.
- Nulstil timer ved hvert `result`-event, ikke kun `isFinal`.

### 8.2 Stemme-kommandoer

- `processVoiceCommands` opdateres med kategori-udtrækning og returnerer et objekt, der også indeholder `categoryHint` og `typeHint`.
- Kommandoerne testes på slutningen af teksten (som i dag) for at undgå at fjerne ord midt i sætningen.

---

## 9. Afhængigheder

- `components/CreateItemForm.tsx` — ny fælles komponent.
- `components/VoiceCaptureModal.tsx` — reduceres til optagelses-wrapper omkring `CreateItemForm`.
- `app/(tabs)/board.tsx` — "+ Tilføj" reduceres til manuel wrapper omkring `CreateItemForm`.
- `hooks/useVoiceRecognition.ts` — silence-timer, optagevarighed, fejltype.
- `services/voiceCommands.ts` — kommando-parser med kategori/type-hints.
- `services/categories.ts` — `suggestCategory` + projekt-historik.
- `services/items.ts` — `createItem` (uændret interface).
- `services/media.ts`, `services/ocr.ts`, `services/translation.ts`, `services/share.ts` — bruges af `CreateItemForm`.
- `services/roles.ts` — `canAssignItems`, `canAssignOthers`.

---

## 10. Acceptkriteriedækning

| US-004 kriterie | Designafsnit | Kommentar |
|---|---|---|
| 1–3 Auto-gem / stilhed | 3.2 | 5s, default on, modal åben |
| 4 OS-timeout | 3.3 | 50s max timer + genoptag/sammenkæd |
| 5–8 Ensartethed | 2, 7 | Fælles formular, samme felter, reset |
| 9–10 AI/type/validering | 5, 2.3 | AI-forslag, tekst/foto krav |
| 11–14 Stemmekommandoer | 4 | Gem, slet alt, kategori, type |
| 15–16 Kort OS-timeout | 3.3 | Auto-genstart |
| 17 Længere timeout | 3.3 | Brugerbesked |

---

## 11. Åbne spørgsmål til PO

Ingen. Alle afklaringer fra US-004 er indarbejdet.

---

## 12. Risici (se detaljer i risk-assessment-b-c-redo-v2.md)

- OS hard timeout kan ikke helt undgås; mitigeres med 50s max timer og sammenkædning.
- Auto-gem kan gemme ufuldstændige sager; mitigeres med toggle og tydelig feedback.
- Fælles formular kan forårsage regression i OCR/deling/tildeling; mitigeres med stærk regressionstest.
- AI/type-forslag kan fejle på dansk/domæne; mitigeres med fail-safe og brugeroverride.
