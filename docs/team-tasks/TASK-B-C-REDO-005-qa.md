# TASK-B-C-REDO-005: QA-verifikation for US-001, US-002, US-003

## Formål

Verificere kvaliteten af kodeændringerne for de tre user stories før audit-gate og PO-go til build.

## Scope

- Kodekvalitet: TypeScript, lint, formattering.
- Logikgennemgang af US-001, US-002 og US-003.
- Pre-test checks og release gate-vurdering.
- Sikkerhed og compliance-tjek.

## Agent-tildeling

- **QA Agent** — ansvarlig for QA-rapport og go/no-go.
- **Developer Agent** — reagerer på fundne fejl.
- **Master Agent** — koordinerer og eskalerer blocker.

## Forudsætninger / afhængigheder

- Fase 4 (Kode) er afsluttet.
- `.claude/team/dev/dev-notes-b-c-redo.md` er tilgængelig.
- `.claude/team/test/testplan-b-c-redo.md` er tilgængelig.

## Input-filer (læs alle)

- `.claude/team/dev/dev-notes-b-c-redo.md`
- `.claude/team/design/design-001-project-creation.md`
- `.claude/team/design/design-002-search.md`
- `.claude/team/design/design-003-context-lists.md`
- `.claude/team/compliance/compliance-b-c-redo.md`
- `.claude/team/test/testplan-b-c-redo.md`

## Arbejdsopgaver

### 1. Statisk analyse
- Kør TypeScript-tjek: `tsc --noEmit` eller projektets tilsvarende.
- Kør lint: `eslint` / `prettier --check` efter projektets opsætning.
- Gennemgå ændrede filer for kodekvalitet og konsistens.

### 2. Logikgennemgang
- **US-001:**
  - Er årsagen til falsk fejlmeddelelse rettet?
  - Er dubletkontrollen korrekt (case-sensitivity, trim, scope)?
  - Er der idempotens ved gentagne klik?
- **US-002:**
  - Er substring-søgning default?
  - Er smart-søgning korrekt parseret?
  - Håndterer parseren edge cases (tom streng, specialtegn, kombinationer)?
  - Er performance acceptable (debounce, datasæt)?
- **US-003:**
  - Er data-model korrekt?
  - Er opdateringslogik for lister konsistent?
  - Er afkrydsning persistenteret korrekt?
  - Er deling implementeret efter design?

### 3. Sikkerhed og compliance
- Gennemgå Firestore-regel-ændringer.
- Sikr at ingen secrets eller API-nøgler er introduceret.
- Verificér at deling ikke lækker uautoriserede data.

### 4. Release gate
- Vurder om koden er klar til build.
- Identificér kendte begrænsninger og accepterede afvigelser.

## Review-punkter

- [ ] TypeScript og lint er grønne.
- [ ] Pre-test checks er grønne.
- [ ] Logikgennemgang gennemført for alle tre US.
- [ ] Ingen kritiske eller høj-prioritetsfejl uden dokumenteret workaround.
- [ ] Compliance-krav er overholdt.

## Output / deliverables

- `.claude/team/qa/qa-report-b-c-redo.md` med:
  - Trafiklys for TypeScript, lint, logik, sikkerhed, release gate.
  - Liste over fund og status.
  - Go/no-go konklusion.

## Go/no-go gate

**Go-kriterier:**
- QA-rapport viser grønt for release.
- Ingen kritiske fejl.
- Høj-prioritetsfejl er enten rettet eller PO-godkendt som accepteret.

**No-go-kriterier:**
- Kritiske fejl i kode.
- TypeScript/lint fejler.
- Compliance-brud.

## PO-go kræves

- **Nej** — QA-rapporterer til Master Agent. Kun accepterede afvigelser af kritisk karakter skal PO-godkendes.

## Begrænsninger

- Må ikke rette kode selv (rapporterer til Developer Agent).
- Må ikke starte builds.
- Må ikke godkende release uden grøn QA-gate.

## Kontakt

Rapporter til Master Agent. Eskaler blocker til PO.
