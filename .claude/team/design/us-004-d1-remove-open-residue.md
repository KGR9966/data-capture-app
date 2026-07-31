# D1: Fjern "Åben"/"åbn"-tekstresidu efter kamera/album-kommando

**Dokument:** `.claude/team/design/us-004-d1-remove-open-residue.md`  
**Status:** Klar til review  
**Dato:** 2026-07-15  
**Scope:** `components/VoiceCaptureModal.tsx` + `services/voiceCommands.ts`  

---

## 1. Scope

Når brugeren i voice/create-flow siger en kommando for at åbne kamera eller album, må selve kommandoen og relaterede aktionsord **ikke** ende i final `title`/`content`.

### Kommandoer der skal fjernes helt

Udledt fra `services/voiceCommands.ts` og VOICE-001:

| Kommando | Variantsom skal fjernes | Bemærkning |
|---|---|---|
| Åbn kamera | `åbn kamera`, `åben kamera`, `åbne kamera` | `åbne` genkendes ikke direkte, men ordet kan hænge tilbage |
| Åbn album | `åbn album`, `åben album`, `åbne album` | Samme som ovenfor |
| Tag billede | `tag billede`, `tag et billede`, `tag foto` | Udvid med `tag` + evt. fyldord |
| Vælg foto | `vælg foto`, `vælg billede`, `album` | Eksisterende liste har `album` som trigger |
| Kamera | `kamera` alene | Eksisterende trigger, men kan være almindeligt ord – se risici |

### Aktionsord (præfix) der aldrig må blive residu

Når en foto-kommando genkendes, skal følgende ord fjernes hvis de står umiddelbart foran kommandoen:

- `åbn`, `åben`, `åbne`
- `tag` (+ evt. `et`)
- `vælg`

### Ude af scope

- At ændre hvornår `kamera`/`album` alene trigger en foto-handling (det er en særskilt PO-beslutning).
- At ændre auto-gem, OS-timeout eller genoptagelseslogik.

---

## 2. Root cause

### 2.1 Parseren fjerner ikke altid præfiks

I `services/voiceCommands.ts` genkendes foto-kommandoer af `detectCommand()` ved at lede efter hele phrases i normaliseret tekst:

```typescript
const OPEN_ALBUM_COMMANDS = ["aaben album", "aabn album", "vaelg foto", "album"];
const OPEN_CAMERA_COMMANDS = ["aaben kamera", "aabn kamera", "tag billede", "kamera"];
```

`removeCommandWords()` fjerner kun den matchede phrase baseret på ordbounds:

```typescript
if (command === "openAlbum" || command === "openCamera") {
  // ... finder index i normaliseret tekst, tæller wordsBefore,
  // fjerner targetWordCount fra originalWords
}
```

**Problem:** Når triggeren er enkeltordet `album` eller `kamera`, fjernes kun det ene ord. Foranstående ord som `åbne` bliver stående, fordi `åbne` ikke matcher nogen af de kendte phrases (`aaben kamera`, `aabn kamera`, `tag billede`, `kamera`).

Eksempel:  
Input: `"Åbne kamera"`  
- `detectCommand` finder `kamera` → `openCamera`  
- `removeCommandWords` fjerner `kamera`  
- Resultat: `rawText = "Åbne"`, `title = "Åbne"`  

Det samme gælder `"Åbne album"`, `"Åbn kamera test"` osv.

### 2.2 Modalen gør dobbelt arbejde

I `components/VoiceCaptureModal.tsx` (ca. linje 368–401):

```typescript
if (parsed.command === "openAlbum" || parsed.command === "openCamera") {
  // ...
  applyParsedResultRef.current(parseVoiceInput(parsed.rawText), { lockType: isFinal });

  if (!manualTitleEditRef.current) {
    setTitle(parsed.title);
    // ...
  }
  if (!manualContentEditRef.current) {
    setContent(parsed.content);
  }
  // ...
  photoTitleBaselineRef.current = titleRef.current.trim();
  photoContentBaselineRef.current = contentRef.current.trim();
}
```

