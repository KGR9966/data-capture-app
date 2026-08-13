# Data Capture — Comprehensive bug/backlog-round testplan

**Dokument:** `.claude/team/test/testplan-comprehensive-round.md`  
**Dato:** 2026-07-15  
**Status:** PO-godkendt comprehensive round  
**Ansvarlig:** Test Manager Agent  
**Platforme:** iOS, Android, web (hvor relevant)  

---

## Sådan læses planen

| Kolonne | Betydning |
|---|---|
| **ID** | Unikt testcase-id. Format: `TC-<område>-###`. |
| **Forudsætning** | Data, roller, tilladelser og tilstand før test. |
| **Trin** | Nummererede handlinger. |
| **Forventet resultat** | Præcis succes-kriterie. |
| **Status** | `🟢` OK / `🟡` forbehold / `🔴` fejler / `⚪` ikke testet. |
| **Faktisk resultat** | Udfyldes under test. |
| **Bemærkninger** | Enhed, build, logs, screenshots, regression-referencer. |

---

## 1. US-005: Præcis / wildcard-søgning

**Filer berørt:** `services/search.ts`, søgefelt-UI  
**Mål:** `"..."` matcher hele ord/frase, `*...*` matcher hele-ord wildcard, almindelig tekst er substring.  

### Oversigt

| # | Case | Fokus | Regression |
|---|---|---|---|
| TC-SRC-001 | Almindelig tekst som substring | Substring | Ja |
| TC-SRC-002 | Præcis phrase `"..."` matcher hele ord | Phrase | Ja |
| TC-SRC-003 | Præcis phrase skelner fra delstreng | Phrase | Ja |
| TC-SRC-004 | Tegnsætning tæller som word boundary | Phrase | Ja |
| TC-SRC-005 | Hele-ord wildcard `*...*` | Wildcard | Ja |
| TC-SRC-006 | Wildcard kræver sammenhæng i ét ord | Wildcard | Ja |
| TC-SRC-007 | Kombinationer: phrase + substring + OR/NOT | Kombination | Ja |
| TC-SRC-008 | æøå + normalisering | Sprog | Ja |
| TC-SRC-009 | Highlight-intervaller for phrase/wildcard | Highlight | Ja |
| TC-SRC-010 | UI-hint for søgesyntaks | UI | Ja |

### TC-SRC-001: Almindelig tekst som substring
| Felt | Værdi |
|---|---|
| ID | TC-SRC-001 |
| Forudsætning | Projekt har sager med "Liseleje" og "Liselejevej". |
| Trin | 1. Gå til Søg. <br> 2. Indtast `Liseleje`. |
| Forventet resultat | Begge sager matches (substring). Antal resultater vises. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-SRC-002: Præcis phrase matcher hele ord
| Felt | Værdi |
|---|---|
| ID | TC-SRC-002 |
| Forudsætning | Projekt har sag med "Besøg i Liseleje". |
| Trin | 1. Gå til Søg. <br> 2. Indtast `"Liseleje"`. |
| Forventet resultat | Sagen matches. Highlight markerer kun hele ordet. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-SRC-003: Præcis phrase skelner fra delstreng
| Felt | Værdi |
|---|---|
| ID | TC-SRC-003 |
| Forudsætning | Projekt har sag med "Besøg i Liselejevej" men ikke "Liseleje" som isoleret ord. |
| Trin | 1. Gå til Søg. <br> 2. Indtast `"Liseleje"`. |
| Forventet resultat | Ingen match. Søgeresultatlisten er tom. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-SRC-004: Tegnsætning tæller som word boundary
| Felt | Værdi |
|---|---|
| ID | TC-SRC-004 |
| Forudsætning | Projekt har sag med tekst "Liseleje,". |
| Trin | 1. Gå til Søg. <br> 2. Indtast `"Liseleje"`. |
| Forventet resultat | Sagen matches. Komma betragtes som boundary. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-SRC-005: Hele-ord wildcard
| Felt | Værdi |
|---|---|
| ID | TC-SRC-005 |
| Forudsætning | Projekt har sager med "Liseleje" og "Liselejevej". |
| Trin | 1. Gå til Søg. <br> 2. Indtast `*liselej*`. |
| Forventet resultat | Begge sager matches. `*liselej*` matcher inden for ét ord. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-SRC-006: Wildcard kræver sammenhæng i ét ord
| Felt | Værdi |
|---|---|
| ID | TC-SRC-006 |
| Forudsætning | Projekt har sag med tekst "leje i Lise" (ordene er adskilt). |
| Trin | 1. Gå til Søg. <br> 2. Indtast `*liselej*`. |
| Forventet resultat | Ingen match. Wildcard kræver sammenhængende bogstaver inden for ét ord. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-SRC-007: Kombinationer af phrase, substring og operatorer
| Felt | Værdi |
|---|---|
| ID | TC-SRC-007 |
| Forudsætning | Sager findes med "Liseleje", "Liselejevej", "Asserbo". |
| Trin | 1. Søg `"Liseleje" vej`. <br> 2. Søg `"Liseleje" -vej`. <br> 3. Søg `"Liseleje" OR "Asserbo"`. |
| Forventet resultat | 1) Kun sager med både hele ordet "Liseleje" og delstreng "vej". <br> 2) Sager med "Liseleje" men ikke "vej". <br> 3) Sager med enten "Liseleje" eller "Asserbo" som hele ord. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-SRC-008: æøå og normalisering
| Felt | Værdi |
|---|---|
| ID | TC-SRC-008 |
| Forudsætning | Projekt har sager med "Rødovre" og "Rødovrevej". |
| Trin | 1. Søg `"Rødovre"`. <br> 2. Søg `*rød*`. |
| Forventet resultat | 1) Kun "Rødovre" matches, ikke "Rødovrevej". <br> 2) "Rødovre" matches (wildcard + normalisering). |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-SRC-009: Highlight-intervaller for phrase/wildcard
| Felt | Værdi |
|---|---|
| ID | TC-SRC-009 |
| Forudsætning | Projekt har sag med tekst "Liseleje Liselejevej". |
| Trin | 1. Søg `"Liseleje"`. |
| Forventet resultat | Kun første ord fremhæves. Andet ord fremhæves ikke. Layout brydes ikke. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-SRC-010: UI-hint for søgesyntaks
| Felt | Værdi |
|---|---|
| ID | TC-SRC-010 |
| Forudsætning | Søgefelt er tilgængeligt. |
| Trin | 1. Gå til Søg. <br> 2. Observer tekst under/ved søgefeltet. |
| Forventet resultat | Hint vises: "Almindelig tekst søger som delstreng. Brug \"...\" for præcis ord/phrase og *...* for hele-ord wildcard." |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

