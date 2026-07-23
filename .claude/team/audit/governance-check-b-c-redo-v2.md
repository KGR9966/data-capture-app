# Governance-check B+C redo v2 — Audit Agent

**Dokument:** `.claude/team/audit/governance-check-b-c-redo-v2.md`  
**Dato:** 2026-07-15  
**Audit Agent:** Uafhængig kontrol af fase 4-7  
**Fokus:** US-006 — projektoprettelsesfejl og dubletforhindring  
**Status for US-004/US-005:** Design og testplan er gennemført; kode og QA for disse to US er ikke afsluttet og indgår derfor ikke i denne audit.

---

## 1. Executive summary

| Kontrolpunkt | Resultat |
|---|---|
| User stories godkendt før design | ✅ Ja — US-006 er PO-godkendt, se `team-status.md` og `us-006-project-creation-bug.md`. |
| Design godkendt før kode | ✅ Ja — `design-006-project-creation.md` og `compliance-b-c-redo-v2.md` er PO-godkendt. |
| Testplan klar før kode | ✅ Ja — `testplan-b-c-redo-004-006.md` dækker US-006. |
| QA-gate gennemført før audit | ✅ Ja — `qa-report-us-006.md` giver GO med accepterede forbehold. |
| Scope-creep | ✅ Ingen inden for US-006. |
| Uautoriserede builds | ✅ Intet build startet for de aktuelle US-006 ændringer. |
| Master Agent skrev produktionskode | ✅ Ingen direkte evidens for US-006; kode tilsyneladende Developer Agent. |
| Gule findings eskaleret til PO og backlog | ✅ Ja — US6-001 og US6-002 er registreret i `data-capture-backlog.md`. |
| Git-hygiejne | ⚠️  Ucommittede ændringer — oprindelse kendt, men skal committes før build. |
| Dokumentation af PO-go til fase 6 | ⚠️  `team-status.md` viser stadig uafkrydset "PO giver go til fase 6 (Kode)". |
| Teknisk risiko i Firestore-regler | ⚠️  Mulig regelafvisning ved batch-oprettelse pga. brug af `get()` frem for `getAfter()`. |

**Samlet konklusion: GO til audit-gaten**, med forbehold og eskaleringer der skal afklares før build.

---

## 2. Scope og input-filer

Gennemgåede filer:

- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-013.md` (Design & compliance)
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-014.md` (Testplan)
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-015.md` (Kode — US-006)
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-016.md` (Kode — US-004)
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-017.md` (Kode — US-005)
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-018.md` (QA-verifikation)
- `C:\Users\kimgr\data-capture-app\.claude\team\tasks\TASK-B-C-REDO-019.md` (Audit-gate, denne opgave)
- `C:\Users\kimgr\data-capture-app\.claude\team\status\team-status.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\design-006-project-creation.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\design\us-006-project-creation-bug.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\compliance\compliance-b-c-redo-v2.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\test\testplan-b-c-redo-004-006.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\qa\qa-report-us-006.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\collaboration-structure.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\SOP-PO-approvals.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-backlog.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-b-c-status.md`
- `C:\Users\kimgr\data-capture-app\services\projects.ts`
- `C:\Users\kimgr\data-capture-app\app\(tabs)\index.tsx`
- `C:\Users\kimgr\data-capture-app\firestore.rules`
- Git log og status for `C:\Users\kimgr\data-capture-app`

---

## 3. Governance-check pr. kontrolpunkt

### 3.1 User stories og design godkendt før kode

- `team-status.md` angiver, at PO har godkendt US-004, US-005 og US-006.
- `us-006-project-creation-bug.md` indeholder PO-beslutningerne for eksisterende dubletter, unikhedsscope, beskedtekst og beskrivelsesfelt.
- `design-006-project-creation.md` er baseret på de godkendte beslutninger og har status "Klar til PO-review"; team-status bekræfter, at designfasen er gennemført og godkendt af PO.
- `compliance-b-c-redo-v2.md` giver betinget godkendelse af designet under forudsætning af, at de krævede Firestore-regelændringer følger med i samme build og testes af QA.

**Vurdering:** Overholdt for US-006.

### 3.2 Testplan klar før kode

- `testplan-b-c-redo-004-006.md` er oprettet og indeholder testcases TC-006.1 til TC-006.11 for US-006, inklusive regressionscases.
- Testplanen dækker de Gherkin-baserede acceptkriterier i `us-006-project-creation-bug.md`.
- Task-beskrivelsen for kodefasen (TASK-B-C-REDO-015) refererer eksplicit til testplan-afsnittet for US-006.