Her kaldes `applyParsedResult` med `parseVoiceInput(parsed.rawText)` OG derefter sættes titel/content eksplicit fra `parsed`. Det giver:

1. To parse-runder og to `setTitle`/`setContent`-kald kort efter hinanden.
2. Risiko for race mellem state-opdateringer og refs.
3. Hvis `parsed.title` stadig indeholder residu (f.eks. `"Åbne"`), skrives det ind i formularen.

### 2.3 Sammenfatning

Residu opstår fordi:

1. Parseren kun fjerner den matchede phrase, ikke eventuelle foranstående aktionsord.
2. Modalen bruger parserens output på en måde, der kan proppe residu ind i formularen før kamera/album åbner.

---

## 3. Brugerflow

```text
Bruger trykker Start optagelse
        │
        ▼
Bruger siger: "Åbn kamera skaden på taget"
        │
        ▼
App genkender foto-kommandoen
Parser fjerner "Åbn kamera" + præfiksord
        │
        ▼
Title = "skaden på taget", Content = ""
        │
        ▼
App åbner kamera
Bruger tager foto
        │
        ▼
Optagelse genoptages
Alt ny tekst efter foto appends til Content
        │
        ▼
Bruger siger "gem" → item gemmes med title/content uden "åbn/kamera"
```

---

## 4. Teknisk løsning

### 4.1 Ændring i `services/voiceCommands.ts`

Introducer en dedikeret helper `stripPhotoCommand(input, command)` der:

1. Finder den matchede foto-phrase på samme måde som i dag.
2. Udvider matchet til også at inddrage umiddelbart foranstående aktionsord/præfiks fra en `PHOTO_PREFIXES`-liste (`åbn`, `åben`, `åbne`, `tag`, `vælg`, `et`).
3. Fjerner hele blokken fra original input.
4. Kører `cleanText()` på resultatet, så mellemrum og tegnsætning normaliseres.

Pseudokode:

```typescript
const PHOTO_PREFIXES = ["åbne", "åben", "åbn", "vælg", "tag", "et"];

function stripPhotoCommand(input: string, command: "openAlbum" | "openCamera"): string {
  const normalized = normalizeCommand(input);
  const commands = command === "openAlbum" ? OPEN_ALBUM_COMMANDS : OPEN_CAMERA_COMMANDS;

  let matchedPhrase = "";
  let matchedIndex = -1;
  for (const cmd of commands) {
    const idx = normalized.indexOf(cmd);
    if (idx !== -1 && (matchedIndex === -1 || idx < matchedIndex)) {
      matchedIndex = idx;
      matchedPhrase = cmd;
    }
  }
  if (!matchedPhrase) return input;

  // Fjern evt. præfiks foran kommandoen
  const beforeText = normalized.slice(0, matchedIndex).trim();
  const beforeWords = beforeText.split(/\s+/).filter(Boolean);
  while (beforeWords.length > 0 && PHOTO_PREFIXES.includes(beforeWords[beforeWords.length - 1])) {
    beforeWords.pop();
  }

  const afterText = normalized.slice(matchedIndex + matchedPhrase.length).trim();
  const afterWords = afterText.split(/\s+/).filter(Boolean);

  const cleanNormalized = [...beforeWords, ...afterWords].join(" ");
  // Map tilbage til original casing hvis ønsket, ellers brug normalized.
  // Simplificeret: return cleanText(rebuildFromOriginalWords(input, beforeWords.length, matchedPhrase.length));
}
```

Alternativt kan `removeCommandWords` udvides med et ekstra trin efter ordbounds-fjernelse:

```typescript
if (command === "openAlbum" || command === "openCamera") {
  let result = removeMatchedPhrase(input, command); // eksisterende logik
  result = removeLeadingPrefixes(result, PHOTO_PREFIXES);
  return result;
}
```

