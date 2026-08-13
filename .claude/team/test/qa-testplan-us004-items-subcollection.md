# Testplan — US-004 Items Subcollection Migration (B-løsning)

**Projekt:** `C:\Users\kimgr\data-capture-app` (Expo SDK 57, React Native 0.86, New Architecture)  
**Branch:** `fix/us004-voice-redesign` / `fix/us004-items-subcollection`  
**Dato oprettet:** 2026-07-15  
**Formål:** Testcases for omlægning af `items`, `checkpoints` og `comments` til subcollections under `projects/{projectId}`. Dækker migration, E2E, sikkerhed, regression og build-go gates.

---

## Hvordan testplanen bruges

1. **Master Agent udfylder** `Status MA` og `Begrundelse MA` efter egen verifikation.
2. **PO (dig) udfylder** `PO testet` med `- [x]` og `Status PO` + `Begrundelse PO` efter din test.
3. **Trafiklys:**
   - 🟢 = OK, ingen problemer.
   - 🟡 = Testet med forbehold / observeret udfordring / kræver opfølgning.
   - 🔴 = Fejler / blocker.
   - ⚪ = Ikke testet endnu.
4. **Regression:** Cases markeret `Regression: Ja` skal køres igen efter større ændringer på kritisk funktionalitet.

---

## Overblik – status per område

| Område | Status MA | Status PO | Regression-kritiske cases | Bemærkning |
|---|---|---|---|---|
| App-start & auth | ⚪ | ⚪ | TC-A.1, TC-A.2, TC-A.3 | Påvirkes ikke af migrationen. |
| Tema & UI | ⚪ | ⚪ | TC-B.1 | Påvirkes ikke. |
| Projekter | ⚪ | ⚪ | TC-C.1–C.5 | `deleteProject` er nu callable Cloud Function. |
| Board & indlæg | ⚪ | ⚪ | TC-D.1–D.3 | `createItem(projectId, item)` og `subscribeToItems(projectId, ...)` med subcollection-paths. |
| Foto-upload & OCR | ⚪ | ⚪ | TC-E.1–E.5, TC-E.4a–E.4c | Storage-path forbliver `projects/{projectId}/items/...`. |
| Stemmeoptagelse | ⚪ | ⚪ | TC-F.1–F.4, TC-004.1–004.20 | `VoiceCaptureModal` kalder `createItem(activeProject.id, { ... })`. |
| Søgning | ⚪ | ⚪ | TC-G.1–G.2 | `subscribeToItems(project.id, ...)` forbliver uændret i signatur. |
| Item-detalje | ⚪ | ⚪ | TC-H.1–H.3 | Alle kald kræver nu `projectId` fra route params. |
| RBAC & ansvarlige | ⚪ | ⚪ | TC-R.1–R.5, TC-AS.1–AS.3 | Email-medlemmer får stadig editor via `memberEmails`. |
| Chat / kommentarer | ⚪ | ⚪ | TC-CH.1–CH.12 | Kommentarer ligger nu under `/projects/{projectId}/items/{itemId}/comments`. |
| Deep links & Shortcuts | ⚪ | ⚪ | TC-I.1–I.4 | `buildItemUrl(itemId, projectId)` kræver nu begge params. |
| Push-notifikationer | ⚪ | ⚪ | TC-J.1, TC-B4.1, TC-B1.13 | Reminder udvidet med `targetProjectId`; legacy fallback håndteret. |
| Service-layer / subcollection migration | ⚪ | ⚪ | TC-B1.12 | `getItemsByAssignee`, `isTitleDuplicate`, `unassignItemsFromMember`, `getProjectDeletionStats` bruger subcollection-paths. |
| Dynamiske lister | ⚪ | ⚪ | TC-005.7–005.28, TC-B1.6 | `sourceItemPath`, `sourceProjectId` og checkpoint-paths opdateret. Projekt-scopede checklists ligger under `/projects/{projectId}/checklists`. |
| Sikkerhed / negative cases | ⚪ | ⚪ | TC-SEC.1–SEC.37 | Subcollection-regler testes mod emulator og fysiske enheder. Project-scopede checklists og deres items ligger under `/projects/{projectId}/checklists`. |
| Migration / wipe-and-recreate | ⚪ | ⚪ | TC-MIG.1–MIG.5 | Testdata wipes; genskabes og verificeres. |
| Cloud Function / projektsletning | 🟡 | 🔴 | TC-B9.1–B9.6 | `deleteProject` callable sletter cascade server-side. PO-test af TC-001 i build `92247ec7` fejlede med `UNAUTHENTICATED` pga. manglende IAM invoker. Functions unit tests bestod. Afventer gen-test efter IAM-rettelse. |

---

## 1. Eksisterende baseline-cases der stadig er relevante

Følgende cases kopieres fra `memory/data-capture-test-baseline.md` med bemærkninger om path-/signatur-ændringer. Alle statusfelter nulstilles til ⚪ indtil migrationen er testet.

