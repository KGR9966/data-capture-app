# TASK-B-C-REDO-002: Design & compliance for US-001, US-002, US-003

## Formål

Omsæt de tre godkendte user stories til et konkret, gennemarbejdet design med data-model, sikkerhed, risikovurdering og compliance-godkendelse. Designet skal godkendes af PO, før der skrives testplan eller kode.

## Scope

Dækker følgende user stories:
- **US-001:** Rettelse af projektoprettelse og forhindring af dubletter.
- **US-002:** Søgning med fuzzy-substring og smart-søgning.
- **US-003:** Dynamiske lister / Context Lists.

## Agent-tildeling

- **Solution Design Agent** — overordnet design, data-model, arkitektur, review.
- **Compliance/Security Agent** — Firestore-regler, GDPR, sikkerhed, App Store-egnethed.
- **Creative/AI Challenger Agent** — udfordrer design, foreslår UX-forbedringer og AI-anvendelse.

## Forudsætninger / afhængigheder

- PO har godkendt user stories US-001, US-002 og US-003.
- PO har godkendt den overordnede opgaveplan i `.claude/team/status/team-status.md`.
- Ingen kode må påbegyndes før denne fase er godkendt.

## Input-filer (læs alle)

- `.claude/team/design/us-001-project-creation-fix.md`
- `.claude/team/design/us-002-search.md`
- `.claude/team/design/us-003-dynamic-lists.md`
- `.claude/team/tasks/TASK-B-C-REDO-001.md`
- `.claude/team/status/team-status.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\collaboration-structure.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\SOP-PO-approvals.md`
- Eksisterende kodebase (især projektoprettelse, søgning, items/cases, Firestore-regler).

## Arbejdsopgaver

### 1. US-001 — Projektoprettelse
- Fejlsøg nuværende oprettelsesflow og identificér den præcise årsag til den falske fejlmeddelelse.
- Beslut unikhedsregel for projektnavne (case-sensitivity, trim, scope: global / bruger / organisation).
- Design UI-tilstande: loading, fejl, success, dublet-advarsel.
- Beslut håndtering af eksisterende dubletter.
- Sikr idempotens ved gentagne klik.

### 2. US-002 — Søgning
- Vælg arkitektur: lokal søgeindex på enhed vs. server-side/Firestore vs. hybrid.
- Definér datafelter der søges i (titel, beskrivelse, noter, evt. OCR/original tekst).
- Design søgeparser med fuzzy-substring som standard og smart-søgning som supplement.
- Prioritér operatorer: substring, `*ord*`, `"frase"`, `-negation`, `OR`, filtre.
- Design UI: søgefelt, clear-knap, syntakshjælp, resultatvisning, highlight.
- Vurder performance og debounce-strategi.

### 3. US-003 — Context Lists
- Design data-model: navn, søgestreng, ejer, oprettet, opdateret, punkter, afkrydsningsstatus.
- Aftal med PO, hvordan et "punkt" udledes fra sagsbeskrivelse/noter.
- Design opdateringslogik: trigger/cloud function eller lokal logik.
- Design UI: oversigt, listevisning, deling, omdøb, slet.
- Beslut om lister er personlige eller projektdelte.
- Beslut delingsformat: statisk tekst eller dynamisk link.

### 4. Compliance & sikkerhed
- Gennemgå Firestore-sikkerhedsregler for projekter, sager og Context Lists.
- Sikr at unikhedsregel kan håndhæves konsistent (evt. via app-logik + regler).
- GDPR-vurdering: ingen persondata i delte lister uden PO-godkendelse.
- App Store-overvejelser: nye tilladelser (f.eks. deling) skal begrundes.

### 5. Risikovurdering
- Opdatér `.claude/team/design/risk-assessment-b-c-redo.md` med risici, sandsynlighed, konsekvens og mitigations.
- Særlig fokus på: performance, parser-kompleksitet, parsing af punkter, eksisterende dubletter.

## Review-punkter

- [ ] Design dækker alle acceptkriterier i de tre user stories.
- [ ] Data-model og Firestore-regler er dokumenteret.
- [ ] Åbne spørgsmål fra user stories er besvaret (eller eskaleret til PO).
- [ ] Risikovurdering er komplet.
- [ ] Compliance Agent har givet skriftlig godkendelse.

## Output / deliverables

- `.claude/team/design/design-001-project-creation.md`
- `.claude/team/design/design-002-search.md`
- `.claude/team/design/design-003-context-lists.md`
- `.claude/team/compliance/compliance-b-c-redo.md`
- `.claude/team/design/risk-assessment-b-c-redo.md`

## Go/no-go gate

**Go-kriterier:**
- Alle design-dokumenter er skrevet og reviewet.
- Compliance Agent har godkendt design og sikkerhed.
- Master Agent har gennemgået designet med PO.
- **PO har givet skriftligt go til designet.**

**No-go-kriterier:**
- Manglende afklaring af kritiske spørgsmål (f.eks. punkt-parser, unikhedsscope).
- Compliance-afvisning.
- PO ønsker designændringer.

## PO-go kræves

- **Ja** — PO skal godkende det samlede design, før testplan og kode påbegyndes.

## Begrænsninger

- Må ikke skrive produktionskode.
- Må ikke starte builds.
- Må ikke ændre scope uden PO-go.
- Må ikke beslutte MVP/quick win/fast track — det er PO's beslutning.

## Kontakt

Rapporter til Master Agent. Eskaler åbne spørgsmål og blocker til PO.
