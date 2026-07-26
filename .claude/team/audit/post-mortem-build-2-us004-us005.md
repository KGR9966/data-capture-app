# Post-mortem: Build 2 — US-004 + US-005

**Dato:** 2026-07-15  
**Status:** Total NO-GO  
**Berørte områder:** US-004 (stemme/opret sag), US-005 (dynamiske lister)  
**Build-ID:** Android `ef4584ac-51ed-4ab6-b01a-250decf2eecf`, iOS `93baa590-75e4-4166-b560-d65d526fbbb4`  
**Branch:** `v2026.07.15-build2-us004-us005`  
**Commit:** `3bb094c`

---

## Hvad skete der?

Build 2 blev udviklet, QA-godkendt, audit-godkendt og sendt til PO-acceptance. PO-testede appen på fysisk enhed og fandt, at næsten alle US-004-testcases fejlede, og US-005 dynamisk liste-oprettelse fejlede fra start.

> PO's egen formulering: *"Operationen lykkedes, men patienten døde."*

Teknisk set kørte koden uden crashes, men brugeroplevelsen var så dårlig, at funktionaliteten ikke kan frigives.

---

## Konkrete fejl fundet af PO

### US-004 — Stemme / opret sag

| ID | Fejl | Konsekvens |
|---|---|---|
| TC-004.1 | Auto-gem gav ingen feedback. Brugeren stod tilbage i optage-vinduet og troede noget var galt. | Brugeren gentager optagelsen og skaber dubletter / forvirring. |
| TC-004.2 | Auto-gem-state blev ikke nulstillet mellem optagelser. | Uforudsigelig starttilstand. |
| TC-004.4–4.10 | Titel blev forkortet til første bogstav/ord: "D", "K", "S", "Hej", "Dette". | Titler er ubrugelige og vises forkert i Board. |
| TC-004.11 | Stop-kommando "gem" endte i tekstfeltet. | Sagen gemmes med ordet "Gem" som indhold. |
| TC-004.13 | Type og kategori blev sat forkert ud fra første ord. | Brugeren mister kontrol over klassificering. |
| TC-004.16 | Timer blev rød i stedet for orange ved 45 sek. | Visuel advarsel ikke som specificeret. |
| TC-004.17 | Tegnsætning vises, men titel/indhold fordeles forkert. | Parser splitter sætning uhensigtsmæssigt. |
| TC-004.19 | Manuelt redigeret titel/kategori blev overskrevet af systemtekst. | Brugeren kan ikke rette felter. |
| TC-004.20 | Efter foto tilføjet til stemme-sag med type "Fejl" blev type til "Foto", og tekst forsvandt. | Regel C for type-vs-photo-lock virkede ikke i praksis. |

### US-005 — Dynamiske lister

| ID | Fejl | Konsekvens |
|---|---|---|
| TC-005.3 | "Kunne ikke oprette den dynamiske liste" — generisk fejl. | Brugeren ved ikke, hvad der gik galt. |
| — | Projektafgrænsning ved oprettelse var uklar. | Lister kunne tilknyttes forkert projekt eller fejle stille. |
| — | Ingen forhåndsvisning før oprettelse. | Brugeren får ikke bekræftet, hvad der sker. |

---

## Rodårsager

| # | Rodårsag | Hvorfor det fik konsekvenser |
|---|---|---|
| R1 | **Ingen PO-godkendte input/output-eksempler før kode.** Regler for "titel fra stemme", "type fra stemme" og "kategori fra stemme" blev diskuteret abstrakt. | Developer implementerede en parser, der tog første ord som type og næste ord som titel. |
| R2 | **QA testede teknisk, ikke brugercentreret.** QA fandt en TypeScript-regression, men ikke at "Gem" ender i teksten. | Kritiske UX-fejl nåede PO-acceptance. |
| R3 | **Audit godkendte uden at kræve UX-eksempler.** Audit så arkitektur og regler, men ikke konkret brugeradfærd. | Governance-gaten var for svag på subjektiv UX. |
| R4 | **Master Agent hoppede over plan-godkendelse under tidspres.** Planen for stemme-redesign blev ikke godkendt med eksempler, før kode blev skrevet. | Fortolkningsfejl og manglende afklaringer. |
| R5 | **PO-acceptance skete på færdig EAS build, ikke udviklingsbuild.** Da fejl blev fundet, var build allerede brændt af. | Dyr læringscyklus og spildt build-tid. |
| R6 | **Dynamisk liste-oprettelse blev ikke tilstrækkeligt testet i B/C-designet.** Fokus lå på stemme og søgning. | Fejlede første gang PO prøvede. |
| R7 | **Manglende UX/UI Agent i teamet.** Ingen agent havde eksplicit ansvar for brugeroplevelse før kode. | Designfortolkninger endte hos Developer. |

---

## Hvad det har kostet

| Post | Omkostning |
|---|---|
| **PO-tid** | En hel dag brugt på acceptancetest af ikke-frigivelsesklar build. |
| **Build-tid/tokens** | EAS Build 2 for Android + iOS er brugt uden at kunne frigives. |
| **Momentum** | Tilliden til processen blev ramt. |
| **Dokumenter** | PO-testresultater blev desværre overskrevet, så læring må genleveres. |

---

## Læring og ændringer

### Governance-ændringer gennemført

1. **PO-UX-eksempel-gate:** Minimum 5 PO-godkendte input/output-eksempler før kode, der påvirker brugerinput/output.
2. **UX/UI Agent officiel rolle:** Reviewer brugerflows, eksempler og UI-feedback før kode.
3. **PO-acceptance før EAS build:** Udviklingsbuild/simulering skal godkendes før EAS build startes.
4. **Delegation med klare mandater:** Master Agent må selv beslutte tekniske detaljer; PO godkender brugerflow, forretningsregler og release.
5. **Tidsbegrænsede godkendelser:** Ikke-kritiske godkendelser kan auto-godkendes efter 24 timers tavshed.
6. **Testdokumenter versioneres og committes:** PO-resultater må ikke leve som untracked filer.

### Procesændringer

- Plan-godkendelse før implementering — ikke bare undervejs.
- UX/UI Agent skal godkende eksempler, før Developer starter.
- QA skal teste konkrete input/output-par, ikke kun kørsel.
- Audit skal godkende UX-eksempeltabel.

---

## Handlinger

| # | Handling | Ansvarlig | Status |
|---|---|---|---|
| 1 | Opret post-mortem og governance-opdatering | Master Agent | ✅ Udført |
| 2 | Redesign US-004 med overskrift-punktum-model | Developer Agent | 🔄 Planlagt |
| 3 | Ret US-005 dynamisk liste-oprettelse | Developer Agent | 🔄 Planlagt |
| 4 | QA-review med input/output-par | QA Agent | 🔄 Planlagt |
| 5 | Audit-gate før ny build | Audit Agent | 🔄 Planlagt |
| 6 | PO-acceptance på udviklingsbuild før EAS build | PO + Master Agent | 🔄 Planlagt |

---

## Konklusion

Build 2 var en kostbar påmindelse om, at teknisk fungerende kode ikke er nok. Fremover skal brugeroplevelsen designes og godkendes konkret — med eksempler — før en eneste linje kode skrives. Operationen skal lykkes, **og** patienten skal overleve.
