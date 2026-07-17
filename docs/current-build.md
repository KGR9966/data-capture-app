# Data Capture – Aktuelt build og hurtigstart

> Levende dokument med det seneste udviklings-build, installationslink og start-procedure.
> Sidst opdateret: 2026-07-15

## Aktuelt dev build

| Felt | Værdi |
|---|---|
| **Build-ID** | `fab85114-d346-4406-8eba-0fa5f9e1b8f1` (Android), `bc7a5b59-aca6-4195-92b3-f4c22ce05e91` (iOS) |
| **Platform** | Android + iOS preview build |
| **Distribution** | Internal (EAS) |
| **EAS Dashboard** | https://expo.dev/accounts/kgradm/projects/data-capture-app/builds |
| **Android installationslink** | https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/fab85114-d346-4406-8eba-0fa5f9e1b8f1 |
| **iOS installationslink** | https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/bc7a5b59-aca6-4195-92b3-f4c22ce05e91 |
| **QR-kode** | Scan QR-koden på de respektive EAS build-sider via linksene ovenfor. |
| **Fokus i dette build** | CHAT-001 chat/kommentarer på items + omdøbning `comment` → `note` |
| **Git snapshot** | `a5533db` |
| **Forrige build** | `ebdb8ffc-7cfd-4648-929e-14398e6eb422` |

## Hurtigstart – når QR-koden er forsvundet

1. Åbn terminal i `C:\Users\kimgr\data-capture-app`.
2. Kør:
   ```powershell
   npm run start:safe
   ```
3. Vent på, at der står `Waiting on http://localhost:8083`.
4. Scan QR-koden med din **Data Capture dev build-app** (ikke Expo Go).

> **Vigtigt:** Brug altigt dev build, ikke Expo Go. Expo Go understøtter ikke de nye native Firebase-moduler (Firestore, Storage, OCR, etc.).

## Testenheder

| Enhed | Model | Status | Bemærkning |
|---|---|---|---|
| iPhone 13 | iPhone 13 | Installeret | Bruges til test |
| iPhone 17 | iPhone 17 | Installeret | Bruges til test |
| iPad | iPad | Afventer installation | Skal installeres |

## Installationsinstruktion per enhed

1. Åbn Safari (iOS) eller Chrome (Android) på enheden.
2. Gå til EAS Dashboard: https://expo.dev/accounts/kgradm/projects/data-capture-app/builds
3. Find det ønskede build:
   - Android: `fab85114-d346-4406-8eba-0fa5f9e1b8f1`
   - iOS: `bc7a5b59-aca6-4195-92b3-f4c22ce05e91`
4. Tryk installationslinket og scan QR-koden på siden, eller følg anvisningen.
5. Åbn appen og accepter tilladelser.

## Ændringsoversigt (CHAT-001)

- Ny chat/kommentartråd under hver sag (item) med real-time opdateringer.
- Roller håndhæves: `viewer` kan ikke skrive kommentarer; `editor`, `admin` og `owner` kan.
- Forfattere kan slette egne kommentarer; `admin`/`owner` kan slette alle kommentarer i projektet.
- Kaskade-sletning: kommentarer slettes automatisk, når en sag slettes.
- `comment` → `note` omdøbning i item-typer, labels og kategori-forslag.
- Client-side throttling: maks 1 send pr. 2 sekunder og maks 10 kommentarer pr. minut pr. item.

## Kendte begrænsninger

- Push-notifikationer ved nye kommentarer er ikke inkluderet i v1.
- Redigering af egne kommentarer er ikke inkluderet i v1; brugere kan slette og oprette ny.
- Server-side rate limiting er ikke implementeret i v1; client-side throttling kan omgås af en manipuleret klient.
- **Firestore Security Rules er endnu ikke deployet** (se statusfil og release notes); deploy kræver manuelt skridt i Firebase Console eller opsætning af Firebase CLI.

## Når der kommer nyt build

Når et nyt EAS build er gennemført, opdateres dette dokument med:
- Nyt build-ID.
- Installationslink.
- Dato.
- Eventuelle ændringer der kræver ny installation.

## Testplan

Se `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.xlsx` for redigerbar testplan med afkrydsning og trafiklys.

## Hjælp ved problemer

Hvis appen ikke vil starte efter scan:
- Slet appen på telefonen og installer den igen fra EAS.
- Sørg for at telefonen er på samme netværk som PC'en (LAN).
- Tjek at port 8083 ikke er blokeret.
- Spørg mig: "Hvad er det aktuelle build og start-kommando?"
