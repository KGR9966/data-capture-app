# CHECKLIST-001 – Aktionslister fra søgning

> Backlog-case: Brugeren ønsker at kunne omdanne søgeresultater til en vedligeholdelig checkliste med flueben, deduplikering, sortering, deling via e-mail/SMS, og mulighed for at markere status tilbage på den enkelte sag.
> Dato: 2026-07-15
> Status: `proposed` (afventer PO-prioritering)

---

## Problem / brugerværdi

Når man søger i Data Capture, får man typisk en liste af sager (items). I dag kan man se dem, men ikke arbejde videre med dem som en samlet opgaveliste. Brugeren efterspørger en funktion, hvor søgeresultater kan konverteres til en vedligeholdelig aktionsliste, så man kan:

- Afkrydse udførte punkter.
- Fjerne dubletter.
- Filtrere dynamisk.
- Sortere åbne punkter alfabetisk og flytte udførte til bunden.
- Dele listen via e-mail eller SMS.
- Markere status tilbage på den oprindelige sag (så man kan se, om den er udført).

Dette øger værdien af søgefunktionen markant og gør appen til et aktivt arbejdsværktøj frem for kun en database.

---

## Foreslået løsning – overordnet

### 1. Separat fane: "Aktionslister" (eller "Checklister")

Anbefaling: Ja, en separat fane. Rationale:

- Søg-fanen har ét ansvar: finde data.
- Aktionslister har et andet ansvar: planlægge og eksekvere.
- En separat fane giver plads til at gemme flere navngivne lister, se historik og dele.

Alternativ: Integrer det som en "Opret liste"-knap på søgeresultatet, men vis listen i sin egen fane. Dette er den hybrid, vi anbefaler.

### 2. Flow

1. Bruger laver en søgning i "Søg"-fanen.
2. På søgeresultatskærmen tilføjes knap: **"Opret aktionsliste"**.
3. Bruger vælger, hvilke felter der skal blive til listepunkter:
   - Item-titel
   - OCR-tekst / oversat tekst
   - Kategori
   - Ansvarlig
   - Egen tekst (bruger kan tilføje noter)
4. Appen genererer en navngivet liste.
5. Bruger kan redigere, afkrydse, sortere, filtrere og dele listen.
6. Når et punkt afkrydses, kan appen automatisk opdatere den tilknyttede sag (f.eks. sætte `status: done`, tilføje kommentar, eller arkivere).

---

## Hvor AI kan gøre det smart

| AI-funktion | Beskrivelse | Værdi |
|-------------|-------------|-------|
| **Smart deduplikering** | Finder semantisk ens punkter, ikke kun identisk tekst. F.eks. "Køb mælk" og "Husk mælk i Netto" kan genkendes som dubletter. | Færre manuelle dubletter |
| **Auto-gruppering** | Grupperer listepunkter efter kategori, ansvarlig, lokation eller emne. | Bedre overblik |
| **Handlingsforslag** | Forslår, hvad næste skridt er for hvert punkt (f.eks. "Kontakt ansvarlig", "Bestil vare"). | Hurtigere eksekvering |
| **Prioritering** | Anbefaler rækkefølge baseret på deadline, ansvarlig, alder, kompleksitet. | Bedre fokus |
| **Smart afkrydsning** | Genkender når en sag er løst baseret på nye kommentarer eller statusændringer. | Mindre manuel vedligeholdelse |
| **Opsummering til deling** | Genererer en kort e-mail/SMS-tekst: "3 af 7 punkter tilbage. Højeste prioritet: ..." | Professionel kommunikation |
| **Stemme-tilføjelse** | Bruger kan tilføje punkter til listen med stemme. | Hurtig input |

---

## Funktionelle berigelser (udover brugerens ønsker)

1. **Navngivne, gemte lister**  
   Bruger kan have flere lister: "Indkøb uge 29", "Badeværelse-renovering", "Udestående til kgr@trust.dk".

2. **Dynamiske lister (live-update)**  
   En liste kan være bundet til en gemt søgning. Når nye items matcher søgningen, tilføjes de automatisk (med markering).

3. **Dato og deadline på punkter**  
   Mulighed for at sætte forfaldsdato. Udløbne punkter vises rødt.

4. **Tildel ansvarlig per listepunkt**  
   Mulighed for at override item-ansvarlig eller tildele en ansvarlig specifikt for listen.

5. **Underpunkter / delopgaver**  
   Et listepunkt kan have underpunkter (f.eks. "Renovering" → "Køb fliser", "Bestil håndværker").

