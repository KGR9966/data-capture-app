# Plan: B (quick wins) + C (Context Lists)

Mål: levere tre hurtige forbedringer (B), derefter Context Lists MVP (C) i to separate EAS preview builds, så vi kan teste undervejs.

---

## Overordnet rækkefølge

Ét EAS preview build med både B og C:

1. **B (quick wins)**
   - B1: Del tekst og oversættelser fra en sag.
   - B2: Forbedret søgning – `*vand*`, `"frase"`, `-negation`, `OR` + simple filtre.
   - B3: Stemmekommandoord + redigerbart preview.
2. **C (Context Lists MVP)**
   - Ny "Aktionslister" fane.
   - Opret liste fra søgeresultater.
   - Checkboxes, deduplikering, alfabetisk sortering, udførte i bund.
   - Automatisk status-tilbagekobling til kildesag.
   - Deling via `react-native-share`.
   - Deep-link-støtte `datacapture://open-list?id=...` klar til GEOFENCE-001.

Alt bygges, testes og frigives i én omgang.

---

## Fase 1 – Quick wins (B)

### B1: Del tekst og oversættelser fra sag

Hvad:
- I `app/item.tsx`: tilføj del-knapper for
  - item `content`
  - `ocrOriginal` (hvis foto med OCR)
  - `ocrTranslated` (hvis oversat)
- I `components/VoiceCaptureModal.tsx`: tilføj del-knapper for OCR-tekst og oversættelse (i dag findes kun "Kopiér").
- Genbrug `react-native-share` via ny funktion `shareText` i `services/share.ts`.

Teknik:
- `services/share.ts`: tilføj `shareText(text: string, title?: string, subject?: string)` som bruger `Share.open({ message: text, title, subject })`.
- Tilføj lokal feedback ("Deling åbnet") – ikke nødvendigt at gemme state; `failOnCancel: false`.
- Hold UI ens med de eksisterende "Kopiér foto" / "Del foto" knapper.

### B2: Forbedret søgning

Hvad:
- `*vand*` matcher hele ordet `vand` (word boundary), men ikke `Vandkande`.
- `"vandkande med blomster"` matcher præcis sætning.
- `vand -kande` finder `vand` og udelukker `kande`.
- `vand OR flaske` finder enten ord.
- Filtre: `type:note`, `kategori:indkøb`, `status:åben`, `ansvarlig:kim`, `has:photo`, `has:comment`.
- Nuværende adfærd (fri tekst AND) bevares som fallback.

Teknik:
- Opret `services/search.ts` med parser.
- Tokens: quoted phrase, `*word*`, `-term`, `OR`, `filter:key`.
- Match-funktion tager en `CaptureItem` og returnerer boolean + score.
- Genbruges i `app/(tabs)/search.tsx` via `useMemo`.
- Søgefelter: title, content, category, type label, tags, assignedToName, status.
- `has:comment`: kræver data ikke tilgængelig i item (comments er subcollection). For MVP: udelad `has:comment` og marker det som fase 2, eller check `item.commentCount` hvis vi tilføjer et tællefelt.
- UI: behold eksisterende søgefelt, opdater placeholder til at vise syntaks.
- Resultater sorteres stadig efter match-score.

### B3: Stemmekommandoord + redigerbart preview

Hvad:
- Kommandoord under optagelse:
  - `skift` / `ny linje` → linjeskift
  - `punktum` → `.`
  - `komma` → `,`
  - `spørgsmålstegn` → `?`
  - `udråbstegn` → `!`
  - `semikolon` → `;`
  - `kolon` → `:`
  - `tankestreg` → `-`
  - `slet sidste ord` → fjerner sidste ord før kommandoen
  - `fortryd` → rydder alt
  - `gem` / `opret` → stopper optagelse og går til redigerbart preview
  - `annuller` → stopper og lukker modal
- Post-processing: mellemrum efter tegnsætning, fjern dobbeltmellemrum, trim.
- Fjern auto-gem og 5-sek. countdown; modal viser altid redigerbart preview med manuel "Gem" / "Annuller".