### TC-A.1: Appen starter uden crash
| Felt | Værdi |
|---|---|
| ID | TC-A.1 |
| Område | App-start & auth |
| Regression | Ja |
| Testtrin | 1. Luk appen helt på telefonen. <br> 2. Åbn appen fra ikon. |
| Forventet resultat | Navneindtastningsskærmen vises uden crash. |
| Status MA | ⚪ |
| Begrundelse MA | Påvirkes ikke af migration. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-A.2: Navn og anonym login
| Felt | Værdi |
|---|---|
| ID | TC-A.2 |
| Område | App-start & auth |
| Regression | Ja |
| Testtrin | 1. Indtast navn i velkomstskærmen. <br> 2. Tryk "Fortsæt". |
| Forventet resultat | Brugeren logges ind anonymt og lander på Projekter-fanen. |
| Status MA | ⚪ |
| Begrundelse MA | Påvirkes ikke. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-A.3: Genstart husker bruger
| Felt | Værdi |
|---|---|
| ID | TC-A.3 |
| Område | App-start & auth |
| Regression | Ja |
| Testtrin | 1. Log ind med navn. <br> 2. Luk appen helt. <br> 3. Åbn appen igen. |
| Forventet resultat | Brugeren er stadig logget ind / navnet er udfyldt. |
| Status MA | ⚪ |
| Begrundelse MA | Påvirkes ikke. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B.1: Skift mellem mørkt og lyst tema
| Felt | Værdi |
|---|---|
| ID | TC-B.1 |
| Område | Tema & UI |
| Regression | Nej |
| Testtrin | 1. Gå til Indstillinger. <br> 2. Tryk på switch for "Mørk tilstand". <br> 3. Gå tilbage til Board/Projekter. |
| Forventet resultat | Appen skifter mellem mørkt og lyst tema uden crash. |
| Status MA | ⚪ |
| Begrundelse MA | Påvirkes ikke. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-C.1: Opret nyt projekt
| Felt | Værdi |
|---|---|
| ID | TC-C.1 |
| Område | Projekter |
| Regression | Ja |
| Testtrin | 1. Gå til Projekter. <br> 2. Tryk "+ Nyt". <br> 3. Indtast navn og beskrivelse. <br> 4. Tryk "Opret". |
| Forventet resultat | Projektet oprettes i Firestore og vises i projektlisten. Board åbnes automatisk. |
| Status MA | ⚪ |
| Begrundelse MA | `createProject` uændret. Board åbnes med nyt projekt aktivt. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-C.2: Vis projektliste (eje og delte)
| Felt | Værdi |
|---|---|
| ID | TC-C.2 |
| Område | Projekter |
| Regression | Ja |
| Testtrin | 1. Gå til Projekter. <br> 2. Sammenlign med projekter i Firebase Console. |
| Forventet resultat | Egen projekter og projekter delt via email vises korrekt. Listen opdateres live. |
| Status MA | ⚪ |
| Begrundelse MA | `subscribeToProjects` uændret. Email-medlemmer vises stadig via `memberEmails array-contains`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-C.3: Vælg aktivt projekt
| Felt | Værdi |
|---|---|
| ID | TC-C.3 |
| Område | Projekter |
| Regression | Ja |
| Testtrin | 1. Gå til Projekter. <br> 2. Tryk på et projekt. |
| Forventet resultat | Board-fanen åbnes med det valgte projekts navn. |
| Status MA | ⚪ |
| Begrundelse MA | `ProjectContext` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-C.4: Projekt-persistence ved genstart
| Felt | Værdi |
|---|---|
| ID | TC-C.4 |
| Område | Projekter |
| Regression | Ja |
| Testtrin | 1. Vælg et projekt. <br> 2. Luk appen helt. <br> 3. Åbn appen igen. |
| Forventet resultat | Det sidst valgte projekt er stadig aktivt og vises i Board. |
| Status MA | ⚪ |
| Begrundelse MA | AsyncStorage-persistence uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-C.5: Inviter medlem via email
| Felt | Værdi |
|---|---|
| ID | TC-C.5 |
| Område | Projekter |
| Regression | Nej |
| Testtrin | 1. Gå til Projekter. <br> 2. Hold inde på et projekt du ejer. <br> 3. Indtast en email. <br> 4. Bekræft invitationen. |
| Forventet resultat | Email tilføjes til projektets `memberEmails`. Inviteret bruger kan se projektet ved login med samme email. |
| Status MA | ⚪ |
| Begrundelse MA | `addProjectMemberByEmail` uændret. Email-medlem får editor og kan læse/skrive items i subcollection. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-D.1: Opret nyt indlæg
| Felt | Værdi |
|---|---|
| ID | TC-D.1 |
| Område | Board & indlæg |
| Regression | Ja |
| Testtrin | 1. Gå til Board. <br> 2. Tryk "+ Tilføj". <br> 3. Vælg type, indtast titel og beskrivelse. <br> 4. Tryk "Gem". |
| Forventet resultat | Indlæg oprettes i `/projects/{projectId}/items/{itemId}` og vises øverst i Board-listen. |
| Status MA | ⚪ |
| Begrundelse MA | `createItem(activeProject.id, { ... })` — signatur ændret; `projectId` fjernes fra payload og sendes som path-parameter. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-D.2: Vis indlæg i Board
| Felt | Værdi |
|---|---|
| ID | TC-D.2 |
| Område | Board & indlæg |
| Regression | Ja |
| Testtrin | 1. Gå til Board for aktivt projekt. |
| Forventet resultat | Eksisterende indlæg vises med type-badge, titel, dato, forfatter og status. Listen opdateres live. |
| Status MA | ⚪ |
| Begrundelse MA | `subscribeToItems(activeProject.id, ...)` lytter nu på subcollection uden `where("projectId", "==", ...)`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-D.3: Kategori-forslag
| Felt | Værdi |
|---|---|
| ID | TC-D.3 |
| Område | Board & indlæg |
| Regression | Nej |
| Testtrin | 1. Opret indlæg med tekst: "Knappen virker ikke". <br> 2. Opret indlæg med tekst: "Jeg har en idé til layout". |
| Forventet resultat | Første indlæg får kategori "Fejl". Andet får kategori "Idé" eller "UI/UX". |
| Status MA | ⚪ |
| Begrundelse MA | `suggestCategory` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-E.1: Upload billede fra album
| Felt | Værdi |
|---|---|
| ID | TC-E.1 |
| Område | Foto-upload & OCR |
| Regression | Ja |
| Testtrin | 1. Gå til Board. <br> 2. Tryk "+ Tilføj". <br> 3. Tryk "Album". <br> 4. Giv tilladelse og vælg billede. |
| Forventet resultat | Billede vises som preview. Upload starter og gennemføres. "Uploader..." forsvinder. |
| Status MA | ⚪ |
| Begrundelse MA | Storage-path forbliver `projects/{projectId}/items/{itemId}/...`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-E.2: Upload billede fra kamera
| Felt | Værdi |
|---|---|
| ID | TC-E.2 |
| Område | Foto-upload & OCR |
| Regression | Ja |
| Testtrin | 1. Gå til Board. <br> 2. Tryk "+ Tilføj". <br> 3. Tryk "Kamera". <br> 4. Giv tilladelse og tag foto. |
| Forventet resultat | Foto vises som preview og uploades til Firebase Storage. |
| Status MA | ⚪ |
| Begrundelse MA | Storage-path uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-E.3: Foto vises i item-detalje
| Felt | Værdi |
|---|---|
| ID | TC-E.3 |
| Område | Foto-upload & OCR |
| Regression | Ja |
| Testtrin | 1. Opret indlæg med foto. <br> 2. Gem. <br> 3. Tryk på indlægget i Board. |
| Forventet resultat | Billede vises i detalje-skærmen. |
| Status MA | ⚪ |
| Begrundelse MA | `item.tsx` læser `projectId` fra route params og henter item med `getItemById(projectId, itemId)`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-E.4: OCR læser tekst fra billede
| Felt | Værdi |
|---|---|
| ID | TC-E.4 |
| Område | Foto-upload & OCR |
| Regression | Ja |
| Testtrin | 1. Opret indlæg med billede der indeholder tekst. <br> 2. Før gem: tryk "🔍 Læs tekst". |
| Forventet resultat | Tekst fra billedet indsættes i beskrivelsesfeltet. |
| Status MA | ⚪ |
| Begrundelse MA | OCR uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-E.4a: Annuller nulstiller + Tilføj-form
| Felt | Værdi |
|---|---|
| ID | TC-E.4a |
| Område | Foto-upload & OCR |
| Regression | Nej |
| Testtrin | 1. Gå til Board. <br> 2. Tryk "+ Tilføj". <br> 3. Indtast titel/tekst eller tag foto. <br> 4. Tryk "Annuller". <br> 5. Tryk "+ Tilføj" igen. |
| Forventet resultat | Modalen åbnes med tomme felter. Ingen tidligere data vises. |
| Status MA | ⚪ |
| Begrundelse MA | Form-reset uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-E.4b: Kopiér original og oversat OCR-tekst
| Felt | Værdi |
|---|---|
| ID | TC-E.4b |
| Område | Foto-upload & OCR |
| Regression | Nej |
| Testtrin | 1. Læs tekst fra foto. <br> 2. Oversæt. <br> 3. Tryk "Kopiér" ved original og oversat tekst. <br> 4. Indsæt et andet sted. |
| Forventet resultat | Begge tekster kan kopieres til udklipsholder og indsættes korrekt. |
| Status MA | ⚪ |
| Begrundelse MA | `copyToClipboard` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-E.5: Kategori opdateres efter OCR
| Felt | Værdi |
|---|---|
| ID | TC-E.5 |
| Område | Foto-upload & OCR |
| Regression | Nej |
| Testtrin | 1. Læs tekst fra billede med ord som "bug" eller "idé". <br> 2. Se kategori-feltet. |
| Forventet resultat | Kategori opdateres automatisk baseret på OCR-teksten. |
| Status MA | ⚪ |
| Begrundelse MA | `suggestCategory` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-E.4c: Visuel feedback på Kopiér-knapper
| Felt | Værdi |
|---|---|
| ID | TC-E.4c |
| Område | Foto-upload & OCR |
| Regression | Nej |
| Testtrin | 1. Læs tekst fra foto. <br> 2. Tryk "Kopiér" ved original og oversat tekst. |
| Forventet resultat | Knappen viser "Kopieret!" i grønt i 1,5 sek. efter tryk. |
| Status MA | ⚪ |
| Begrundelse MA | Visuel feedback uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-F.1: Stemmeoptagelse startes
| Felt | Værdi |
|---|---|
| ID | TC-F.1 |
| Område | Stemmeoptagelse |
| Regression | Ja |
| Testtrin | 1. Gå til Board. <br> 2. Tryk "🎤 Optag". <br> 3. Accepter tilladelser. <br> 4. Tal en sætning. |
| Forventet resultat | Optagelse starter. Tekst vises løbende i tekstfeltet. |
| Status MA | ⚪ |
| Begrundelse MA | `useVoiceRecognition` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-F.2: Auto-gem efter optagelse
| Felt | Værdi |
|---|---|
| ID | TC-F.2 |
| Område | Stemmeoptagelse |
| Regression | Ja |
| Testtrin | 1. Start optagelse. <br> 2. Stop optagelse. <br> 3. Vent ca. 5 sekunder uden at redigere. |
| Forventet resultat | Indlæg gemmes automatisk og vises i Board. |
| Status MA | ⚪ |
| Begrundelse MA | Auto-save kalder `createItem(activeProject.id, { ... })` med ny signatur. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-F.3: Kategori-prefix via stemme
| Felt | Værdi |
|---|---|
| ID | TC-F.3 |
| Område | Stemmeoptagelse |
| Regression | Nej |
| Testtrin | 1. Tryk "🎤 Optag". <br> 2. Sig: "Bug. Knappen virker ikke." |
| Forventet resultat | Type sættes til "Bug" og kategori til "Fejl". |
| Status MA | ⚪ |
| Begrundelse MA | `parseVoiceCommand` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-F.4: Foto vedhæftet i stemme-modal
| Felt | Værdi |
|---|---|
| ID | TC-F.4 |
| Område | Stemmeoptagelse |
| Regression | Nej |
| Testtrin | 1. Tryk "🎤 Optag". <br> 2. Tryk "Album" eller "Kamera". <br> 3. Vælg/tag billede. <br> 4. Gem optagelsen. |
| Forventet resultat | Billede uploades og vedhæftes stemmeindlægget. |
| Status MA | ⚪ |
| Begrundelse MA | Storage-path uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-G.1: Tekst-søgning
| Felt | Værdi |
|---|---|
| ID | TC-G.1 |
| Område | Søgning |
| Regression | Ja |
| Testtrin | 1. Gå til Søg. <br> 2. Indtast et ord fra et eksisterende indlæg. |
| Forventet resultat | Relevante indlæg vises sorteret efter flest matches. Antal resultater vises. |
| Status MA | ⚪ |
| Begrundelse MA | `search.tsx` kalder `subscribeToItems(project.id, ...)` med subcollection internt. Item card `onPress` medsendes `projectId`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-G.2: Stemme-søgning
| Felt | Værdi |
|---|---|
| ID | TC-G.2 |
| Område | Søgning |
| Regression | Nej |
| Testtrin | 1. Gå til Søg. <br> 2. Tryk 🎤 i søgefeltet. <br> 3. Tal et søgeord. |
| Forventet resultat | Søgeteksten opdateres med talegenkendelse. Resultater filtreres. |
| Status MA | ⚪ |
| Begrundelse MA | Stemme-søgning uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-H.1: Vis item-detalje
| Felt | Værdi |
|---|---|
| ID | TC-H.1 |
| Område | Item-detalje |
| Regression | Ja |
| Testtrin | 1. Gå til Board eller Søg. <br> 2. Tryk på et indlæg. |
| Forventet resultat | Detalje-skærm viser type-badge, titel, kategori, indhold, foto, status, tags, dato og forfatter. |
| Status MA | ⚪ |
| Begrundelse MA | `app/item.tsx` læser `projectId` fra `useLocalSearchParams()` og kalder `getItemById(projectId, itemId)`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-H.2: Rediger indlæg
| Felt | Værdi |
|---|---|
| ID | TC-H.2 |
| Område | Item-detalje |
| Regression | Ja |
| Testtrin | 1. Åbn et indlæg. <br> 2. Tryk "Rediger". <br> 3. Ændr titel, indhold, kategori, status eller tags. <br> 4. Tryk "Gem". |
| Forventet resultat | Ændringer gemmes i Firestore og vises i Board/detalje. |
| Status MA | ⚪ |
| Begrundelse MA | `updateItem(projectId, itemId, updates)` kræver nu `projectId`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-H.3: Slet indlæg
| Felt | Værdi |
|---|---|
| ID | TC-H.3 |
| Område | Item-detalje |
| Regression | Ja |
| Testtrin | 1. Åbn et indlæg. <br> 2. Tryk "Slet". <br> 3. Bekræft. |
| Forventet resultat | Indlæg fjernes fra `/projects/{projectId}/items/{itemId}`. Brugeren returnerer til Board. Listen opdateres. |
| Status MA | ⚪ |
| Begrundelse MA | `deleteItem(projectId, itemId)` sletter kommentarer før doc-delete. Checkpoints fjernes implicit eller eksplicit. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-R.1: Inviter medlem med rolle
| Felt | Værdi |
|---|---|
| ID | TC-R.1 |
| Område | RBAC & ansvarlige |
| Regression | Ja |
| Testtrin | 1. Gå til Projekter. <br> 2. Hold inde på et projekt du ejer. <br> 3. Vælg fane "Medlemmer". <br> 4. Indtast email og vælg rolle (admin/editor/viewer). <br> 5. Tryk "Inviter". |
| Forventet resultat | Medlemmet tilføjes med valgt rolle i `projects/{id}/members`. Inviteret bruger ser projektet med den tildelte rolle. |
| Status MA | ⚪ |
| Begrundelse MA | `addProjectMemberByEmail` + `subscribeToProjectMembers` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-R.2: Skift rolle på eksisterende medlem
| Felt | Værdi |
|---|---|
| ID | TC-R.2 |
| Område | RBAC & ansvarlige |
| Regression | Ja |
| Testtrin | 1. Åbn medlemsmodal for et projekt. <br> 2. Tryk på en anden rolle for et eksisterende medlem. |
| Forventet resultat | Rollen opdateres i Firestore. UI viser straks den nye rolle. Kun owner/admin kan ændre roller. |
| Status MA | ⚪ |
| Begrundelse MA | `updateProjectMemberRole` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-R.3: Fjern medlem fra projekt
| Felt | Værdi |
|---|---|
| ID | TC-R.3 |
| Område | RBAC & ansvarlige |
| Regression | Ja |
| Testtrin | 1. Åbn medlemsmodal. <br> 2. Tryk "Fjern" ved et medlem. <br> 3. Bekræft. |
| Forventet resultat | Medlemmet fjernes fra `projects/{id}/members`. Brugeren kan ikke længere se projektet. |
| Status MA | ⚪ |
| Begrundelse MA | `removeProjectMember` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-R.4: Viewer kan kun læse
| Felt | Værdi |
|---|---|
| ID | TC-R.4 |
| Område | RBAC & ansvarlige |
| Regression | Ja |
| Testtrin | 1. Log ind som bruger med viewer-rolle i et projekt. <br> 2. Gå til Board og item-detalje. |
| Forventet resultat | "+ Tilføj"/"Optag"-knapper skjules. Rediger/slet skjules. Brugeren kan se items og medlemmer, men ikke ændre noget. |
| Status MA | ⚪ |
| Begrundelse MA | `canAssignItems`, `canEditItem`, `canDeleteItem` bruges i `board.tsx` og `item.tsx`. Subcollection `read` tilladt for viewer. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-R.5: Editor kan ikke administrere medlemmer
| Felt | Værdi |
|---|---|
| ID | TC-R.5 |
| Område | RBAC & ansvarlige |
| Regression | Nej |
| Testtrin | 1. Log ind som editor i et projekt. <br> 2. Gå til Projekter og hold inde på projektet. |
| Forventet resultat | Medlemsmodal åbnes, men invitation, rolleændring og fjern-knapper er ikke tilgængelige. Editor kan se medlemmer. |
| Status MA | ⚪ |
| Begrundelse MA | `canInviteMembers` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-AS.1: Tildel ansvarlig ved oprettelse
| Felt | Værdi |
|---|---|
| ID | TC-AS.1 |
| Område | RBAC & ansvarlige |
| Regression | Ja |
| Testtrin | 1. Gå til Board. <br> 2. Tryk "+ Tilføj". <br> 3. Vælg en ansvarlig i chip-rækken. <br> 4. Gem item. <br> 5. Gentag i "🎤 Optag"-modalen. |
| Forventet resultat | Item gemmes med `assignedTo` og `assignedToName`. Ansvarlig vises på Board-kort og i detalje. |
| Status MA | ⚪ |
| Begrundelse MA | Assignment-chips uændret. `createItem` signatur ændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-AS.2: Skift ansvarlig i item-detalje
| Felt | Værdi |
|---|---|
| ID | TC-AS.2 |
| Område | RBAC & ansvarlige |
| Regression | Ja |
| Testtrin | 1. Åbn et item. <br> 2. Tryk "Rediger". <br> 3. Vælg en anden ansvarlig. <br> 4. Gem. |
| Forventet resultat | Ansvarlig opdateres i Firestore og vises i Board og detalje. |
| Status MA | ⚪ |
| Begrundelse MA | Redigeringstilstand i `item.tsx` viser assignment-chips. `updateItem(projectId, itemId, updates)`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-AS.3: Vis ansvarlig på Board-kort og i detalje
| Felt | Værdi |
|---|---|
| ID | TC-AS.3 |
| Område | RBAC & ansvarlige |
| Regression | Nej |
| Testtrin | 1. Opret eller redigér et item med ansvarlig. <br> 2. Gå til Board. <br> 3. Tryk på item. |
| Forventet resultat | Board-kort viser "👤 {navn}". Item-detalje viser "Ansvarlig: {navn}". |
| Status MA | ⚪ |
| Begrundelse MA | `assignedToName` vises uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.1: Oprettelse af kommentar
| Felt | Værdi |
|---|---|
| ID | TC-CH.1 |
| Område | Chat / kommentarer |
| Regression | Nej |
| Testtrin | 1. Log ind som owner/admin/editor i et projekt. <br> 2. Gå til Board og tryk på et item. <br> 3. Indtast tekst i kommentarfeltet nederst. <br> 4. Tryk "Send". |
| Forventet resultat | Kommentaren gemmes i `/projects/{projectId}/items/{itemId}/comments`. Den vises straks i kommentarlisten med forfatter og timestamp. Inputfeltet tømmes. |
| Status MA | ⚪ |
| Begrundelse MA | `createComment(projectId, itemId, text)` — signatur uændret (kendte allerede projectId). Path nu subcollection. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.2: Visning af kommentarliste i realtid
| Felt | Værdi |
|---|---|
| ID | TC-CH.2 |
| Område | Chat / kommentarer |
| Regression | Nej |
| Testtrin | 1. Åbn et item på to forskellige enheder/brugere i samme projekt. <br> 2. Skriv en kommentar fra enhed A. |
| Forventet resultat | Kommentaren vises på enhed B inden for få sekunder, sorteret kronologisk (ældste øverst). Listen scrolles automatisk til nyeste kommentar. |
| Status MA | ⚪ |
| Begrundelse MA | `subscribeToComments(projectId, itemId, callback)` lytter på subcollection. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.3: Sletning af egen kommentar
| Felt | Værdi |
|---|---|
| ID | TC-CH.3 |
| Område | Chat / kommentarer |
| Regression | Nej |
| Testtrin | 1. Log ind og opret en kommentar på et item. <br> 2. Tryk på slet-ikonet ved din egen kommentar. <br> 3. Bekræft sletning. |
| Forventet resultat | Kommentaren fjernes fra Firestore og forsvinder fra listen. |
| Status MA | ⚪ |
| Begrundelse MA | `deleteComment(projectId, itemId, commentId)` uændret signatur. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.4: Sletning af andres kommentar som owner/admin
| Felt | Værdi |
|---|---|
| ID | TC-CH.4 |
| Område | Chat / kommentarer |
| Regression | Nej |
| Testtrin | 1. Log ind som owner eller admin i projektet. <br> 2. Åbn et item hvor en anden bruger har skrevet en kommentar. <br> 3. Tryk på slet-ikonet ved den andens kommentar. <br> 4. Bekræft. |
| Forventet resultat | Kommentaren slettes. |
| Status MA | ⚪ |
| Begrundelse MA | Firestore-regel tillader owner/admin at slette andres kommentarer. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.5: Editor kan ikke slette andres kommentarer
| Felt | Værdi |
|---|---|
| ID | TC-CH.5 |
| Område | Chat / kommentarer |
| Regression | Nej |
| Testtrin | 1. Log ind som editor i projektet. <br> 2. Åbn et item med en kommentar skrevet af en anden. |
| Forventet resultat | Slet-ikonet vises ikke ved andres kommentarer. Forsøg på at slette via manipuleret kald afvises af Firestore med `PERMISSION_DENIED`. |
| Status MA | ⚪ |
| Begrundelse MA | Subcollection-regel: delete kun tilladt hvis `authorId == getUserId()` eller owner/admin. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.6: Viewer må ikke kunne oprette kommentar
| Felt | Værdi |
|---|---|
| ID | TC-CH.6 |
| Område | Chat / kommentarer |
| Regression | Nej |
| Testtrin | 1. Log ind som viewer i et projekt. <br> 2. Åbn et item. |
| Forventet resultat | Kommentar-inputfeltet og send-knap vises ikke eller er deaktiveret. Viewer kan stadig læse eksisterende kommentarer. |
| Status MA | ⚪ |
| Begrundelse MA | UI skjuler input for viewer. Firestore create afvises for viewer. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.7: Inputvalidering af kommentar
| Felt | Værdi |
|---|---|
| ID | TC-CH.7 |
| Område | Chat / kommentarer |
| Regression | Nej |
| Testtrin | 1. Åbn et item som owner/admin/editor. <br> 2. Prøv at sende: tom tekst, kun mellemrum, tekst på 2.001 tegn, og gyldig tekst på 2.000 tegn. |
| Forventet resultat | Tom/whitespace og tekst over 2.000 tegn afvises med fejlmeddelelse. Gyldig tekst accepteres. |
| Status MA | ⚪ |
| Begrundelse MA | Validering uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.8: Kommentar-timestamp og forfatter
| Felt | Værdi |
|---|---|
| ID | TC-CH.8 |
| Område | Chat / kommentarer |
| Regression | Nej |
| Testtrin | 1. Opret en kommentar. <br> 2. Tjek visningen i appen og dokumentet i Firestore. |
| Forventet resultat | Kommentaren viser forfatterens navn/email og et timestamp svarende til oprettelsestidspunktet. `createdAt` sat via `serverTimestamp()`. |
| Status MA | ⚪ |
| Begrundelse MA | Comment interface bevares inkl. `projectId` og `itemId`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.9: Omdøbning af item-type `comment` til `note` i UI
| Felt | Værdi |
|---|---|
| ID | TC-CH.9 |
| Område | Chat / kommentarer |
| Regression | Ja |
| Testtrin | 1. Åbn VoiceCaptureModal ("🎤 Optag"). <br> 2. Se stemmekommando-hjælp og type-chips. <br> 3. Opret et item med type `note`. <br> 4. Gå til Board, Søg og item-detalje. |
| Forventet resultat | I hele UI vises type-label som "Notat" (ikke "Kommentar"). Stemmekommandoen "Notat. ..." virker. |
| Status MA | ⚪ |
| Begrundelse MA | UI-label uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.10: Legacy items med `type: "comment"` vises som "Notat"
| Felt | Værdi |
|---|---|
| ID | TC-CH.10 |
| Område | Chat / kommentarer |
| Regression | Ja |
| Testtrin | 1. I Firebase Console findes eller oprettes et item med `type: "comment"`. <br> 2. Åbn appen og naviger til Board, Søg og item-detalje for det pågældende item. |
| Forventet resultat | Item vises med badge/label "Notat". Appen crasher ikke. Data i Firestore ændres ikke automatisk ved visning. |
| Status MA | ⚪ |
| Begrundelse MA | Label-mapping uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.11: Regression – stadig muligt at oprette alle andre item-typer
| Felt | Værdi |
|---|---|
| ID | TC-CH.11 |
| Område | Chat / kommentarer |
| Regression | Ja |
| Testtrin | 1. Gå til Board og tryk "+ Tilføj". <br> 2. Vælg type: idé, observation, bug, note. <br> 3. Gem hvert item. <br> 4. Gentag i VoiceCaptureModal med stemmekommandoer. |
| Forventet resultat | Alle typer kan stadig oprettes uden fejl. De vises korrekt i Board med relevante badges og labels. |
| Status MA | ⚪ |
| Begrundelse MA | `createItem` signatur ændret, men item-type-felt bevares. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.12: Sikkerhedsregler – uautoriseret bruger kan ikke skrive eller slette
| Felt | Værdi |
|---|---|
| ID | TC-CH.12 |
| Område | Chat / kommentarer |
| Regression | Nej |
| Testtrin | 1. Prøv at oprette en kommentar som ikke-medlem af projektet. <br> 2. Prøv at slette en kommentar som viewer eller ikke-medlem. |
| Forventet resultat | Firestore afviser begge handlinger med `PERMISSION_DENIED`. Ingen kommentar oprettes eller slettes. |
| Status MA | ⚪ |
| Begrundelse MA | Subcollection `comments` regler kræver projektrolle. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-CH.13: App skriver `projectId` og `itemId` i comment-dokument
| Felt | Værdi |
|---|---|
| ID | TC-CH.13 |
| Område | Chat / kommentarer |
| Regression | Nej |
| Testtrin | 1. Opret en kommentar via appen. <br> 2. Tjek dokumentet i Firestore under `/projects/{projectId}/items/{itemId}/comments/{commentId}`. |
| Forventet resultat | Dokumentet indeholder både `projectId` og `itemId` felter med korrekte værdier, ud over `authorId`, `text` og `createdAt`. |
| Status MA | ⚪ |
| Begrundelse MA | Design spec afsnit 3.3 kræver at `createComment` skriver begge reference-felter. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-I.1: Åbn Board fra deep link med kategori
| Felt | Værdi |
|---|---|
| ID | TC-I.1 |
| Område | Deep links & Shortcuts |
| Regression | Ja |
| Testtrin | 1. Åbn linket `datacapture://tabs/board?category=DINKATEGORI` i Safari på telefonen. |
| Forventet resultat | Appen åbner Board med filterbjælke for valgt kategori. |
| Status MA | ⚪ |
| Begrundelse MA | `useLocalSearchParams` parser `category` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-I.2: Filtrer Board via deep link med status
| Felt | Værdi |
|---|---|
| ID | TC-I.2 |
| Område | Deep links & Shortcuts |
| Regression | Ja |
| Testtrin | 1. Åbn linket `datacapture://tabs/board?status=new` i Safari. |
| Forventet resultat | Board viser kun indlæg med status "new". Filterbjælke vises. |
| Status MA | ⚪ |
| Begrundelse MA | `useLocalSearchParams` parser `status` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-I.3: Kopier Shortcuts-link fra item
| Felt | Værdi |
|---|---|
| ID | TC-I.3 |
| Område | Deep links & Shortcuts |
| Regression | Ja |
| Testtrin | 1. Gå til Board. <br> 2. Find et indlæg med kategori. <br> 3. Tryk på 🔗-ikonet. |
| Forventet resultat | Link kopieres til udklipsholder. Bekræftelsesbesked vises. |
| Status MA | ⚪ |
| Begrundelse MA | `buildBoardUrl` uændret. Item-level deeplink ændres separat (se TC-B4.2). |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-I.4: Nulstil filter i Board
| Felt | Værdi |
|---|---|
| ID | TC-I.4 |
| Område | Deep links & Shortcuts |
| Regression | Ja |
| Testtrin | 1. Åbn Board med aktivt filter. <br> 2. Tryk "Nulstil". |
| Forventet resultat | Filter fjernes. Alle indlæg vises. Filterbjælke forsvinder. |
| Status MA | ⚪ |
| Begrundelse MA | `router.replace("/(tabs)/board")` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-J.1: Registrer push-token og modtag test-push
| Felt | Værdi |
|---|---|
| ID | TC-J.1 |
| Område | Push-notifikationer |
| Regression | Nej |
| Testtrin | 1. Gå til Indstillinger. <br> 2. Tryk "Registrer push". <br> 3. Accepter tilladelse. <br> 4. Luk appen helt. <br> 5. Send test-push til tokenet. |
| Forventet resultat | Et Expo push-token vises på skærmen. Test-push modtages på låseskærmen når appen er lukket. |
| Status MA | ⚪ |
| Begrundelse MA | Push-token registrering uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-K.1: Vis brugerinfo i indstillinger
| Felt | Værdi |
|---|---|
| ID | TC-K.1 |
| Område | Indstillinger |
| Regression | Nej |
| Testtrin | 1. Gå til Indstillinger. |
| Forventet resultat | Navn, email/uid, tema-switch, push-token og "Registrer push"-knap vises korrekt. |
| Status MA | ⚪ |
| Begrundelse MA | `settings.tsx` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-K.2: Log ud
| Felt | Værdi |
|---|---|
| ID | TC-K.2 |
| Område | Indstillinger |
| Regression | Ja |
| Testtrin | 1. Gå til Indstillinger. <br> 2. Tryk "Log ud". |
| Forventet resultat | Brugeren logges ud og returnerer til velkomstskærmen. |
| Status MA | ⚪ |
| Begrundelse MA | `logOut` uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

