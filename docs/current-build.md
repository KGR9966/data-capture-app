# Data Capture – Aktuelt build og hurtigstart

> Levende dokument med det seneste udviklings-build, installationslink og start-procedure.
> Sidst opdateret: 2026-07-15

## Aktuelt dev build

| Felt | Værdi |
|---|---|
| **Build-ID** | `ef4584ac-51ed-4ab6-b01a-250decf2eecf` (Android), `93baa590-75e4-4166-b560-d65d526fbbb4` (iOS) |
| **Platform** | Android + iOS preview build |
| **Distribution** | Internal (EAS) |
| **EAS Dashboard** | https://expo.dev/accounts/kgradm/projects/data-capture-app/builds |
| **Android EAS build-side** | [Åbn Android build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/ef4584ac-51ed-4ab6-b01a-250decf2eecf) |
| **iOS EAS build-side** | [Åbn iOS build](https://expo.dev/accounts/kgradm/projects/data-capture-app/builds/93baa590-75e4-4166-b560-d65d526fbbb4) |
| **Git snapshot** | `937f79d` med udestående ændringer (Build 2 rettelser er endnu ikke commit'et) |
| **Fokus i dette build** | US-004 + US-005: Stemme/oprettelsesredesign, dynamiske lister og søgeportal |
| **Forrige build** | ~~`7490b239-74d7-4feb-af44-a25d9281e856` / `6fc715f8-d442-4f23-a5ea-5742c29fbf3d`~~ **Forældet** |

## Build 2 – US-004 + US-005

Dette build indeholder redesign af optagelse/oprettelse og dynamiske lister:

- **Fælles `CreateItemForm`:** Ensartede felter og rækkefølge for manuel oprettelse og stemmeoptagelse.
- **AI type-forslag:** Type foreslås automatisk ud fra titel/tekstindhold (bug, idé, observation, notat).
- **Stemmekommandoer:** Gem, slet alt, fortryd (undo sidste sætning/ord), tegnsætning og kategori-præfix.
- **OS-timeout håndtering:** Lang afbrydelse giver Alert med "Start ny optagelse", "Gem" og "Luk".
- **Dynamiske lister:** Søgeportal med substring/fuzzy-søgning, smart syntaks og konfigurationsdialog.
- **Live opdatering:** Dynamiske lister synkroniseres, når underliggende sager matcher/slipper søgningen.
- **Status-synkronisering:** Afkrydsning sætter kildesag til `done`; fjernelse af afkrydsning gendanner forrige status.
- **Deling og dybe links:** Liste-tekst og dyb link deles; rettighedstjek ved dyb link.

### Kendte begrænsninger i Build 2

- ESLint-warnings og package-version warning i pre-test-check er ikke blocker, men teknisk gæld.
- Type-vs-foto-lås er afklaret og godkendt af PO (regel C): stemmekommando låser; manuelt chip-valg før foto låser ikke; foto skifter til `photo`; chip-valg efter foto låser.
- Pre-existing secrets i `.env`, `google-services.json`, `GoogleService-Info.plist` bør håndteres før produktionsrelease.

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
   - Android: `ef4584ac-51ed-4ab6-b01a-250decf2eecf`
   - iOS: `93baa590-75e4-4166-b560-d65d526fbbb4`
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
