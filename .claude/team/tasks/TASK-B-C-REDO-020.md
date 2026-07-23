# TASK-B-C-REDO-020: Build & release-forberedelse for US-004, US-005 og US-006

## Formål

Forbered og eksekver EAS-build (iOS + Android) med ændringerne fra US-004, US-005 og US-006, efter at QA og audit har givet go og PO har godkendt build.

## Scope

- Release-forberedelse: changelog, versionsnummer, build-konfiguration.
- EAS-build iOS.
- EAS-build Android.
- Opdatering af `docs/current-build.md` med build-ID, QR, link, ændringsoversigt.
- Markering af ældre builds som "Forældet".

## Agent-tildeling

- **Release Engineer / Deploy Agent** — eksekverer build og opdaterer build-dokumentation.
- **Master Agent** — anmoder PO om go til build og verificerer input.
- **QA Agent** — verificerer at release gate stadig er grøn før build.

## Forudsætninger / afhængigheder

- Fase 7 (TASK-B-C-REDO-018) er grøn.
- Fase 8 (TASK-B-C-REDO-019) har givet go.
- **PO har givet skriftligt go til build.**
- Ingen udestående kritiske eller høj-prioritetsfejl.

## Input-filer (læs alle)

- `.claude/team/status/team-status.md`
- `.claude/team/qa/qa-report-b-c-redo-v2.md`
- `.claude/team/audit/governance-check-b-c-redo-v2.md`
- `.claude/team/dev/dev-notes-b-c-redo-v2.md`
- `docs/current-build.md`
- `eas.json`
- `app.json` / `app.config.js`
- Git log med relevante commits.

## Arbejdsopgaver

### 1. Forberedelse
- Verificér at QA-go og audit-go foreligger.
- Verificér PO-go til build.
- Gennemgå ændringer og forbered changelog/ændringsoversigt.
- Sikr at versionsnummer/build-nummer er korrekte.
- Tjek at `eas.json` og app-konfiguration er konsistente.

### 2. Build
- Kør EAS-build for iOS.
- Kør EAS-build for Android.
- Overvåg build-status og håndtér eventuelle build-fejl.

### 3. Dokumentation
- Opdatér `docs/current-build.md` med:
  - Build-dato.
  - Commit / git snapshot.
  - Build-ID'er for iOS og Android.
  - Installationslink / QR-koder.
  - Ændringsoversigt (US-004, US-005, US-006).
  - Kendte begrænsninger.
- Marker ældre builds som "Forældet".

### 4. Smoke-test
- Installer build på referenceenhed/simulator og kør hurtig smoke-test:
  - Appen starter.
  - Projektoprettelse fungerer (US-006).
  - Optag og "+ Tilføj" åbner (US-004).
  - Lister-fane åbner (US-005).
  - Baseline navigation fungerer.

## Review-punkter

- [ ] PO-go til build dokumenteret.
- [ ] QA-go og audit-go dokumenteret.
- [ ] Build-ID'er for både iOS og Android registreret.
- [ ] `docs/current-build.md` opdateret.
- [ ] Smoke-test ok.

## Output / deliverables

- Opdateret `docs/current-build.md`.
- EAS-build-ID'er for iOS og Android.
- Installationslinks / QR-koder.
- Kort smoke-test-notat.

## Go/no-go gate

**Go-kriterier:**
- Begge platforme bygger succesfuldt.
- Smoke-test ok.
- Dokumentation opdateret.

**No-go-kriterier:**
- Build fejler på en eller begge platforme.
- Smoke-test viser kritiske fejl.
- PO-go mangler.

## PO-go kræves

- **Ja** — PO skal have givet udtrykkeligt go til build, før Release Engineer starter build.

## Begrænsninger

- Må ikke starte build uden PO-go.
- Må ikke deploye til app store eller produktion uden separat PO-go.
- Må ikke ændre kode under build-forberedelse uden at gå tilbage til QA-gate.

## Kontakt

Rapporter til Master Agent. Master Agent anmoder PO om go til build og formidler build-resultater.