6. **Templates**  
   Gemte skabeloner: "Ugeindkøb", "Projektstart", "Ferieplanlægning".

7. **Deling og eksport**  
   - E-mail (via `react-native-share` + `mailto` eller backend).  
   - SMS (`sms:` link eller native share).  
   - PDF/CSV-eksport til fremtidig administration.  
   - Del direkte til anden projektmedlem i appen.

8. **Status-synkronisering til sag**  
   Når et listepunkt afkrydses, kan bruger vælge handling:
   - Markér item som `done` / `archived`.
   - Tilføj kommentar med "Udført via aktionsliste [listename]".
   - Skift ansvarlig.
   - Ingen tilbagekobling (kun visuel i listen).

9. **Offline-støtte**  
   Listen skal kunne redigeres offline og synkronisere når netværket er tilbage.

10. **Notifikationer**  
    Påmindelse om åbne punkter med deadline, eller når en dynamisk liste får nye matches.

---

## Foreslået data-model (Firestore)

```text
checklists/{checklistId}
  - name: string
  - ownerId: string
  - projectId: string (optional)
  - createdAt: timestamp
  - updatedAt: timestamp
  - isDynamic: boolean
  - searchQuery: object (hvis dynamisk)
  - sharedWith: { userId: role }

checklists/{checklistId}/items/{itemId}
  - sourceItemId: string (reference til items/{itemId})
  - sourceItemPath: string
  - title: string
  - notes: string
  - isCompleted: boolean
  - completedAt: timestamp
  - completedBy: string
  - dueDate: timestamp (optional)
  - assigneeId: string (optional)
  - orderIndex: number
  - createdAt: timestamp
```

Overvejelse: Hvis mange brugere laver mange lister, bør `checklists` være en top-level collection. Sikkerhedsregler skal sikre, at kun ejer/delte brugere kan læse/skrive.

---

## Tekniske afhængigheder

- `react-native-share` (allerede installeret via COPY-001) til deling.
- `expo-clipboard` (allerede installeret) til kopiering af liste-tekst.
- Firestore Security Rules udvidelse for `checklists` collection.
- Muligvis backend/Firebase Function til e-mail-afsendelse (hvis ikke native `mailto:` er tilstrækkeligt).
- AI-funktionerne kan starte som client-side heuristikker og senere udbygges med Gemini/Claude API eller Firebase Genkit.

---

## UI/UX forslag

- **Tab "Aktionslister"** med oversigt over gemte lister.
- **Søg-fane:** knap "Opret aktionsliste" på resultatskærmen.
- **Listevisning:**
  - Checkbox foran hvert punkt.
  - Udførte punkter grået ud og flyttet til bunden.
  - Åbne punkter sorteret alfabetisk (som ønsket) eller efter prioritet.
  - Swipe for at slette eller redigere.
  - Top-bar med filter/søgefelt og dele-knap.

---

## Risici og overvejelser

| Risiko | Betydning | Mitigation |
|--------|-----------|------------|
| Scope creep | Høj | Start med MVP: navngivne lister, flueben, deling via share-sheet, status-tilbagekobling. AI tilføjes i fase 2. |
| Firestore omkostninger | Medium | Paginering og begrænsning på dynamiske lister; ikke real-time sync af store lister. |
| Kompleksitet i søgning | Medium | Genbrug eksisterende søgelogik; gem søgekriterier som JSON. |
| Privatliv ved deling | Medium | Deling via native share-sheet respekterer brugerens valgte app; ingen data sendes til ukendte tjenester. |

---

## Anbefaling

1. **Accepter backlog-case som P2 eller P3.** Funktionen har høj brugerværdi og passer naturligt efter CHAT-001 og COPY-001.
2. **MVP først** – undgå at bygge alt på én gang:
   - Navngivne lister fra søgning.
   - Flueben, alfabetisk sortering af åbne, udførte i bund.
   - Deduplikering på titel.
   - Deling via `react-native-share`.
   - Status-tilbagekobling til item som valgfri handling.
3. **AI fase 2** – start med smart deduplikering og opsummering til deling. Disse er lavhængende frugter med høj værdi.
4. **Design først** – brug en kort design-fase til at fastlægge tab-struktur, data-model og synkroniseringsregler.

---

## Relateret

- [[data-capture-test-baseline]] — testplan med afkrydsning (ikke samme funktion, men overlap i tankegang).
- [[data-capture-rbac-strategy]] — rettigheder til lister skal følge RBAC-principper.
- COPY-001 — deling via `react-native-share` er allerede på plads.
- CHAT-001 — kommentarer kan bruges som "log" når et listepunkt afkrydses.