---

## 2. US-011/B4: Push-påmindelser

**Filer berørt:** `services/reminders.ts`, `services/reminderNotifications.ts`, `components/ReminderModal.tsx`, `app/item.tsx`, `app/checklist.tsx`, `app/_layout.tsx`  
**Mål:** Lokale push-påmindelser på sager og listepunkter med planlagt tid, gentagelse og routing.  

### Oversigt

| # | Case | Fokus | Regression |
|---|---|---|---|
| TC-REM-001 | Opret påmindelse på sag | Opret + planlæg | Ja |
| TC-REM-002 | Tryk på notifikation åbner sag | Routing | Ja |
| TC-REM-003 | Slet påmindelse inden udløb | Cancel | Ja |
| TC-REM-004 | Daglig gentagelse | Gentagelse | Ja |
| TC-REM-005 | Tilladelse nægtet flow | Permission | Ja |
| TC-REM-006 | App dræbt inden udløb | OS-planlægning | Ja |
| TC-REM-007 | Ændring af tidspunkt | Reschedule | Ja |
| TC-REM-008 | Påmindelse på listepunkt | Checklist point | Ja |
| TC-REM-009 | Inaktivér / slet sag fjerner påmindelse | Cleanup | Ja |

### TC-REM-001: Opret påmindelse på sag
| Felt | Værdi |
|---|---|
| ID | TC-REM-001 |
| Forudsætning | Sag "Køb maling" er åben. Notifikationstilladelser er givet (eller prompt accepteres). |
| Trin | 1. Tryk klokke-ikon. <br> 2. Sæt tid til om 2 min. <br> 3. Vælg "En gang". <br> 4. Gem. |
| Forventet resultat | Påmindelse gemmes i Firestore under `/users/{uid}/reminders`. Planlagt notifikation vises i OS. Efter 2 min vises push med titel "Køb maling". |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | Test på fysisk enhed; simulator viser ikke altid push. |

### TC-REM-002: Tryk på notifikation åbner sag
| Felt | Værdi |
|---|---|
| ID | TC-REM-002 |
| Forudsætning | TC-REM-001 gennemført; push modtaget. |
| Trin | 1. Tryk på notifikationen. |
| Forventet resultat | Appen åbner `app/item.tsx` med korrekt `itemId`. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-REM-003: Slet påmindelse inden udløb
| Felt | Værdi |
|---|---|
| ID | TC-REM-003 |
| Forudsætning | Påmindelse planlagt om 5 min på en sag. |
| Trin | 1. Åbn påmindelsesmodal. <br> 2. Tryk Slet / Fjern. |
| Forventet resultat | Ingen notifikation vises efter 5 min. Dokument markeres inaktivt eller slettes. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-REM-004: Daglig gentagelse
| Felt | Værdi |
|---|---|
| ID | TC-REM-004 |
| Forudsætning | Listepunkt "Tjek fugt" har daglig påmindelse kl. 09.00. |
| Trin | 1. Gem påmindelse. <br> 2. Vent til næste dag kl. 09.00 (eller juster enhedstid). |
| Forventet resultat | Notifikation vises dagligt. Identifikator genbruges — ingen duplikater. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-REM-005: Tilladelse nægtet
| Felt | Værdi |
|---|---|
| ID | TC-REM-005 |
| Forudsætning | Frisk installation eller afvist tilladelse. |
| Trin | 1. Åbn sag. <br> 2. Tryk klokke. <br> 3. Afvis tilladelse i systemdialog. |
| Forventet resultat | Modal lukkes ikke med fejl. Blid prompt vises med mulighed for at åbne systemindstillinger. Ingen crash. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | Test på iOS og Android 13+. |

### TC-REM-006: App dræbt inden udløb
| Felt | Værdi |
|---|---|
| ID | TC-REM-006 |
| Forudsætning | Påmindelse sat om 10 min. |
| Trin | 1. Luk app helt. <br> 2. Vent 10 min. |
| Forventet resultat | Notifikation vises alligevel (OS gemmer trigger). |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-REM-007: Ændring af tidspunkt
| Felt | Værdi |
|---|---|
| ID | TC-REM-007 |
| Forudsætning | Eksisterende påmindelse kl. 10.00. |
| Trin | 1. Åbn modal. <br> 2. Ændr til kl. 11.00. <br> 3. Gem. |
| Forventet resultat | Kl. 10.00 vises ingen notifikation. Kl. 11.00 vises den. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-REM-008: Påmindelse på listepunkt
| Felt | Værdi |
|---|---|
| ID | TC-REM-008 |
| Forudsætning | Liste åben med punkt "Bestil isolering". |
| Trin | 1. Tryk påmindelse-knap på listepunktet. <br> 2. Sæt tid. <br> 3. Gem. |
| Forventet resultat | Påmindelse gemmes. Ved udløb åbner tryk på notifikation listen med `checklistId`. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-REM-009: Slet sag/liste fjerner tilknyttede påmindelser
| Felt | Værdi |
|---|---|
| ID | TC-REM-009 |
| Forudsætning | Sag med påmindelse eller liste med punkt med påmindelse. |
| Trin | 1. Slet sag/liste. <br> 2. Vent på sync. |
| Forventet resultat | Påmindelsesdokumenter markeres inaktive. Planlagte notifikationer annulleres. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | Afhænger af US-001 delete cascade. |

---

## 3. US-005/B3: Offline understøttelse af lister

**Filer berørt:** `services/checklistsOffline.ts`, `hooks/useProjectChecklistsOffline.ts`, `hooks/useChecklistItemsOffline.ts`, `app/(tabs)/checklists.tsx`, `app/checklist.tsx`  
**Mål:** Se og redigere lister/listepunkter offline; ændringer synkroniseres ved online.  

### Oversigt

