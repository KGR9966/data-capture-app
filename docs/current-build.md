# Data Capture – Aktuelt build og hurtigstart

> Levende dokument med det seneste udviklings-build, installationslink og start-procedure.
> Sidst opdateret: 2026-07-15

## Aktuelt dev build

| Felt | Værdi |
|---|---|
| **Build-ID** | `376a3067-cabb-4afe-b49c-e70467177a93` (Android), `6c3c014c-5f0d-42ca-91b5-3e1b259aff9e` (iOS) |
| **Platform** | Android + iOS preview build |
| **Distribution** | Internal (EAS) |
| **EAS Dashboard** | https://expo.dev/accounts/kgradm/projects/data-capture-app/builds |
| **Android installationslink** | https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/376a3067-cabb-4afe-b49c-e70467177a93 |
| **iOS installationslink** | https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/6c3c014c-5f0d-42ca-91b5-3e1b259aff9e |
| **QR-kode** | Scan QR-koden på de respektive EAS build-sider via linksene ovenfor. |
| **Fokus i dette build** | CHAT-001 rettelser (kommentar-afsendelse, "Ingen ansvarlig" redigering) + COPY-001 del/kopiér foto + ny Google Translate API-nøgle |
| **Git snapshot** | `ad34f80` (`v2026.07.15-rc1`) |
| **Forrige build** | `fab85114-d346-4406-8eba-0fa5f9e1b8f1` / `bc7a5b59-aca6-4195-92b3-f4c22ce05e91` |

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
   - Android: `376a3067-cabb-4afe-b49c-e70467177a93`
   - iOS: `6c3c014c-5f0d-42ca-91b5-3e1b259aff9e`
4. Tryk installationslinket og scan QR-koden på siden, eller følg anvisningen.
5. Åbn appen og accepter tilladelser.

## Ændringsoversigt (CHAT-001 + COPY-001)

- Ny chat/kommentartråd under hver sag (item) med real-time opdateringer.
- Roller håndhæves: `viewer` kan ikke skrive kommentarer; `editor`, `admin` og `owner` kan.
- Forfattere kan slette egne kommentarer; `admin`/`owner` kan slette alle kommentarer i projektet.
- Kaskade-sletning: kommentarer slettes automatisk, når en sag slettes.
- `comment` → `note` omdøbning i item-typer, labels og kategori-forslag.
- Client-side throttling: maks 1 send pr. 2 sekunder og maks 10 kommentarer pr. minut pr. item.
- **Rettet i denne RC**: kommentarer kan nu sendes (undefined-værdier fjernes før Firestore-skriv); "Ingen ansvarlig"-knap virker i redigeringstilstand.
- **COPY-001**: knapperne "Kopiér foto" og "Del foto" vises under foto på item-detail.
- **Oversættelse**: ny Google Translate API-nøgle bundet i EAS build (den gamle returnerede 403).

## Kendte begrænsninger

- Push-notifikationer ved nye kommentarer er ikke inkluderet i v1.
- Redigering af egne kommentarer er ikke inkluderet i v1; brugere kan slette og oprette ny.
- Server-side rate limiting er ikke implementeret i v1; client-side throttling kan omgås af en manipuleret klient.
- **Firestore Security Rules er deployet** manuelt 2026-07-15; automatisk CLI-deploy (AUTO-001) er stadig åben.

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
