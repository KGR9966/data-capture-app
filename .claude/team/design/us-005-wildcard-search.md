# US-005: Præcis / wildcard-søgning

## Baggrund
Nuværende søgning i `services/search.ts` er ren substring-søgning. `Liseleje` finder både "Liseleje" og "Liselejevej". Brugeren ønsker en syntaks der kan skelne mellem hele ord/udtryk og delstrenger, uden at ændre eksisterende substring-adfærd.

## Scope
- Aktiver den eksisterende `"..."` og `*...*` syntaks der allerede parses, men som i dag matches som substring.
- Bevar almindelig tekst som substring-søgning.
- Ingen ændring af token-struktur eller filter-syntaks.

## Brugerflow
1. Brugeren taster i søgefeltet.
2. `Liseleje` (almindelig tekst): substring-søgning — uændret.
3. `"Liseleje"`: præcis whole-word / phrase-match. Finder "Liseleje", "Liseleje," og "Liseleje." men ikke "Liselejevej".
4. `*liselej*`: hele-ord wildcard. Finder kun inden for ét ord, fx "Liseleje" og "Liselejevej". Bruges når brugeren vil søge bredere end præcis phrase, men stadig begrænset til hele ord.
5. Kombinationer virker som før: `"Liseleje" vej`, `"Liseleje" OR "Asserbo"`, `"Liseleje" -vej`.

## Parser-ændring
Ingen parser-ændring. `tokenize()` genkender allerede:
- `"..."` → `kind: "phrase"`
- `*ord*` / `*ord` / `ord*` → `kind: "word", exact: true` (cleaned værdi uden stjerner)
- almindelige ord → `kind: "word", exact: false`

Ændringen ligger udelukkende i `termMatches()` og `containsPhrase()`.

## Matcher-ændring
### Nuværende
- `containsPhrase()` kalder `containsTerm()` → substring.
- `termMatches()` ignorerer `exact`-flagget → substring for alle tokens.

### Ny
1. **Phrase `"..."`**: whole-word match efter normalisering.
   - Regex: `\b<escapedNormalizedPhrase>\b`.
   - Kræver escape af regex-specialtegn i phrase.

2. **Wildcard `*...*`** (`exact: true`): whole-word wildcard match efter normalisering.
   - Konverter `*` til `[^\s]*` så wildcard kun virker inden for ét ord.
   - Regex: `\b[^\s]*<escapedNormalizedValue>[^\s]*\b`.

3. **Almindelige ord** (`exact: false`): fortsæt med substring-søgning.

### Helpers at tilføje
```ts
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWholeWord(
  haystack: string,
  needle: string,
  wildcard: boolean
): boolean {
  const normalizedHaystack = normalizeForMatch(haystack);
  const normalizedNeedle = normalizeForMatch(needle);
  if (!normalizedNeedle) return false;

  const escaped = escapeRegex(normalizedNeedle).replace(/\\\*/g, "[^\\s]*");
  const pattern = wildcard
    ? `\\b[^\\s]*${escaped}[^\\s]*\\b`
    : `\\b${escaped}\\b`;

  return new RegExp(pattern, "i").test(normalizedHaystack);
}
```

### Opdaterede funktioner
- `containsPhrase(haystack, phrase)` → `containsWholeWord(haystack, phrase, false)`.
- `termMatches(haystack, term)` → `term.exact ? containsWholeWord(..., true) : containsTerm(...)`.
- `findHighlightSegments()` skal bruge samme regex-baserede matching for at markere korrekte interval-grænser, særligt for phrase/wildcard. Substring-markering for almindelige ord beholdes.

## UI-ændring
- Lille hint under søgefeltet (eller tooltip/placeholder):
  > "Almindelig tekst søger som delstreng. Brug \"...\" for præcis ord/phrase og *...* for hele-ord wildcard."
- Ingen ændring af søgefeltets adfærd eller layout ud over tekst-hint.

## Testcases
Testfil: opret `services/search.test.ts` (eller tilsvarende) med følgende cases.

| # | Query | Tekst | Forventet match | Kommentar |
|---|-------|-------|-----------------|-----------|
| 1 | `Liseleje` | "Besøg i Liselejevej" | Ja | substring, uændret |
| 2 | `Liseleje` | "Besøg i Liseleje" | Ja | substring |
| 3 | `"Liseleje"` | "Besøg i Liseleje" | Ja | whole-word phrase |
| 4 | `"Liseleje"` | "Besøg i Liselejevej" | Nej | whole-word skelner |
| 5 | `"Liseleje"` | "Liseleje," | Ja | tegnsætning tæller som boundary |
| 6 | `*liselej*` | "Liselejevej" | Ja | hele-ord wildcard |
| 7 | `*liselej*` | "Liseleje" | Ja | hele-ord wildcard |
| 8 | `*liselej*` | "leje i Lise" | Nej | "liselej" skal være sammenhængende i ét ord |
| 9 | `*lise*` | "Liseleje" | Ja | prefix/suffix wildcard |
| 10 | `"Liseleje" vej` | "Liselejevej" | Nej | phrase + substring AND kræver begge |
| 11 | `"Liseleje" -vej` | "Liselejevej" | Nej | excluded term matcher hele teksten |
| 12 | `"Liseleje" OR "Asserbo"` | "Liselejevej" | Nej | OR-gruppe phrase matcher ikke |
| 13 | `"Rødovre"` | "Rødovrevej" | Nej | æøå-normalisering før boundary |
| 14 | `*rød*` | "Rødovre" | Ja | wildcard + normalisering |
| 15 | highlight `"Liseleje"` i "Liseleje Liselejevej" | markerer kun første ord | korrekte interval-grænser |

## Risici

| Risiko | Alvor | Mitigation |
|--------|-------|------------|
| `\b` word boundaries kan opføre sig uventet med ikke-ASCII eller specialtegn. | Medium | Normaliser æøå før matching; test cases dækker æøå og tegnsætning. |
| Eksisterende brugere der brugte `"..."` som substring får færre resultater. | Lav | Det er ønsket adfærd; kommunikeres i release notes. |
| `*...*` gik fra inaktivt flag til aktiv whole-word wildcard; kan overraske. | Lav | Dokumentér syntaks tydeligt i UI-hint. |
| Highlight-intervaller kan blive forskudt når æøå normaliseres til 2 tegn. | Medium | Brug regex-match på original tekst efter normalisering; verificer med tests. |
| Performance ved mange items: regex per term per item. | Lav | Samme kompleksitetsorden som før; client-side dataset er begrænset. |

## Beslutninger der skal godkendes
1. Skal `*...*` være whole-word wildcard (indeni ét ord) eller præcis phrase? — Foreslået: whole-word wildcard.
2. Skal hint vises permanent eller kun ved fokus/placeholder? — Foreslået: permanent kort linje under søgefeltet.
3. Skal vi tillade `*` kun i start eller slut (`*ord` / `ord*`) som whole-word prefix/suffix? — Foreslået: ja, samme wildcard-logik.

## Næste trin
1. PO-godkendelse af design.
2. Implementer `containsWholeWord` og opdater `termMatches` / `containsPhrase` / `findHighlightSegments`.
3. Tilføj unit tests.
4. Manuel test med B+C data og søgefelt-hint.