**Vurdering:** Overholdt.

### 3.3 QA-gate gennemført før audit

- `qa-report-us-006.md` er dateret 2026-07-15 og anbefaler "GO med accepterede forbehold".
- TypeScript og lint er grønne.
- Pre-test checks er grønne med én ikke-blokerende advarsel.
- Ingen kritiske eller høj-prioritets blockere.

**Vurdering:** Overholdt for US-006.

### 3.4 Scope-kontrol

De aktuelle kodeændringer begrænser sig til:

- `services/projects.ts` — ny `isDuplicateProjectName()`, `createProject` omskrevet til `writeBatch`.
- `app/(tabs)/index.tsx` — inline fejl, `creating`-flag, deaktiveret knap.
- `firestore.rules` — ny regel for `projects/{projectId}/members/{memberId}` og email-baseret læseadgang.

Ingen ændringer vedrører:

- Offline redigering / push-notifikationer
- Globale lister
- Semantisk deduplikering
- PDF-eksport
- OCR, deling, oversættelse, fotoalbum/kamera, tildeling

**Vurdering:** Ingen scope-creep i US-006.

### 3.5 Ændringskontrol

- Godkendt funktionalitet (OCR, deling, oversættelse, fotoalbum/kamera, tildeling) er ikke ændret.
- Data-model er uændret bortset fra den semantiske ændring, at `createProject` nu bruger `writeBatch` og genererer `roles: { [ownerId]: "owner" }` i stedet for den tidligere betingede ternary. Dette er en forretningslogik-ændring inden for det godkendte design (idempotens, rollback). Den er PO-godkendt via designfasen.
- Firestore Security Rules ændres. SOP §2.2a kræver PO-go før deploy af nye regler; design og compliance er PO-godkendt, men selve deploy skal godkendes før build.
- Items- og comments-reglerne i `firestore.rules` refererer stadig til `.data.members`, som ikke findes i `Project`-interfacet (eksisterende bug, uden for US-006). Dette er dokumenteret i både `compliance-b-c-redo-v2.md` og `qa-report-us-006.md`.

**Vurdering:** Ingen uautoriserede ændringer af godkendt funktionalitet.

### 3.6 Habilitet og mandat

- Der er ingen commits eller signaturer, der peger på, at Master Agent har skrevet produktionskode for US-006.
- De aktuelle ucommittede ændringer ligger i overensstemmelse med TASK-B-C-REDO-015 (Developer Agent).
- Bemærk: `data-capture-b-c-status.md` beskriver, at den oprindelige B+C-implementering blev udført "solo i hovedsession uden sub-agenter, review eller Plan Mode", og at "der blev startet nye EAS-builds uden eksplicit PO-godkendelse". Dette er en læringspointe fra forrige runde, ikke en del af den aktuelle US-006-flow.
- Der er ingen tegn på, at Developer Agent har ændret scope.

**Vurdering:** Overholdt for US-006; historisk note om B+C inkluderet.

### 3.7 Dokumentation og git-hygiejne

- `git status --short` viser ændringer i `app/(tabs)/index.tsx`, `firestore.rules` og `services/projects.ts`, samt utracked filer under `.claude/team/` og `.claude/eas-build-status.log` / `.claude/poll-eas-builds.sh`.
- Kodeændringerne er ikke committet. Oprindelsen er kendt (TASK-B-C-REDO-015), men de skal committes med klare beskeder før build.
- `.claude/eas-build-status.log` og `.claude/poll-eas-builds.sh` er rester fra et tidligere B+C-build (rc3, 2026-07-18). De er ikke relateret til de aktuelle US-006 ændringer, men bør ryddes op eller arkiveres for at undgå forvirring.
- Der findes ikke noget `dev-notes-b-c-redo-v2.md`, selvom TASK-B-C-REDO-015 og QA-rapporten forventer fejlsøgningsnoter. Root-cause-analysen er dog dokumenteret i `design-006-project-creation.md`.
- Testplan-faktiske-resultatfelterne er ikke udfyldt (alle status ⚪). Dette er forventet, da QA har foretaget kode- og logikreview snarere end manuel testkørsel.

**Vurdering:** Git-hygiejne skal rettes før build. Manglende dev-notes er en dokumentationsmæssig afvigelse, men ikke blocker for audit.

