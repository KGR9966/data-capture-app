# TASK-B-C-REDO-013: Design & compliance for US-004, US-005 og US-006

## Formål

Omsæt de tre godkendte user stories til et konkret, gennemarbejdet design med data-model, sikkerhed, risikovurdering og compliance-godkendelse. Designet skal godkendes af PO, før der skrives testplan eller kode.

## Scope

Dækker følgende user stories:
- **US-006:** Ret "Kunne ikke oprette projektet"-fejl og forhindr dubletter.
- **US-004:** Ensartet og robust optagelse/oprettelse af sager.
- **US-005:** Dynamiske lister og søgeportal.

## Agent-tildeling

- **Solution Design Agent** — overordnet design, data-model, arkitektur, review.
- **Compliance/Security Agent** — Firestore-regler, GDPR, sikkerhed, App Store-egnethed.
- **Creative/AI Challenger Agent** — udfordrer design, foreslår UX-forbedringer og AI-anvendelse.

## Forudsætninger / afhængigheder

- PO har godkendt user stories US-004, US-005 og US-006.
- PO har godkendt den overordnede opgaveplan i `.claude/team/status/team-status.md`.
- PO har besvaret åbne spørgsmål i US-006 (dubletpolitik, unikhedsscope, beskedtekst, beskrivelsesfelt) — ellers eskaleres de straks.
- Ingen kode må påbegyndes før denne fase er godkendt.

## Input-filer (læs alle)

- `.claude/team/design/us-006-project-creation-bug.md`
- `.claude/team/design/us-004-voice-create-collab.md`
- `.claude/team/design/us-005-dynamic-lists-collab.md`
- `.claude/team/tasks/TASK-B-C-REDO-012.md`
- `.claude/team/status/team-status.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\collaboration-structure.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\SOP-PO-approvals.md`
- Eksisterende kodebase (projektoprettelse, voice recognition, søgning, items/cases, lister, Firestore-regler).

## Arbejdsopgaver

### 1. US-006 — Projektoprettelse
- Fejlsøg nuværende oprettelsesflow og identificér den præcise årsag til den falske fejlmeddelelse.
- Design idempotent oprettelsesflow med klar loading/fejl/success-tilstand.
- Beslut unikhedsregel for projektnavne (case-sensitivity, trim, scope: global / bruger / projektgruppe).
- Design UI-tilstande: loading, fejl, success, dublet-advarsel.
- Beslut håndtering af eksisterende dubletter (merge, omdøb, marker, ignorer).
- Sikr at gentagne klik på "Opret" ikke skaber flere projekter.

### 2. US-004 — Voice / Create Item
- Design fælles `CreateItemForm`-komponent med felter i den rækkefølge PO har godkendt.
- Design auto-gem-logik: stilhedstimer, `isFinal`-håndtering, interaktion med optagestatus.
- Design håndtering af OS-timeout og genoptagelse/sammenkædning af optagelser.
- Specificér stemmekommandoer (gem, slet alt, kategori, punktum/komma/ny linje).
- Design interaktion mellem Type og Kategori (AI-forslag, brugeroverride, historik).
- Sikr at OCR, oversættelse, deling og fotoalbum/kamera integreres korrekt i den fælles formular.

### 3. US-005 — Dynamiske lister og søgeportal
- Vælg søgearkitektur: lokal søgeindex på enhed vs. server-side/Firestore vs. hybrid.
- Definér datafelter der søges i (titel, beskrivelse, noter, evt. OCR/original tekst).
- Design søgeparser med substring/fuzzy som standard og smart syntaks (`*ord*`, `"frase"`, `-negation`, `OR`, filtre) som supplement.
- Design data-model for `checklists`, `checklistItems` og relation til `items` / `projects`.
- Aftal med PO, hvordan et "punkt" udledes fra sagsbeskrivelse/noter (linjeskift, `- `, `* `, sætninger, bruger-markeret).
- Design dynamisk opdateringslogik: hvornår matches tilføjes/fjernes/gråes ud.
- Design UI: ny "Lister"-fane, listevisning, portal-kort, afkrydsning, sortering, redigering, sletning.
- Design deling: native share-sheet med tekst + dyb link med rettighedstjek.

### 4. Compliance & sikkerhed
- Gennemgå Firestore-sikkerhedsregler for projekter, sager, lister og listepunkter.
- Sikr at unikhedsregel for projektnavne kan håndhæves konsistent (app-logik + evt. regler).
- GDPR-vurdering: ingen persondata i delte lister uden PO-godkendelse.
- App Store-overvejelser: nye tilladelser (f.eks. deling) skal begrundes.
- Vurder Firestore læseomkostninger ved mange dynamiske lister.

### 5. Risikovurdering
- Opdatér `.claude/team/design/risk-assessment-b-c-redo-v2.md` med risici, sandsynlighed, konsekvens og mitigations.
- Særlig fokus på: projektoprettelsesfejl, voice-timeout, parser-kompleksitet, parsing af punkter, eksisterende dubletter, dynamisk opdatering og læseomkostninger.

## Review-punkter

- [ ] Design dækker alle acceptkriterier i de tre user stories.
- [ ] Data-model og Firestore-regler er dokumenteret.
- [ ] Åbne spørgsmål fra user stories er besvaret (eller eskaleret til PO).
- [ ] Risikovurdering er komplet.
- [ ] Compliance Agent har givet skriftlig godkendelse.

## Output / deliverables

- `.claude/team/design/design-006-project-creation.md`
- `.claude/team/design/design-004-voice-create.md`
- `.claude/team/design/design-005-dynamic-lists.md`
- `.claude/team/compliance/compliance-b-c-redo-v2.md`
- `.claude/team/design/risk-assessment-b-c-redo-v2.md`

## Go/no-go gate

**Go-kriterier:**
- Alle design-dokumenter er skrevet og reviewet.
- Compliance Agent har godkendt design og sikkerhed.
- Master Agent har gennemgået designet med PO.
- **PO har givet skriftligt go til designet.**

**No-go-kriterier:**
- Manglende afklaring af kritiske spørgsmål (f.eks. punkt-parser, unikhedsscope, dubletpolitik).
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