| # | Case | Fokus | Regression |
|---|---|---|---|
| TC-OFL-001 | Listeoversigt vises offline | Cache | Ja |
| TC-OFL-002 | Listedetalje vises offline | Cache | Ja |
| TC-OFL-003 | Afkryds punkt offline | Optimistic update | Ja |
| TC-OFL-004 | Rediger noter offline | Update queue | Ja |
| TC-OFL-005 | Genstart app offline bevarer ændringer | Persistens | Ja |
| TC-OFL-006 | Opret punkt på manuel liste offline | Add manual | Ja |
| TC-OFL-007 | Slet punkt offline | Delete + track | Ja |
| TC-OFL-008 | To enheder konflikt | Last-write-wins | Ja |
| TC-OFL-009 | Kompaktion af pending queue | Queue compaction | Ja |
| TC-OFL-010 | Pull-to-refresh flusher queue | PTR | Ja |
| TC-OFL-011 | Offline-indikator og deaktiverede handlinger | UI | Ja |

### TC-OFL-001: Listeoversigt vises offline
| Felt | Værdi |
|---|---|
| ID | TC-OFL-001 |
| Forudsætning | Bruger har tidligere åbnet listeoversigten online. |
| Trin | 1. Aktiver flymode. <br> 2. Åbn Checklister-fane. |
| Forventet resultat | Cachede lister vises. Offline-badge vises. Ingen uendelig loader. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-OFL-002: Listedetalje vises offline
| Felt | Værdi |
|---|---|
| ID | TC-OFL-002 |
| Forudsætning | Liste åbnet online. |
| Trin | 1. Aktiver flymode. <br> 2. Åbn listen igen. |
| Forventet resultat | Cachede punkter vises. Offline-badge vises. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-OFL-003: Afkryds punkt offline
| Felt | Værdi |
|---|---|
| ID | TC-OFL-003 |
| Forudsætning | Liste åben offline med udført punkt. |
| Trin | 1. Afkryds punkt. <br> 2. Observer UI. <br> 3. Slå flymode fra. |
| Forventet resultat | UI opdateres med det samme. "afventer sync"-label vises. Ved online flush opdateres source-sag/checkpoint. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-OFL-004: Rediger noter offline
| Felt | Værdi |
|---|---|
| ID | TC-OFL-004 |
| Forudsætning | Liste åben offline. |
| Trin | 1. Rediger noter på et punkt. <br> 2. Gem. <br> 3. Slå flymode fra. |
| Forventet resultat | Noter synkroniseres til Firestore. `updatedAt` sættes af serveren. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-OFL-005: Genstart app offline bevarer ændringer
| Felt | Værdi |
|---|---|
| ID | TC-OFL-005 |
| Forudsætning | Ændringer lavet offline. |
| Trin | 1. Luk app helt. <br> 2. Aktiver flymode (hvis ikke allerede). <br> 3. Genstart app. |
| Forventet resultat | Cache og pending operations indlæses. Lokale ændringer bevares. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-OFL-006: Opret punkt på manuel liste offline
| Felt | Værdi |
|---|---|
| ID | TC-OFL-006 |
| Forudsætning | Manuel liste åben offline. |
| Trin | 1. Tryk "Tilføj punkt". <br> 2. Indtast titel. <br> 3. Gem. <br> 4. Slå flymode fra. |
| Forventet resultat | Punkt vises med lokalt id. Ved sync oprettes det i Firestore; id udskiftes uden UI-flash. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-OFL-007: Slet punkt offline
| Felt | Værdi |
|---|---|
| ID | TC-OFL-007 |
| Forudsætning | Dynamisk liste åben offline med punkt. |
| Trin | 1. Slet punkt. <br> 2. Slå flymode fra. |
| Forventet resultat | Punkt fjernes lokalt. Ved sync kaldes `deleteChecklistItemAndTrack`; `deletedItemKeys` opdateres. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-OFL-008: To enheder konflikt
| Felt | Værdi |
|---|---|
| ID | TC-OFL-008 |
| Forudsætning | To enheder; samme konto; samme liste. |
| Trin | 1. Enhed A ændrer titlen offline. <br> 2. Enhed B ændrer titlen online. <br> 3. A går online. |
| Forventet resultat | A's lokale titel vinder. Non-blocking indikator: "Overskrevet med din seneste ændring". |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-OFL-009: Kompaktion af pending queue
| Felt | Værdi |
|---|---|
| ID | TC-OFL-009 |
| Forudsætning | Offline. |
| Trin | 1. Toggle punkt. <br> 2. Rediger noter. <br> 3. Toggle samme punkt igen. <br> 4. Slå flymode fra. |
| Forventet resultat | Kun endelig tilstand synkroniseres. Ingen overflødige Firestore-writes. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-OFL-010: Pull-to-refresh flusher queue
| Felt | Værdi |
|---|---|
| ID | TC-OFL-010 |
| Forudsætning | Netværk tilbage. Pending operationer findes. |
| Trin | 1. Træk ned i liste. |
| Forventet resultat | Queue flushes. Liste opdateres fra Firestore. Spinner forsvinder. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-OFL-011: Offline-indikator og deaktiverede handlinger
| Felt | Værdi |
|---|---|
| ID | TC-OFL-011 |
| Forudsætning | App offline. |
| Trin | 1. Åbn listeoversigt og liste. <br> 2. Observer "Tilføj punkt" på dynamisk liste. <br> 3. Observer Del/Slet/Link knapper. |
| Forventet resultat | Offline-badge vises. "Tilføj punkt" på dynamisk liste er grå/deaktiveret. Del/Slet/Link er grå/deaktiveret. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

---

## 4. US-001/B9: Slet projekt

**Filer berørt:** `services/projects.ts`, `app/(tabs)/index.tsx`, `contexts/ProjectContext.tsx`, `functions/src/deleteProject.ts`  
**Mål:** Ejer kan slette projekt og al tilhørende data via Cloud Function.  

### Oversigt