---

## 2. Nye E2E-cases for subcollection-migration

### TC-B1.1: Board viser items efter migration
| Felt | Værdi |
|---|---|
| ID | TC-B1.1 |
| Område | Subcollection migration / Board |
| Regression | Ja |
| Testtrin | 1. Sørg for at der findes items under `/projects/{projectId}/items/{itemId}` (efter wipe/recreate). <br> 2. Log ind som owner/admin/editor/viewer. <br> 3. Gå til Board. |
| Forventet resultat | Items vises i Board uden tom liste eller permission-denied. Listen opdateres live ved nye items. |
| Status MA | ⚪ |
| Begrundelse MA | `subscribeToItems(projectId, ...)` lytter på subcollection. Firestore list-regel skal tillade for alle roller. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.2: Search viser items
| Felt | Værdi |
|---|---|
| ID | TC-B1.2 |
| Område | Subcollection migration / Søgning |
| Regression | Ja |
| Testtrin | 1. Gå til Søg. <br> 2. Indtast tekst der matcher items i forskellige projekter. |
| Forventet resultat | Resultater vises fra alle projekter brugeren har adgang til. Tryk ind på et resultat og tilbage uden crash. |
| Status MA | ⚪ |
| Begrundelse MA | `search.tsx` itererer projekter og kalder `subscribeToItems(project.id, ...)`. Item card `onPress` medsender `projectId`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.3: Item-detalje loader med projectId + itemId
| Felt | Værdi |
|---|---|
| ID | TC-B1.3 |
| Område | Subcollection migration / Item-detalje |
| Regression | Ja |
| Testtrin | 1. Åbn et item fra Board. <br> 2. Åbn et item fra Søg. <br> 3. Åbn et item fra checkliste-kilde-link. |
| Forventet resultat | Item-detalje vises korrekt i alle tre tilfælde. URL/route params indeholder både `itemId` og `projectId`. |
| Status MA | ⚪ |
| Begrundelse MA | `app/item.tsx` læser begge params. `getItemById(projectId, itemId)`. `subscribeToComments(projectId, itemId, ...)`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.4: Kommentarer create/read/delete
| Felt | Værdi |
|---|---|
| ID | TC-B1.4 |
| Område | Subcollection migration / Kommentarer |
| Regression | Ja |
| Testtrin | 1. Åbn et item som editor. <br> 2. Opret kommentar. <br> 3. Verificér real-time visning. <br> 4. Slet egen kommentar. <br> 5. Som owner/admin, slet en andens kommentar. |
| Forventet resultat | Kommentar oprettes under `/projects/{projectId}/items/{itemId}/comments`. Læs og slet virker i realtid. |
| Status MA | ⚪ |
| Begrundelse MA | `commentsCollection(projectId, itemId)`. `deleteAllCommentsForItem(projectId, itemId)` kaldes ved item-sletning. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.5: Checkpoints create/update
| Felt | Værdi |
|---|---|
| ID | TC-B1.5 |
| Område | Subcollection migration / Checkpoints |
| Regression | Ja |
| Testtrin | 1. Opret item med type der genererer checkpoints, eller opret manuelt i item-detalje. <br> 2. Opdater ét checkpoint (afkryds/tekst). |
| Forventet resultat | Checkpoints gemmes under `/projects/{projectId}/items/{itemId}/checkpoints/{checkpointId}`. Opdatering vises med det samme. |
| Status MA | ⚪ |
| Begrundelse MA | `getCheckpointsForItem(projectId, itemId)`, `updateCheckpoint(projectId, itemId, checkpointId, updates)`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.6: Dynamisk liste fra søgning toggler source item status
| Felt | Værdi |
|---|---|
| ID | TC-B1.6 |
| Område | Subcollection migration / Dynamiske lister |
| Regression | Ja |
| Testtrin | 1. Søg efter et ord der matcher flere items. <br> 2. Opret dynamisk liste med status-synk slået til. <br> 3. Afkryds et punkt. |
| Forventet resultat | Checkpoint opdateres under nyt path. Source item status ændres til done/in_progress afhængigt af afkrydsning. |
| Status MA | ⚪ |
| Begrundelse MA | `setChecklistPointCompleted` bruger `point.sourceProjectId` til checkpoint- og item-reference. `sourceItemPath` sættes til `projects/${item.projectId}/items/${item.id}` (verificér i checkliste-item-dokument). |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.7: Offline checklist pending-op sync
| Felt | Værdi |
|---|---|
| ID | TC-B1.7 |
| Område | Subcollection migration / Offline |
| Regression | Ja |
| Testtrin | 1. Åbn en dynamisk liste. <br> 2. Slå flymode til. <br> 3. Afkryds ét punkt. <br> 4. Slå flymode fra. <br> 5. Vent på flush. |
| Forventet resultat | Pending-op synkroniseres. Source item status opdateres efter genetablering af net. Ingen dobbelt-toggle eller fejl. |
| Status MA | ⚪ |
| Begrundelse MA | `toggleChecklistPointOffline` gemmer hele `ChecklistItem` inkl. `sourceProjectId`. `executePendingOp` kalder `toggleChecklistPoint` som selv resolver nye stier. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.8: Reminder notification åbner korrekt item-detalje
| Felt | Værdi |
|---|---|
| ID | TC-B1.8 |
| Område | Subcollection migration / Push-påmindelser |
| Regression | Ja |
| Testtrin | 1. Åbn et item. <br> 2. Opret reminder med `targetProjectId: projectId`. <br> 3. Luk appen. <br> 4. Vent til notification modtages. <br> 5. Tap notification. |
| Forventet resultat | Appen åbner item-detalje med korrekt `itemId` og `projectId`. |
| Status MA | ⚪ |
| Begrundelse MA | `Reminder` udvidet med `targetProjectId`. Notification data payload inkluderer `targetProjectId`. `NotificationResponseHandler` router til `/item?itemId=...&projectId=...`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.9: Projekt-sletning via Cloud Function fjerner alt
| Felt | Værdi |
|---|---|
| ID | TC-B1.9 |
| Område | Subcollection migration / Cloud Function |
| Regression | Ja |
| Testtrin | 1. Opret projekt med items, checkpoints, comments, checklists (projekt-scoped) og fotos. <br> 2. Log ind som owner/admin. <br> 3. Slet projektet. |
| Forventet resultat | Callable `deleteProject({ projectId })` returnerer success. Alle items, checkpoints, comments, members, checklists og Storage-filer under `projects/{projectId}/items/` fjernes. |
| Status MA | ⚪ |
| Begrundelse MA | `deleteProject` i `services/projects.ts` kalder nu `httpsCallable(getFunctions(), "deleteProject")`. Client-side `deleteProjectCascade` fjernet. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.10: Email-medlem editor access
| Felt | Værdi |
|---|---|
| ID | TC-B1.10 |
| Område | Subcollection migration / RBAC |
| Regression | Ja |
| Testtrin | 1. Owner inviterer email med editor-rolle. <br> 2. Email-bruger logger ind (anonymt eller med email-link). <br> 3. Email-bruger åbner projektet. <br> 4. Email-bruger opretter item og kommentar. |
| Forventet resultat | Email-editor kan se Board/items, oprette item og kommentar. Firestore list-query på subcollection tillades via `hasProjectRoleById` som tjekker `memberEmails`. |
| Status MA | ⚪ |
| Begrundelse MA | `hasProjectRoleById(projectId, ...)` laver `get()` på `projects/{projectId}`. Email-medlemmer får editor via `memberEmails`. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.11: Ikke-medlem security — tom liste / permission denied
| Felt | Værdi |
|---|---|
| ID | TC-B1.11 |
| Område | Subcollection migration / Sikkerhed |
| Regression | Ja |
| Testtrin | 1. Log ind som bruger C som IKKE er medlem af projekt A. <br> 2. Forsøg at åbne Board for projekt A. <br> 3. Forsøg at åbne et item-detalje i projekt A via manipuleret link. |
| Forventet resultat | Board viser tom liste eller permission-denied uden crash. Item-detalje viser fejl/Alert eller tom skærm. Ingen data eksponeres. |
| Status MA | ⚪ |
| Begrundelse MA | Subcollection list-regel kræver `hasProjectRoleById(projectId, ...)`. Appen håndterer tom liste/error gracefully. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.12: Service-funktioner med projectId signatur
| Felt | Værdi |
|---|---|
| ID | TC-B1.12 |
| Område | Subcollection migration / Service-layer |
| Regression | Nej |
| Testtrin | 1. Kald `getItemsByAssignee(projectId, assigneeId)` for projekt med items tildelt brugeren. <br> 2. Kald `isTitleDuplicate(projectId, title, excludeItemId?)` med eksisterende titel og igen med unik titel. <br> 3. Kald `unassignItemsFromMember(projectId, assigneeId)` og tjek items. <br> 4. Kald `getProjectDeletionStats(projectId)` som owner/admin. |
| Forventet resultat | Alle funktioner bruger subcollection-paths under `/projects/{projectId}/items`. `isTitleDuplicate` returnerer `true` kun for titel inden for samme projekt. `getProjectDeletionStats` returnerer tællinger uden at slette data. |
| Status MA | ⚪ |
| Begrundelse MA | Design spec afsnit 3.2 definerer disse signaturer. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.13: Legacy deeplink / reminder uden projectId
| Felt | Værdi |
|---|---|
| ID | TC-B1.13 |
| Område | Subcollection migration / Routing |
| Regression | Ja |
| Testtrin | 1. Åbn et item-detalje med route params der kun indeholder `itemId` (ingen `projectId`). <br> 2. Simulér gammel reminder/deeplink der kun har `targetItemId`. |
| Forventet resultat | Appen viser en Alert med teksten `"Påmindelsen peger på en sag uden projekt-id."` og navigerer ikke til item-detalje. Ingen crash. |
| Status MA | ⚪ |
| Begrundelse MA | Design spec afsnit 4.1 kræver graceful fallback når `projectId` mangler. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-B1.14: Offline pending-ops med gamle stier
| Felt | Værdi |
|---|---|
| ID | TC-B1.14 |
| Område | Subcollection migration / Offline |
| Regression | Ja |
| Testtrin | 1. Injicer/manipuler AsyncStorage til at indeholde en pending-op der refererer gammel top-level path `/items/{itemId}/checkpoints/{checkpointId}`. <br> 2. Åbn appen online og trigger flush. |
| Forventet resultat | Appen kaster ikke crash. Pending-op discardes eller flushes med warning; appen fortsætter normal drift. |
| Status MA | ⚪ |
| Begrundelse MA | Design spec afsnit 3.5: gamle pending-ops må ikke crashe appen. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