---

## 4. Fund og afvigelser

### 4.1 Manglende skriftlig PO-go til fase 6 i team-status

**Alvor:** Mellem  
**Beskrivelse:** `team-status.md` afsnit 8 har punktet "PO giver go til fase 6 (Kode)" som uafkrydset, selvom US-006-koden er færdig og QA-rapporten foreligger.  
**Relevans:** TASK-B-C-REDO-015 angiver, at PO-go ikke kræves i kodefasen, men kun før build (fase 9). Der er dermed en modstrid mellem den overordnede faseplan og den specifikke task.  
**Anbefaling:** PO bør bekræfte skriftligt, at fase 6 for US-006 blev godkendt, alternativt give retroaktivt go. Derefter skal `team-status.md` opdateres, så faseplanen afspejler den faktiske tilstand.

### 4.2 Ucommittede kodeændringer

**Alvor:** Mellem  
**Beskrivelse:** De tre US-006-filer (`services/projects.ts`, `app/(tabs)/index.tsx`, `firestore.rules`) er ændret, men ikke committet.  
**Relevans:** No-go-kriteriet i TASK-B-C-REDO-019 nævner "Ucommittede ændringer med uklar oprindelse" som no-go. Oprindelsen er kendt, men for build kræves committed historik.  
**Anbefaling:** Developer Agent committes ændringerne med klare beskeder (f.eks. `fix(US-006): atomic project creation, duplicate check, inline errors`) før build.

### 4.3 Manglende dev-notes-fil

**Alvor:** Lav  
**Beskrivelse:** `dev-notes-b-c-redo-v2.md` findes ikke, selvom TASK-B-C-REDO-015 forventer fejlsøgningsnoter.  
**Relevans:** Root-cause og design er dokumenteret i `design-006-project-creation.md`.  
**Anbefaling:** Opret eller omdøb et notat, så kodefasens begrænsninger og fejlsøgningshistorik er samlet ét sted. Dette er ikke en blocker for audit.

### 4.4 Teknisk risiko: `get()` vs. `getAfter()` i members-regel

**Alvor:** Høj (potentiel re-introduktion af den falske fejlmeddelelse)  
**Beskrivelse:** `createProject` bruger nu `writeBatch(db)` til at oprette både `projects/{id}` og `projects/{id}/members/{memberId}` atomisk. Firestore-reglen for members-subcollection bruger `get()` til at læse projekt-dokumentet for at verificere ejerskab. Ifølge Firebase-dokumentationen læser `get()` den aktuelt committede tilstand, mens `getAfter()` læser den staged tilstand efter batch/transaction. Hvis members-regelens `get()` evalueres før projekt-dokumentet er committed, kan reglen afvise medlemsoprettelsen, hvilket medfører, at hele batchen fejler — og den oprindelige "Kunne ikke oprette projektet"-fejl vender tilbage.  
**Relevans:** Dette er ikke en governance-afvigelse i sig selv, men en kritisk teknisk risiko for PO-accept. QA-rapporten fangede ikke dette; den fokuserede på manglende server-side dublet-revalidering.  
**Anbefaling:** Verificér regelopførslen på Firebase Emulator med staging-regler, før build godkendes. Hvis `get()` afviser, skal reglen omskrives til `getAfter()` for members-oprettelser, eller `createProject` skal gå tilbage til to separate skrivninger med rollback-håndtering i app-koden. Kilde: [Firebase: Writing conditions for Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions).

### 4.5 Eksisterende bug i items/comments-regler

**Alvor:** Mellem  
**Beskrivelse:** `firestore.rules` linje 82 og 114 refererer til `get(...).data.members`, men feltet hedder `memberEmails`. Dette er en eksisterende fejl uden for US-006-scope, men den kan påvirke læseadgang for delte projekter i andre flows.  
**Relevans:** SOP §2.2a: Master Agent skal advare PO, hvis nye regler kan påvirke eksisterende funktionalitet. `compliance-b-c-redo-v2.md` og `qa-report-us-006.md` har allerede dokumenteret dette.  
**Anbefaling:** Følg op i separat opgave; PO bør beslutte, om den skal rettes i samme build eller i næste release.

---

## 5. Eskaleringer til PO og Master Agent

### 5.1 Til PO

