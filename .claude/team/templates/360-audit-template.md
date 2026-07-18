# 360° Audit Skabelon

> Genanvendelig skabelon for helhedsorienteret audit af Data Capture (og fremtidige apps).

---

## Metadata

```yaml
name: AUDIT-YYYY-MM-DD-<scope>
auditor: <agent/team>
date: YYYY-MM-DD
app: Data Capture
type: midway | pre-release | post-mortem | ad-hoc
status: in-progress | completed
related_release: vYYYY.MM.DD-rcN
```

---

## 1. Trigger

Hvorfor køres auditet nu?
- [ ] Før release / build
- [ ] Midtvejs i større feature
- [ ] Efter incident / post-mortem
- [ ] Rutinecheck / kvartal
- [ ] Andet: __________

---

## 2. Dimensioner

For hver dimension: læs relevante dokumenter/kode, vurder, noter findings.

### 2.1 Process / Governance
- [ ] Roller og ansvar er klare
- [ ] SOP følges (godkendelser, delegation, build/deploy)
- [ ] Task handoff mellem agenter er dokumenteret
- [ ] Beslutninger og eskaleringer er sporbare
- [ ] Secrets/API-nøgler trackes i services register

### 2.2 Arkitektur / Kodekvalitet
- [ ] Filstruktur er skalerbar og konsistent
- [ ] Services er veladskilte og testbare
- [ ] Ingen duplikeret UI/konstanter/logic
- [ ] TypeScript strict overholdes (minimer `any`)
- [ ] Error handling og offline-UX er konsistent
- [ ] Native dependencies er justified og korrekt konfigureret
- [ ] Release gate dækker aktuelle dependencies

### 2.3 Sikkerhed / Compliance / App Store-readiness
- [ ] API-nøgler/secrets håndteres korrekt (ikke i git, ikke hardcoded)
- [ ] Firestore / Storage regler er least-privilege og versioneret
- [ ] PII og dataindsamling er dokumenteret
- [ ] Privatlivspolitik findes og er publiceret
- [ ] App.json tilladelser er minimale og begrundede
- [ ] App Store / Play Store privacy-angivelser er opdateret
- [ ] Deep links / share flows lækker ikke følsomme data

### 2.4 UX / Produktretning
- [ ] Onboarding er klar for førstegangsbrugere
- [ ] Core flow (capture → board → search → detail) er sammenhængende
- [ ] Avancerede features er discoverable uden at overvælde
- [ ] RBAC er konsistent og ikke punitivt
- [ ] Nye features passer til den overordnede produktvision
- [ ] Interessenter (personlig bruger, owner, editor, viewer) er betjent

---

## 3. Findings

| # | Severity | Dimension | Finding | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| 1 | HIGH | Sikkerhed | ... | ... | ... | open |
| 2 | MEDIUM | UX | ... | ... | ... | open |
| 3 | LOW | Arkitektur | ... | ... | ... | open |

**Severity:**
- **HIGH:** Blokerer release / produktion / App Store, eller har stor sikkerheds-/data-risiko.
- **MEDIUM:** Bør rettes før næste build eller inden for 1-2 sprints.
- **LOW:** Rydde-op, dokumentation, polering.

---

## 4. Action Plan

### P0 — Blokerer release

- [ ] Action 1
- [ ] Action 2

### P1 — Før næste build / umiddelbart efter

- [ ] Action 1
- [ ] Action 2

### P2 — Næste 1-2 sprints

- [ ] Action 1
- [ ] Action 2

### P3 — Strategisk / fremtidig

- [ ] Action 1
- [ ] Action 2

---

## 5. Anbefaling til PO

- [ ] Godkend P0-actions
- [ ] Godkend P1-actions
- [ ] Træf strategisk beslutning om: __________
- [ ] Godkend denne audit-proces som standard

---

## 6. Læring til næste audit

Hvad gik godt:
- ...

Hvad kan forbedres:
- ...

Ændringer til skabelonen:
- ...

---

*360° Audit — Data Capture — genanvendelig skabelon.*
