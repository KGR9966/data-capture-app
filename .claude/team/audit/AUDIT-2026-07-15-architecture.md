# Architecture & Code Quality Audit — Data Capture Expo App

**Date:** 2026-07-15  
**Scope:** Static review of `package.json`, `app.json`, `app/`, `services/`, `components/`, `contexts/`, `docs/firestore-rules.md`, and CHAT-001 / COPY-001 task specs.  
**Method:** Source inspection only; no builds or tests executed.  
**Auditor:** Claude Code Architecture / Code Quality auditor

---

## Executive Summary

The project follows a clear Expo Router + React Context + Firebase services structure and the CHAT-001 / COPY-001 features are functionally implemented. However, there are **security-critical gaps** in Firestore rules and repository hygiene, plus maintainability issues from duplicated UI logic, missing tests, and inconsistent error handling. The release gate gives false confidence because it does not cover several new native dependencies introduced by COPY-001 and other recent features.

---

## Findings (ranked by severity)

### 1. HIGH — Firestore catch-all rules override CHAT-001 protections

- **Location:** `C:\Users\kimgr\data-capture-app\docs\firestore-rules.md`, rules block lines 19-21
- **Observation:** The rules contain a top-level `match /{document=**}` that allows `read, write` to the entire database until `2026-08-09`. This takes precedence over the CHAT-001 comment rules in practice, so no role/membership enforcement is actually active server-side.
- **Risk:** Any authenticated (or unauthenticated, depending on Auth rules) user can read or write any item, project, or comment. The documented CHAT-001 protections are effectively inert.
- **Mitigation:** Remove the catch-all rule and implement collection-specific rules for `projects`, `projects/{id}/members`, `items`, and `items/{id}/comments` that mirror the role model in `services/roles.ts`. Add `firestore.rules` and `firebase.json` to the repo for automated deploy (already tracked as AUTO-001).

---

### 2. HIGH — Sensitive Firebase configuration files committed to the repo

- **Location:** `C:\Users\kimgr\data-capture-app\google-services.json`, `C:\Users\kimgr\data-capture-app\GoogleService-Info.plist`, `C:\Users\kimgr\data-capture-app\.gitignore`
- **Observation:** Both Android and iOS Firebase config files, including API keys and project IDs, are tracked in git. `.gitignore` does not list `google-services.json`, `GoogleService-Info.plist`, or `.env`.
- **Risk:** API keys and project metadata are exposed in version control. Rotating or per-environment configuration is harder, and keys can leak in CI/build logs.
- **Mitigation:**
  1. Add `google-services.json`, `GoogleService-Info.plist`, and `.env` to `.gitignore`.
  2. Provide templates (e.g., `google-services.json.example`) with placeholder values.
  3. Store production config as EAS secrets or use a pre-build config plugin; keep only non-sensitive `app.json` references (`"googleServicesFile": "./google-services.json"`).

---

### 3. HIGH — Release gate does not protect against missing native modules

- **Location:** `C:\Users\kimgr\data-capture-app\scripts\pre-test-check.js` (lines 77-105), `C:\Users\kimgr\data-capture-app\scripts\release-gate.js` (lines 70-100)
- **Observation:** The native-module safety check only looks for `@react-native-firebase/storage/auth/firestore`, `expo-mlkit-ocr`, and `expo-clipboard`. It ignores `react-native-share`, `expo-image-picker`, `expo-file-system`, `expo-image`, and `expo-speech-recognition`, all of which are imported at module level in `services/share.ts`, `services/media.ts`, `app/(tabs)/board.tsx`, `app/item.tsx`, `components/VoiceCaptureModal.tsx`, and `hooks/useVoiceRecognition.ts`.
- **Risk:** Running in Expo Go or an outdated development build will crash at startup or when a screen loads. The gate reports "OK" despite the exposure.
- **Mitigation:** Extend `nativeModulePackages` to include every native dependency, or lazy-load native modules (as done correctly in `services/ocr.ts` and `services/deeplinks.ts`) so the app starts gracefully with a fallback message when a module is missing.

---

### 4. MEDIUM — UI constants and formatting duplicated across screens

- **Location:**
  - `app/(tabs)/board.tsx` lines 39-57, 59-90
  - `app/(tabs)/search.tsx` lines 19-61
  - `app/item.tsx` lines 47-65, 25-35
  - `components/VoiceCaptureModal.tsx` lines 33-41, 97-105, 43-56
