# US-011/B4: Push-påmindelser på sager og listepunkter

> Rolle: Solution Design Agent  
> Scope: Lokale push-notifikationer (expo-notifications) i den PO-godkendte bug/backlog-runde. Server push / FCM og fælles påmindelser holdes udenfor.  
> Dato: 2026-07-15

---

## 1. Scope

### 1.1 Inkluderet i denne runde

- Brugeren kan sætte en **lokal push-påmindelse** på:
  - En sag (`CaptureItem`) fra sagsskærmen `app/item.tsx`.
  - Et listepunkt (`ChecklistItem`) fra listeskærmen `app/checklist.tsx`.
- Påmindelsen består af:
  - Dato og tidspunkt for første udsendelse.
  - Valgfri gentagelse: **en gang**, **daglig** eller **ugentlig**.
  - Valgfri brugerdefineret note / besked.
- Påmindelsen vises som en lokal push-notifikation, selv hvis appen er lukket.
- Tryk på notifikationen åbner den tilknyttede sag eller liste.
- Brugeren kan redigere eller slette en eksisterende påmindelse.
- Tilladelses-flow til notifikationer (iOS + Android 13+) implementeres.

### 1.2 Udeladt i denne runde

- Server push / FCM / fjernnotifikationer.
- Påmindelser til andre brugere (f.eks. "påmind ansvarlig").
- Rollebaserede notifikationsindstillinger.
- Snooze / udsættelse fra notifikationen.
- Gentagelse udover daglig/ugentlig (f.eks. hver 14. dag).
- Kalender-integration eller tidszone-håndtering udover enhedens lokale tid.
- Web-understøttelse (web får ikke push i denne runde).

---

## 2. Brugerflow

### 2.1 Påmindelse på en sag

```text
1. Bruger åbner en sag fra Board / Søg / Liste.
2. I sagsskærmen trykker brugeren på klokke-ikonet "Påmindelse".
3. Appen anmoder om notifikations-tilladelse første gang.
4. Modal / bundark åbnes:
   - Forvalgt dato/tid: nu + 1 time.
   - Gentagelse: [En gang | Daglig | Ugentlig].
   - Note (valgfri).
5. Brugeren trykker "Gem".
6. Appen gemmer påmindelsen i Firestore og planlægger en lokal notifikation.
7. Brugeren får feedback: "Påmindelse gemt".
```

### 2.2 Påmindelse på et listepunkt

```text
1. Bruger åbner en liste i app/checklist.tsx.
2. I rækken for et listepunkt trykker brugeren på "Påmindelse".
3. Samme modal som for sager åbnes, forvalgt med listepunktets titel.
4. Brugeren gemmer.
5. Ved udløb vises notifikation; tryk åbner listen med fokus på punktet.
```

### 2.3 Når notifikationen udløses

```text
1. Enheden viser push med sagens/listepunktets titel og evt. note.
2. Bruger trykker på notifikationen.
3. Appen navigerer til:
   - `/item?itemId=<id>` for sager.
   - `/checklist?id=<checklistId>` for listepunkter (fokus punkt markeres visuelt).
```

---

## 3. Data-model

### 3.1 Valgt model

Påmindelser er personlige for den bruger, der opretter dem, og knyttet til den lokale enhed. Derfor gemmes de i:

```
/users/{userId}/reminders/{reminderId}
```

Alternativet `items/{itemId}/reminders` ville gøre påmindelsen synlig for alle projektmedlemmer og potentielt udløse notifikationer på andres enheder, hvilket ikke er ønsket i denne lokale runde.

### 3.2 Felter

| Felt | Type | Beskrivelse |
|------|------|-------------|
| `reminderId` | string | Firestore-dokument-id. |
| `userId` | string | Ejer af påmindelsen ( Firebase Auth uid). |
| `targetType` | string | `"item"` eller `"checklistPoint"`. |
| `targetId` | string | Hhv. `itemId` eller `checklistItemId`. |
| `parentId` | string | `projectId` for sager, `checklistId` for listepunkter. |
| `targetTitle` | string | Kopi af sagens/listepunktets titel til notifikationstekst. |
| `customNote` | string | Brugerdefineret note (valgfri). |
| `dueAt` | Timestamp | Første planlagte udsendelse. |
| `recurrence` | string | `"once"`, `"daily"` eller `"weekly"`. |
| `isActive` | boolean | `true` indtil brugeren sletter eller slår den fra. |
| `createdAt` | Timestamp | Oprettelsestidspunkt. |
| `updatedAt` | Timestamp | Seneste ændring. |

### 3.3 Rettigheder

Følgende Firestore-regler tilføjes (uddrag):

```
match /users/{userId}/reminders/{reminderId} {
  allow read, write: if isAuthenticated() && request.auth.uid == userId;
}
```