**Valg:** Implementer en ny `stripPhotoCommand()` for at holde foto-fjernelsen samlet og testbar.

### 4.2 Ændring i `components/VoiceCaptureModal.tsx`

Simplificer `openAlbum`/`openCamera`-grenen:

```typescript
if (parsed.command === "openAlbum" || parsed.command === "openCamera") {
  const isAlbum = parsed.command === "openAlbum";

  stopPendingRef.current = true;
  intentionalStopRef.current = true;
  stopRecordingRef.current();
  resetTranscriptRef.current();

  // Brug parserens rensede titel/content. Frøs titlen, så ny tekst efter foto går til content.
  if (!manualTitleEditRef.current) {
    setTitle(parsed.title);
    if (parsed.title.trim()) {
      titleFrozenRef.current = true;
    }
  }
  if (!manualContentEditRef.current) {
    setContent(parsed.content);
  }

  // Husk baseline for det der kommer efter fotoet.
  photoTitleBaselineRef.current = titleRef.current.trim();
  photoContentBaselineRef.current = contentRef.current.trim();

  // Åbn kamera/album efter kort delay.
  setTimeout(() => {
    (async () => {
      try {
        if (isAlbum) {
          await handlePickImageRef.current();
        } else {
          await handleTakePhotoRef.current();
        }
      } catch (error) {
        console.log("Voice photo command error", error);
      }
      stopPendingRef.current = false;
      intentionalStopRef.current = false;
      savePendingRef.current = false;
      if (visibleRef.current && autoSaveOnSilenceRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        try {
          await startRecordingRef.current();
        } catch (restartError) {
          console.log("Voice photo restart error", restartError);
          Alert.alert("Optagelse", "Kunne ikke genoptage stemmeoptagelsen automatisk. Tryk på knappen for at starte igen.");
        }
      }
    })();
  }, 800);
  return;
}
```

**Vigtige ændringer:**

- Fjern `applyParsedResultRef.current(parseVoiceInput(parsed.rawText), ...)` – det er redundant og skaber race.
- Brug `parsed.title` og `parsed.content` direkte. Parseren har nu ansvaret for at fjerne alt residu.
- Bevar `titleFrozenRef.current` så tekst efter foto går til content.

### 4.3 Hvor i pipeline fjernes kommandoen

| Trin | Handling | Fil |
|---|---|---|
| 1 | Rå transcript modtages | `hooks/useVoiceRecognition.ts` |
| 2 | `parseVoiceInput()` kaldes | `components/VoiceCaptureModal.tsx` |
| 3 | **Foto-kommando + præfiks fjernes** | `services/voiceCommands.ts` (nyt `stripPhotoCommand`) |
| 4 | Tekst renses (`cleanText`) og splittes i title/content | `services/voiceCommands.ts` |
| 5 | Resultat anvendes i modal state | `components/VoiceCaptureModal.tsx` |
| 6 | Kamera/album åbnes | `components/VoiceCaptureModal.tsx` |

---

## 5. Testcases

### Parser-tests (`scripts/verify-voice-parser.ts` skal udvides)

| # | Input | Forventet title | Forventet content | Kommando | Bemærkning |
|---|---|---|---|---|---|
| D1.1 | `"Åbn kamera"` | `""` | `""` | `openCamera` | Kun kommando |
| D1.2 | `"Åben kamera"` | `""` | `""` | `openCamera` | Accent-variant |
| D1.3 | `"Åbne kamera"` | `""` | `""` | `openCamera` | `åbne` skal fjernes som præfiks |
| D1.4 | `"Åbn album vinduet er sprunget"` | `"vinduet er sprunget"` | `""` | `openAlbum` | Tekst efter kommando |
| D1.5 | `"Tag billede af skaden på taget"` | `"af skaden på taget"` | `""` | `openCamera` | Parserens nuværende opførsel beholdes; `tag billede` fjernes |
| D1.6 | `"Vælg foto fra dokumentation"` | `"fra dokumentation"` | `""` | `openAlbum` | `vælg foto` fjernes |
| D1.7 | `"Observationsnote åbn kamera skaden på taget"` | `"Observationsnote skaden på taget"` | `""` | `openCamera` | Ingen tegnsætning mellem title og restord – hele strengen bliver titel |
| D1.8 | `"Silvan punktum åbn kamera"` | `"Silvan"` | `""` | `openCamera` | Titel fryses før foto |

