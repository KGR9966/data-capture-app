# US-004 D3: Auto-titel må ikke overskrive manuelt redigeret titel

**Status:** Design færdigt. Koden indeholder allerede en implementeret rettelse (commit `7ccdcb1`); fokus er nu verifikation og dokumentation.  
**Scope:** Manuelt oprettelsesflow (`+ Tilføj` i `app/(tabs)/board.tsx`) via `components/CreateItemForm.tsx`.  
**Voice-flow er ikke berørt:** `VoiceCaptureModal` kalder `CreateItemForm` med `mode="voice"`, hvor auto-titel effekten returnerer øjeblikkeligt.

---

## 1. Scope

Når brugeren åbner `+ Tilføj` og begynder at skrive i **Beskrivelse** først, udledes **Titel** automatisk fra beskrivelsens første linje / første 6 ord (`deriveTitle`).

Problemet (før rettelse): hvis brugeren derefter retter titlen, vil den fortsatte auto-udledning synkronisere titlen tilbage med beskrivelsen, så titlen ikke kan rettes uafhængigt.

Mål:
- Brugeren skal altid kunne redigere titlen uafhængigt af beskrivelsen.
- Auto-udledt titel skal kun være et forslag, indtil brugeren aktivt griber ind.
- Titel skal forblive valgfri: en tom titel får en fallback ved gem.

---

## 2. Root cause

`components/CreateItemForm.tsx` indeholder en `useEffect`, der auto-udleder titel fra `content`:

```tsx
// Før rettelse (nu patched)
useEffect(() => {
  if (mode === "voice") return;
  if (title.trim()) return;          // stopper kun hvis titel allerede har indhold
  const suggestion = deriveTitle(content);
  if (suggestion && suggestion !== title) {
    onTitleChange(suggestion);
  }
}, [content, mode, title, onTitleChange]);
```

Problemer:
1. Effekten kører ved **enhver** ændring af `content`, uden at vide om brugeren selv har redigeret titlen.
2. Når brugeren retter titlen fra f.eks. "D" til "Duer", forbliver `title` ikke-tom, men næste tastetryk i `content` genudløser effekten og overskriver titlen med den nye `deriveTitle(content)`.
3. `app/(tabs)/board.tsx` har også en fallback ved gem: `const finalTitle = title.trim() || deriveTitle(finalContent);`, men denne kører kun ved gem og kan ikke forhindre løbende overskrivning under redigering.

Den implementerede rettelse tilføjer et `titleTouchedRef`-flag, der sættes til `true` første gang brugeren skriver i titel-inputtet. Effekten returnerer herefter tidligt, når flaget er sat.

---

## 3. Brugerflow

### Kritisk scenario (skal virke)

1. Brugeren trykker **+ Tilføj**.
2. Brugeren skriver i **Beskrivelse**: `Due`.
3. Appen udleder automatisk **Titel**: `Due`.
4. Brugeren tapper på **Titel** og retter den til `Duer`.
5. Brugeren skriver videre i **Beskrivelse** eller lader den stå.
6. **Beskrivelse** må ikke ændres pga. titel-redigering.
7. **Titel** forbliver `Duer`.
8. Brugeren trykker **Gem** → sagen gemmes med titel `Duer` og beskrivelse `Due`.

### Alternativt scenario

1. Brugeren åbner `+ Tilføj`, skriver ingenting i titel.
2. Brugeren skriver en lang beskrivelse.
3. Titel opdateres løbende som forslag fra første linje.
4. Brugeren gemmer uden at røre titel → titlen udledes ved gem.

---

## 4. Teknisk løsning

### State-mask / isolation

Introducer et `titleTouchedRef`, der track-brugerens eksplicitte redigering af titel-feltet:

```tsx
const titleTouchedRef = useRef(false);

useEffect(() => {
  if (mode === "voice") return;
  if (titleTouchedRef.current) return; // bruger har taget kontrol
  if (title.trim()) return;             // undgå unødvendige opdateringer
  const suggestion = deriveTitle(content);
  if (suggestion && suggestion !== title) {
    onTitleChange(suggestion);
  }
}, [content, mode, title, onTitleChange]);
```

Titel-inputtet markerer flaget ved første ændring:

```tsx
<TextInput
  value={title}
  onChangeText={(text) => {
    titleTouchedRef.current = true;
    onTitleChange(text);
  }}
/>
```

### Nulstilling

Når modalen lukkes eller annulleres, skal formularen nulstilles. `board.tsx` kalder allerede `resetManualForm()`, som sætter `title` og `content` tilbage til tomme strenge. `CreateItemForm` lever i `board.tsx`s scope og mountes på ny ved hver modal-åbning, så `titleTouchedRef` initialiseres til `false` automatisk.

### Gem-fallback

`board.tsx` bevarer fallback-logikken:

```tsx
const finalTitle = title.trim() || deriveTitle(finalContent);
```

Dvs. hvis brugeren har manuelt slettet titlen igen efter at have redigeret den (`titleTouchedRef = true`), vil appen stadig kunne udlede en titel ved gem — men kun hvis feltet er tomt ved gemmetidspunktet. Under redigering respekteres brugerens tomme titel.

---

## 5. UI/UX

