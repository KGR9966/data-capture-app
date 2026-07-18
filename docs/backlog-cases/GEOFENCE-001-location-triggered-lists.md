# GEOFENCE-001 – Lokationstriggerede aktionslister

> Backlog-case: Brugeren ønsker at aktionslister (f.eks. indkøbslister) automatisk popper op, når man nærmer sig et relevant sted — fx 5 km og 1 km fra en bestemt butik. Funksjonen skal integreres med telefonens eksisterende automatisering (Shortcuts / Tasker / Automate) frem for at bygge baggrundslokation direkte ind i appen.
> Dato: 2026-07-15
> Status: `proposed` (afventer PO-prioritering)

---

## Vision

"Det travle hverdags livredder." Appen skal kunne blive påmindt om relevante lister baseret på, hvor man er. Fx:

- Nærmer sig Elgiganten → listen "Indkøb af IT-udstyr" popper op.
- Nærmer sig posthuset → "Aflever pakker" vises.
- Nærmer sig renseriet → "Hent skjorter" dukker op.
- Nærmer sig hjemmet → "Husk at tage vasketøjet ind".

Dette gør Data Capture fra et passivt notatværktøj til en proaktiv assistent.

---

## Princip: Brug telefonens automatisering, ikke baggrundslokation i appen

Tidligere råd fra chatten: i stedet for at bygge kompleks baggrundslokation og geofencing ind i appen, udnyttes telefonens eksisterende automatisering:

| Platform | Værktøj | Hvad det gør |
|---|---|---|
| iOS | **Shortcuts** (automation) | Når bruger entrerer/ forlader et område, trigger det en handling |
| Android | **Tasker**, **Automate**, eller **Google Assistant Routines** | Samme som Shortcuts |

Appen eksponerer en **deep link / URL scheme**, som telefonens automatisering kan kalde:

```
datacapture://open-list?name=Indkøb%20IT-udstyr
```

Når deep linket åbnes, starter appen og viser listen.

---

## Fordele ved denne tilgang

1. **Mindre batteriforbrug** — appen lytter ikke selv efter GPS hele tiden.
2. **Mindre privacy-kompleksitet** — ingen baggrundslokationsrettigheder i appen.
3. **Brugeren ejer automatiseringen** — de kan selv vælge, hvilke steder og lister der skal trigges.
4. **Ingen native SDK-udvidelser** — vi genbruger deep links og appens eksisterende navigation.
5. **Fleksibilitet** — bruger kan kombinere med andre Shortcuts/Tasker flows.

---

## Hvordan brugeren opsætter det

### iOS Shortcuts (automation)

1. Åbn **Shortcuts** > **Automation** > **Create Personal Automation**.
2. Vælg **Arrival** eller **Location**.
3. Vælg butik/posthus/renseri på kortet og radius (f.eks. 1 km eller 5 km).
4. Vælg **Open URL**.
5. Indsæt deep link:
   ```
   datacapture://open-list?name=Indkøb%20IT-udstyr
   ```
6. Gem.

### Android (Tasker eksempel)

1. Opret **Profile** > **Location** > radius.
2. Opret **Task** > **Browse URL**.
3. URL:
   ```
   datacapture://open-list?name=Indkøb%20IT-udstyr
   ```

---

## Hvad appen skal understøtte

1. **URL scheme / deep link** for at åbne en specifik aktionsliste:
   - `datacapture://open-list?name=<navn>`
   - `datacapture://open-list?id=<checklistId>`
   - `datacapture://open-list?name=<navn>&filter=open`

2. **Liste-siden skal håndtere deep link**:
   - Hvis listen findes → åbn den.
   - Hvis listen ikke findes → vis forslag eller opret en ny.
   - Hvis appen ikke er logget ind → vis login først.

3. **Mulighed for at knytte et sted til en liste (metadata)**:
   - I appen kan bruger tilføje et eller flere steder til en liste:
     - Butiksnavn + adresse
     - Koordinater
     - Radius (1 km, 5 km)
   - Disse metadata bruges kun til at generere deep links / vejledning til Shortcuts opsætning.

4. **Wizard i appen** der guider brugeren til at opsætte Shortcuts/Tasker automation:
   - "Vælg liste"
   - "Vælg sted"
   - "Vælg radius"
   - "Kopier deep link" eller "Send til Shortcuts".

---

## Killer-features der aktiveres ved lokation

| Trigger | Mulig handling |
|---|---|
| Nærmer sig sted | Åbn relevant liste |
| Forlader hjemmet | Vis "dagens opgaver" |
| Ankommer til arbejde | Vis projektliste med åbne sager |
| Nærmer sig butik | Åbn indkøbsliste + vis kun åbne punkter |
| Forlader butik | Prompt: "Vil du arkivere udførte punkter?" |

---

## Tekniske afhængigheder

- Deep link / linking skal være konfigureret i appen (`expo-linking` eller `Linking` API).
- Aktionslister skal implementeres først (CHECKLIST-001).
- Ingen nye native dependencies kræves.
- Kræver at brugeren selv opsætter Shortcuts/Tasker (onboarding/wizard nødvendig).

---

## Privacy og compliance

- Appen tracker IKKE brugerens lokation i baggrunden.
- Telefonens OS håndterer geofencing.
- Deep link kan åbne appen uden at sende lokationsdata.
- Brugeren skal explicit vælge at aktivere automatisering.

---

## Risici og overvejelser

| Risiko | Betydning | Mitigation |
|---|---|---|
| Opsætning for teknisk for nogle brugere | Høj | Lav en step-by-step wizard med screenshots/video. |
| Platform-forskelle (iOS vs Android) | Medium | To guider: Shortcuts-guide og Tasker/Automate-guide. |
| Deep links kan fejle | Medium | Test `Linking.getInitialURL()` og `Linking.addEventListener('url', ...)` grundigt. |
| Bruger glemmer at slå det fra | Lav | Gør det nemt at slette/ændre automation i Shortcuts/Tasker. |
| Afhængighed af CHECKLIST-001 | Høj | Implementer aktionslister først. |

---

## Anbefaling

1. **Byg CHECKLIST-001 først.** Geofencing giver først mening, når listerne findes.
2. **Lav deep links som næste skridt.** Det er lav kompleksitet, høj værdi, og åbner for andre integrationer.
3. **Tilføj en "Smart steder" wizard** i appen, der genererer deep links og instruktioner.
4. **Start med ét scenario:** indkøbsliste ved nærhed af butik. Det er nemt at forklare og teste.
5. **AI-fase 2:** Forslag til steder baseret på listens indhold (f.eks. "IT-udstyr → Elgigenter, Power, Proshop").

---

## Relateret

- [[CHECKLIST-001-search-action-list]] — aktionslister er forudsætning for geofencing.
- COPY-001 — deling via share-sheet kan bruges til at dele lister.
- [[data-capture-rbac-strategy]] — personlige lister vs. projekt-lister.
