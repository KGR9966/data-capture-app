# Arkiv over godkendte user stories og use cases — Data Capture

> Fil: `.claude/team/design/usecase-archive.md`  
> Rolle: Solution Design Agent / dokumentansvarlig  
> Dato: 2026-07-15  
> Formål: Centralt arkiv over alle PO-godkendte (eller af PO accepterede/implementerede) user stories og use cases, så teamet hurtigt kan slå op: hvad er scope, hvornår blev det godkendt, hvilket design-dokument er autoritativt, og hvilke vigtige PO-beslutninger knytter sig til det.

---

## Sådan læses arkivet

- **ID / navn:** Internt ID og kort beskrivende navn.
- **Godkendelsesdato:** Dato for PO-godkendelse eller PO-accept (f.eks. RC / build-accept).
- **Beskrivelse:** Kort resumé af scope og værdi.
- **Design-dokument:** Sti til det gældende design-dokument under `.claude/team/design/` (eller andet autoritativt dokument, hvis designet ikke ligger i design-mappen).
- **Bemærkninger / vigtige PO-beslutninger:** De beslutninger, der har størst betydning for implementering, test og videreudvikling.

---

## Godkendte user stories og use cases

| ID | Navn | Godkendelsesdato | Beskrivelse | Design-dokument | Bemærkninger / vigtige PO-beslutninger |
|---|---|---|---|---|---|
| US-001 | Projektoprettelse — ret falsk fejl og forhindr dubletter (oprindelig) | 2026-07-15 (B+C observation) | Ret fejlen, hvor appen viser "Kunne ikke oprette projektet", selvom projektet faktisk oprettes; indfør unikhedskontrol af projektnavne. | `.claude/team/design/us-001-project-creation-fix.md` | Erstattet / udbygget af **US-006**. Beholdes i arkivet som historisk reference. |
| US-001 / B9 | Slet projekt og tilhørende data | 2026-07-15 | Kun ejer kan slette et projekt; cascade-delete fjerner projekt, medlemmer, sager, checkpoints, kommentarer, checklister, fotos i Storage og lokale reminders. | `.claude/team/design/us-001-delete-project.md` | Hard delete; tekstbekræftelse med projektets navn; kun owner (ikke admin); Cloud Function anbefalet; soft delete og medlemsvarsel udskudt. |
| US-002 | Søgning med fuzzy-substring og smart-søgning | 2026-07-15 | Standard søgning skal være substring/fuzzy; supplement med smart syntaks (`*ord*`, `"frase"`, `-ord`, `OR`, filtre). | `.claude/team/design/us-002-search-v2.md` (gældende efter B+C hotfix)  <br>`.claude/team/design/us-002-search.md` (oprindeligt) | Minimum 2 bogstaver før søgning; robust håndtering af `&`, `/`, `-`, tal, æøå; highlight af matches. |
| US-003 | Dynamiske lister / Context Lists (oprindeligt koncept) | 2026-07-15 | Gem søgning som dynamisk, afkrydsningsbar arbejdsliste; automatisk opdatering; deling. | `.claude/team/design/us-003-dynamic-lists.md` | Videreudviklet til **US-005**. Beholdes som koncept-reference. |
| US-004 | Ensartet og robust optagelse/oprettelse af sager | 2026-07-15 | Gør "Optag" og "+ Tilføj" ensartede; genetablér auto-gem; sikr robust optagelse; AI-forslag til Type/Kategori; stemmekommandoer. | `.claude/team/design/us-004-voice-create-collab.md` (godkendt US)  <br>`.claude/team/design/design-004-voice-create.md` (teknisk design)  <br>`.claude/team/design/us-004-field-flow-analysis.md` (feltanalyse) | Fælles `CreateItemForm`; Type=`Fejl` i stedet for `Bug`; auto-gem efter 5 sek. stilhed; modal forbliver åben efter auto-gem; Type-lås i voice-mode kan ikke overskrives af foto; titel auto-udledes fra tekst. |
| US-005 | Dynamiske lister og søgeportal | 2026-07-15 | Søgning + Context Lists: substring/fuzzy som standard; opret liste fra søgning; afkrydsning; dynamisk opdatering; deling; ny "Lister"-fane. | `.claude/team/design/us-005-dynamic-lists-v2.md` (gældende efter B+C hotfix)  <br>`.claude/team/design/us-005-dynamic-lists-collab.md`  <br>`.claude/team/design/design-005-dynamic-lists.md` | Projektspecifikke lister; brugeroprettede lister først; punkt-udledning fra linjeskift / `- ` / `* `; afkrydsning adskilt fra sags-status; nye matches markeres med badge; gamle matches gråes ud. |
| US-005-wildcard | Præcis / wildcard-søgning | 2026-07-15 | Udvid søgning med `"..."` whole-word phrase og `*...*` whole-word wildcard, uden at ændre substring-adfærd for almindelig tekst. | `.claude/team/design/us-005-wildcard-search.md` | `*...*` = hele-ord wildcard inden for ét ord; permanent hint under søgefelt; prefix/suffix wildcard (`*ord` / `ord*`) tillades. |
| US-005 / B3 | Offline redigering og synkronisering af lister | 2026-07-15 (comprehensive round) | Bruger kan se og redigere lister/listepunkter offline; ændringer synkroniseres ved online-tilstand. | `.claude/team/design/us-005-offline-lists.md` (gældende)  <br>`.claude/team/design/us-010-offline-lists.md` (tidligere udkast) | Begrænset til checkliste-punkter; `@react-native-community/netinfo`; AsyncStorage-cache + pending queue; optimistic updates; dynamisk re-match og liste-metadata-ændringer er online-only. |
| US-006 | Ret "Kunne ikke oprette projektet"-fejl og forhindr dubletter | 2026-07-15 | Kritisk bugfix: falsk fejlmeddelelse ved projektoprettelse forsvinder; indfør trim + case-insensitivt duplicate-tjek for ejerens egne projekter. | `.claude/team/design/us-006-project-creation-bug.md` (godkendt US)  <br>`.claude/team/design/design-006-project-creation.md` (teknisk design) | Root cause: manglende Firestore-regel for `projects/{id}/members`; batch/transaction for idempotens; gamle dubletter lades være; nye dubletter forhindres; inline fejl i stedet for Alert. |
| US-006 / B8 | US-006 forbedringer: tomt-navn-feedback og server-side dublet-revalidering | 2026-07-15 (comprehensive round) | Udvid US-006 med inline feedback ved tomt projektnavn og server-side revalidering af dubletter. | Dækkes af `.claude/team/design/us-006-project-creation-bug.md` og `.claude/team/design/design-006-project-creation.md` samt QA-finding i `.claude/team/qa/qa-report-us-006.md` | To gule findings fra QA (tomt navn + server-side revalidering) udskudt til denne runde; se `.claude/team/status/team-status.md` afsnit 9.7 og 9.8. |
| US-011 / B4 | Push-påmindelser på sager og listepunkter | 2026-07-15 (comprehensive round) | Lokale push-notifikationer (expo-notifications) som reminder på sag og listepunkt: dato/tid, gentagelse, note, redigering/sletning, routing ved tryk. | `.claude/team/design/us-011-push-reminders.md` | Server push / FCM og fælles påmindelser udskudt; reminders personlige og enhedsbundne i `/users/{userId}/reminders`; tilladelses-flow; daglig/ugentlig gentagelse. |
| B3 | Offline redigering og synkronisering af lister | 2026-07-15 | Se **US-005 / B3** ovenfor. | `.claude/team/design/us-005-offline-lists.md` | Samme som US-005 / B3; backlog-punkt fra comprehensive round. |
| B4 | Push-notifikationer / påmindelser om åbne listepunkter | 2026-07-15 | Se **US-011 / B4** ovenfor. | `.claude/team/design/us-011-push-reminders.md` | Samme som US-011 / B4; backlog-punkt fra comprehensive round. |
| B8 | US-006 forbedringer: tomt-navn-feedback og server-side dublet-revalidering | 2026-07-15 | Se **US-006 / B8** ovenfor. | Se US-006-dokumenterne. | Backlog-punkt fra comprehensive round. |
| B9 | Slet projekt + tilhørende sager | 2026-07-15 | Se **US-001 / B9** ovenfor. | `.claude/team/design/us-001-delete-project.md` | Backlog-punkt fra comprehensive round. |
| D1 | Photo "Åben"-tekst residue | 2026-07-15 (US-004 hotfix observation) | Rens stemme/foto-flow, så kamera/album-kommandoen ikke efterlader "Åben"/"åbn"-tekst i titel eller content. | `.claude/team/design/us-004-d1-remove-open-residue.md` | Lille restfejl fra US-004 hotfix-runden; med i comprehensive round. |
| D3 | Tilføj auto-title bug | 2026-07-15 (US-004 hotfix observation) | Auto-genereret titel må ikke overskrive en titel, brugeren aktivt har redigeret; titel skal være valgfri og uafhængig af beskrivelse, når brugeren har taget kontrol. | `.claude/team/design/us-004-d3-auto-title-bug.md` | Lille restfejl fra US-004 hotfix-runden; med i comprehensive round. |
| SEARCH-001 | Forbedret søgning | 2026-07-15 | Præcis ordsøgning, frasesøgning, negation, OR, filtre, nylige/gemte søgninger, fuzzy match. | `docs/backlog-cases/SEARCH-001-search-improvements.md` | Implementeret som en del af US-002 / US-005; specifikation i backlog-cases. |
| CHECKLIST-001 | Aktionslister fra søgning (Context Lists) | 2026-07-15 | Omdan søgeresultater til navngivne, vedligeholdelige checklister med flueben, deduplikering, sortering, deling og status-tilbagekobling. | `docs/backlog-cases/CHECKLIST-001-search-action-list.md` (original)  <br>`docs/backlog-cases/CHECKLIST-001-creative-enrichment.md` (kreativ berigelse) | Implementeret som en del af US-005; kreativ berigelse introducerer navnet "Context Lists". |
| VOICE-001 | Forbedret stemmeindtaling | 2026-07-15 | Kommandoord under indtaling, post-processing, redigerbart preview før gem. | `docs/backlog-cases/VOICE-001-voice-input-improvements.md` | Implementeret som en del af US-004; krav om redigerbart preview er senere justeret til auto-gem + modal åben. |
| CHAT-001 | Chat / kommentarer på indlæg | 2026-07-15 (RC `v2026.07.15-rc1`) | Kommentar-tråd under hvert item; understøtter flere deltagere; type `comment` omdøbes til `note`. | Ingen separat design-doc i `.claude/team/design/`; dokumenteret i `docs/backlog.md` og `docs/firestore-rules.md` samt audit-filer. | Implementeret i RC `v2026.07.15-rc1`; Firestore-regler for kommentarer; privacy policy skal opdateres. |
| COPY-001 | Kopiér billede fra sag | 2026-07-15 (RC `v2026.07.15-rc1`) | Mulighed for at kopiere foto fra item-detalje til udklipsholder og dele foto via native share-sheet. | Ingen separat design-doc i `.claude/team/design/`; dokumenteret i `docs/backlog.md`, `docs/rollback-plan.md` og audit-filer. | Implementeret i RC `v2026.07.15-rc1`; bruger `react-native-share` og `expo-clipboard`. |

---

## Status og videre referencer

- Seneste team-status (inkl. B+C redesign, US-004 hotfix og comprehensive bug/backlog-round): `.claude/team/status/team-status.md`
- Overordnet plan for den samlede bug- og backlog-runde (B3, B4, B8, B9, D1, D3 m.fl.): `.claude/plans/comprehensive-bug-backlog-round.md`
- Backlog og gennemført funktionalitet (inkl. CHAT-001, COPY-001): `docs/backlog.md`
- Baseline testplan: `memory/data-capture-test-baseline.md` og `memory/data-capture-test-baseline.xlsx`

---

## Noter til vedligeholdelse

- Når en ny user story godkendes af PO, tilføjes den med ID, navn, dato, beskrivelse, link til design-dokument og vigtige PO-beslutninger.
- Når en US erstattes af en nyere (f.eks. US-001 → US-006), beholdes den gamle med krydsreference, så historikken bevares.
- Use cases / backlog-cases uden for `.claude/team/design/` (f.eks. `docs/backlog-cases/`) refereres eksplicit med stien.