### Modal-flow-tests (manuel/ad-hoc eller via `scripts/simulate-voice-modal.ts`)

| # | Sekvens | Forventet final title | Forventet final content |
|---|---|---|---|
| D1.M1 | Start → `"Åbn kamera"` → tag foto → `"maling komma hammer"` → gem | `""` | `"maling, hammer"` |
| D1.M2 | Start → `"Silvan punktum åbn kamera"` → tag foto → `"hammer"` → gem | `"Silvan"` | `"hammer"` |
| D1.M3 | Start → `"Åbne album noter"` → vælg foto → gem | `"noter"` | `""` |

---

## 6. Risici + mitigation

| Risiko | Sandsynlighed | Impact | Mitigation |
|---|---|---|---|
| `kamera`/`album` som almindelige ord triggers utilsigtet | Mellem | Mellem | Behold eksisterende trigger-opførsel i denne opgave; opret separat sag hvis PO ønsker at kræve "åbn" foran. |
| Fjernelse af `tag`/`vælg` præfiks kan fjerne meningsfulde ord i enkelte sætninger | Lav | Lav | Fjern kun præfikset når `command === openCamera/openAlbum`, dvs. kun når parseren allerede har konkluderet at det er en foto-kommando. |
| Race-condition mellem `setTitle` og `titleRef` når titel fryses | Mellem | Mellem | Simplificer modal-grenen så der kun er ét state-sæt. Brug `parsed.title` direkte. |
| Dansk talegenkendelse skriver "åben" som "åbne" eller "åbner" | Høj | Mellem | Udvid `PHOTO_PREFIXES` med varianter: `åbne`, `åbner`, `åbent`, `åben`. |
| Regression i andre kommandoer | Mellem | Mellem | Kør `verify-voice-parser.ts` før og efter. Behold alle eksisterende E1–E13 cases. |
| iOS genoptagelse efter kamera fejler | Mellem | Mellem | Ændres ikke i denne opgave; eksisterende 1200ms delay og Alert beholdes. |

---

## 7. Næste trin

1. **PO-review:** Godkend scope, især om `kamera`/`album` som enkeltord skal fortsætte som trigger, og om `tag billede` skal fjerne `af` som præposition.
2. **Implementering i `services/voiceCommands.ts`:**
   - Tilføj `PHOTO_PREFIXES`.
   - Implementer `stripPhotoCommand()` og brug den i `parseVoiceInput()` for foto-kommandoer.
3. **Implementering i `components/VoiceCaptureModal.tsx`:**
   - Simplificer `openAlbum`/`openCamera`-grenen.
   - Fjern dobbelt kald til `applyParsedResult`/`parseVoiceInput(parsed.rawText)`.
4. **Opdater tests:**
   - Tilføj D1.1–D1.8 til `scripts/verify-voice-parser.ts`.
   - Kør `npx ts-node scripts/verify-voice-parser.ts`.
   - Verificer modal-flow manuelt på iOS/Android eller via `scripts/simulate-voice-modal.ts`.
5. **Regressionstest:** Kør baseline testplan for voice/create (se `data-capture-test-baseline.md`).
6. **Acceptance:** PO godkender at "Åben"/"åbn"/"åbne" ikke vises i titel/content efter foto-kommando.
