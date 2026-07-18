# SEARCH-001 – Forbedret søgning

> Backlog-case: Brugeren ønsker en stærkere og mere fleksibel søgefunktion med præcis match, frasesøgning, filtre, gemte søgninger og fuzzy match.
> Dato: 2026-07-15
> Status: `proposed` (afventer PO-prioritering)

---

## Problem / brugerværdi

Den nuværende søgning finder tekst på tværs af projekter, men understøtter ikke:
- Præcis ordsøgning (så "vand" ikke også finder "Vandkande").
- Frasesøgning med citattegn.
- Negation eller OR.
- Filtre på type, kategori, status, ansvarlig eller projekt.
- Gemte eller nylige søgninger.

For en app der skal fungere som "din bedste ven i hverdagen" er søgningen afgørende for at finde tilbage til indtastede tanker, ideer, observationer og opgaver.

---

## Foreslåede funktioner

### P1 – Grundlæggende søgesyntaks

| Funktion | Eksempel | Formål |
|---|---|---|
| **Præcis ordsøgning** | `*vand*` | Finder kun hele ordet "vand" |
| **Frasesøgning** | `"vandkande med blomster"` | Finder præcis denne sætning |
| **Negation** | `vand -kande` | Finder "vand" men udelukker "vandkande" |
| **OR-søgning** | `vand OR flaske` | Finder begge ord |

### P2 – Filtre og feltsøgning

| Filter | Eksempel | Formål |
|---|---|---|
| Type | `type:note` / `type:bug` | Kun items af en bestemt type |
| Kategori | `kategori:indkøb` | Kun items i en kategori |
| Status | `status:åben` / `status:arkiveret` | Efter status |
| Ansvarlig | `ansvarlig:kim@...` / `ansvarlig:mig` | Items tildelt en person |
| Projekt | `projekt:renovering` eller toggle global/lokalt | Søg i ét projekt eller alle |
| Har foto | `has:photo` | Kun items med foto |
| Har kommentar | `has:comment` | Kun items med kommentarer |

### P3 – Brugervenlighed

| Funktion | Beskrivelse |
|---|---|
| **Nylige søgninger** | Gem sidste 10 søgninger; ét tryk gentager |
| **Gemte søgninger** | Bruger navngiver og gemmer en søgning; grundlag for Context Lists |
| **Søgeforslag** | Auto-complete på kategorier, ansvarlige, projekter |
| **Fuzzy søgning** | Finder "vandkande" selvom man skriver "vandkand" |
| **Projektkontekst i resultater** | Vis projektnavn på hver søgeresultat |
| **Søg i specifikke felter** | Kun titel, kun OCR, kun kommentarer |

---

## Teknisk tilgang

Da appen bruger Firestore, kan vi ikke køre fuld-text search direkte. Muligheder:

1. **Client-side filtering** (nuværende tilgang, begrænset skalérbarhed)
   - Hent items og filtrer lokalt.
   - Passer til lavt datavolumen.
   - Fuzzy og kompleks syntaks kan køres lokalt.

2. **Algolia / Typesense / Elasticsearch** (fremtidig skalering)
   - Synkronisér Firestore-data til en search-engine.
   - Giver hurtig, avanceret søgning.
   - Kræver backend og meromkostninger.

**Anbefaling:** Start med forbedret client-side filtering. Hvis datavolumen vokser, migrer til Algolia eller Typesense.

---

## MVP-anbefaling

1. Præcis ordsøgning (`*vand*`)
2. Frase + negation + OR
3. Filtre: type, kategori, status, ansvarlig
4. Nylige søgninger
5. Projekt-kontekst i resultater

Fuzzy søgning, gemte søgninger og feltsøgning tilføjes i fase 2.

---

## Relateret

- [[CHECKLIST-001-search-action-list]] — gemte søgninger bliver grundlag for Context Lists.
- [[data-capture-test-baseline]] — test af søgefunktionen.