| # | Case | Fokus | Regression |
|---|---|---|---|
| TC-DEL-001 | Slet tomt projekt | Basisflow | Ja |
| TC-DEL-002 | Slet projekt med sager, checkpoints og kommentarer | Cascade | Ja |
| TC-DEL-003 | Slet projekt med checklister | Cascade | Ja |
| TC-DEL-004 | Slet projekt med fotos | Storage | Ja |
| TC-DEL-005 | Medlem/admin forsøger at slette | Rolle | Ja |
| TC-DEL-006 | Annullér i bekræftelsesdialog | Afbryd | Ja |
| TC-DEL-007 | Forkert navn i tekstbekræftelse | Guard | Ja |
| TC-DEL-008 | Aktivt projekt slettes | Active project | Ja |
| TC-DEL-009 | Netværksfejl under sletning | Fejlhåndtering | Ja |

### TC-DEL-001: Slet tomt projekt
| Felt | Værdi |
|---|---|
| ID | TC-DEL-001 |
| Forudsætning | Bruger ejer tomt projekt uden sager, lister eller fotos. |
| Trin | 1. Tryk "..." på projektkort. <br> 2. Vælg "Slet projekt". <br> 3. Gennemfør dialoger og skriv navn. <br> 4. Bekræft. |
| Forventet resultat | Projekt og `members`-subcollection fjernes. Bruger sendes tilbage til projektlisten. |
| Status | 🔴 |
| Faktisk resultat | Build `92247ec7` (commit `60542c1`, 2026-08-11/12): Sletning fejler med `UNAUTHENTICATED`. Fejlmeddelelse: `Diagnose: sletning fejlede. Sletning fejlede (unknown): deleteProject fejlede: httpsCallable(unauthenticated): UNAUTHENTICATED; directUrl(unknown): JSON Parse error: Unexpected character:` |
| Bemærkninger | Rodårsag: `deleteProject` Cloud Function manglede IAM `allUsers` + `Cloud Functions Invoker`. Rettet efterfølgende; afventer verifikation i næste build. |

### TC-DEL-002: Slet projekt med sager, checkpoints og kommentarer
| Felt | Værdi |
|---|---|
| ID | TC-DEL-002 |
| Forudsætning | Projekt har sager med checkpoints og kommentarer. |
| Trin | Gennemfør slet-flow. |
| Forventet resultat | Alle `items`, `checkpoints` og `comments` med `projectId` er fjernet. Ingen dokumenter kan queries frem. |
| Status | 🟡 |
| Faktisk resultat | Ikke individuelt testet i build 92247ec7. Underliggende `deleteProject` fejlede med `UNAUTHENTICATED` for TC-DEL-001. |
| Bemærkninger | Gen-test efter IAM-rettelse og verifikation af TC-DEL-001. |

### TC-DEL-003: Slet projekt med checklister
| Felt | Værdi |
|---|---|
| ID | TC-DEL-003 |
| Forudsætning | Projekt har checklister med listepunkter. |
| Trin | Gennemfør slet-flow. |
| Forventet resultat | Alle `checklists` og `checklists/{id}/items` for projektet er fjernet. |
| Status | 🟡 |
| Faktisk resultat | Ikke individuelt testet i build 92247ec7. Underliggende `deleteProject` fejlede med `UNAUTHENTICATED` for TC-DEL-001. |
| Bemærkninger | Gen-test efter IAM-rettelse og verifikation af TC-DEL-001. |

### TC-DEL-004: Slet projekt med fotos
| Felt | Værdi |
|---|---|
| ID | TC-DEL-004 |
| Forudsætning | Projekt har sager med fotos i Storage under `projects/{projectId}/items/`. |
| Trin | Gennemfør slet-flow. |
| Forventet resultat | Storage-mappen er tom. Download-URL'er returnerer 404. |
| Status | 🟡 |
| Faktisk resultat | Ikke individuelt testet i build 92247ec7. Foto-upload (TC-002) bestod, men sletning af fotos under projektsletning kunne ikke verificeres pga. `UNAUTHENTICATED`. |
| Bemærkninger | Gen-test efter IAM-rettelse og verifikation af TC-DEL-001. |

### TC-DEL-005: Medlem eller admin forsøger at slette
| Felt | Værdi |
|---|---|
| ID | TC-DEL-005 |
| Forudsætning | Bruger er medlem/admin i projekt ejet af en anden. |
| Trin | 1. Forsøg at påkalde slet-funktion via UI. <br> 2. (Optional) Kald Cloud Function direkte. |
| Forventet resultat | Handling afvises. Projekt og data forbliver intakte. Slet-knap vises ikke for ikke-ejere. |
| Status | 🟡 |
| Faktisk resultat | Ikke individuelt testet i build 92247ec7. Rolle-checks er verificeret i functions unit tests (8/8 PASS). |
| Bemærkninger | Gen-test i app UI efter IAM-rettelse og verifikation af TC-DEL-001. |

### TC-DEL-006: Annullér i bekræftelsesdialog
| Felt | Værdi |
|---|---|
| ID | TC-DEL-006 |
| Forudsætning | Owner trykker "Slet projekt". |
| Trin | 1. Tryk "Annuller" i dialog 1. <br> 2. Gentag og tryk "Annuller" i dialog 2. |
| Forventet resultat | Intet slettes. Bruger forbliver på projektlisten. |
| Status | 🟡 |
| Faktisk resultat | Ikke individuelt testet i build 92247ec7. Underliggende `deleteProject` fejlede med `UNAUTHENTICATED` for TC-DEL-001. |
| Bemærkninger | Gen-test efter IAM-rettelse og verifikation af TC-DEL-001. |

### TC-DEL-007: Forkert navn i tekstbekræftelse
| Felt | Værdi |
|---|---|
| ID | TC-DEL-007 |
| Forudsætning | Owner er nået til tekstbekræftelse. |
| Trin | 1. Indtast forkert projektnavn. |
| Forventet resultat | "Slet"-knappen forbliver deaktiveret. Sletning kan ikke gennemføres. |
| Status | 🟡 |
| Faktisk resultat | Ikke individuelt testet i build 92247ec7. Underliggende `deleteProject` fejlede med `UNAUTHENTICATED` for TC-DEL-001. |
| Bemærkninger | Gen-test efter IAM-rettelse og verifikation af TC-DEL-001. |