---

## 3. Negative sikkerhedstest per rolle

Testes både i Firestore emulator og på fysisk enhed. "Forventet" er `PERMISSION_DENIED` eller tom liste for list-queries.

### TC-SEC.1–SEC.5: Items — list/create/update/delete per rolle

| ID | Operation | Rolle | Forventet | Bemærkning |
|---|---|---|---|---|
| TC-SEC.1 | list items | owner/admin/editor/viewer/email-editor | tilladt | Subcollection list-regel med `hasProjectRoleById`. |
| TC-SEC.2 | list items | ikke-medlem | afvist / tom liste | App viser tom liste eller fejl. |
| TC-SEC.3 | create item | editor/owner/admin/email-editor | tilladt | |
| TC-SEC.4 | create item | viewer | afvist | UI skjuler create; manipuleret kald afvises. |
| TC-SEC.5 | create item | ikke-medlem | afvist | `hasProjectRoleById(projectId, ["owner","admin","editor"])`. |
| TC-SEC.6 | update item | owner/admin | tilladt | |
| TC-SEC.7 | update item | editor (egen item / assignedTo=self) | tilladt | |
| TC-SEC.8 | update item | editor (andens item, assignedTo≠self) | afvist | |
| TC-SEC.9 | update item | viewer | afvist | |
| TC-SEC.10 | update item | ikke-medlem | afvist | |
| TC-SEC.11 | delete item | owner/admin | tilladt | |
| TC-SEC.12 | delete item | editor (egen item, createdBy=self) | tilladt | |
| TC-SEC.13 | delete item | editor (andens item) | afvist | |
| TC-SEC.14 | delete item | viewer / ikke-medlem | afvist | |