1. **Bekræft fase 6-go for US-006:** `team-status.md` viser uafkrydset "PO giver go til fase 6 (Kode)". Godkendte du, at Developer Agent startede kodefasen for US-006? Hvis ja, skal `team-status.md` opdateres.
2. **Accepter gule findings som release-forbehold:** QA fandt to gule punkter (manglende inline fejl ved tomt navn og manglende server-side dublet-revalidering). De er registreret i `data-capture-backlog.md`. Bekræft, at de udskydes til næste release.
3. **Godkend Firestore-regelændringer før deploy:** SOP §2.2a kræver PO-go før deploy af nye Firestore-regler. Design og compliance er godkendt, men selve deploy skal godkendes, og der skal køres smoke-test (opret projekt, item, kommentar, slet item, log ind) efter deploy.
4. **Teknisk risiko ved members-regel:** Vurder om du vil have, at teamet verificerer `get()`/`getAfter()`-problemet på emulator, før build startes. Hvis reglen afviser batchen, skal rettelsen prioriteres.
5. **Eksisterende items/comments-regel-bug:** Godkend, om rettelse af `.data.members` → `.data.memberEmails` skal med i samme build eller udskydes.

### 5.2 Til Master Agent

1. **Opdater `team-status.md`:** Afkryds "PO giver go til fase 6 (Kode)" og flyt fokus til "Audit-go modtaget, afventer PO-go til build".
2. **Sørg for commit af US-006-ændringer:** Ucommittede ændringer skal committes med klare beskeder før build.
3. **Ryd op i build-artifacts:** Arkiver eller fjern `.claude/eas-build-status.log` og `.claude/poll-eas-builds.sh`, som er rester fra rc3-bygget.
4. **Etablér dev-notes:** Opret `dev-notes-b-c-redo-v2.md` med fejlsøgningsnoter og kendte begrænsninger for US-006.
5. **Planlæg emulator-test af members-reglen:** Sørg for, at QA eller Developer Agent tester `createProject` mod de opdaterede regler på Firebase Emulator, før PO-go til build gives.

---

## 6. Læringspunkter

1. **Faseplan vs. task-beskrivelser skal være konsistente.** `team-status.md` krævede PO-go til fase 6, mens task-beskrivelsen sagde nej. Det skaber tvivl ved audit. Faseplanen bør spejle den gældende SOP og de specifikke task-filer.
2. **Dev-notes bør skrives løbende.** Selvom root-cause findes i design-dokumentet, forventer kode- og QA-fasen et samlet dev-notes-dokument.
3. **Build-artifacts bør ryddes op mellem builds.** Rester fra tidligere builds (logs, poll-scripts) kan forveksles med nye, uautoriserede builds.
4. **Firestore-regelændringer skal testes på emulator før hvert build.** Tekniske regelinteraktioner (som `get()` i en batch) kan genintroducere netop den bug, man forsøger at rette.

---

## 7. Go / no-go konklusion

**Anbefaling: GO**

Audit Agent giver **go til audit-gaten** for US-006, fordi:

- User story, design og compliance er PO-godkendt.
- Testplanen dækker US-006's acceptkriterier.
- QA-gate er gennemført med GO med accepterede forbehold.
- Der er ingen scope-creep inden for US-006.
- Ingen EAS-build er startet for de aktuelle US-006-ændringer.
- De to gule findings er eskaleret til PO og dokumenteret i backlog.

**Betingelser før build (fase 9 / PO-go):**

1. PO bekræfter skriftligt, at fase 6 for US-006 var godkendt (eller giver retroaktivt go), og `team-status.md` opdateres.
2. Ucommittede ændringer committes med klare beskeder.
3. `dev-notes-b-c-redo-v2.md` oprettes med US-006-fejsøgningsnoter.
4. Firestore-reglerne for members-subcollection testes på emulator; hvis `get()` afviser batchen, rettes reglen til `getAfter()` før build.
5. PO godkender deploy af Firestore-reglerne og smoke-testes bagefter.
6. Rester fra rc3-bygget (`.claude/eas-build-status.log`, `.claude/poll-eas-builds.sh`) ryddes op.

**Eskaleret til PO:** Manglende fase 6-go i `team-status.md`, teknisk risiko i members-regel, eksisterende items/comments-regel-bug.

**Eskaleret til Master Agent:** Opdatering af status, commit af ændringer, dev-notes, emulator-test, oprydning.

---

**Udarbejdet af:** Audit Agent  
**Næste skridt:** PO-godkendelse af ovenstående betingelser og herefter PO-go til build.