- **Observation:** `ITEM_TYPE_LABELS`, `ITEM_TYPE_COLORS`, `formatDate`, `formatCreator`, `formatStatus`, and the entire OCR/translation UI block are copy-pasted between `board.tsx`, `search.tsx`, `item.tsx`, and `VoiceCaptureModal.tsx`.
- **Risk:** Inconsistent labels/colors, higher bug surface, and harder maintenance. CHAT-001 already renamed `comment` → `note` and a future change will need edits in multiple files.
- **Mitigation:** Extract shared constants to `constants/itemTypes.ts` and shared formatting helpers to `utils/formatting.ts`. Extract the OCR/translation panel into a reusable `OcrTranslationPanel.tsx` component.

---

### 5. MEDIUM — No automated tests for business-critical logic

- **Location:** Project root; `services/roles.ts`, `services/comments.ts`, `services/items.ts`
- **Observation:** There are no project-level tests (`*.test.ts`, `__tests__/`). The role model (`canEditItem`, `canDeleteItem`, `canComment`, etc.) and the cascade-delete behavior added for CHAT-001 are only verified manually.
- **Risk:** Permission regressions (e.g., a viewer accidentally gaining edit rights) are easy to introduce. Firestore rules drift from code behavior is likely over time.
- **Mitigation:** Add Jest/Vitest and write unit tests for `services/roles.ts` and `services/comments.ts`. Add Firestore emulator integration tests that verify CHAT-001 rules against the documented scenarios (create, read, delete by author/owner/admin/viewer).

---

### 6. MEDIUM — Type safety gaps and `any` leaks

- **Location:**
  - `services/items.ts` lines 54-55, 60 (`createdAt?: any`, `updatedAt?: any`, `Record<string, any>`)
  - `services/comments.ts` lines 24-25 (`createdAt?: any`, `updatedAt?: any`)
  - `services/projects.ts` lines 28-29, 37 (`createdAt?: any`, `updatedAt?: any`, `joinedAt?: any`)
  - `services/projects.ts` line 255 (`deleteFieldHack(): any`)
  - `services/ocr.ts` line 1 (`let recognizeTextModule: any = null`)
  - `contexts/AuthContext.tsx` lines 44-45 (`Promise<any>`)
  - `app/item.tsx` line 25, `app/(tabs)/search.tsx` line 30, `app/(tabs)/board.tsx` line 59 (`formatDate(ts: any)`)
- **Observation:** Timestamp fields are typed as `any`, utility casts use `any`, and the OCR module is untyped. This weakens `strict: true` and masks potential runtime mismatches (e.g., `toMillis()` called on a plain Date or number).
- **Risk:** Runtime crashes when formatting timestamps; refactoring becomes unsafe; TypeScript strict mode is effectively undermined in several files.
- **Mitigation:** Define a shared `Timestamp = FirebaseFirestoreTypes.Timestamp | Date | number | null` union and strict formatting helpers. Replace `deleteFieldHack` with the directly imported `deleteField`. Add a minimal type for the OCR module or use `expo-mlkit-ocr` exported types.

---

### 7. MEDIUM — VoiceCaptureModal has broken role-based assignment and fragile auto-save

- **Location:** `components/VoiceCaptureModal.tsx` lines 241-243, 251-270, 284-305
- **Observation:**
  - `getProjectRole({ id: projectId, ownerId: "" }, null, members)` passes `null` as `userId`, so the function returns `null` immediately. `canAssignItems(projectRole)` is therefore always false, and the assignment chip section is never shown in the voice modal.
  - `handleSaveInternal` calls the async `onSave` prop without `await`, then immediately sets `isProcessing = false` and calls `onClose()`. If `createItem` throws, the error is an unhandled promise rejection and the modal may close before the save completes.
  - Auto-save fires when `!editedRef.current`, but voice transcript updates set `content` without setting `editedRef.current = true`, so the modal can auto-close while the user is still reviewing the transcription.
- **Risk:** Voice-created items cannot be assigned; data loss or misleading UX; unhandled errors.
- **Mitigation:** Pass the current user ID and correct `ownerId` to `getProjectRole`. Await `onSave` and handle errors with a visible message. Set `editedRef.current = true` whenever the transcript or any field changes, or require explicit save for voice captures.