### TC-DEL-008: Aktivt projekt slettes
| Felt | Værdi |
|---|---|
| ID | TC-DEL-008 |
| Forudsætning | Det projekt brugeren står i, er valgt som aktivt. |
| Trin | Slet det aktive projekt. |
| Forventet resultat | `activeProject` nulstilles. Bruger navigeres til projektlisten og ser ikke længere gammelt projekt i Board. |
| Status | 🟡 |
| Faktisk resultat | Ikke individuelt testet i build 92247ec7. Underliggende `deleteProject` fejlede med `UNAUTHENTICATED` for TC-DEL-001. |
| Bemærkninger | Gen-test efter IAM-rettelse og verifikation af TC-DEL-001. |

### TC-DEL-009: Netværksfejl under sletning
| Felt | Værdi |
|---|---|
| ID | TC-DEL-009 |
| Forudsætning | Cloud Function kaldes, men netværk afbrydes. |
| Trin | Gennemfør slet-flow under simuleret netværksfejl. |
| Forventet resultat | UI viser fejlmeddelelse. Projekt vises stadig i listen, da sletning ikke er bekræftet færdig. |
| Status | 🟡 |
| Faktisk resultat | Ikke individuelt testet i build 92247ec7. Underliggende `deleteProject` fejlede med `UNAUTHENTICATED` for TC-DEL-001. |
| Bemærkninger | Gen-test efter IAM-rettelse og verifikation af TC-DEL-001. |

---

## 5. B8 / US-006: Tomt projektnavn + server-side forhindring af dubletter

**Filer berørt:** `app/(tabs)/index.tsx`, `services/projects.ts`, Cloud Function `createProject`, `firestore.rules`  
**Mål:** Tomme/whitespace-navne afvises; fremtidige dubletter forhindres for ejerens egne projekter.  

### Oversigt

| # | Case | Fokus | Regression |
|---|---|---|---|
| TC-PRJ-001 | Tomt navn client-side | Validering | Ja |
| TC-PRJ-002 | Whitespace-only navn | Validering | Ja |
| TC-PRJ-003 | Dublet — eksakt match | Unikhed | Ja |
| TC-PRJ-004 | Dublet — case/mellemrum varianter | Unikhed | Ja |
| TC-PRJ-005 | Anden brugers projekt med samme navn | Scope | Ja |
| TC-PRJ-006 | Cloud Function afviser tomt navn | Server | Ja |
| TC-PRJ-007 | Cloud Function afviser dublet | Server | Ja |
| TC-PRJ-008 | Eksisterende dubletter blokkerer ikke helt | Historisk data | Ja |
| TC-PRJ-009 | Vellykket oprettelse | Happy path | Ja |
| TC-PRJ-010 | `updateProject` validerer navn | Rename | Ja |

### TC-PRJ-001: Tomt navn client-side
| Felt | Værdi |
|---|---|
| ID | TC-PRJ-001 |
| Forudsætning | Bruger åbner "Nyt projekt"-dialogen. |
| Trin | 1. Slet alt tekst. <br> 2. Tryk **Opret**. |
| Forventet resultat | "Projektnavn må ikke være tomt" vises inline. Intet projekt oprettes. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-PRJ-002: Whitespace-only navn
| Felt | Værdi |
|---|---|
| ID | TC-PRJ-002 |
| Forudsætning | Bruger åbner "Nyt projekt"-dialogen. |
| Trin | 1. Indtast "   ". <br> 2. Tryk **Opret**. |
| Forventet resultat | "Projektnavn må ikke være tomt" vises inline. Intet projekt oprettes. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-PRJ-003: Dublet — eksakt match
| Felt | Værdi |
|---|---|
| ID | TC-PRJ-003 |
| Forudsætning | Bruger ejer projekt "Renovering". |
| Trin | 1. Åbn "Nyt projekt". <br> 2. Indtast "Renovering". <br> 3. Tryk **Opret**. |
| Forventet resultat | "Der findes allerede et projekt med dette navn." Intet nyt projekt. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-PRJ-004: Dublet — case/mellemrum varianter
| Felt | Værdi |
|---|---|
| ID | TC-PRJ-004 |
| Forudsætning | Bruger ejer projekt "Renovering". |
| Trin | 1. Indtast "  renovering  ". <br> 2. Indtast "RENovering". <br> 3. Tryk **Opret** for hver. |
| Forventet resultat | Begge blokeres med dublet-besked. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-PRJ-005: Anden brugers projekt med samme navn
| Felt | Værdi |
|---|---|
| ID | TC-PRJ-005 |
| Forudsætning | Bruger har adgang til delt projekt "Renovering" ejet af en anden. |
| Trin | 1. Opret eget projekt "Renovering". |
| Forventet resultat | Tilladt. Unikhed gælder kun egne projekter. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-PRJ-006: Cloud Function afviser tomt navn
| Felt | Værdi |
|---|---|
| ID | TC-PRJ-006 |
| Forudsætning | Client-side guard omgås (f.eks. via testkald). |
| Trin | 1. Kald Cloud Function med `name = ""`. |
| Forventet resultat | `invalid-argument` / "Projektnavn må ikke være tomt". |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-PRJ-007: Cloud Function afviser dublet
| Felt | Værdi |
|---|---|
| ID | TC-PRJ-007 |
| Forudsætning | Eksisterende ejet projekt "Renovering" i Firestore. |
| Trin | 1. Kald Cloud Function med `name = "Renovering"`. |
| Forventet resultat | `already-exists` / "Der findes allerede et projekt med dette navn." |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-PRJ-008: Eksisterende dubletter blokkerer ikke helt
| Felt | Værdi |
|---|---|
| ID | TC-PRJ-008 |
| Forudsætning | Bruger har to eksisterende projekter med navn "Renovering". |
| Trin | 1. Forsøg at oprette tredje "Renovering". |
| Forventet resultat | Blokeret. De to eksisterende projekter kan stadig arbejdes i. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-PRJ-009: Vellykket oprettelse
| Felt | Værdi |
|---|---|
| ID | TC-PRJ-009 |
| Forudsætning | Gyldigt unikt navn. |
| Trin | 1. Indtast navn. <br> 2. Tryk **Opret**. |
| Forventet resultat | Projekt oprettes. Modal lukker. Navigation til board. Aktivt projekt sættes. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-PRJ-010: `updateProject` validerer navn
| Felt | Værdi |
|---|---|
| ID | TC-PRJ-010 |
| Forudsætning | Omdøb-funktion findes eller testes via service. |
| Trin | 1. Forsøg at omdøbe projekt til "" eller "   ". |
| Forventet resultat | `updateProject` kaster "Projektnavn må ikke være tomt". Ingen opdatering. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

