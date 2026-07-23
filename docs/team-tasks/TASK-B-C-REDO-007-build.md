# TASK-B-C-REDO-007: Build & release-forberedelse for US-001, US-002, US-003

## Formål

Efter PO-go køre EAS-build og producere installationsklare build-ID'er, QR-koder og ændringsoversigt.

## Scope

- Indhente PO-go til build.
- Køre EAS-build for iOS og Android.
- Opdatere `docs/current-build.md`.
- Markere tidligere builds som forældede.
- Sikre at installationslink og QR er klar til PO acceptance test.

## Agent-tildeling

- **Release Engineer / Deploy Agent** — kører build og opdaterer build-dokumentation.
- **Master Agent** — anmoder PO om go og præsenterer byggegrundlaget.
- **QA Agent** — bekræfter at QA-gate stadig er grøn ved build-start.

## Forudsætninger / afhængigheder

- Fase 5 (QA) er grøn.
- Fase 6 (Audit) har givet go.
- **PO har givet skriftligt go til build.**
- Git-status er ren (ingen uncommittede ændringer).

## Input-filer (læs alle)

- `.claude/team/qa/qa-report-b-c-redo.md`
- `.claude/team/audit/governance-check-b-c-redo.md`
- `.claude/team/status/team-status.md`
- `.claude/team/test/testplan-b-c-redo.md`
- `docs/current-build.md`
- `docs/backlog.md`

## Arbejdsopgaver

### 1. Forberedelse
- Verificér git-status: `git status --short` skal være tom.
- Verificér seneste commit og branch.
- Gennemgå QA-rapport og audit-godkendelse.
- Master Agent præsenterer byggegrundlag for PO og indhenter go.

### 2. EAS-build
- Kør build for iOS og Android (eller den platform PO har anmodet om).
- Overvåg build-forløb og håndter eventuelle fejl.
- Dokumentér build-ID'er og links.

### 3. Dokumentation
- Opdater `docs/current-build.md` med:
  - Build-ID'er for iOS og Android.
  - installationslink / QR.
  - Ændringsoversigt (US-001, US-002, US-003).
  - Status: "Klar til PO acceptance test".
- Markér tidligere rc2/rc3 builds som "Forældet".
- Opdater `docs/backlog.md` med status.

### 4. Kvalitetssikring før test
- Verificér at build er succesfuldt.
- Verificér at links/QR er korrekte.
- Smoketest: installer på en fysisk eller simulator-enhed, hvis muligt.

## Review-punkter

- [ ] PO-go til build er dokumenteret.
- [ ] Git-status er ren.
- [ ] Build succesfuldt for alle ønskede platforme.
- [ ] `docs/current-build.md` opdateret.
- [ ] Ældre builds markeret forældet.
- [ ] QA og audit status bekræftet.

## Output / deliverables

- Opdateret `docs/current-build.md`.
- Build-ID'er og installationslink/QR.
- Eventuel build-log ved fejl.

## Go/no-go gate

**Go-kriterier:**
- PO-go dokumenteret.
- Build succesfuldt.
- Dokumentation opdateret.

**No-go-kriterier:**
- Manglende PO-go.
- Build fejler.
- Audit stop.

## PO-go kræves

- **Ja** — PO skal give udtrykkeligt go til build, før Release Engineer må starte EAS-build.

## Begrænsninger

- Må ikke starte build før PO-go.
- Må ikke ændre kode efter QA-go uden ny QA-runde.
- Må ikke deployere til produktion uden ekstra PO-go (hvis relevant).

## Kontakt

Rapporter til Master Agent. Ved build-fejl: dokumentér og eskaler til PO for beslutning om ny runde.
