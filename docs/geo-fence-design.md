# Geo fence / placering-baserede påmindelser for lister

**Dato:** 2026-08-06  
**PO:** Kim Grandal  
**Master Agent:** Claude  
**Status:** Design-kladde — afventer PO-godkendelse før implementering.

---

## Brugerønske

En liste (f.eks. "Silvan") skal kunne knyttes til en **geografisk placering**. Hvis listen indeholder uafsluttede punkter, og brugeren kommer indenfor en valgt radius (f.eks. 500 meter) fra placeringen, vises en lokal notifikation:

> "Du er tæt på Silvan — du har 3 punkter i listen 'Silvan'."

Hvis løsningen bliver for batteritung eller risikerer App Store-afvisning, kan **telefon-automatisering** (iOS Shortcuts / Android Automate) bruges som alternativ.

---

## Analyse af tekniske muligheder

### Mulighed A: Native geo fence i appen via `expo-location`

`expo-location` understøtter geofencing:

- `Location.startGeofencingAsync(taskName, regions)`
- Callback ved `Enter` / `Exit` via `TaskManager.defineTask`
- Kan vise notifikation med `expo-notifications`

**Begrænsninger ifølge Expo-dokumentation:**

| Platform | Max aktive geo fences | App genstart ved geo fence-event |
|----------|----------------------|----------------------------------|
| iOS      | 20                   | Ja, systemet genstarter appen    |
| Android  | 100                  | Nej, hvis appen er dræbt         |

- **iOS:** Kræver "Always" lokationstilladelse og `location` i `UIBackgroundModes`.
- **App Store-risiko:** Apple Guideline 2.5.4. Hvis appen kun bruger geofencing (ikke real-time tracking), kan `UIBackgroundModes: location` give afvisning. Apple anbefaler region monitoring uden baggrundslokation, men Expo's API kræver stadig "background location" klassifikation.
- **Batteri:** Geofencing er generelt mere batteri-venligt end konstant baggrundslokation, men stadig tungere end ingen baggrundsopgave.
- **Test:** Virker ikke i Expo Go — kræver development build / EAS.

### Mulighed B: Significant location changes

- `expo-location` kan også få opdateringer ved "significant changes".
- Mindre præcist end geofencing — ikke egnet til 500 m radius.
- Lettere at få godkendt end konstant tracking.

**Vurdering:** Ikke præcis nok til Silvan-scenariet.

### Mulighed C: Telefon-automatisering (anbefalet som start)

**iOS Shortcuts:**
- Brugeren opretter en "Automation": *"When I arrive at [Silvan]"* eller *"When I leave [Hjem]"*.
- Handling: *"Open URL"* → `datacapture://checklist?id=<id>&projectId=<projectId>`.
- Alternativ: *"Get contents of URL"* mod en simpel HTTP-endpoint og vis notifikation.

**Android (Automate / Tasker):**
- Tilsvarende: geofence-trigger → åbn app via deeplink eller vis notifikation.

**Fordele:**
- Ingen baggrundslokation i appen.
- Ingen ekstra batteriforbrug fra appen.
- Ingen App Store-risiko.
- Brugeren har fuld kontrol over hvilke lister der skal trigge.

**Ulemper:**
- Brugeren skal selv sætte det op (men kan guides).
- Kan ikke gøres helt automatisk fra appen.

### Mulighed D: Foreground-only check

- Appen tjekker afstand til liste-placeringer, når brugeren aktivt åbner appen.
- Ingen notifikation i baggrunden.

**Vurdering:** Opfylder ikke brugerønsket om at blive påmindet uden at åbne appen.

---

## Anbefaling

**Hybrid approach:**

1. **Primær (fase 1):** Mulighed C — telefon-automatisering.
   - Appen gemmer `location` på checklisten.
   - Appen viser en guide med en klar URL til Shortcuts/Automate.
   - Ingen ny baggrundskode.
2. **Supplerende (fase 2):** Mulighed A — native geo fence i appen.
   - Implementeres kun hvis fase 1 er utilstrækkelig, og hvis App Store-godkendelse kan sikres.
   - Begræns til max 20 lister med geo fence ad gangen på iOS.

---

## Foreslået data-model

### Udvidelse af `Checklist`

```typescript
export interface ChecklistLocation {
  name: string;           // "Silvan Hillerød"
  latitude: number;
  longitude: number;
  radiusMeters: number;   // default 500
}

export interface Checklist {
  // ... eksisterende felter ...
  location?: ChecklistLocation;
  notifyOnArrival?: boolean;  // default false
}
```

### Firestore-regler

En checkliste med `location` følger samme læse-/skriverettigheder som checklisten i øvrigt. Ingen ekstra regler nødvendige for fase 1.

---

## Foreslået brugerflow

### 1. Tilknyt sted til liste

1. Bruger åbner en liste (`app/checklist.tsx`).
2. Trykker på ny indstilling: "Tilknyt sted".
3. Søger efter sted (Google Places API, Apple Maps, eller manuel indtastning af koordinater).
4. Vælger radius: 100 m / 250 m / 500 m / 1 km / 2 km.
5. Slår "Påmind når jeg er tæt på" til.
6. Gemmer.

### 2. Guide til telefon-automatisering

Når en liste har `location` og `notifyOnArrival: true`, vises en guide:

**iOS:**
```text
Vil du have besked, når du er tæt på Silvan?
1. Åbn Shortcuts-appen.
2. Tryk "Automation" → "+" → "Arrives".
3. Vælg "Silvan" som sted.
4. Tilføj handling "Open URL" og indsæt:
   datacapture://checklist?id=<id>&projectId=<projectId>
5. Slå "Ask Before Running" fra.
```