- **Titel-feltet** viser allerede placeholderen `Titel (valgfrit)`, hvilket kommunikerer, at det er valgfrit.
- **Auto-vs-manuel indikator (frivillig):** Overvej en subtil visuel forskel, når titlen er auto-udledt frem for manuelt redigeret. Eksempler:
  - En lille grå tekst under titel-feltet: `Auto-forslag fra beskrivelse`, der forsvinder, når brugeren redigerer feltet.
  - Eller placeholder-stil på selve teksten, indtil brugeren rører ved den.
- **Minimal ændring:** Den eksisterende rettelse tilføjede ikke ny UI. Hvis PO ønsker en indikator, kan den implementeres uden at ændre state-masken.
- **Rækkefølge:** Felt-rækkefølgen i `+ Tilføj` er fortsat `Type → Beskrivelse → Titel → Kategori → Foto → Gem`. Dette understøtter, at brugeren først skriver beskrivelse og derefter vælger at rette titlen.

---

## 6. Testcases

| # | Scenario | Forventet resultat | Prioritet |
|---|----------|---------------------|-----------|
| 1 | Bruger skriver "Due" i Beskrivelse uden at røre Titel. | Titel auto-udledes til "Due". | Must |
| 2 | Bruger retter auto-titel fra "Due" til "Duer" og skriver derefter videre i Beskrivelse. | Titel forbliver "Duer"; Beskrivelse ændres kun af brugerens input. | Must |
| 3 | Bruger sletter manuelt indtastet titel og gemmer. | Ved gem udledes titel fra Beskrivelse (fallback). Sagen gemmes. | Should |
| 4 | Bruger åbner `+ Tilføj`, skriver titel før beskrivelse, derefter beskrivelse. | Titel ændres ikke af beskrivelse, fordi titel allerede var manuelt redigeret. | Must |
| 5 | Bruger åbner `+ Tilføj`, lukker modalen, åbner den igen. | `titleTouchedRef` er nulstillet; auto-titel fungerer igen fra start. | Should |
| 6 | Bruger åbner Optag (`VoiceCaptureModal`), taler tekst, retter titel, taler videre. | Voice-mode springer auto-titel over; titel styres af stemmeparser/kommandoer. | Must |
| 7 | Bruger gemmer en sag med kun Beskrivelse (tom Titel). | Sagen gemmes med `finalTitle = deriveTitle(content)` og `title` felt tomt. | Should |
| 8 | Bruger gemmer en sag med kun Titel (tom Beskrivelse) og intet foto. | Gem-knappen er aktiv (kræver title \|\| content \|\| mediaUrl); sagen gemmes. | Should |

### Regressionstests

- Verificer at kategori-forslag (`suggestCategory`) stadig bruger `title + content` korrekt.
- Verificer at Type-forslag og foto-auto-switch ikke er påvirket af `titleTouchedRef`.
- Verificer at `deriveTitle` truncerer korrekt til første 6 ord.

---

## 7. Risici + mitigation

| Risiko | Sandsynlighed | Konsekvens | Mitigation |
|--------|---------------|------------|------------|
| Bruger forventer, at auto-titel genoptages, hvis titlen slettes manuelt. | Mellem | Forvirring: tom titel efter manuel redigering får ikke nyt forslag under redigering, kun ved gem. | Dokumentér adfærden; overvej en "Nulstil titel"-knap, der også sætter `titleTouchedRef = false`. |
| `titleTouchedRef` er en ref og ikke en del af React-state; gen-renders kan være sjældne. | Lav | Ref'en opdateres synkront i event handler, så timing er korrekt. | Ingen yderligere handling; test på både iOS og Android. |
| Formularen mountes ikke på ny ved modal åben/luk, så `titleTouchedRef` bærer over. | Lav | Auto-titel virker ikke i nye modal-åbninger. | Sikr at `board.tsx` resetter state og at `CreateItemForm` unmountes (i dag renderes den kun når `modalVisible` er true). |
| PO ønsker visuel indikator for auto-vs-manuel titel. | Lav | Ekstra UI-arbejde efter implementering. | Hold indikatoren optional; tilføj som separat opgave, hvis PO kræver det. |
| Fallback `deriveTitle(finalContent)` ved gem kan returnere noget andet end det brugeren så under redigering. | Lav | Titel ændres ubemærket ved gem. | Behold `deriveTitle` logikken uændret; den er allerede afgrænset til første 6 ord. |

---

## 8. Næste trin

1. **Verifikation:** Kør testcases 1-8 manuelt i simulator/ device (iOS + Android) på nuværende `main`.
2. **Opdater baseline testplan:** Markér D3 som testet i `.claude/team/docs/data-capture-test-baseline.xlsx` / `.md`.
3. **Overvej UI-indikator:** Hvis PO ønsker visuel markering af auto-titel, oprettes en separat lille opgave.
4. **PO-godkendelse:** Fremvis det konkrete flow "Due → Duer" for PO som acceptance-test.
5. **Regression:** Kør eksisterende US-004 test-suite (E1-E13) for at sikre, at rettelsen ikke har brudt voice-flow eller type/kategori-forslag.

---

## Referencer

- `components/CreateItemForm.tsx` linje 91: `deriveTitle(content: string)`
- `components/CreateItemForm.tsx` linje 151: `titleTouchedRef`
- `components/CreateItemForm.tsx` linje 163-171: auto-derive effekt med `titleTouchedRef` gate
- `components/CreateItemForm.tsx` linje 382-386: `onChangeText` sætter `titleTouchedRef.current = true`
- `app/(tabs)/board.tsx` linje 163: `finalTitle = title.trim() || deriveTitle(finalContent)`