### TC-SEC.15–SEC.22: Checkpoints per rolle

| ID | Operation | Rolle | Forventet | Bemærkning |
|---|---|---|---|---|
| TC-SEC.15 | list checkpoints | owner/admin/editor/viewer/email-editor | tilladt | |
| TC-SEC.16 | list checkpoints | ikke-medlem | afvist / tom liste | |
| TC-SEC.17 | create/update checkpoint | owner/admin/editor/email-editor | tilladt | |
| TC-SEC.18 | create/update checkpoint | viewer | afvist | |
| TC-SEC.19 | create/update checkpoint | ikke-medlem | afvist | |
| TC-SEC.20 | delete checkpoint | owner/admin/editor/email-editor | tilladt | |
| TC-SEC.21 | delete checkpoint | viewer / ikke-medlem | afvist | |

### TC-SEC.22–SEC.27: Comments per rolle

| ID | Operation | Rolle | Forventet | Bemærkning |
|---|---|---|---|---|
| TC-SEC.22 | list comments | owner/admin/editor/viewer/email-editor | tilladt | |
| TC-SEC.23 | list comments | ikke-medlem | afvist / tom liste | |
| TC-SEC.24 | create comment | owner/admin/editor/email-editor | tilladt | |
| TC-SEC.25 | create comment | viewer / ikke-medlem | afvist | |
| TC-SEC.26 | delete own comment | author (editor/owner/admin) | tilladt | |
| TC-SEC.27 | delete others comment | owner/admin | tilladt | |
| TC-SEC.28 | delete others comment | editor / viewer / ikke-medlem | afvist | |

