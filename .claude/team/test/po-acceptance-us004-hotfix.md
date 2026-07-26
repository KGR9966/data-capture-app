# PO-acceptance — US-004 hotfix (Build 2 rettelser)

**Dato:** 2026-07-15  
**Branch:** `fix/us004-voice-redesign`  
**Forudsætning:** Ny EAS hotfix-build installeret på fysisk enhed.

---

## Testcases — stemme-oprettelse (E1–E12)

| # | Handling | Forventet resultat |
|---|---|---|
| E1 | Sig "Byggemarked punktum køb maling punktum" | Titel: `Byggemarked`; Content: `køb maling.`; Type: `note`; Kategori: `Note` |
| E2 | Sig "Bil komma oliepunktum" | Titel: `Bil`; Content: `olie.`; Type: `note` |
| E3 | Sig "Hus punktum vindue komma rudepunktum" | Titel: `Hus`; Content: `vindue, rude.`; Type: `note` |
| E4 | Sig "Projekt punktum opgave 1 ny linje opgave 2 punktum" | Titel: `Projekt`; Content: `opgave 1\nopgave 2.`; Type: `note` |
| E5 | Sig "Gem" efter en sætning | Item gemmes; modal lukker; vibration + toast vises |
| E6 | Sig "Silvan punktum hammer komma sav punktum gem" | Titel: `Silvan`; Content: `hammer, sav.`; Type: `note`; gemmes automatisk efter 5 sek. stilhed |
| E7 | Sig "Billede punktum smukt hus gem" | Titel: `Billede`; Content: `smukt hus.`; Type: `note` (ikke `photo`) |
| E8 | Sig "Køkken punktum køb køleskab punktum" | Titel: `Køkken`; Content: `køb køleskab.`; Type: `note` |
| E9 | Sig "Haveskur punktum mål 2 meter komma 3 meter punktum" | Titel: `Haveskur`; Content: `mål 2 meter, 3 meter.`; Type: `note` |
| E10 | Sig "Anlægsarbejde punktum grave ny linje så komma kantsten punktum" | Titel: `Anlægsarbejde`; Content: `grave\nså, kantsten.`; Type: `note` |
| E11 | Sig "Åbn album" under optagelse → vælg billede → vent | Optagelsen pauses under valg og genoptages efter; billedet vedhæftes; type forbliver `note`; titel ændres ikke |
| E12 | Sig "Åbn kamera" under optagelse → tag billede → vent | Optagelsen pauses under foto og genoptages efter; billedet vedhæftes; type forbliver `note` |
| E13 | Sig "Silvan punktum hammer ny linje komma sav punktum gem" | Titel: `Silvan`; Content: `hammer,\nsav.` (ingen mellemrum efter linjeskift) |

---

## Testcases — type/kategori og foto

| # | Handling | Forventet resultat |
|---|---|---|
| TC-001 | Opret item via stemme uden foto | Type = `voice`, Kategori = `Voice` |
| TC-002 | Under stemme-optagelse: tryk "Åbn album" og vælg foto | Type forbliver `voice`; Kategori forbliver `Voice` |
| TC-003 | Under stemme-optagelse: tryk "Åbn kamera" og tag foto | Type forbliver `voice`; Kategori forbliver `Voice` |
| TC-004 | Efter auto-gem åbnes item i board | Felterne title/content/type/category stemmer overens med det talte; billedet vises |
| TC-005 | Kopier et billede fra anden app og del til Data Capture | Grønt visuelt feedback; item oprettes med type `photo`; ingen crash |

---

## Testcases — Firestore / regression

| # | Handling | Forventet resultat |
|---|---|---|
| TC-006 | Åbn board med projektmedlemmer | Ingen `firestore/permission-denied` i konsol |
| TC-007 | Opret nyt item manuelt uden stemme | Item gemmes korrekt; regression OK |
| TC-008 | Opret projekt | Ingen falsk fejl; dubletter af samme navn forhindres |

---

## Go / No-go

- [ ] Alle E1–E13 passed
- [ ] TC-001–TC-005 passed
- [ ] TC-006–TC-008 passed (regression)
- [ ] Ingen crash eller freeze efter foto under optagelse
- [ ] Godkendes til merge/release: **GO / NO-GO**
