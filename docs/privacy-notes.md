# Data Capture – privatlivsnoter

## Chat / kommentarer (CHAT-001)

Når du skriver en kommentar på en sag i Data Capture, gemmes følgende persondata:

- **Forfatter-id** (`authorId`) – din unikke bruger-id i Firebase Authentication.
- **Navn** (`authorName`) – dit viste navn i appen (valgfrit, hentes fra Firebase Authentication).
- **E-mail** (`authorEmail`) – din e-mailadresse som fallback, hvis navn mangler (valgfrit).
- **Tekst** (`text`) – selve kommentarteksten.
- **Tidsstempler** (`createdAt`, `updatedAt`) – hvornår kommentaren blev oprettet og sidst ændret, sat server-side via Firestore `serverTimestamp()`.
- **Kontekst** (`itemId`, `projectId`) – hvilken sag og hvilket projekt kommentaren tilhører; dette er nødvendigt for at vise kommentartråden og håndhæve adgangskontrol.

### Opbevaring

Chat-data opbevares i Firestore som en subcollection under den sag, den tilhører:

```
/items/{itemId}/comments/{commentId}
```

Kommentarer opbevares, indtil den tilhørende **sag slettes** eller det tilhørende **projekt slettes**. Når en sag slettes, fjernes kommentarerne automatisk via kaskade-sletning i `deleteItem()`.

### Synlighed

Alle projektmedlemmer kan læse kommentarer på en sag. Det er kun projektmedlemmer med rollen `owner`, `admin` eller `editor`, der kan oprette kommentarer. Brugere med rollen `viewer` har kun læseadgang. Owner/admin kan slette enhver kommentar; forfatteren kan slette sin egen kommentar.

### Slette- og retention-politik

- **Sletning af egen kommentar:** Forfatteren kan slette sin egen kommentar.
- **Sletning af andres kommentarer:** Projektets `owner` eller `admin` kan slette enhver kommentar.
- **Sletning af sag:** Når en sag slettes, slettes alle tilhørende kommentarer automatisk (kaskade-sletning).
- **Redigering:** Redigering af egne kommentarer er ikke understøttet i v1 (udskudt efter PO-beslutning). Brugere kan slette en kommentar og oprette en ny.
- **Anonymisering:** Hvis en bruger forlader et projekt, bevares historiske kommentarer for projektets audit- og samarbejdsformål, medmindre brugeren udtrykkeligt anmoder om sletning i henhold til GDPR art. 17.