### TC-SEC.29–SEC.30: Project-scoped checklists per rolle

| ID | Operation | Rolle | Forventet | Bemærkning |
|---|---|---|---|---|
| TC-SEC.29 | list project-scoped checklists (`/projects/{projectId}/checklists`) | owner/admin/editor/viewer/email-editor | tilladt | `hasProjectRoleById(projectId, [...])` via path-variabel. |
| TC-SEC.30 | list project-scoped checklists (`/projects/{projectId}/checklists`) | ikke-medlem | afvist / tom liste | |

### TC-SEC.31–SEC.32: Personal/shared checklists

| ID | Operation | Rolle | Forventet | Bemærkning |
|---|---|---|---|---|
| TC-SEC.31 | list personal checklists (`/checklists` med `ownerId`/`sharedWith` filter) | owner/shared editor | tilladt | `request.query.ownerId` / `request.query.sharedWith` uden cross-document lookup. |
| TC-SEC.32 | get personal checklist (`/checklists/{checklistId}`) | ikke-medlem / ikke-delt | afvist | `ownerId` / `sharedWith` tjek på `resource.data`. |

### TC-SEC.33: Legacy top-level paths skal afvises

| ID | Operation | Rolle | Forventet | Bemærkning |
|---|---|---|---|---|
| TC-SEC.33 | list/get/create/update/delete på gamle top-level `/items/{itemId}`, `/items/{itemId}/checkpoints/{checkpointId}`, `/items/{itemId}/comments/{commentId}` | enhver autentificeret bruger | afvist | Gamle top-level paths har ingen regler; `firestore.rules` skal ikke længere indeholde `match /items/{itemId}`. |

### TC-SEC.34–SEC.35: Project-scoped checklist items (`/projects/{projectId}/checklists/{checklistId}/items`)

| ID | Operation | Rolle | Forventet | Bemærkning |
|---|---|---|---|---|
| TC-SEC.34 | list/get project-scoped checklist items | owner/admin/editor/viewer/email-editor | tilladt | Subcollection under project. `hasProjectRoleById` via path-variabel. |
| TC-SEC.35 | list/get project-scoped checklist items | ikke-medlem | afvist / tom liste | |

### TC-SEC.36–SEC.37: Personal/shared checklist items (`/checklists/{checklistId}/items`)

| ID | Operation | Rolle | Forventet | Bemærkning |
|---|---|---|---|---|
| TC-SEC.36 | list/get personal/shared checklist items | owner/shared editor | tilladt | Parent checklist read-regel. |
| TC-SEC.37 | list/get personal/shared checklist items | ikke-medlem / ikke-delt | afvist | |

---

## 4. Migration / wipe-and-recreate test cases

### TC-MIG.1: Backup før wipe
| Felt | Værdi |
|---|---|
| ID | TC-MIG.1 |
| Område | Migration |
| Regression | Nej |
| Testtrin | 1. Tag screenshots af Board, Søg, Checklister, Projekt-medlemmer i dev/prod. <br> 2. Eksportér (manuelt) nøgledokumenter fra `/items`, `/checklists`, `/projects`. |
| Forventet resultat | Referencedokumentation eksisterer før sletning. PO/Master Agent godkender wipe. |
| Status MA | ⚪ |
| Begrundelse MA | Kun testdata — wipe-and-recreate accepteret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-MIG.2: Wipe Firestore testdata
| Felt | Værdi |
|---|---|
| ID | TC-MIG.2 |
| Område | Migration |
| Regression | Nej |
| Testtrin | 1. Slet i Firebase Console: <br> - Alle `/items/{itemId}` og subcollections (`checkpoints`, `comments`). <br> - Alle `/projects/{projectId}` og subcollections (`members`, `items`, `checkpoints`, `comments`, `checklists`, `checklists/{id}/items`). <br> - Alle `/checklists/{checklistId}` og subcollections (`items`) der **ikke** er projekt-scopede (personlige/delte). <br> - Storage-præfikset `projects/`. <br> - (Valgfrit) behold `/users/{userId}/reminders` med accept af at gamle reminders mangler `targetProjectId`. |
| Forventet resultat | Ingen gamle top-level items/checkpoints/comments/Storage-filer tilbage. Projekt-scopede checklists slettes sammen med projektet. |
| Status MA | ⚪ |
| Begrundelse MA | Wipe sker før Build 1. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-MIG.3: Recreate testprojekter og medlemmer
| Felt | Værdi |
|---|---|
| ID | TC-MIG.3 |
| Område | Migration |
| Regression | Ja |
| Testtrin | 1. Opret 2+ testprojekter via appen. <br> 2. Inviter email-medlem (editor) og uid-medlem (viewer/editor). <br> 3. Verificér medlemsliste i Firebase Console under `/projects/{projectId}/members`. |
| Forventet resultat | Projekter og members oprettes korrekt under nye subcollection-paths. |
| Status MA | ⚪ |
| Begrundelse MA | `/projects/{projectId}` og `/projects/{projectId}/members` er allerede subcollections og uændret. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-MIG.4: Recreate items, checkpoints, comments, checklists
| Felt | Værdi |
|---|---|
| ID | TC-MIG.4 |
| Område | Migration |
| Regression | Ja |
| Testtrin | 1. Opret items manuelt og via stemme. <br> 2. Tilføj kommentarer og checkpoints. <br> 3. Opret checklister fra søgning. <br> 4. Opret reminders. |
| Forventet resultat | Items/checkpoints/comments ligger under `/projects/{projectId}/items/{itemId}/...`. Projekt-scopede checklists ligger under `/projects/{projectId}/checklists/{checklistId}/...`. Personlige/delte checklists ligger eventuelt under `/checklists/{checklistId}/...`. Ingen data længere under top-level `/items`. |
| Status MA | ⚪ |
| Begrundelse MA | Verificér i Firebase Console at stierne er korrekte. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

### TC-MIG.5: Post-migration verifikation
| Felt | Værdi |
|---|---|
| ID | TC-MIG.5 |
| Område | Migration |
| Regression | Ja |
| Testtrin | 1. Gennemfør TC-B1.1–B1.14 og relevante baseline-cases. |
| Forventet resultat | Board, Søg, Item-detalje, Kommentarer, Checklister, Offline, Reminders, Projektsletning og Sikkerhed virker. |
| Status MA | ⚪ |
| Begrundelse MA | Fuld E2E regression efter recreate. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

---

## 5. Manuel regression checklist for fysisk iOS-test

Bruges ved fysisk test på iPhone/iPad. Marker hver række med Status MA/PO efter test.