---

## 6. US-004 D1: Fjern "Åben"/"åbn"-tekstresidu efter kamera/album-kommando

**Filer berørt:** `services/voiceCommands.ts`, `components/VoiceCaptureModal.tsx`  
**Mål:** Aktionsord (`åbn`, `åben`, `åbne`, `tag`, `vælg`) fjernes sammen med foto-kommandoen.  

### Oversigt

| # | Case | Fokus | Regression |
|---|---|---|---|
| TC-VRC-001 | Kun kommando "Åbn kamera" | Parser | Ja |
| TC-VRC-002 | Accent-variant "Åben kamera" | Parser | Ja |
| TC-VRC-003 | "Åbne kamera" fjerner præfiks | Parser | Ja |
| TC-VRC-004 | Tekst efter album-kommando | Parser | Ja |
| TC-VRC-005 | "Tag billede af..." | Parser | Ja |
| TC-VRC-006 | "Vælg foto fra..." | Parser | Ja |
| TC-VRC-007 | Observationsnote + kamera | Parser | Ja |
| TC-VRC-008 | Modal-flow med foto + efterfølgende tekst | Modal | Ja |
| TC-VRC-009 | Regression: eksisterende voice parser tests | Regression | Ja |

### TC-VRC-001: Kun kommando "Åbn kamera"
| Felt | Værdi |
|---|---|
| ID | TC-VRC-001 |
| Forudsætning | Voice parser tilgængelig. |
| Trin | 1. Kør parser med input `"Åbn kamera"`. |
| Forventet resultat | `command === "openCamera"`. `title === ""`. `content === ""`. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-VRC-002: "Åben kamera"
| Felt | Værdi |
|---|---|
| ID | TC-VRC-002 |
| Forudsætning | Voice parser tilgængelig. |
| Trin | 1. Kør parser med input `"Åben kamera"`. |
| Forventet resultat | `command === "openCamera"`. `title === ""`. `content === ""`. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-VRC-003: "Åbne kamera" fjerner præfiks
| Felt | Værdi |
|---|---|
| ID | TC-VRC-003 |
| Forudsætning | Voice parser tilgængelig. |
| Trin | 1. Kør parser med input `"Åbne kamera"`. |
| Forventet resultat | `command === "openCamera"`. `title === ""`. `content === ""`. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-VRC-004: Tekst efter album-kommando
| Felt | Værdi |
|---|---|
| ID | TC-VRC-004 |
| Forudsætning | Voice parser tilgængelig. |
| Trin | 1. Kør parser med input `"Åbn album vinduet er sprunget"`. |
| Forventet resultat | `command === "openAlbum"`. `title === "vinduet er sprunget"`. `content === ""`. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-VRC-005: "Tag billede af..."
| Felt | Værdi |
|---|---|
| ID | TC-VRC-005 |
| Forudsætning | Voice parser tilgængelig. |
| Trin | 1. Kør parser med input `"Tag billede af skaden på taget"`. |
| Forventet resultat | `command === "openCamera"`. `title === "af skaden på taget"`. `content === ""`. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-VRC-006: "Vælg foto fra..."
| Felt | Værdi |
|---|---|
| ID | TC-VRC-006 |
| Forudsætning | Voice parser tilgængelig. |
| Trin | 1. Kør parser med input `"Vælg foto fra dokumentation"`. |
| Forventet resultat | `command === "openAlbum"`. `title === "fra dokumentation"`. `content === ""`. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-VRC-007: Observationsnote + kamera
| Felt | Værdi |
|---|---|
| ID | TC-VRC-007 |
| Forudsætning | Voice parser tilgængelig. |
| Trin | 1. Kør parser med input `"Observationsnote åbn kamera skaden på taget"`. |
| Forventet resultat | `command === "openCamera"`. `title === "Observationsnote skaden på taget"`. `content === ""`. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-VRC-008: Modal-flow med foto + efterfølgende tekst
| Felt | Værdi |
|---|---|
| ID | TC-VRC-008 |
| Forudsætning | Voice flow kører. |
| Trin | 1. Start optagelse. <br> 2. Sig `"Silvan punktum åbn kamera"`. <br> 3. Tag foto. <br> 4. Sig `"hammer"`. <br> 5. Sig `"gem"`. |
| Forventet resultat | Final title = "Silvan". Final content = "hammer". Intet residu af "åbn"/"kamera". |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-VRC-009: Regression — eksisterende voice parser tests
| Felt | Værdi |
|---|---|
| ID | TC-VRC-009 |
| Forudsætning | `scripts/verify-voice-parser.ts` indeholder E1–E13 cases. |
| Trin | 1. Kør `npx ts-node scripts/verify-voice-parser.ts`. |
| Forventet resultat | Alle eksisterende cases består. Ingen regression. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

---

## 7. US-004 D3: Auto-titel må ikke overskrive manuelt redigeret titel

**Filer berørt:** `components/CreateItemForm.tsx`, `app/(tabs)/board.tsx`  
**Mål:** Når brugeren redigerer titlen, stopper auto-udledning fra beskrivelse.  

### Oversigt

| # | Case | Fokus | Regression |
|---|---|---|---|
| TC-ATT-001 | Auto-titel fra beskrivelse | Basis | Ja |
| TC-ATT-002 | Manuel titel overskrives ikke | Kritisk | Ja |
| TC-ATT-003 | Slettet manuel titel fallback ved gem | Fallback | Ja |
| TC-ATT-004 | Titel før beskrivelse | Rækkefølge | Ja |
| TC-ATT-005 | Modal nulstilles | Reset | Ja |
| TC-ATT-006 | Voice-mode påvirkes ikke | Voice | Ja |
| TC-ATT-007 | Gem med kun beskrivelse | Gem | Ja |
| TC-ATT-008 | Gem med kun titel | Gem | Ja |

