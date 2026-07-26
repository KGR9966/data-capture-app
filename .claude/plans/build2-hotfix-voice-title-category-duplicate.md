# Plan: Build 2 hotfix — Voice UX + titel/type + kategori + dubletregel

**Dato:** 2026-07-15  
**Trigger:** PO-acceptancetest TC-004.1 fejlede på UX, og PO har anmodet om forbedret stemme-titel/type, automatisk kategori og smartere dublet-håndtering.

## 1. Problemer vi løser

| # | Problem | Årsag | Løsning |
|---|---|---|---|
| A | **Auto-gem giver ingen feedback.** Brugeren tror optagelsen fejlede og gentager den. | Modal nulstiller uden bekræftelse. | Luk modal, afspil afdæmpet gemt-lyd, vis toast. |
| B | **Titel/type fra stemme er ubrugelig.** "Ob" i fed skrift, type sat ud fra første ord. | `deriveTitle` tager 6 første ord; `parseVoiceCommand` bruger første ord som type/category. | Forbedret heuristik: hele sætningen → titel; type ud fra nøgleord i hele teksten; category via `suggestCategory`. |
| C | **Kategori sættes ikke automatisk ved stemmeinput.** | `parseVoiceCommand` overskriver kategori med eget mapping, ikke `suggestCategory`. | Brug `suggestCategory({title, content, type})` efter type er valgt. |
| D | **Dubletter accepteres altid.** To identiske stemme-sager gemmes begge. | Ingen dublet-tjek på item-oprettelse. | Bloker dubletter med mindre sagen matcher en dynamisk listes filter eller kategori. |

## 2. Forretningsregler (PO-godkendt)

### Regel 1 — Auto-gem efter stilhed
- Når stilheds-timeout udløses og auto-gem er slået til:
  1. Stop optagelse.
  2. Gem sagen.
  3. Afspil afdæmpet, særskilt lyd (ikke systembeep).
  4. Vis toast: "Sagen er gemt".
  5. Luk modalen og returnér til Board.
- Brugeren kan derefter optage en ny sag ved at trykke "Optag" igen.

### Regel 2 — Titel fra stemme
- Titel = den fulde, rensede sætning efter kommando/type-ord er fjernet.
- Eksempler:
  - "Observationsnote fra byggepladsen." → Titel: "Observationsnote fra byggepladsen"
  - "Fejl — vandhane utæt i køkkenet." → Titel: "Vandhane utæt i køkkenet" (efter kommando-fjernelse)
  - "Jeg har en idé til nyt skilt." → Titel: "Nyt skilt"
- Hvis titel efter fjernelse er tom, falder tilbage til `deriveTitle`.

### Regel 3 — Type fra stemme
- Type vælges ud fra nøgleord i hele teksten, ikke kun første ord.
- Prioritet: bug → idea → observation → note → other.
- Nøgleord (dansk + engelsk):
  - bug: bug, fejl, crash, fejler, virker ikke
  - idea: idé, ide, forbedring, ønske, feature, forslag
  - observation: observation, observer, bemærk, fundet
  - note: spørgsmål, hvordan, hvorfor, hvad med

### Regel 4 — Kategori fra stemme
- Efter type er fastlagt, kald `suggestCategory({ title, content, type })`.
- Brug kun forslag hvis det er bedre end "Andet".
- Brugeren kan altid overskrive manuelt.

### Regel 5 — Dubletregel
- Før oprettelse af en sag, tjek om en sag med samme **normaliserede titel** allerede findes i samme projekt.
- Hvis ja:
  - Find alle dynamiske lister tilhørende projektet.
  - Hvis sagens titel, content, category eller type matcher en dynamisk listes **søgefilter** eller **kategori** → tillad dubletten.
  - Ellers → blokér med fejl: "En sag med denne titel findes allerede. Opret en dynamisk liste hvis du vil tillade flere sager om samme emne."
- Normalisering: lower-case, fjern specialtegn, sammenlign første 60 tegn.

## 3. Teknisk tilgang

### Filer der ændres

| Fil | Ændring |
|---|---|
| `components/VoiceCaptureModal.tsx` | Auto-gem: luk modal + lyd + toast. Brug forbedret titel/type/kategori. |
| `services/voiceCommands.ts` eller ny `services/voiceParser.ts` | Forbedret parser: returnerer `{ title, content, itemType, category }` fra stemmeinput. |
| `components/CreateItemForm.tsx` | Sørg for, at manuel redigering ikke overskriver voice-titel unødigt. |
| `services/items.ts` | Tilføj `findDuplicateItem()` og `isDuplicateAllowedByDynamicList()`. |
| `services/checklists.ts` | Eksponer hjælper til at hente dynamiske lister for projekt og matche sag mod liste-filter. |

### Lyd
- Tilføj lydfil `assets/sounds/saved.mp3` (eller `.wav`).
- Brug `expo-av` til at afspille afdæmpet lyd.
- Hvis lydfil mangler, falder tilbage til kort vibration (`Vibration.vibrate(50)`).

### Toast
- Brug eksisterende toast-mønster hvis det findes; ellers vis kort overlay eller `Alert` som midlertidig løsning.
- Hvis intet toast-system findes, vises en **midlertidig inline banner** i Board i stedet.

## 4. Risici og afvejninger

| Risiko | Afhjælpning |
|---|---|
| Lyd kræver asset og expo-av. | Hvis asset mangler, brug vibration. Toast kan laves uden ny dependency. |
| Dublet-tjek kræver ekstra Firestore-read pr. oprettelse. | Cache i memory i kort tid; begræns til items i samme projekt. |
| Forbedret parser kan ændre adfærd for eksisterende brugere. | Denne build er stadig i B/C-testfasen, så det er acceptabelt. |
| Kategori fra stemme kan være upræcis. | Brugeren kan altid rette; det er et forslag. |

## 5. Testplan

### QA-fokus
1. TC-004.1: Auto-gem lukker modal, afspiller lyd, viser toast.
2. TC-004.5: Stemmekommando "gem" fungerer stadig.
3. TC-004.4: Type-forslag virker efter forbedret parser.
4. TC-004.x (ny): Stemmeinput giver brugbar titel og kategori.
5. TC-005.x (ny): Dubletter tillades, når dynamisk liste matcher.
6. Regression: Manuel oprettelse, foto, OCR, stemmekommandoer, dynamiske lister.

### Audit-fokus
1. Dublet-tjek laver ikke race-conditions eller unødvendige reads.
2. Lyd afspilles ikke i støjende loop.
3. Toast/feedback vises kun én gang per auto-gem.
4. Reglerne dokumenteres tydeligt.

## 6. Godkendelsekrav

Før implementering skal PO godkende:
- [ ] Regel 1: Auto-gem lukker modal + lyd + toast.
- [ ] Regel 2–4: Titel/type/kategori fra stemme.
- [ ] Regel 5: Dubletter tillades ved match med dynamisk liste.
- [ ] Planens tekniske tilgang og berørte filer.