| # | Scenario | Trin | Succeskriterie | Status MA | Status PO |
|---|---|---|---|---|---|
| R1 | Installér Build 1 på iPhone | 1. Slet gammel app. <br> 2. Installer EAS build. <br> 3. Stol på profil. <br> 4. Åbn app og tilslut Metro. | App starter uden crash; velkomstskærm vises. | ⚪ | ⚪ |
| R2 | Opret projekt + item manuelt | 1. Opret projekt. <br> 2. Gå til Board. <br> 3. Tryk + Tilføj, indtast titel, gem. | Item vises i Board med korrekt badge/titel. Data ligger under `projects/{projectId}/items/{itemId}`. | ⚪ | ⚪ |
| R3 | Opret item via stemme | 1. Tryk Optag. <br> 2. Sig tekst. <br> 3. Vent auto-gem. | Item vises i Board. `createdBy` og `projectId` korrekte. | ⚪ | ⚪ |
| R4 | Søgning og navigation | 1. Gå til Søg. <br> 2. Søg efter ord fra et item. <br> 3. Tryk på resultat. <br> 4. Gå tilbage. | Søgeresultater vises. Item-detalje åbnes korrekt. Ingen crash. | ⚪ | ⚪ |
| R5 | Foto-upload | 1. Opret item med foto fra album/kamera. <br> 2. Gem. <br> 3. Åbn item-detalje. | Foto vises. Storage-path `projects/{projectId}/items/{itemId}/...`. | ⚪ | ⚪ |
| R6 | Kommentarer realtid | 1. Åbn item på to enheder (owner + editor). <br> 2. Skriv kommentar fra enhed A. | Kommentar vises på enhed B inden for få sekunder. | ⚪ | ⚪ |
| R7 | Checkpoints | 1. Opret item med type der genererer checkpoints. <br> 2. Afkryds/tekstrediger ét checkpoint. | Checkpoint opdateres under subcollection. | ⚪ | ⚪ |
| R8 | Dynamisk liste + status-synk | 1. Opret liste fra søgning med status-synk til. <br> 2. Afkryds punkt. | Source item status ændres til done. Punkt markeres udført. | ⚪ | ⚪ |
| R9 | Offline checklist | 1. Slå flymode til. <br> 2. Afkryds punkt. <br> 3. Slå flymode fra. <br> 4. Vent flush. | Source item opdateres efter online flush. | ⚪ | ⚪ |
| R10 | Reminder notification | 1. Opret reminder på item. <br> 2. Luk appen. <br> 3. Vent notification. <br> 4. Tap notification. | Åbner item-detalje korrekt med både itemId og projectId. | ⚪ | ⚪ |
| R11 | Projekt-sletning | 1. Opret projekt med items, foto, projekt-scoped checkliste, kommentarer. <br> 2. Slet projekt. | Projekt + subcollections (items, checkpoints, comments, members, checklists) + Storage fjernes. Ingen orphaned data. | ⚪ | ⚪ |
| R12 | Email-medlem | 1. Inviter email-editor. <br> 2. Log ind med email-bruger. <br> 3. Opret item og kommentar. | Email-editor kan læse/oprette items og kommentarer. | ⚪ | ⚪ |
| R13 | Ikke-medlem sikkerhed | 1. Log ind som bruger uden medlemskab. <br> 2. Forsøg at åbne Board/deep link. | Tom liste eller permission denied. Ingen crash. | ⚪ | ⚪ |
| R14 | Viewer read-only | 1. Log ind som viewer. <br> 2. Gå til Board og item-detalje. | Ingen opret/rediger/slet knapper. Kan læse items og kommentarer. | ⚪ | ⚪ |
| R15 | Genstart persistence | 1. Vælg projekt. <br> 2. Luk appen. <br> 3. Genåbn. | Sidst valgte projekt er aktivt. Bruger stadig logget ind. | ⚪ | ⚪ |

---

## 6. Build 1 GO criteria og Build 2 trigger conditions

### 6.1 Build 1 GO criteria (must-pass før Build 1 frigives)

| # | Kriterium | Metode | Ansvarlig |
|---|---|---|---|
| BG1.1 | `npm run typecheck` grøn | Kør `npm run typecheck` | Backend/UI Agent |
| BG1.2 | `npm run lint` grøn | Kør `npm run lint` | QA Agent |
| BG1.3 | `npm run pre-test-check` grøn | Kør `npm run pre-test-check` | QA Agent |
| BG1.4 | Firestore emulator regeltests grønne | `firebase emulators:exec --only firestore "node scripts/test-rules.js"` | Security Agent |
| BG1.5 | Board viser items efter wipe/recreate | TC-B1.1 + TC-MIG.2–MIG.5 | QA/PO |
| BG1.6 | Search viser items og navigation virker | TC-B1.2 | QA/PO |
| BG1.7 | Item-detalje loader med projectId + itemId | TC-B1.3 | QA/PO |
| BG1.8 | Kommentarer create/read/delete | TC-B1.4 + TC-CH.1–CH.8 | QA/PO |
| BG1.9 | Checkpoints create/update | TC-B1.5 | QA/PO |
| BG1.10 | Dynamisk liste toggler source item status | TC-B1.6 | QA/PO |
| BG1.11 | Email-medlem editor access | TC-B1.10 | QA/PO |
| BG1.12 | Ikke-medlem security | TC-B1.11 + TC-SEC.1–SEC.37 | QA/Security Agent |
| BG1.13 | Negative regeltests per rolle | TC-SEC.1–SEC.37 | Security Agent |
| BG1.14 | Ingen nye composite-index-fejl i emulator logs | Tjek logs under emulator-kørsel | Security Agent |
| BG1.15 | PO godkendelse ifølge SOP | SOP for PO-godkendelser | PO |

### 6.2 Build 1 trigger conditions (Build 1 må IKKE frigives hvis)

- BG1.1–BG1.4 fejler.
- BG1.5–BG1.13 fejler på mere end ét must-pass case.
- Firestore emulator viser `permission_denied` for gyldige projektmedlemmer.
- App crasher ved åbning af item-detalje fra Board, Søg eller Checkliste.
- `npm run typecheck` fejler pga. manglende `projectId` param i service-kald.

### 6.3 Build 2 trigger conditions (Build 2 skal bygges når)

| # | Betingelse | Begrundelse |
|---|---|---|
| BT2.1 | Build 1 var NO-GO på grund af gate-fejl, emulator-tests eller E2E-fejl der ikke kunne rettes inden Build 1. | Build 2 er en re-build med rettelser; ingen nye features. |
| BT2.2 | PO finder P1/P2-regressioner under fysisk iOS E2E-test af Build 1. | Build 2 til specifikke bugfixes; affected gates genkøres. |
| BT2.3 | Projekt-scopede checklists, regel-redesign eller data-model-ændringer blev ikke færdige før Build 1. | **Ikke acceptabelt som Build 2** — kræver ny planlægningsrunde. |
| BT2.4 | PO finder blocker under Build 1 fysisk test. | Build 2 til bugfixes. |

### 6.4 Build 2 GO criteria (must-pass før Build 2 frigives)

| # | Kriterium | Metode | Ansvarlig |
|---|---|---|---|
| BG2.1 | Cloud Function `deleteProject` deployet | `firebase deploy --only functions` | Cloud Agent |
| BG2.2 | Projektsletning fjerner alt | TC-B1.9 + TC-B9.1–B9.6 | QA/PO |
| BG2.3 | Offline checklist pending-op sync | TC-B1.7 | QA/PO |
| BG2.4 | Reminder notification åbner korrekt item-detalje | TC-B1.8 + TC-B4.1 | QA/PO |
| BG2.5 | Fuld fysisk iOS regression checklist bestået | Manuel checkliste afsnit 5 | QA/PO |
| BG2.6 | `npm run typecheck` og `npm run lint` stadig grønne | Kør gates igen | QA Agent |
| BG2.7 | Firestore regler deployet og emulator-tests grønne | `firebase deploy --only firestore:rules` + emulator | Security Agent |
| BG2.8 | Ingen orphaned items/checkpoints/comments/checklists/Storage efter sletning | Tjek Firebase Console efter TC-B1.9 | QA/Cloud Agent |
| BG2.9 | PO godkendelse ifølge SOP | SOP for PO-godkendelser | PO |

---

## 7. Cloud Function detaljerede testcases

### TC-B9.1: deleteProject callable — autentificering og validering
| Felt | Værdi |
|---|---|
| ID | TC-B9.1 |
| Område | Cloud Function / Sikkerhed |
| Regression | Nej |
| Testtrin | 1. Kald `deleteProject` uden auth. <br> 2. Kald med ugyldigt `projectId`. <br> 3. Kald med ikke-eksisterende `projectId`. |
| Forventet resultat | Uden auth: `unauthenticated`. Ugyldigt projectId: `invalid-argument`. Ikke-eksisterende: `not-found`. |
| Status MA | 🟢 |
| Begrundelse MA | Functions unit tests: 8/8 PASS (auth, rolle, cascade, storage cleanup). |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | Ikke manuelt testet i build 92247ec7. |
| Senest opdateret | 2026-08-13 |

### TC-B9.2: deleteProject callable — rollecheck
| Felt | Værdi |
|---|---|
| ID | TC-B9.2 |
| Område | Cloud Function / Sikkerhed |
| Regression | Nej |
| Testtrin | 1. Kald som owner. <br> 2. Kald som admin. <br> 3. Kald som editor. <br> 4. Kald som viewer. <br> 5. Kald som ikke-medlem. |
| Forventet resultat | Owner/admin: success. Editor/viewer/ikke-medlem: `permission-denied`. |
| Status MA | 🟢 |
| Begrundelse MA | Functions unit tests: 8/8 PASS (owner, admin, editor, viewer, non-member cases). |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | Ikke manuelt testet i build 92247ec7. |
| Senest opdateret | 2026-08-13 |

### TC-B9.3: deleteProject callable — cascade sletning
| Felt | Værdi |
|---|---|
| ID | TC-B9.3 |
| Område | Cloud Function / Data-integritet |
| Regression | Ja |
| Testtrin | 1. Opret projekt med items, checkpoints, comments, members, project-scoped checklists og fotos. <br> 2. Kald `deleteProject({ projectId })` som owner. <br> 3. Verificér i Firebase Console og Storage. |
| Forventet resultat | `recursiveDelete(projectRef)` fjerner projekt + subcollections. Projekt-scopede checklists fjernes. Storage-præfiks `projects/{projectId}/items/` fjernes. |
| Status MA | 🟢 |
| Begrundelse MA | Functions unit tests: cascade + storage cleanup PASS. Cloud Function `deleteProject` redeployet us-central1 v1 callable. |
| PO testet | - [x] |
| Status PO | 🔴 |
| Begrundelse PO | Build 92247ec7 (commit 60542c1, 2026-08-11/12): TC-001 projektsletning fejlede med `UNAUTHENTICATED` før cascade kunde verificeres. Fejl: `deleteProject fejlede: httpsCallable(unauthenticated): UNAUTHENTICATED; directUrl(unknown): JSON Parse error: Unexpected character:` |
| Senest opdateret | 2026-08-13 |