### TC-ATT-001: Auto-titel fra beskrivelse
| Felt | Værdi |
|---|---|
| ID | TC-ATT-001 |
| Forudsætning | Bruger åbner `+ Tilføj` manuel oprettelse. |
| Trin | 1. Skriv "Due" i Beskrivelse uden at røre Titel. |
| Forventet resultat | Titel auto-udledes til "Due". |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-ATT-002: Manuel titel overskrives ikke
| Felt | Værdi |
|---|---|
| ID | TC-ATT-002 |
| Forudsætning | TC-ATT-001 gennemført. |
| Trin | 1. Ret Titel til "Duer". <br> 2. Skriv videre i Beskrivelse. |
| Forventet resultat | Titel forbliver "Duer". Beskrivelse ændres kun af brugerens input. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | Kritisk acceptance: "Due → Duer". |

### TC-ATT-003: Slettet manuel titel fallback ved gem
| Felt | Værdi |
|---|---|
| ID | TC-ATT-003 |
| Forudsætning | Bruger har redigeret titlen. |
| Trin | 1. Slet titlen. <br> 2. Gem sagen. |
| Forventet resultat | Ved gem udledes titel fra Beskrivelse. Sagen gemmes. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-ATT-004: Titel før beskrivelse
| Felt | Værdi |
|---|---|
| ID | TC-ATT-004 |
| Forudsætning | Bruger åbner `+ Tilføj`. |
| Trin | 1. Skriv titel først. <br> 2. Skriv beskrivelse. |
| Forventet resultat | Titel ændres ikke af beskrivelse. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-ATT-005: Modal nulstilles
| Felt | Værdi |
|---|---|
| ID | TC-ATT-005 |
| Forudsætning | Bruger åbner `+ Tilføj`, redigerer titel, lukker modalen. |
| Trin | 1. Luk modal. <br> 2. Åbn `+ Tilføj` igen. |
| Forventet resultat | `titleTouchedRef` er nulstillet. Auto-titel fungerer igen fra start. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-ATT-006: Voice-mode påvirkes ikke
| Felt | Værdi |
|---|---|
| ID | TC-ATT-006 |
| Forudsætning | Bruger åbner Optag (`VoiceCaptureModal`). |
| Trin | 1. Tal tekst. <br> 2. Ret titel. <br> 3. Tal videre. |
| Forventet resultat | Voice-mode springer auto-titel over. Titel styres af stemmeparser. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-ATT-007: Gem med kun beskrivelse
| Felt | Værdi |
|---|---|
| ID | TC-ATT-007 |
| Forudsætning | Bruger åbner `+ Tilføj`. |
| Trin | 1. Skriv beskrivelse. <br> 2. Slet auto-titel. <br> 3. Gem. |
| Forventet resultat | Sagen gemmes med `finalTitle = deriveTitle(content)`. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-ATT-008: Gem med kun titel
| Felt | Værdi |
|---|---|
| ID | TC-ATT-008 |
| Forudsætning | Bruger åbner `+ Tilføj`. |
| Trin | 1. Indtast titel. <br> 2. Slet beskrivelse. <br> 3. Gem uden foto. |
| Forventet resultat | Gem-knappen er aktiv. Sagen gemmes med titel og tom beskrivelse. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

---

## 8. UI/UX Review: Board, checklist og item-kommentar

**Filer berørt:** `app/(tabs)/board.tsx`, `app/checklist.tsx`, `app/item.tsx`  
**Mål:** Board-knapper ens bredde, ansvarlig vises i checklist, "Tilbage" forsvinder ikke ved kommentar.  

### Oversigt

| # | Case | Fokus | Regression |
|---|---|---|---|
| TC-UXR-001 | Board-knapper har ens bredde | Board | Ja |
| TC-UXR-002 | Board-knapper accessibility | Board | Ja |
| TC-UXR-003 | Ansvarlig vises i checklist-item | Checklist | Ja |
| TC-UXR-004 | Ansvarlig fallback skjuler tom linje | Checklist | Ja |
| TC-UXR-005 | "Tilbage" forbliver synlig under kommentar | Item | Ja |
| TC-UXR-006 | Kommentar + tastatur + navigation | Item | Ja |

### TC-UXR-001: Board-knapper har ens bredde
| Felt | Værdi |
|---|---|
| ID | TC-UXR-001 |
| Forudsætning | Board-fanen vises. |
| Trin | 1. Observer "Optag" og "Tilføj" knapper. <br> 2. Skift tekststørrelse / accessibility. |
| Forventet resultat | Knapperne har identisk bredde (`width` eller `flex: 1`). Layout brydes ikke. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-UXR-002: Board-knapper accessibility
| Felt | Værdi |
|---|---|
| ID | TC-UXR-002 |
| Forudsætning | Skærmlæser aktiveret. |
| Trin | 1. Fokuser på "Optag" og "Tilføj". |
| Forventet resultat | Begge knapper har `accessible`, `accessibilityRole="button"`, `accessibilityLabel`. Emojis suppleres med tekstlige labels. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-UXR-003: Ansvarlig vises i checklist-item
| Felt | Værdi |
|---|---|
| ID | TC-UXR-003 |
| Forudsætning | Dynamisk liste med punkt fra sag med ansvarlig. |
| Trin | 1. Åbn listen. |
| Forventet resultat | Hvert listepunkt viser ansvarligens navn (f.eks. "👤 Kim") med blåt assignee-look. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-UXR-004: Ansvarlig fallback skjuler tom linje
| Felt | Værdi |
|---|---|
| ID | TC-UXR-004 |
| Forudsætning | Dynamisk liste med punkt uden ansvarlig. |
| Trin | 1. Åbn listen. |
| Forventet resultat | Ingen tom ansvarlig-linje. Visuel støj minimeres. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

### TC-UXR-005: "Tilbage" forbliver synlig under kommentar
| Felt | Værdi |
|---|---|
| ID | TC-UXR-005 |
| Forudsætning | Bruger har åbnet en sag. |
| Trin | 1. Tryk kommentar-felt. <br> 2. Skriv kommentar. |
| Forventet resultat | "← Tilbage" forbliver synlig og trykbar. Header må ikke skubbes ud over skærmen. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | Test på iOS og Android. |

### TC-UXR-006: Kommentar + tastatur + navigation
| Felt | Værdi |
|---|---|
| ID | TC-UXR-006 |
| Forudsætning | Bruger skriver kommentar. |
| Trin | 1. Skriv kommentar. <br> 2. Send. <br> 3. Tryk Tilbage. |
| Forventet resultat | Kommentar gemmes. Navigation tilbage fungerer. App låser ikke. |
| Status | ⚪ |
| Faktisk resultat | |
| Bemærkninger | |

