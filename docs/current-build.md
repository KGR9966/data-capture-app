# Data Capture – Aktuelt build og hurtigstart

> Levende dokument med det seneste udviklings-build, installationslink og start-procedure.
> Sidst opdateret: 2026-07-15

## Aktuelt dev build

| Felt | Værdi |
|---|---|
| **Build-ID** | `e823cf07-aa97-421e-88ed-98e86b33c70f` (Android), `0323bbbb-bee5-4fb0-a040-2cfb4f34bf64` (iOS) |
| **Platform** | Android + iOS preview build |
| **Distribution** | Internal (EAS) |
| **EAS Dashboard** | https://expo.dev/accounts/kgradm/projects/data-capture-app/builds |
| **Android EAS build-side** | [Åbn Android build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/e823cf07-aa97-421e-88ed-98e86b33c70f) |
| **Android direkte download (APK)** | *Afventer færdiggørelse af build* |
| **iOS EAS build-side** | [Åbn iOS build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/0323bbbb-bee5-4fb0-a040-2cfb4f34bf64) |
| **iOS direkte download (IPA)** | *Afventer færdiggørelse af build* |
| **QR-kode** | Scan QR-koden på de respektive EAS build-sider via linksene ovenfor. |
| **Fokus i dette build** | B+C quick wins og Context Lists: del tekst/oversættelser, avanceret søgning, stemmekommandoer, nyt "Lister"-modul med status-synkronisering |
| **Git snapshot** | `f85bda8` (`v2026.07.18-rc2`) |
| **Forrige build** | `376a3067-cabb-4afe-b49c-e70467177a93` / `6c3c014c-5f0d-42ca-91b5-3e1b259aff9e` |

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
| iPad | iPad | Installeret | Bruges til test |

## Installationsinstruktion per enhed

1. Åbn Safari (iOS) eller Chrome (Android) på enheden.
2. Gå til EAS Dashboard: https://expo.dev/accounts/kgradm/projects/data-capture-app/builds
3. Find det ønskede build:
   - Android: `e823cf07-aa97-421e-88ed-98e86b33c70f`
   - iOS: `0323bbbb-bee5-4fb0-a040-2cfb4f34bf64`
4. Tryk installationslinket og scan QR-koden på siden, eller følg anvisningen.
5. Åbn appen og accepter tilladelser.

## Ændringsoversigt (B+C – quick wins + Context Lists MVP)

- **B1 – Del tekst og oversættelser**: Del/kopiér sagens tekst og eventuel oversættelse fra item-detail og VoiceCaptureModal.
- **B2 – Avanceret søgning**: Nyt søgesprog med `*vand*` for helt ord, `"frase"` for nøjagtig sætning, `-negation`, `OR` og simple filtre (`type:`, `kategori:`, `status:`, `ansvarlig:`, `projekt:`, `has:photo`).
- **B3 – Stemmekommandoer**: Punktum, komma, ny linje, slet sidste ord, fortryd, gem, annuller. Stemmeoptagelse viser redigerbar preview og gemmer ikke automatisk.
- **C – Context Lists MVP**:
  - Nyt "Lister"-fane med alle brugerens lister.
  - Opret liste direkte fra søgeresultater med "Opret aktionsliste".
  - Deduplikering ved oprettelse og alfabetisk sortering af åbne punkter; færdige samles nederst.
  - Afkrydsning synkroniserer automatisk kildens item-status til `done`.
  - Del liste som tekst og dyb-link (`datacapture://open-list?id=...`).
  - Nye Firestore-regler for `checklists` og `checklists/{id}/items` er klar til manuelt deploy.

## Kendte begrænsninger

- Push-notifikationer ved nye kommentarer er ikke inkluderet i v1.
- Redigering af egne kommentarer er ikke inkluderet i v1; brugere kan slette og oprette ny.
- Server-side rate limiting er ikke implementeret i v1; client-side throttling kan omgås af en manipuleret klient.
- Opdaterede Firestore Security Rules (inkl. `checklists`) er klar, men ikke deployet endnu – deployes manuelt lige så snart build er godkendt.

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
