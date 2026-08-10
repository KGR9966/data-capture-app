# Secrets-håndtering og nøglerotation — Data Capture

**Dato:** 2026-08-02  
**Status:** `google-services.json` og `GoogleService-Info.plist` er markeret til sletning i git, og `.gitignore` forhindrer fremtidig tracking. PO/Release Engineer skal stadig rotere de eksponerede nøgler og flytte Google Translate-nøglen til EAS secrets.

## Hvad der er fundet

- `google-services.json` og `GoogleService-Info.plist` har været tracked i repo og indeholder reelle Firebase API-nøgler.
- `.env` har indeholdt `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY`, som bliver indlejret i app-bundlen.

## Hvad der er rettet i koden

- `google-services.json` og `GoogleService-Info.plist` er tilføjet `.gitignore`.
- De to filer er slettet fra working directory og sletningen er staged (`git status` viser `D  google-services.json` og `D  GoogleService-Info.plist`).
- Debug-logs der kunne lække nøgler eller følsomme URL'er er fjernet fra `services/media.ts` og `services/translation.ts`.
- `eas.json` er opdateret så EAS secret `GOOGLE_TRANSLATE_API_KEY` injecteres som `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` i preview- og production-builds.

## Hvad PO / Release Engineer skal gøre

### 1. Roter Firebase API-nøgler

1. Gå til [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Find projektet `data-capture-506bd`.
3. Slet den gamle Android API-nøgle og opret en ny.
4. Slet den gamle iOS API-nøgle og opret en ny.
5. Download nye konfigurationsfiler:
   - Android: `google-services.json`
   - iOS: `GoogleService-Info.plist`
6. Læg de nye filer i repo-roden (`data-capture-app/`), men **commit dem ikke** — de skal forblive untracked og injecteres ved build via EAS secrets eller lokalt working copy.

### 2. Ryd eksponerede nøgler fra git-historikken

Da filerne tidligere var tracked, kan gamle nøgler stadig findes i git-historikken. To muligheder:

#### Mulighed A — Slet filerne helt fra historikken (anbefales)

```bash
# Kør i repo-roden. Dette omskriver historikken — alle clones skal re-clone eller rebase.
git filter-repo --path google-services.json --path GoogleService-Info.plist --invert-paths

# Alternativ med filter-branch (langsommere, men inkluderet i standard git):
# git filter-branch --force --index-filter \
#   "git rm --cached --ignore-unmatch google-services.json GoogleService-Info.plist" \
#   --prune-empty --tag-name-filter cat -- --all
```

Bemærk: Efter historik-omskrivning skal alle samarbejdspartnere klone repoet igen.

#### Mulighed B — Slet kun fra fremtidige commits

Hvis historik-omskrivning er for risikabel:

1. Accepter at gamle nøgler stadig findes i historikken — derfor er **rotation (trin 1) påkrævet**.
2. Sikr at filerne ikke genintroduceres (`.gitignore` er allerede på plads).
3. Commit sletningen næste gang du committer kodeændringer.

### 3. Flyt Google Translate API-nøgle til EAS secrets

1. Gå til [Expo Dashboard → data-capture-app → Secrets](https://expo.dev/accounts/[account]/projects/data-capture-app/secrets).
2. Tilføj en secret med navn `GOOGLE_TRANSLATE_API_KEY` og værdien fra din `.env` (eller roter først, se trin 4).
3. `eas.json` er allerede opdateret til at injectere den som `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` i preview og production.
4. Slet `.env` fra working directory og commit sletningen (eller behold den lokalt, men sørg for at den ikke committes).
5. **Roter** Google Translate API-nøglen i Google Cloud Console og opdater EAS secret med den nye nøgle.

### 4. EAS build krav

Før næste EAS build skal følgende være på plads:

- `google-services.json` ligger untracked i repo-roden (til Android build).
- `GoogleService-Info.plist` ligger untracked i repo-roden (til iOS build).
- `.env` findes ikke i working directory, medmindre den bruges lokalt — i så fald må den ikke committes.
- EAS secret `GOOGLE_TRANSLATE_API_KEY` er sat.
- De roterede API-nøgler fra Google Cloud Console er indsat i de nye konfigurationsfiler.

### 5. Efter build

- Verificér at de nye konfigurationsfiler ikke er med i commit:
  `git status --short` skal vise dem som `??` (untracked), ikke `M` eller `A`.
- Verificér at `.env` ikke er tracked: `git ls-files | grep .env` skal returnere tom output.

## Hvorfor dette er vigtigt

- `google-services.json` / `GoogleService-Info.plist` API-nøgler kan misbruges til at oprette forbrug mod din Firebase-konto (f.eks. database-læsninger, push-notifikationer).
- `EXPO_PUBLIC_*` variabler indlejres i JavaScript-bundlen og kan udvindes af enhver der downloader appen.
- Secrets i git-historikken eksponeres i clones, forks og CI-logs.

## Kontaktpunkter

- Firebase Console: https://console.firebase.google.com/project/data-capture-506bd
- Google Cloud Credentials: https://console.cloud.google.com/apis/credentials?project=data-capture-506bd
- Expo Dashboard: https://expo.dev