Teknik:
- Opret `services/voiceCommands.ts` med `processVoiceCommands(text, currentContent)`.
- Kør processering på hvert `onResult` i `components/VoiceCaptureModal.tsx` før `parseVoiceCommand`.
- "Slet sidste ord" håndteres på det samlede tekststreng ved at fjerne sidste ord før kommando-token.
- "Fortryd" nulstiller `content` og `transcript`.
- "Gem"/"opret" stopper optagelse; optagelse slutter → preview vises; bruger trykker manuelt Gem.
- "Annuller" kalder `onClose()`.
- Fjern `autoSave`-state, `autoSaveCountdown`, toggle og interval.
- Bevar optagelsesknap, editable TextInput, type-chips, kategori, foto, ansvarlig, Gem/Annuller.
- Genbrug samme kommando-processor i `app/(tabs)/search.tsx`'s stemmesøgning (valgfrit i B, men lav indsats).

---

## Fase 2 – Context Lists MVP (C)

### Data-model

`checklists` (top-level collection):
- `name: string`
- `ownerId: string`
- `projectId?: string` (valgfrit overordnet projekt; item kan dog komme fra flere projekter)
- `isDynamic: boolean`
- `searchQuery?: object` (fase 2)
- `sharedWith: { [userId]: role }`
- `syncStatusToSource: boolean` (default true)
- `createdAt`, `updatedAt: serverTimestamp`

`checklists/{id}/items/{itemId}`:
- `sourceItemId: string` (reference til `items/{id}`)
- `sourceProjectId: string`
- `title: string`
- `notes: string`
- `isCompleted: boolean`
- `completedAt?: timestamp`
- `completedBy?: string`
- `orderIndex: number`
- `createdAt`, `updatedAt: serverTimestamp`

MVP begrænser `isDynamic` til `false`; dynamiske lister tilføjes i fase 2.

### Sikkerhed

- Tilføj `firestore.rules` i repo som kilde-til-sandhed.
- Regler for `checklists`:
  - read: owner eller delt bruger.
  - write: owner eller delt med `admin`/`editor`.
- Regler for `checklists/{id}/items`: samme ejerskab/deling som parent.
- For `items`: bevar eksisterende projektbaserede regler; tilføj evt. at medlemmer kan opdatere status hvis de er editor/admin/owner eller hvis de er tildelt.
- Manuel udrulning til Firebase Console eller `firebase deploy` efter test.

### Navigation og UI

- Tilføj `app/(tabs)/checklists.tsx` som ny fane "Aktionslister" i `app/(tabs)/_layout.tsx`.
- Tilføj `app/checklist.tsx` som stack-skærm (detalje/modal for en liste).
- Tilføj `app/open-list.tsx` som alias: læser `?id=...`, redirecter til `/checklist?id=...` (understøtter `datacapture://open-list?id=...`).
- Tilføj `Stack.Screen name="checklist"` og `Stack.Screen name="open-list"` i `app/_layout.tsx`.

`checklists.tsx` oversigt:
- Liste over `checklists` for current user.
- Vis navn, antal udførte/total, dato.
- Tom tilstand: "Opret din første aktionsliste fra Søg-fanen."
- Tryk på liste → `/checklist?id=...`.

`checklist.tsx` detalje:
- Header med navn, dele-knap, rediger navn (valgfrit MVP).
- FlatList med punkter.
- Hvert punkt: checkbox, titel, noter, link til kildesag.
- Åbne punkter sorteres alfabetisk.
- Udførte punkter grået ud og i bunden sorteret efter `completedAt` desc.
- Swipe eller lang-tryk for slet (kun owner/admin/editor).
- Nyt punkt: tekstfelt + "Tilføj" opretter en ny sag i det aktive projekt og tilføjer den til listen (per PO-krav: nye punkter skal altid være en sag).

`search.tsx`:
- Tilføj knap "Opret aktionsliste" over resultater når `query` eller resultater findes.
- Prompt til listnavn.
- Kald `createChecklistFromItems(userId, name, results)`.
- Dedupliker efter normaliseret titel.
- Hvert resultat bliver et checklist-item med `sourceItemId`, `sourceProjectId`, `title`.

### Services

`services/checklists.ts`:
- `createChecklist(...)`
- `createChecklistFromItems(userId, name, items)` – dedup + sortering.
- `subscribeToChecklists(userId, callback)`
- `subscribeToChecklistItems(checklistId, callback)`
- `updateChecklistItem(checklistId, itemId, updates)`
- `toggleChecklistItemComplete(checklist, item, userId)`:
  - Marker checklist item done/undone.
  - Hvis `syncStatusToSource` og markeres done: opdater `items/{sourceItemId}` status til `done` (evt. tilføj kommentar "Udført via aktionsliste [name]").
  - Hvis un-done: opdater source item status til `new`? For MVP: kun ved done; undo rører ikke kildesag.
