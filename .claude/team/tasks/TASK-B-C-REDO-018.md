# TASK-B-C-REDO-018: QA-verifikation for US-004, US-005 og US-006

## Formål

Verificér at koden for US-004, US-005 og US-006 opfylder design, specifikation, kvalitetsstandarder og release gate, før audit-gate og build.

## Scope

- Kodegennemgang og verifikation af US-006, US-004 og US-005.
- TypeScript, lint og pre-test checks.
- Logikgennemgang af projektoprettelse, voice-recognition, auto-gem, søgning, dynamiske lister, deling og dybe links.
- Release gate-vurdering.
- QA-rapport med trafiklys.

## Agent-tildeling

- **QA Agent** — ansvarlig for QA-rapport og go/no-go.
- **Developer Agent** — retter fejl og uddyber kode under review.
- **Master Agent** — eskalerer blocker til PO.

## Forudsætninger / afhængigheder

- Fase 6 (TASK-B-C-REDO-015, -016, -017) er afsluttet.
- Selvtest fra Developer Agent foreligger.
- Testplan (TASK-B-C-REDO-014) og design-dokumenter foreligger.

## Input-filer (læs alle)

- `.claude/team/dev/dev-notes-b-c-redo-v2.md`
- `.claude/team/test/testplan-b-c-redo-004-006.md`
- `.claude/team/design/design-006-project-creation.md`
- `.claude/team/design/design-004-voice-create.md`
- `.claude/team/design/design-005-dynamic-lists.md`
- Eksisterende kodebase med ændringer.

## Arbejdsopgaver

### 1. TypeScript og lint
- Kør `tsc --noEmit` og projektets lint-kommando.
- Dokumentér eventuelle fejl og om de er rettet eller accepteret med begrundelse.

### 2. Pre-test checks
- Kør projektets pre-test / sanity checks (f.eks. `expo prebuild`, `expo doctor`, eller tilsvarende).
- Verificér at afhængigheder er konsistente.

### 3. Logikgennemgang
- US-006:
  - Fejlsøgningsårsag dokumenteret og rettet.
  - Duplicate-tjek er trimmet, case-insensitivt og scoped korrekt.
  - Idempotens ved gentagne klik.
- US-004:
  - Fælles `CreateItemForm` bruges af både "Optag" og "+ Tilføj".
  - Auto-gem stopper ikke under aktiv indtaling.
  - Stemmekommandoer og AI-forslag implementeret efter PO-afklaringer.
  - Regressionssikring: OCR, oversættelse, deling, foto, tildeling.
- US-005:
  - Substring/fuzzy er standard; smart syntaks supplement.
  - Dynamisk opdatering, afkrydsning, done-i-bunden, deling, dybe links.
  - Firestore-regler for lister er korrekte.
  - Performance og læseomkostninger er acceptable.

### 4. Testdækning
- Sammenlign implementering med testplan.
- Identificér huller, hvor testplan kræver yderligere test eller hvor kode ikke dækker testcases.

### 5. Release gate
- Vurder om koden er klar til build.
- Dokumentér kritiske, høje, mellem og lave risici.

## Review-punkter

- [ ] TypeScript og lint er grønne (eller afvigelser er PO-godkendt).
- [ ] Pre-test checks er grønne.
- [ ] Kode følger de godkendte design-dokumenter.
- [ ] Ingen scope-creep uden PO-go.
- [ ] Ingen kendte kritiske eller høj-prioritetsfejl.

## Output / deliverables

- `.claude/team/qa/qa-report-b-c-redo-v2.md` indeholdende:
  - Status pr. US (trafiklys: rød/gul/grøn).
  - TypeScript/lint resultater.
  - Pre-test checks resultater.
  - Logikgennemgang med bemærkninger.
  - Release gate-anbefaling (GO / GO med forbehold / NO-GO).
  - Liste over kendte fejl med prioritet.

## Go/no-go gate

**Go-kriterier:**
- QA-rapport viser grønt for release.
- Ingen kritiske eller høj-prioritetsfejl uden PO-godkendt afvigelse.

**No-go-kriterier:**
- Kritiske fejl uafklaret.
- TypeScript/lint fejl, der blokkerer build.
- Scope-creep eller afvigelser fra design uden PO-go.

## PO-go kræves

- **Nej** i denne fase, men QA kan anbefale at afvente PO-afklaring ved høj-prioritetsfund.
- **PO-go kræves** før build (fase 9).

## Begrænsninger

- Må ikke selv rette produktionskode uden at eskalere til Developer Agent.
- Må ikke starte builds.
- Må ikke godkende afvigelser fra scope uden PO-go.

## Kontakt

Rapporter til Master Agent. Eskaler blocker og afvigelsesbehov til PO.