### TC-B9.4: deleteProject response shape og runtime config
| Felt | Værdi |
|---|---|
| ID | TC-B9.4 |
| Område | Cloud Function / Kontrakt |
| Regression | Nej |
| Testtrin | 1. Kald `deleteProject({ projectId })` som owner. <br> 2. Tjek returneret data og function-konfiguration i `firebase.json` / functions-kilde. |
| Forventet resultat | Callable returnerer `{ success: true }`. Function kører med `memory: "512MB"` og `timeoutSeconds: 300`. |
| Status MA | 🟢 |
| Begrundelse MA | Functions unit tests PASS; runtime config verificeret i kildekode og deploy. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | Kun implicit: kald nåede aldrig funktionen pga. `UNAUTHENTICATED`. |
| Senest opdateret | 2026-08-13 |

### TC-B9.5: deleteProject Storage cleanup failure håndtering
| Felt | Værdi |
|---|---|
| ID | TC-B9.5 |
| Område | Cloud Function / Fejlhåndtering |
| Regression | Nej |
| Testtrin | 1. Mock eller simulér at Storage-sletning fejler (fx ugyldig bucket-konfig eller netværksfejl). <br> 2. Kald `deleteProject({ projectId })` som owner. |
| Forventet resultat | Function returnerer stadig `{ success: true }`. Firestore-projektet og subcollections er slettet. Storage-fejl logges som warning; der er **ikke** rollback. |
| Status MA | 🟢 |
| Begrundelse MA | Functions unit tests: storage cleanup failure håndtering PASS. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | Ikke manuelt testet i build 92247ec7. |
| Senest opdateret | 2026-08-13 |

### TC-B9.6: deleteProject unavailable — ingen client-side cascade fallback
| Felt | Værdi |
|---|---|
| ID | TC-B9.6 |
| Område | Cloud Function / Offline & fallback |
| Regression | Nej |
| Testtrin | 1. Simulér at callable er utilgængelig (offline eller emulator ikke startet). <br> 2. Forsøg at slette projekt via appen. |
| Forventet resultat | Appen viser fejl til brugeren. Der må **ikke** finde client-side cascade delete sted (ingen batch-sletning af items/checkpoints/comments). |
| Status MA | 🟢 |
| Begrundelse MA | Kode-review: client-side `deleteProjectCascade` fjernet; kun callable-kald. |
| PO testet | - [x] |
| Status PO | 🟢 |
| Begrundelse PO | Build 92247ec7: Ved `UNAUTHENTICATED` fejl viste appen fejlmeddelelse og slettede ikke data client-side. Ingen cascade fandt sted. |
| Senest opdateret | 2026-08-13 |

---

## 8. Push-påmindelse detaljeret testcase

### TC-B4.1: Reminder med targetProjectId
| Felt | Værdi |
|---|---|
| ID | TC-B4.1 |
| Område | Push-påmindelser / Subcollection migration |
| Regression | Ja |
| Testtrin | 1. Åbn item i projekt A. <br> 2. Opret reminder. <br> 3. Verificér dokument i Firestore `/users/{userId}/reminders/{reminderId}` har feltet `targetProjectId`. <br> 4. Verificér scheduled notification data payload har `targetProjectId`. |
| Forventet resultat | `targetProjectId` sættes lig `projectId`. Notification data kan parses i `NotificationResponseHandler`. |
| Status MA | ⚪ |
| Begrundelse MA | `Reminder` / `ReminderInput` udvidet med `targetProjectId?: string`. `createReminder` kopierer feltet. |
| PO testet | - [ ] |
| Status PO | ⚪ |
| Begrundelse PO | |
| Senest opdateret | 2026-07-15 |

---

## 9. Regressionstest-skabelon (kopiér ved Build 1 / Build 2)

Bruges når der er lavet større ændringer. Kopier relevante `Regression: Ja`-cases herunder og marker dem.

| ID | Område | Status MA | Begrundelse MA | PO testet | Status PO | Begrundelse PO |
|---|---|---|---|---|---|---|
| TC-A.1 | App-start | ⚪ | | - [ ] | ⚪ | |
| TC-A.2 | Auth | ⚪ | | - [ ] | ⚪ | |
| TC-A.3 | Persistence | ⚪ | | - [ ] | ⚪ | |
| TC-C.1 | Opret projekt | ⚪ | | - [ ] | ⚪ | |
| TC-C.2 | Projektliste | ⚪ | | - [ ] | ⚪ | |
| TC-C.3 | Vælg projekt | ⚪ | | - [ ] | ⚪ | |
| TC-C.4 | Projekt-persistence | ⚪ | | - [ ] | ⚪ | |
| TC-C.5 | Inviter email | ⚪ | | - [ ] | ⚪ | |
| TC-D.1 | Opret item | ⚪ | Ny signatur `createItem(projectId, item)` | - [ ] | ⚪ | |
| TC-D.2 | Vis Board | ⚪ | Subcollection list-query | - [ ] | ⚪ | |
| TC-D.3 | Kategori-forslag | ⚪ | | - [ ] | ⚪ | |
| TC-E.1 | Album-upload | ⚪ | Storage-path uændret | - [ ] | ⚪ | |
| TC-E.2 | Kamera-upload | ⚪ | | - [ ] | ⚪ | |
| TC-E.3 | Foto i detalje | ⚪ | `getItemById(projectId, itemId)` | - [ ] | ⚪ | |
| TC-E.4 | OCR | ⚪ | | - [ ] | ⚪ | |
| TC-F.1 | Stemmeoptagelse | ⚪ | | - [ ] | ⚪ | |
| TC-F.2 | Auto-gem | ⚪ | `createItem(projectId, ...)` | - [ ] | ⚪ | |
| TC-F.3 | Stemmekategori | ⚪ | | - [ ] | ⚪ | |
| TC-F.4 | Foto i stemme | ⚪ | | - [ ] | ⚪ | |
| TC-G.1 | Søgning | ⚪ | Subcollection per projekt | - [ ] | ⚪ | |
| TC-G.2 | Stemme-søgning | ⚪ | | - [ ] | ⚪ | |
| TC-H.1 | Item-detalje | ⚪ | Route params `projectId`+`itemId` | - [ ] | ⚪ | |
| TC-H.2 | Rediger item | ⚪ | `updateItem(projectId, itemId, ...)` | - [ ] | ⚪ | |
| TC-H.3 | Slet item | ⚪ | `deleteItem(projectId, itemId)` | - [ ] | ⚪ | |
| TC-R.1 | Inviter med rolle | ⚪ | | - [ ] | ⚪ | |
| TC-R.2 | Skift rolle | ⚪ | | - [ ] | ⚪ | |
| TC-R.3 | Fjern medlem | ⚪ | | - [ ] | ⚪ | |
| TC-R.4 | Viewer read-only | ⚪ | Subcollection read tilladt | - [ ] | ⚪ | |
| TC-AS.1 | Tildel ansvarlig | ⚪ | | - [ ] | ⚪ | |
| TC-AS.2 | Skift ansvarlig | ⚪ | | - [ ] | ⚪ | |
| TC-AS.3 | Vis ansvarlig | ⚪ | | - [ ] | ⚪ | |
| TC-CH.1–CH.8 | Kommentarer | ⚪ | Subcollection comments | - [ ] | ⚪ | |
| TC-CH.9–CH.11 | Comment→note | ⚪ | | - [ ] | ⚪ | |
| TC-I.1–I.4 | Deep links | ⚪ | | - [ ] | ⚪ | |
| TC-J.1 | Push-token | ⚪ | | - [ ] | ⚪ | |
| TC-005.7–005.28 | Dynamiske lister | 🟡 | Rettet i genetablering; afventer gen-test | - [x] | 🔴 | TC-005 i build 92247ec7: 5-8 duplikater af samme sag i dynamisk liste |
| TC-B1.1–B1.14 | Subcollection migration | ⚪ | Nye cases | - [ ] | ⚪ | |
| TC-B4.1 | Reminder targetProjectId | ⚪ | Nyt felt | - [ ] | ⚪ | |
| TC-B9.1–B9.6 | Cloud Function sletning | 🟡 | Functions unit tests PASS; PO-test af TC-001 fejlede med `UNAUTHENTICATED` | - [x] | 🔴 | TC-001 i build 92247ec7: `deleteProject fejlede: httpsCallable(unauthenticated): UNAUTHENTICATED` |
| TC-SEC.1–SEC.37 | Sikkerhed | ⚪ | Nye negative cases | - [ ] | ⚪ | |
| TC-MIG.1–MIG.5 | Migration | ⚪ | Wipe-and-recreate | - [ ] | ⚪ | |

---

## 10. Ændringslog / historik

| Dato | Version | Hvad der er ændret | Ansvarlig |
|---|---|---|---|
| 2026-07-15 | 1.0 | Oprettet US-004 subcollection migration testplan med baseline-cases, nye E2E cases, negative sikkerhedstest, migration, iOS regression og build-go gates | Test Manager Agent |
| 2026-08-13 | 1.1 | Indskrevet PO-testresultater fra build `92247ec7` (commit `60542c1`, 2026-08-11/12): TC-001 (🔴 `UNAUTHENTICATED`), TC-005 (🔴 dynamisk liste duplikerer), TC-006 (🔴 slet liste permission-denied), TC-007 (🔴 flueben sync), TC-008 (🔴 stemme uden punktum/æøå), TC-GEO-002/003/005 (🟡/🔴 geofence). Cloud Function unit tests markeret 🟢. | Master Agent |

---

## 11. Relateret

- `C:\Users\kimgr\data-capture-app\.claude\team\status\impl-plan-items-subcollection-us004.md`
- `C:\Users\kimgr\data-capture-app\.claude\team\status\rca-items-read-us004.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.md`
- `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\master-agent-verification-checklist.md`
