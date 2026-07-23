# QA Report — Q-001: Type-vs-photo lock behavior

**Date:** 2026-07-15  
**Scope:** Verify rule C in `components/CreateItemForm.tsx` after the latest change.  
**Rule C:**
1. Voice command locks type.
2. Manual chip press before photo does NOT lock — acts as pre-selection.
3. Adding a photo auto-switches type to `photo` unless voice-locked.
4. Manual chip press while a photo is attached locks the type and overrides `photo`.

## Static checks

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npm run typecheck` | PASS (no errors) |
| ESLint | `npm run lint` | PASS for `CreateItemForm.tsx` (project lint reports 1 pre-existing warning in `VoiceCaptureModal.tsx:293`, not in scope) |

## Scenario verification (conceptual trace)

| Scenario | Expected behavior | Actual behavior traced in code | Status |
|----------|-------------------|--------------------------------|--------|
| a. No type chosen, photo added | Type becomes `photo` | `useEffect` at line 200 sees `mediaUrl`, `itemType !== "photo"`, and `!userLockedTypeRef.current`, so it calls `onItemTypeChange("photo")`. | PASS |
| b. Manual `bug` chip pressed, then photo added | Type switches from `bug` to `photo` | `handleSelectType` (line 232) finds `hasPhotoRef.current === false`, so it does **not** set `userLockedTypeRef.current`. Type becomes `bug` but remains unlocked. When the photo is attached, the line-200 effect runs and switches to `photo`. | PASS |
| c. Voice command says "fejl" (`typeLocked=true`), then photo added | Type stays `bug` | Voice sets `externalTypeLocked`, which propagates to `userLockedTypeRef.current` (lines 144 & 148). The line-200 effect checks `!userLockedTypeRef.current` and therefore does **not** switch to `photo`. | PASS |
| d. Photo added first, then manual `bug` chip pressed | Type becomes `bug` and is locked | Photo attachment triggers the line-200 effect and sets type to `photo` (still unlocked). Pressing the `bug` chip calls `handleSelectType`; `hasPhotoRef.current === true`, so it sets `userLockedTypeRef.current = true` and calls `onItemTypeChange("bug")`. | PASS |
| e. Photo removed after auto-switch | Type reverts to default (`other`) | After the auto-switch, `userLockedTypeRef.current` is still `false`. When `mediaUrl` becomes `null`, the line-207 effect (`!mediaUrl && itemType === "photo" && !userLockedTypeRef.current`) calls `onItemTypeChange(defaultType)` where `defaultType` defaults to `"other"`. | PASS |

## Code references

- Lock state tracked in `userLockedTypeRef` (lines 141–153).
- Manual chip logic in `handleSelectType` (lines 232–240).
- Photo auto-switch in `useEffect` (lines 199–204).
- Revert-to-default in `useEffect` (lines 206–211).

## Overall result

**PASS** — The implementation in `components/CreateItemForm.tsx` matches rule C for all traced scenarios. Static checks also pass for the file under test.