**Android:**
```text
Vil du have besked, når du er tæt på Silvan?
1. Åbn Automate (eller Tasker).
2. Opret en flow med trigger "Location enter".
3. Indstil koordinater og radius.
4. Tilføj handling "Open app" → Data Capture, eller vis notifikation.
```

### 3. Når brugeren ankommer

Telefonens automation åbner appen på den valgte liste. Appen viser automatisk en passende besked:

```text
Du er tæt på Silvan
3 punkter venter i listen.
```

Alternativt kan appen ved foreground-start tjekke om den blev åbnet pga. geo fence og vise en lokal notifikation eller banner.

---

## Teknisk implementering — fase 1 (telefon-automatisering)

### Ændrede filer

- `services/checklists.ts` — tilføj `location` og `notifyOnArrival` til `Checklist`-interfacet og CRUD-funktioner.
- `app/checklist.tsx` — tilføj UI til at tilknytte/redigere/slette sted.
- `components/LocationPicker.tsx` (ny) — søgning/valg af sted og radius.
- `services/deeplinks.ts` — sikr at `datacapture://checklist?id=...` håndterer ankomst korrekt.
- `components/GeoFenceGuide.tsx` (ny) — guide til Shortcuts/Automate med copy-to-clipboard.

### Ingen nye native tilladelser nødvendige

For fase 1 kræves ingen `expo-location`, `expo-task-manager` eller baggrundslokation. Det reducerer risiko og byggekompleksitet.

---

## Teknisk implementering — fase 2 (native geo fence)

Hvis fase 1 ikke er nok:

### Nye afhængigheder

```json
{
  "expo-location": "~57.0.8",
  "expo-task-manager": "~57.0.8"
}
```

### Ændret `app.json`

iOS:
```json
"infoPlist": {
  "NSLocationAlwaysAndWhenInUseUsageDescription": "Data Capture bruger din placering til at påminde dig, når du er tæt på en butik eller adresse tilknyttet en liste.",
  "NSLocationWhenInUseUsageDescription": "Data Capture bruger din placering til at vise afstanden til liste-steder.",
  "UIBackgroundModes": ["fetch", "remote-notification", "location"]
}
```

Android:
```json
"permissions": [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_LOCATION"
]
```

### Ny service: `services/geoFencing.ts`

```typescript
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

const GEOFENCING_TASK = "GEO_FENCE_TASK";

TaskManager.defineTask(GEOFENCING_TASK, ({ data, error }) => {
  if (error) return;
  const eventType = data?.eventType;
  const region = data?.region;
  if (eventType === Location.GeofencingEventType.Enter) {
    // Hent checkliste-info fra Firestore eller data.region.identifier
    Notifications.scheduleNotificationAsync({
      content: {
        title: `Tæt på ${region.name || "et liste-sted"}`,
        body: "Du har punkter i listen.",
        data: { checklistId: region.identifier },
      },
      trigger: null, // vis med det samme
    });
  }
});

export async function startMonitoringChecklist(
  checklistId: string,
  location: ChecklistLocation
): Promise<void> {
  await Location.startGeofencingAsync(GEOFENCING_TASK, [
    {
      identifier: checklistId,
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radiusMeters,
      notifyOnEnter: true,
      notifyOnExit: false,
    },
  ]);
}
```

### Begrænsninger der skal håndteres

- **iOS:** Max 20 samtidige geo fences. Hvis brugeren har flere lister, skal vi prioritere (f.eks. kun aktive lister, eller kun dem der er "favoritter").
- **Android:** Max 100 geo fences. Appen genstartes ikke automatisk efter drab.
- **Tilladelser:** Skal håndtere "Always" vs "When in use" vs "Denied".
- **App Store:** Skal have en stærk begrundelse for baggrundslokation.

---

## Batteri- og sikkerhedsvurdering

| Approach | Batteri | App Store | Privacy | Kompleksitet |
|----------|---------|-----------|---------|--------------|
| Fase 1: Telefon-automatisering | Ingen app-påvirkning | Ingen risiko | Bruger kontrollerer selv | Lav |
| Fase 2: Native geo fence | Moderat (OS-håndteret) | Medium risiko | Kræver always-location tilladelse | Høj |
| Konstant baggrundslokation | Høj | Høj risiko | Kræver stærk begrundelse | Høj |

---

## Næste trin

Afventer PO-beslutning:

1. **Skal vi starte med fase 1 (telefon-automatisering)?** Dette er hurtigst, sikrest og lettest at godkende.
2. **Skal vi også implementere fase 2 (native geo fence)?** Dette kræver development build-test og App Store-godkendelsesrisiko.
3. **Skal placering kunne sættes på både personlige og projekt-lister?** Anbefaling: ja, da begge typer kan have praktisk værdi.
4. **Skal brugeren selv indtaste koordinater, eller skal vi integrere en sted-søgning (f.eks. Google Places)?** Google Places kræver API-nøgle (vi har allerede Google Translate-nøgle, men det er en separat service).

---

## Master Agent anbefaling

Start med **fase 1: telefon-automatisering**. Det opfylder brugerønsket uden at introducere baggrundslokation, batteritunge opgaver eller App Store-risiko. Brugeren guides til at oprette en Shortcuts/Automate-regel, som åbner appen på den rigtige liste ved ankomst.

Hvis PO senere ønsker fuldt automatiserede notifikationer uden brugeropsætning, kan **fase 2 (native geo fence)** tilføjes, men det bør testes grundigt på development build og med App Store-review i mente.
