# PO-godkendelse: Søgning og lister — redesign v2

**Dato:** 2026-07-15  
**Godkendes af:** PO (Product Owner)  
**Fremlagt af:** Master Agent  
**Status:** Afventer PO-godkendelse (Task #86)

---

## 1. Hvad godkendes

PO skal tage stilling til følgende:

1. **Arkitektur og data-model** i `design-search-lists-v2.md`.
2. **Testplan** i `testplan-search-lists-v2.md`.
3. **Compliance-godkendelse** i `compliance-search-lists-v2.md` (GO med forbehold).
4. **Prioritering** af S1–S8 + W1.
5. **Go til kode** — Developer Agent må påbegynde implementering.

---

## 2. Nøglepunkter fra designet

| Emne | Design-beslutning |
|---|---|
| Search-parser | Struktureret rewrite der bevarer specialtegn (`&`, `/`, `-`, tal, æøå) |
| Data-model | Ny `items/{id}/checkpoints`-subcollection |
| Status-adskillelse | Listepunkt-status og item-status er helt adskilte |
| S3 | Afkrydsning opdaterer kun det matchende checkpoint; hele item-status ændres ikke |
| S4/S7 | Item-status-ændring spejles IKKE til listepunkter |
| S1 root-cause | Manglende projektvalg / rettigheder + generisk fejlmeddelelse |
| S5 | KeyboardAvoidingView + ScrollView i modals |
| S6 | Fixed header med "Tilbage" i item.tsx; kommentar-inputbar fixed i bunden |
| W1 | Ny `HighlightedText`-komponent i søgeresultater og liste-punkter |
| S8 | Validering: mindst 2 bogstaver før søgning udføres |

---

## 3. Compliance-forbehold

Compliance/Security Agent gav **GO med 3 forbehold**:

1. PO skal bekræfte, at alle projektmedlemmer (inkl. viewers) automatisk må se alle lister i projektet.
2. Firestore-regler for `items/{id}/checkpoints` skal tilføjes i designet (mangler pt.).
3. Eksisterende lister uden `projectId` skal håndteres, så de ikke bliver utilgængelige.

**PO skal tage stilling til forbehold 1 nu.** Forbehold 2 og 3 lukkes i kodefasen og reviewes af QA/Audit.

---

## 4. Åbne spørgsmål til PO før kode

| # | Spørgsmål | Standard-svar hvis du ikke siger andet |
|---|---|---|
| 1 | Må alle projektmedlemmer (inkl. viewers) se lister i projektet? | Ja |
| 2 | Hvor mange items skal klient-side søgning kunne håndtere? | 500 items per projekt |
| 3 | Skal checkpoints oprettes lazy for eksisterende items? | Ja |
| 4 | Skal projektvalg være påkrævet ved listeoprettelse? | Ja |
| 5 | Skal item altid sættes til `in_progress` når checkpoint åbnes? | Nej — kun hvis item var `done` |
| 6 | Skal smart-søgeoperatorer implementeres alle i én omgang? | Nej — start med substring + `&`-håndtering |

Hvis du er uenig i standard-svarene, angiv dine valg.

---

## 5. Estimat

**9–14 udviklerdage** fra kode-start til QA-færdig.

Største risici:
- Search-parser rewrite
- Migrering af eksisterende lister
- Performance på store datasæt

---

## 6. Handling for PO

**Svar med én af følgende:**

### A) GO — hele designet godkendes
"GO — jeg godkender arkitektur, testplan, compliance-forbehold (med eventuelle rettelser angivet) og giver tilladelse til at Developer Agent påbegynder kode."

### B) GO med rettelser
"GO med følgende rettelser: ..."

### C) NO-GO
"NO-GO — følgende skal ændres før jeg godkender: ..."

---

## Relaterede filer

- `.claude/team/design/design-search-lists-v2.md`
- `.claude/team/test/testplan-search-lists-v2.md`
- `.claude/team/compliance/compliance-search-lists-v2.md`