Det sikrer, at en bruger kun ser og redigerer egne påmindelser.

---

## 4. Teknisk approach

### 4.1 Afhængighed

`expo-notifications` er allerede installeret og anvendt i `services/notifications.ts`. Vi udvider med en dedikeret reminder-service.

### 4.2 Nye filer

- `services/reminders.ts` — CRUD mod `users/{userId}/reminders`.
- `services/reminderNotifications.ts` — permission, scheduling, cancellation, sync, routing.
- `components/ReminderModal.tsx` — UI til oprettelse/redigering.

### 4.3 Planlægning af notifikation

Eksempel fra `services/reminderNotifications.ts`:

```typescript
const identifier = reminder.reminderId;

await Notifications.cancelScheduledNotificationAsync(identifier);

let trigger: Notifications.NotificationTriggerInput;
const due = reminder.dueAt.toDate();

if (reminder.recurrence === "once") {
  trigger = { date: due };
} else if (reminder.recurrence === "daily") {
  trigger = { hour: due.getHours(), minute: due.getMinutes(), repeats: true };
} else {
  // weekly
  trigger = {
    weekday: due.getDay() || 7, // 1=Monday...7=Sunday
    hour: due.getHours(),
    minute: due.getMinutes(),
    repeats: true,
  };
}

await Notifications.scheduleNotificationAsync({
  identifier,
  content: {
    title: reminder.targetTitle,
    body: reminder.customNote || "Du har en påmindelse i Data Capture",
    data: {
      type: "reminder",
      targetType: reminder.targetType,
      targetId: reminder.targetId,
      parentId: reminder.parentId,
    },
  },
  trigger,
});
```

### 4.4 Sync og app-kill

- Ved app-start og når bruger logges ind, kører `syncReminderNotifications(userId)`.
- Funktionen:
  1. Henter alle aktive påmindelser fra `users/{userId}/reminders`.
  2. Kalder `Notifications.getAllScheduledNotificationsAsync()`.
  3. Annullerer notifikationer, der ikke længere findes eller er inaktive.
  4. Planlægger (eller genplanlægger) fremtidige / gentagende påmindelser.
- Sync køres også, når påmindelses-dokumenter ændrer sig (Firestore snapshot).
- Hvis appen dræbes, overlever de allerede planlagte notifikationer i OS. Ved næste appstart rydde sync op og genplanlægger.

### 4.5 Cancellation

- Slet / deaktivér påmindelse → `cancelScheduledNotificationAsync(reminderId)`.
- Ændre tidspunkt → annullér gammel identifier, planlæg ny.
- Slet sag eller liste → alle tilknyttede påmindelser markeres inaktive og annulleres ved næste sync.

### 4.6 Permissions

- Første gang brugeren trykker "Påmindelse", kaldes `Notifications.requestPermissionsAsync()`.
- iOS: anmod med `{ ios: { allowAlert: true, allowBadge: false, allowSound: true } }`.
- Android 13+: `POST_NOTIFICATIONS` er allerede i `app.json`. Runtime-tilladelse anmodes automatisk af Expo.
- Hvis brugeren afviser, vises en blid prompt med knap til systemindstillinger (`Linking.openSettings`).

### 4.7 Routing ved tryk

I `app/_layout.tsx` tilføjes en response-listener:

```typescript
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  if (data?.type === "reminder") {
    if (data.targetType === "item") {
      router.push(`/item?itemId=${data.targetId}`);
    } else {
      router.push(`/checklist?id=${data.parentId}`);
    }
  }
});
```

### 4.8 OS-begrænsninger

- **iOS**: Maksimalt antal planlagte notifikationer er begrænset; genbrug af `identifier` per reminder mitigerer.
- **Android 12+**: Exakte alarmer kræver `SCHEDULE_EXACT_ALARM`. Vi undgår det ved at bruge `expo-notifications` standard calendar triggers; små forsinkelser ved Doze accepteres.
- **Tidszone / sommertid**: Brug enhedens lokale tid. Daglig/ugentlig trigger følger enhedens tidszone.

### 4.9 Android-kanal

Ved appstart oprettes kanalen `reminders` med lav prioritet:

```typescript
if (Platform.OS === "android") {
  await Notifications.setNotificationChannelAsync("reminders", {
    name: "Påmindelser",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
```

Alle påmindelses-notifikationer sendes på kanalen `reminders`.

---

## 5. UI/UX

### 5.1 Hvor påmindelsen indstilles

- **`app/item.tsx`**: Tilføj klokke-ikon i header / meta-kort ved siden af "Rediger". Tryk åbner `ReminderModal`.
- **`app/checklist.tsx`**: I hvert listepunkt tilføjes en "Påmindelse"-knap ved siden af "Rediger" og "Slet". Tryk åbner samme modal.
- **`app/(tabs)/settings.tsx`**: Tilføj sektion med knap "Tilladelser til påmindelser" og vis status.

