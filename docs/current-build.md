# Data Capture – Aktuelt build og hurtigstart

> Levende dokument med det seneste udviklings-build, installationslink og start-procedure.
> Sidst opdateret: 2026-07-15

## Aktuelt dev build

| Felt | Værdi |
|---|---|
| **Build-ID** | `7490b239-74d7-4feb-af44-a25d9281e856` (Android), `6fc715f8-d442-4f23-a5ea-5742c29fbf3d` (iOS) |
| **Platform** | Android + iOS preview build |
| **Distribution** | Internal (EAS) |
| **EAS Dashboard** | https://expo.dev/accounts/kgradm/projects/data-capture-app/builds |
| **Android EAS build-side** | [Åbn Android build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/7490b239-74d7-4feb-af44-a25d9281e856) |
| **iOS EAS build-side** | [Åbn iOS build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/6fc715f8-d442-4f23-a5ea-5742c29fbf3d) |
| **Git snapshot** | `6042b91` (`v2026.07.15-build1-us006`) |
| **Fokus i dette build** | US-006: Ret kritisk projektoprettelsesfejl og forhindr dubletter |
| **Forrige build** | ~~`0d155824-6521-41f2-b3de-5d839374a182` / `648a6ba2-2ece-41c5-8238-79361432d44f`~~ **Forældet** |

## Build 1 – US-006

Dette build indeholder kun rettelsen af den kritiske projektoprettelsesfejl:

- **Root-cause:** `createProject` skrev projekt-dokument og members-subcollection i to separate skridt, men Firestore-reglerne manglede en regel for `members`-subcollection. Det medførte falsk fejlmeddelelse og delvise/dobbelte oprettelser.
- **Rettelse:** `writeBatch` sikrer atomisk oprettelse. Ny `members`-subcollection-regel med `getAfter()`. Rettet `memberEmails` og email-baseret læseadgang.
- **Dubletforhindring:** Klient-side tjek (trim, case-insensitivt) mod ejerens egne projekter med inline fejlmeddelelse.
- **Idempotens:** "Opret"-knappen deaktiveres under oprettelse, så gentagne klik ikke skaber dubletter.

### Kendte begrænsninger i Build 1

- Tomt-navn-feedback vises kun som disabled knap, ikke eksplicit besked. Rettes i næste release.
- Server-side dublet-revalidering mod race-vindue er ikke implementeret. Accepteret som fase 1-forbehold.
- Opdaterede Firestore Security Rules skal deployes manuelt samtidig med build-test.

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
2. Gå til det relevante build:
   - Android: `7490b239-74d7-4feb-af44-a25d9281e856`
   - iOS: `6fc715f8-d442-4f23-a5ea-5742c29fbf3d`
4. Tryk installationslinket og scan QR-koden på siden, eller følg anvisningen.
5. Åbn appen og accepter tilladelser.

## Når der kommer nyt build

Når et nyt EAS build er gennemført, opdateres dette dokument med:
- Nyt build-ID.
- Installationslink.
- Dato.
- Eventuelle ændringer der kræver ny installation.

## Testplan

Se `C:\Users\kimgr\.claude\projects\C--cloud-agent\memory\data-capture-test-baseline.xlsx` for redigerbar testplan med afkrydsning og trafiklys.
Fokus for Build 1: TC-006.1 – TC-006.11 i `C:\Users\kimgr\data-capture-app\.claude\team\test\testplan-b-c-redo-004-006.md`.

## Hjælp ved problemer

Hvis appen ikke vil starte efter scan:
- Slet appen på telefonen og installer den igen fra EAS.
- Sørg for at telefonen er på samme netværk som PC'en (LAN).
- Tjek at port 8083 ikke er blokeret.
- Spørg mig: "Hvad er det aktuelle build og start-kommando?"
