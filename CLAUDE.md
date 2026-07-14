# Data Capture - Claude Code instruktioner

Dette er en separat Expo-app (Data Capture) til opsamling af ideer,
observationer, bugs, kommentarer, billeder og stemmeoptagelser under
udvikling og test.

## Projektstruktur

- `app/` - Skærme og routing (expo-router)
- `components/` - Genanvendelige UI-komponenter
- `services/` - Firebase, auth, storage, push-notifikationer
- `contexts/` - React Context for global state (auth, theme, project)
- `hooks/` - Custom hooks
- `constants/` - Tema, konstanter
- `docs/` - Dokumentation, backlog, bugs
- `scripts/` - Hjælpe-scripts
- `memory/` - Governance og projektkontekst

## Teknisk stack

- Expo SDK 57
- React Native 0.86
- TypeScript
- expo-router
- Firebase (Auth, Firestore, Storage, Functions, Cloud Messaging)
- expo-notifications
- expo-speech-recognition (til tale-til-tekst)

## Arbejdsflow

1. Backup før større ændringer.
2. TypeScript check før commit.
3. EAS development builds for iOS og Android.
4. Test på fysiske enheder før godkendelse.

## Nøgle-filer

- `docs/backlog.md` - Features og opgaver
- `docs/bugs.md` - Fejl og bugs
- `memory/collaboration-structure.md` - Governance
- `backup-data-capture.bat` - Sikkerhedskopi

Læs altid `docs/backlog.md` og `docs/bugs.md`, før du starter en ny opgave.