### 5.2 Valg i modalen

| Element | Standardværdi | Valg |
|---------|---------------|------|
| Dato | i dag | Dato-picker (`@react-native-community/datetimepicker`). |
| Tid | nu + 1 time | Time-picker. |
| Gentagelse | "En gang" | "En gang", "Daglig", "Ugentlig". |
| Note | tom | TextInput, max 120 tegn. |

### 5.3 Visning af eksisterende påmindelse

- I sagsskærmen/listepunktet vises en lille "aktiv påmindelse"-indikator med tidspunkt (f.eks. "⏰ I morgen kl. 09.00").
- Tryk på indikatoren åbner modalen til redigering.

### 5.4 Feedback

- Efter gem: `Alert.alert("Påmindelse gemt", "Du får besked, når det er tid.")`.
- Efter slet: `Alert.alert("Påmindelse fjernet")`.
- Hvis tilladelse nægtes: vis forklarende besked og knap til indstillinger.

---

## 6. Testcases

| TC | Forudsætning | Trin | Forventet resultat |
|----|--------------|------|---------------------|
| **TC-01 Opret påmindelse på sag** | Sag "Køb maling" er åben. | 1) Tryk klokke. 2) Sæt tid til om 2 min. 3) Gem. | Påmindelse vises som planlagt i OS. Efter 2 min vises push med titel "Køb maling". |
| **TC-02 Tryk på notifikation åbner sag** | TC-01 er gennemført. | Tryk på notifikationen. | Appen åbner `app/item.tsx` for den korrekte sag. |
| **TC-03 Slet påmindelse inden udløb** | Påmindelse planlagt om 5 min. | Bruger åbner modal og sletter påmindelsen. | Ingen notifikation vises efter 5 min. |
| **TC-04 Daglig gentagelse** | Listepunkt "Tjek fugt" får daglig påmindelse kl. 09.00. | Gem og vent til næste dag kl. 09.00. | Notifikation vises dagligt. |
| **TC-05 Tilladelse nægtet** | Frisk installation / afvist tilladelse. | 1) Tryk klokke. 2) Afvis tilladelse. | Modal viser ikke fejl, men en blid prompt med mulighed for at åbne systemindstillinger. |
| **TC-06 App dræbt inden udløb** | Påmindelse sat om 10 min. | Luk app helt. Vent 10 min. | Notifikation vises alligevel (OS gemmer trigger). |
| **TC-07 Ændring af tidspunkt** | Eksisterende påmindelse kl. 10.00. | Ændr til kl. 11.00 og gem. | Kl. 10.00 vises ingen notifikation; kl. 11.00 vises den. |

---

## 7. Risici + mitigation

| Risiko | Konsekvens | Mitigation |
|--------|------------|------------|
| Bruger afviser notifikations-tilladelse | Ingen påmindelser | Blid prompt + vejledning til systemindstillinger. |
| App dræbt / enhed genstartet | Mistanke om at påmindelser forsvinder | Sync ved appstart genopretter planlagte notifikationer; OS gemmer allerede planlagte. |
| Duplikerede notifikationer | Spam | Brug entydigt `identifier = reminderId`; annullér før genplanlægning. |
| iOS-grænse for planlagte notifikationer | Nye påmindelser kan fejle | Genbrug identifiers; hold antallet under ~64 ved at rydde inaktive. |
| Android Doze / battery saver | Forsinket notifikation | Accepter mindre forsinkelser; brug ikke kritiske alarmer. |
| Tidszone-ændring | Notifikation kommer på "forkert" tidspunkt | Brug lokal enhedstid; daglig/ugentlig trigger følger enheden. |
| Flere enheder samme bruger | Påmindelser synkroniseres ikke automatisk | Accepteret for lokal runde; fremtidig server push kan løse det. |
| Gentagende påmindelser kræver nøjagtig trigger | Understøttes begrænset på tværs af OS | Begræns til daglig/ugentlig; test på begge platforme. |

---

## 8. Næste trin / afhængigheder

1. **PO-godkendelse** af design og scope.
2. **Opdater Firestore-regler** med `/users/{userId}/reminders`.
3. **Implementér**:
   - `services/reminders.ts`
   - `services/reminderNotifications.ts`
   - `components/ReminderModal.tsx`
4. **Integrér UI**:
   - Klokke-ikon og indikator i `app/item.tsx`.
   - Påmindelse-knap i `app/checklist.tsx` listepunkter.
   - Tilladelses-status i `app/(tabs)/settings.tsx`.
5. **Registrér response-listener** i `app/_layout.tsx`.
6. **Sørg for Android-kanal** i app-start.
7. **Test** alle testcases på fysisk iOS og Android.
8. **Dokumentér** i testplan, at funktionaliteten skal markeres grøn før merge.