- `shareChecklist(checklist, items)` – genererer tekst og kalder `react-native-share`.
- `deleteChecklist(checklistId)` (slet subcollection + doc).

### Deep links

- `datacapture://checklist?id=<checklistId>` åbner detalje.
- `datacapture://open-list?id=<checklistId>` alias for kompatibilitet med GEOFENCE-001.
- Ved kold start uden login: gem `pendingDeepLinkId` i AsyncStorage; efter anonymt login naviger til listen.

---

## Filer der berøres

### B
- `services/share.ts` (tilføj `shareText`)
- `app/item.tsx` (del-knapper)
- `components/VoiceCaptureModal.tsx` (del-knapper, command processor, fjern auto-save)
- `services/voiceCommands.ts` (ny)
- `services/search.ts` (ny)
- `app/(tabs)/search.tsx` (brug ny søgning, stemmesøgning kan genbruge kommandoer)

### C
- `services/checklists.ts` (ny)
- `app/(tabs)/checklists.tsx` (ny)
- `app/checklist.tsx` (ny)
- `app/open-list.tsx` (ny)
- `app/(tabs)/_layout.tsx` (ny fane)
- `app/_layout.tsx` (nye stack screens)
- `app/(tabs)/search.tsx` (knap til opret liste)
- `firestore.rules` (ny, dokumenterer regler for items/projects/comments/checklists)
- `docs/backlog.md` (opdater status)
- `docs/current-build.md` (nye build IDs)

---

## Testplan (pre-build)

### B
- Del tekst fra sag: item-detail, VoiceCaptureModal OCR original og oversat.
- Søgning:
  - `*vand*` skal finde "vand" men ikke "Vandkande".
  - `"vandkande med blomster"` finder præcis sætning.
  - `vand -kande` udelukker kande.
  - `vand OR flaske` finder begge.
  - `type:note kategori:indkøb` filtrerer korrekt.
- Stemme:
  - "punktum" og "komma" indsættes som tegn.
  - "slet sidste ord" fjerner sidste ord.
  - "fortryd" rydder teksten.
  - Ingen auto-save; preview vises efter stop, manuel Gem.

### C
- Opret liste fra søgning.
- Åbn liste fra oversigt.
- Afkryds punkt → source item får status `done`.
- Deduplikering ved oprettelse.
- Alfabetisk sortering af åbne, udførte i bund.
- Del liste som tekst.
- Deep link `datacapture://open-list?id=...` åbner korrekt liste.

---

## Build- og releaseplan

1. Implementer B + C lokalt.
2. Commit alt sammen.
3. Kør lokale tests (`expo start` i development build):
   - TypeScript/lint uden fejl.
   - Søgning, stemme, del tekst, opret aktionsliste, afkrydsning, status-sync.
4. EAS preview build iOS + Android.
5. Opdater `docs/current-build.md` med nye build IDs og install-links.
6. Test på iPhone 13 / iPhone 17 / iPad.
7. Opdater `docs/backlog.md` og relevante case-filer (`SEARCH-001`, `VOICE-001`, `CHECKLIST-001`) til `done` / `in progress` efterhånden.

---

## Risici og afhjælpning

| Risiko | Afhjælpning |
|--------|---------------|
| Stemmekommandoer forsvinder midt i sætning | Processér på hver `onResult`, erstat kun hele ord/tokens; vis feedback i tekstfeltet. |
| Søgesyntaks forvirrer brugere | Placeholder-tekst og simpel tom-tilstand med eksempler. |
| Context Lists rører ved source item status | Gør synkronisering valgfri per liste (default on) og log i kommentar for sporbarhed. |
| Firestore-regler for nye collections | Skriv regler i repo og test i Firebase Console emulator / development build før deploy. |
| Scope creep i C | MVP uden dynamiske lister, AI og geofencing; det kommer i fase 2. |

---

## Compliance / P0 påmindelse (parallel, ikke del af B/C)

Før App Store / produktion:
- Luk Firestore catch-all regel.
- Flyt Google Translate API-nøgle fra JS bundle til backend/Cloud Function.
- Tilføj privacy policy (især efter CHAT-001).
- Fjern `GoogleService-Info.plist` / `google-services.json` fra git hvis de indeholder produktionsnøgler.

Disse punkter berører ikke B/C-funktionaliteten, men blokerer produktionsfrigivelse.
