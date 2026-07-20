# Data Capture – Aktuelt build og hurtigstart

> Levende dokument med det seneste udviklings-build, installationslink og start-procedure.
> Sidst opdateret: 2026-07-18

## Aktuelt dev build

| Felt | Værdi |
|---|---|
| **Build-ID** | `648a6ba2-2ece-41c5-8238-79361432d44f` (Android), `0d155824-6521-41f2-b3de-5d839374a182` (iOS) |
| **Platform** | Android + iOS preview build |
| **Distribution** | Internal (EAS) |
| **EAS Dashboard** | https://expo.dev/accounts/kgradm/projects/data-capture-app/builds |
| **Android EAS build-side** | [Åbn Android build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/648a6ba2-2ece-41c5-8238-79361432d44f) |
| **Android direkte download (APK)** | [Download Android APK](https://expo.dev/artifacts/eas/jnCyTDJCSGU2UFgqE4OjKx2-BqBgf8_ztHL4nscQCug.apk) |
| **iOS EAS build-side** | [Åbn iOS build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/0d155824-6521-41f2-b3de-5d839374a182) |
| **iOS direkte download (IPA)** | [Download iOS IPA](https://expo.dev/artifacts/eas/phfp8ZnZtK0ZYdxFqFN-3eM5fHxdQ6bavissHctYfns.ipa) |
| **QR-kode** | Scan QR-koden på de respektive EAS build-sider via linksene ovenfor. |
| **Fokus i dette build** | B+C quick wins og Context Lists: del tekst/oversættelser, avanceret søgning, stemmekommandoer, nyt "Lister"-modul med status-synkronisering |
| **Git snapshot** | `2be7604` (`v2026.07.18-rc3`) |
| **Forrige build** | ~~`e823cf07-aa97-421e-88ed-98e86b33c70f` / `0323bbbb-bee5-4fb0-a040-2cfb4f34bf64`~~ **Forældet** |

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
   - Android: `648a6ba2-2ece-41c5-8238-79361432d44f`
   - iOS: `0d155824-6521-41f2-b3de-5d839374a182`
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

### Rettet i rc3 (det aktuelle build)

- **Sager kunne ikke redigeres**: `app/item.tsx` henter nu projektdata (`ownerId` + `roles`) før rettighedstjekket, så ejer/admin/editor igen kan redigere sager.
- **VoiceCaptureModal rolle-beregning**: Henter projektdata og bruger den aktuelle brugers uid, så tildelingsmuligheder vises korrekt.

## Kendte begrænsninger

- Push-notifikationer ved nye kommentarer er ikke inkluderet i v1.
- Redigering af egne kommentarer er ikke inkluderet i v1; brugere kan slette og oprette ny.
- Server-side rate limiting er ikke implementeret i v1; client-side throttling kan omgås af en manipuleret klient.
- Opdaterede Firestore Security Rules (inkl. `checklists`) er klar, men ikke deployet endnu – deployes manuelt lige så snart build er godkendt.
- **Dette build (rc3) er midlertidigt og afventer PO-godkendelse før videre test.** rc2 er markeret forældet pga. kritisk fejl ved redigering og projektoprettelse.

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
