# Agent instruktioner - Data Capture

Dette projekt er en separat Expo-app bygget med TypeScript og expo-router.

## Konventioner

- Skriv TypeScript med strict mode.
- Brug funktionelle komponenter og hooks.
- Hold komponenter små og fokuserede.
- Placer Firebase-logik i `services/`.
- Brug React Context i `contexts/` for global state.
- Følg eksisterende mappestruktur.

## Husk

- Kør `npx tsc --noEmit` efter kodeændringer.
- Undgå at ændre `node_modules` manuelt.
- Sikkerhedskopi før større ændringer via `backup-data-capture.bat`.
- Dokumentér nye funktioner i `docs/backlog.md` eller `docs/`.
- Aktivér **Project Status Agent** (`docs/status-agent.md`) før nye features, builds eller større valg.
- Opdater **Collaboration Board** (`docs/collaboration-board.md`) efter hver statusændring og beslutning.
- Aktivér **Gate Keeper Agent** (`docs/gate-keeper-agent.md`) før builds og større handlinger.
- Log overholdelse af processen i **Compliance Log** (`docs/compliance-log.md`).
- **Før frigivelse til bruger-test:** Implementer-agenten skal selv køre `node scripts/release-gate.js`, opdatere Compliance Log, og præsentere en konsolideret trafiklys-status for brugeren. Brugeren skal ikke selv køre scripts før test.
