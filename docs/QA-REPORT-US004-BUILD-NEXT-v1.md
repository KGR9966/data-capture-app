# QA Report — US-004 / Geofence Phase 1 — Next EAS Preview Build

**Date:** 2026-08-09  
**QA Agent:** Claude Code QA Agent  
**Scope:** EAS iOS/Android preview build readiness for Data Capture React Native Expo app.  
**Verdict:** GO with conditions

---

## 1. Scope

Validate that the working tree is ready for the next EAS preview build containing:

1. All Build 1-3 bug fixes already merged.  
2. Renewed Google Translate API key configured as EAS secret `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` in the `preview` environment.  
3. Newly implemented Geofence Phase 1 feature (phone automation via iOS Shortcuts / Android Automate; no background location).

---

## 2. Verification Checks

| # | Check | Command | Result |
|---|-------|---------|--------|
| 1 | TypeScript — root | `npx tsc --noEmit` | PASS — no errors, no output |
| 2 | Expo lint | `npx expo lint --quiet` | PASS — no errors, no output |
| 3 | TypeScript — functions | `cd functions && npm run lint` (runs `tsc --noEmit`) | PASS — no errors |
| 4 | EAS config iOS preview | `npx eas config --platform ios --profile preview` | PASS — profile resolves; environment `preview`; key loaded from EAS env |
| 5 | EAS config Android preview | `npx eas config --platform android --profile preview` | PASS — profile resolves; environment `preview`; key loaded from EAS env |
| 6 | EAS preview env vars | `npx eas env:list --environment preview` | PASS — `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` is present (secret + sensitive entries); `GOOGLE_SERVICE_INFO_PLIST`, `GOOGLE_SERVICES_JSON` also present |

### 2.1 EAS CLI version notice
`eas-cli@21.7.0` is available. The local version proceeds with a warning. This is not a build blocker but should be upgraded at the next convenient opportunity.

---

## 3. Geofence Phase 1 Implementation Review

Approved plan: `.claude/team/status/GEOFENCE-FASE1-PLAN.md`

| Component / File | Required Content | Status | Notes |
|------------------|------------------|--------|-------|
| `services/checklists.ts` | `ChecklistLocation` interface, `locations` field on `Checklist`, add/update/delete/toggle CRUD | PASS | `ChecklistLocation` (lines 49-59), `locations?: ChecklistLocation[]` on `Checklist` (line 76). CRUD: `addChecklistLocation`, `updateChecklistLocation`, `deleteChecklistLocation`, `toggleChecklistLocationArrival` |
| `services/geofence.ts` | `buildGeofenceUrl`, `parseGeofenceEvent`, `scheduleGeofenceNotification`, `geofenceGuideText`, `suggestPlacesForChecklist` | PASS | All exported functions present and typed |
| `components/LocationPicker.tsx` | Name, lat, lng, preset radii + custom radius input, save/delete | PASS | Preset radii 100/250/500/1000/2000/5000 m; custom 50 m – 50 km; validation of lat/lng/radius; delete button on edit |
| `components/GeoFenceGuide.tsx` | Guide text per platform, copy arrival/departure link buttons, open automation app button | PASS | iOS Shortcuts / Android Automate guide; copy arrival & departure links; "Åbn Shortcuts" / "Åbn Automate / Tasker" |
| `components/DeepLinkHandler.tsx` | Handles `datacapture://checklist` deep links including geofence params | PASS | Parses `geofence=true`, `event`, `locationId`; navigates to `/checklist` with params |
| `app/checklist.tsx` | Locations section, add/edit/delete/toggle location, geofence banner, smart suggestions | PASS | Section "Steder"; add/edit/delete/toggle; banner with open-item count; suggestion chips |
| `app/_layout.tsx` | `DeepLinkHandler` is mounted | PASS | Mounted inside providers (line 33) |

### 3.1 Fix applied during QA
`app/checklist.tsx` originally detected the geofence event by parsing `window.location.href`. On native iOS/Android `window.location.href` does not reliably reflect the incoming deep-link URL, so the arrival/departure banner would not appear in an EAS mobile build.

QA applied the following fix:

- Added `geofence`, `event`, `locationId` to the `useLocalSearchParams()` destructuring.
- Replaced `parseGeofenceEvent(window.location.href)` with a direct read of those local search params.
- Added the geofence params to the effect dependency array so the banner is recalculated when the deep-link params change.
- Removed the now-unused `parseGeofenceEvent` import from `app/checklist.tsx`.

After the fix `npx tsc --noEmit` and `npx expo lint --quiet` both pass.

---

## 4. `eas.json` Review

File: `eas.json`

The `preview` profile no longer contains an `env` block that overrides `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY`. Current preview profile:

```json
"preview": {
  "distribution": "internal",
  "android": { "buildType": "apk" },
  "environment": "preview"
}
```

Result: **PASS** — the value from the EAS `preview` environment secret will be used at build time, not a value injected from `eas.json`.

---

## 5. Blockers / Conditions

### Blockers
None.

### Conditions / Warnings
1. **Duplicate `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` entries in EAS preview environment.**  
   `npx eas env:list --environment preview` shows one sensitive entry and one secret entry for `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY`. The secret entry is the intended one for EAS builder access. The sensitive entry should be removed to avoid confusion and to ensure only the secret value is used. This is not a build blocker but is a hygiene issue.

2. **Legacy `GOOGLE_TRANSLATE_API_KEY` secret still exists in preview environment.**  
   It is no longer referenced by `eas.json` and can be deleted once the build pipeline is confirmed stable.

3. **eas-cli version outdated.**  
   Local EAS CLI reports `eas-cli@21.7.0` is available. Upgrade when convenient; not a build blocker.

4. **Guide text typo.**  
   `services/geofence.ts` line 250 contains `"Arrives"."` (extra closing quote). Cosmetic; does not affect functionality.

5. **Smart suggestions use placeholder coordinates (0,0).**  
   This matches the Phase 1 plan (manual coordinate entry; no external geocoding API). Users must edit the suggested place to set real coordinates before the geofence link works.

6. **No automated tests for geofence deep-link flow.**  
   Existing checks are `tsc` and lint only. A manual smoke test of a Shortcuts/Automate deep-link opening the app and showing the banner is strongly recommended before declaring the feature production-ready.

---

## 6. Recommended Next Step

Proceed to **PO-go** for the next EAS iOS/Android preview build, with the following acceptance criteria for build verification:

1. Build succeeds for both iOS and Android preview profiles.
2. Translation feature uses the renewed Google Translate key (no `API key expired` errors).
3. Manual smoke test: create a checklist, add a location, copy the arrival deep-link, trigger it from iOS Shortcuts / Android Automate, confirm the app opens the correct checklist and shows the geofence banner with the correct open-item count.

---

## 7. QA Sign-off

- All required verification commands pass.
- Geofence Phase 1 files exist and match the approved plan.
- Critical native-only deep-link banner bug found and fixed during the review.
- No remaining blockers.

**Verdict: GO with conditions.**
