# Data Capture – bugs og kendte problemer

## Åbne

Ingen registrerede bugs.

## Løste

- TypeScript: `ColorSchemeName` kunne ikke tildeles direkte til `Theme` – løst med eksplicit mapping.
- TypeScript: `getFirestore` understøtter ikke `localCache` parameter – løst ved at bruge `initializeFirestore`.
- npm peer-dependency konflikter med React Native 0.86 – løst med `--legacy-peer-deps`.

## Vær opmærksom på

- Firebase skal konfigureres i `.env` før appen kan starte uden fejl.
- Anonymous auth kræver at det er aktiveret i Firebase Authentication.
- Firestore offline persistence fungerer kun når netværket er tilgængeligt ved første initialisering.