---

### 8. MEDIUM — Error handling is inconsistent and offline/permission UX is not uniform

- **Location:** Multiple: `services/items.ts` lines 84-107, `services/comments.ts` lines 108-128, `services/projects.ts` lines 97-128, `app/item.tsx`, `app/(tabs)/index.tsx`, `components/VoiceCaptureModal.tsx`
- **Observation:** Snapshot subscribers silently swallow errors and call `callback([])`. Service functions sometimes throw Danish messages, sometimes generic strings, sometimes log and return null. Screens mix `console.log` with `Alert.alert`. There is no global offline/permission/loading state and no retry pattern.
- **Risk:** Users see empty lists instead of error states, or get conflicting messages. Permission-denied errors from Firestore are handled in `createComment` but not consistently elsewhere.
- **Mitigation:** Create a small `errors.ts` module that maps Firebase error codes to user-facing messages. Update all subscribers to surface errors (e.g., via a returned `{ data, error, loading }` shape) and add a consistent offline banner/retry button pattern in screens.

---

### 9. LOW — Dead code and empty structural directories

- **Location:**
  - `components/DebugOverlay.tsx` — defined but never imported in `app/_layout.tsx` or elsewhere.
  - `constants/` and `store/` — empty directories in the project root.
  - CHAT-001 spec recommended `components/CommentList.tsx` and `components/CommentInput.tsx`; comments are instead inlined in `app/item.tsx` (300+ lines of UI + logic).
- **Observation:** Unused components and empty folders add noise. The single large `item.tsx` file combines detail view, editing, comments, and image sharing, contradicting the project convention of small, focused components.
- **Risk:** Maintenance burden; `item.tsx` is difficult to review and extend.
- **Mitigation:** Remove or wire up `DebugOverlay`. Delete or populate `constants/` and `store/`. Split `item.tsx` into `ItemDetailView`, `ItemEditForm`, `CommentList`, and `CommentInput` components as originally specified.

---

### 10. LOW — Backup files tracked in source control

- **Location:** `app/(tabs)/board.tsx.native-all-in.bak`, `services/media.ts.native-all-in.bak`, `services/ocr.ts.native-all-in.bak`, `package.json.native-all-in.bak`, `package-lock.json.native-all-in.bak`, `app.json.native-all-in.bak`
- **Observation:** Multiple `.native-all-in.bak` backup files are committed. They are not in `.gitignore`.
- **Risk:** Repository bloat, confusion during code review, and risk of accidentally importing from a backup file.
- **Mitigation:** Add `*.bak` and `*.native-all-in.bak` to `.gitignore`, remove the committed backups, and rely on git tags (the project already tags baselines such as `baseline-chat-feature-2026-07-15`) for historical snapshots.

---

## Additional Notes (non-blocking)

- **Native dependencies justification:** `react-native-share` is justified for COPY-001 (native share sheet) and correctly registered in `app.json`. `expo-speech-recognition`, `expo-mlkit-ocr`, `expo-image`, `expo-image-picker`, and `expo-file-system` are all justified by documented features (voice capture, OCR, photo upload/share). None appear unused.
- **CHAT-001 / COPY-001 task alignment:** The code implements the specified features, but the Firestore rules are not fully deployed/aligned (finding #1) and the recommended `CommentList`/`CommentInput` components were not created (finding #9).
- **Translation API key exposure:** `EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY` is embedded in the JS bundle via `process.env`. This is acceptable for a client-facing Google Cloud API key with strict key restrictions, but a backend proxy would be more robust.
- **Theme handling:** `ThemeProvider` auto-switches to the system color scheme whenever it changes, overriding a manual toggle. Consider persisting the user’s explicit choice in `AsyncStorage`.

---

## Recommended Priority Order

1. Fix Firestore rules (remove catch-all, deploy per-collection rules) — blocks any claim of CHAT-001 security compliance.
2. Remove sensitive Firebase config from version control and rotate exposed keys.
3. Harden release gate and lazy-load native modules to prevent dev-build crashes.
4. Add tests for `roles.ts`, comment service, and Firestore rules emulator.
5. Refactor duplicated constants/UI and split `item.tsx` into focused components.
6. Fix `VoiceCaptureModal` role/assignment and async save handling.
7. Standardize error handling and offline UX.
8. Clean up dead code, empty folders, and backup files.