---

## 9. Regressionstest

**Formål:** Sikre at nye ændringer ikke ødelægger eksisterende funktionalitet. Køres før build-go.

### 9.1 Søgning og lister — redesign v2

| ID | Område | Trin | Forventet resultat | Status |
|---|---|---|---|---|
| REG-SL-001 | Opret liste | Søg og opret liste fra ét projekt. | Liste oprettes uden fejl. | ⚪ |
| REG-SL-002 | Afkrydsning | Afkryds punkt; tjek item-status. | Kun checkpoint ændres; item-status følger PO-regler. | 🔴 |
| REG-SL-003 | Kommentar | Skriv og send kommentar. | Kommentar gemmes; navigation virker. | ⚪ |
| REG-SL-004 | Highlight | Søg med specialtegn og æøå. | Highlight korrekt; layout intakt. | ⚪ |

### 9.2 Voice / create flow

| ID | Område | Trin | Forventet resultat | Status |
|---|---|---|---|---|
| REG-VC-001 | Basis oprettelse | Optag "Køb maling komma hammer gem". | Item gemmes med korrekt titel/content. | ⚪ |
| REG-VC-002 | Foto-kommando | Sig "åbn kamera" og tag billede. | Kamera åbner; optagelse genoptages. | ⚪ |
| REG-VC-003 | Gem-kommando | Sig "gem". | Item gemmes. | ⚪ |
| REG-VC-004 | E1–E13 parser tests | `npx ts-node scripts/verify-voice-parser.ts` | Alle består. | 🟡 |

### 9.3 Projekt og auth

| ID | Område | Trin | Forventet resultat | Status |
|---|---|---|---|---|
| REG-PRJ-001 | Opret projekt | Opret nyt projekt. | Projekt oprettes; aktivt projekt sættes. | ⚪ |
| REG-PRJ-002 | Invitation | Inviter medlem. | Invitation modtages; medlem kan tilslutte. | ⚪ |
| REG-AUTH-001 | Login / logout | Log ind og ud. | Ingen crash; data ryddes korrekt. | ⚪ |

### 9.4 Checklister (online baseline)

| ID | Område | Trin | Forventet resultat | Status |
|---|---|---|---|---|
| REG-CL-001 | Opret manuel liste | Opret liste og tilføj punkter. | Liste og punkter gemmes. | ⚪ |
| REG-CL-002 | Opret dynamisk liste | Opret liste fra søgning. | Liste synkroniserer med source items. | 🔴 |
| REG-CL-003 | Slet punkt | Slet punkt fra dynamisk liste. | `deletedItemKeys` opdateres. | ⚪ |

### 9.5 PO-test resultater fra build `92247ec7` (commit `60542c1`, 2026-08-11/12)

| ID | Område | Faktisk resultat | Status |
|---|---|---|---|
| TC-001 | Projekt-sletning | `UNAUTHENTICATED` på `deleteProject`. | 🔴 |
| TC-002 | Foto-upload | Bestod. | 🟢 |
| TC-003 | Oversættelse | Bestod. | 🟢 |
| TC-004 | Notifikation på projekt-liste | Bestod. | 🟢 |
| TC-005 | Dynamisk liste opdaterer | 5-8 duplikater af samme sag i listen. | 🔴 |
| TC-006 | Slet liste | `permission-denied`; debug-tekst "kunne ikke oprette liste". | 🔴 |
| TC-007 | Flueben sync til sag | Teksten "Udført" blinker vildt; status forbliver `new`; 8 ens checkpoints oprettet. | 🔴 |
| TC-008 | Stemmekommando uden punktum | Tekst i én linje i sagen; to linjer i listen; "Indkøb" staves "Indkoeb". | 🔴 |
| TC-009 | Personlige lister separat fane | Fanerne vises; oprettelse påvirket af TC-006. | 🟡 |
| TC-GEO-001 | Tilføj sted til liste | Bestod. | 🟢 |
| TC-GEO-002 | Smarte stedforslag | Kun standardforslag (fx Silvan Hillerød). | 🔴 |
| TC-GEO-003 | Kopier ankomst-link | Notifikationsfejl + 100+ ens notifikationer. | 🔴 |
| TC-GEO-004 | Åbn guide | Bestod; ønske om dansk/præcis vejledning. | 🟡 |
| TC-GEO-005 | Deeplink åbner liste | Delvis passed; hænger sammen med TC-GEO-003. | 🟡 |
| TC-GEO-006 | Toggle sted til/fra | Bestod. | 🟢 |

---

## 10. Godkendelses- og build-go kriterier

Før PO-godkendelse og EAS build skal følgende være opfyldt:

| # | Kriterie | Ansvarlig |
|---|---|---|
| 1 | Alle MUST-cases i denne plan er testet på fysisk iOS + Android (eller simulator hvor markeret). | Test Manager Agent |
| 2 | Ingen `🔴` fejler uden registreret bug og PO-accept. | Test Manager Agent |
| 3 | Unit tests for parser (`verify-voice-parser.ts`) og søgning (`search.test.ts`) består. | Developer Agent |
| 4 | Cloud Functions deployet og testet i staging/udviklingsmiljø. | Developer Agent |
| 5 | Regressionstest afsnit 9 er kørt uden kritiske fejl. | Test Manager Agent |
| 6 | Audit-gate gennemført før build-go. | Audit Agent |
| 7 | PO-acceptance på fysisk enhed. | PO |

---

## Ændringslog

| Dato | Version | Ændring | Ansvarlig |
|---|---|---|---|
| 2026-07-15 | 1.0 | Oprettet comprehensive round testplan med 8 afsnit og regression. | Test Manager Agent |
| 2026-08-13 | 1.1 | Indskrevet PO-testresultater fra build `92247ec7` (commit `60542c1`, 2026-08-11/12): TC-DEL-001 🔴 (`UNAUTHENTICATED`), TC-005 🔴 (duplikater), TC-006 🔴 (permission-denied), TC-007 🔴 (flueben sync), TC-008 🔴 (stemme/æøå), TC-GEO-002/003/005 🔴/🟡 (geofence). TC-002/003/004/GEO-001/004/006 🟢. | Master Agent |
