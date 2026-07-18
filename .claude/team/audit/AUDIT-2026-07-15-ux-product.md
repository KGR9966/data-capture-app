# Data Capture – UX / Product Direction Audit

**Dato:** 2026-07-15
**Scope:** Usability, product direction and stakeholder fit in the Data Capture Expo app.
**Files reviewed:**
- `docs/backlog.md`
- `docs/user-guide.md`
- `docs/backlog-cases/CHECKLIST-001-search-action-list.md`
- `docs/backlog-cases/CHECKLIST-001-creative-enrichment.md`
- `docs/backlog-cases/GEOFENCE-001-location-triggered-lists.md`
- `memory/app-platform-strategy.md`
- `memory/data-capture-rbac-strategy.md`
- `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/board.tsx`, `app/(tabs)/search.tsx`, `app/(tabs)/settings.tsx`, `app/item.tsx`, `app/_layout.tsx`, `app/index.tsx`
- `components/VoiceCaptureModal.tsx`
- `services/roles.ts`

---

## Executive summary

Data Capture is shifting from a lean capture tool into a multi-role collaboration + personal-productivity platform. The existing core flow (capture → board → search → detail) is coherent, but the onboarding is bare-bones and advanced features (voice, OCR, chat, copy/share, RBAC, assignments) are discoverable only through exploration. The proposed `CHECKLIST-001`/`GEOFENCE-001` direction is creative and aligns with the long-term platform vision, but it introduces a second conceptual model (lists-as-execution) on top of the first (items-as-capture). Without deliberate simplification, the app risks becoming three apps in one: a notes app, a lightweight project tracker, and a context-aware task companion.

---

## Ranked findings (max 10)

### 1. Onboarding cliff — first-time users do not know what to do after entering their name
**Severity: High**

The welcome screen (`app/index.tsx`) only asks for a name. After tapping "Fortsæt", the user is dropped into the Projekter tab with an empty list and no explanation of projects, boards, items, roles, or how to capture quickly. There is no inline guidance, coach marks, or a sample project.

**Mitigation:**
- Add a 1–2 screen onboarding carousel that explains: "Projects group your captures", "Board shows the active items", "Search finds across projects", "Tap + or hold the mic to capture fast".
- Seed a sample project (e.g., "Velkommen til Data Capture") with 2–3 example items for first-time users.
- Show a contextual empty-state CTA on the Projects tab: "Opret dit første projekt" with a one-line explanation.

---

### 2. Proposed `Context Lists` + `GEOFENCE-001` introduces a second conceptual model before the first is proven
**Severity: High**

The backlog proposes turning search results into named, checkable, shareable, location-triggered action lists. This is a large expansion from "capture and organise notes" into "execution companion". It adds a fifth tab, saved searches, status sync, deep links, Shortcuts/Tasker wizards, and personal-context metadata. The MVP case itself acknowledges a high scope-creep risk.

**Mitigation:**
- Ship a minimal version first: static named lists from search, check/uncheck, share as text, optional status sync. Defer dynamic lists, AI deduplication, geofencing, and templates until usage data confirms demand.
- Run a PO decision gate: is Data Capture v1 a capture/collaboration tool or a life-execution companion? If both, articulate a clear phased narrative for users.
- If `Context Lists` is approved, rename the tab label and consider whether it belongs in this app or in a future companion/hub app per the platform strategy.

---

### 3. `Board` and `VoiceCaptureModal` are overloaded with responsibilities, hurting discoverability
**Severity: High**

`board.tsx` is ~1,400 lines and handles: active/archived filtering, item creation modal, type chips, category input, image picker/camera, OCR, translation, copy buttons, assignment selection, and Shortcuts deep-link generation. `VoiceCaptureModal.tsx` duplicates most of that surface (voice, photo, OCR, translate, assign). A first-time user opening `+ Tilføj` or `🎤 Optag` is confronted with a dense modal and no progressive disclosure.

**Mitigation:**
- Split creation into stepped or collapsible sections: "What" (type/title/content) → "Media" (photo/OCR) → "Meta" (category/assignee). Show only the first section by default.
- Use the same capture component for both `+ Tilføj` and `🎤 Optag`; the latter just pre-fills content from voice. This reduces duplication and cognitive load.
- Move advanced Shortcuts-link generation out of the category row and into an explicit "Automate / Del" action on the item detail.

---

### 4. The personal-use vs. project-collaboration identity is ambiguous
**Severity: Medium**

The app works as a personal capture tool (single user) but exposes project management concepts everywhere: roles, members, assignments, comments. A personal user may feel the app is heavier than needed, while a project viewer may wonder why they cannot capture. The vision statement in the backlog says it should function as "din bedste ven i hverdagen", but the UI is currently project-centric.

**Mitigation:**
- Define and communicate the primary entry mode: personal workspace defaults to one implicit project, with collaboration features surfaced only when the user explicitly invites someone.
- For personal-only users, hide member/assignment UI until a second member is invited.
- Add a "Use case" selector during onboarding: "Just me" vs "Team/project".

---

### 5. Voice/OCR/chat/copy features are powerful but feel siloed
**Severity: Medium**

Voice has two entry points (Board mic button, Search mic button) and behaves differently in each. OCR is only reachable after uploading a photo inside a creation modal. Comments are only on item detail. Copy/share image is only on item detail. There is no single "capture hub" that makes these modalities visible to a new user.

**Mitigation:**
- Introduce a unified capture sheet accessible from a floating action button on Board: "Text", "Voice", "Photo", "Scan text (OCR)".
- Surface OCR as a first-class capture option, not a photo-side effect.
- Add a small helper hint the first time a user opens capture: "Tryk og hold mikrofonen, eller vælg foto for at scanne tekst."

---

### 6. Search results strip project context and status is inconsistently translated
**Severity: Medium**

`search.tsx` shows items across all projects but the result card does not display the project name. The status label is formatted in `formatStatus()` in search/board but displayed as raw English (`new`, `in_progress`) in `item.tsx` view mode. Category and assignee are shown differently between Board and Search cards.

**Mitigation:**
- Add project name to each search result card.
- Use a shared status component and a shared item-card component across Board, Search, and detail to ensure consistent labels, badges, and photo indicators.
- Translate status in `item.tsx` view mode the same way as in edit mode.

---

### 7. RBAC is implemented but not surfaced consistently in the UI
**Severity: Medium**

Role checks exist (`canEditItem`, `canDeleteItem`, `canComment`, etc.), but screens sometimes show disabled buttons instead of hiding actions, and sometimes pass a stub `ownerId: ""` to `getProjectRole` (e.g., `item.tsx` and `VoiceCaptureModal.tsx`). Viewers see the comment input removed entirely, which is correct, but they still see greyed-out "Rediger"/"Slet" buttons on detail, creating a slightly punitive experience.

**Mitigation:**
- Prefer hiding unavailable actions over disabling them, especially for viewer roles.
- Fix the stub `ownerId` calls: load the project document so role resolution is reliable, or use a cached active project.
- Add a small role badge or hint on the Board/detail so users understand why certain actions are absent.

---

### 8. Auto-save in `VoiceCaptureModal` may surprise users and create unwanted items
**Severity: Medium**

Auto-save is enabled by default and fires 5 seconds after voice recognition stops if the user has not edited. A user who opens voice capture to preview what they said, or who pauses to think, may accidentally create an item.

**Mitigation:**
- Default auto-save to off, or require at least one manual confirmation for the first capture.
- Show a clear preview state: "Lyt igen / Gem / Annuller" before committing.
- If auto-save remains, add an undo toast: "Gemt – fortryd" for a few seconds.

---

### 9. The "🔗" link icon next to a category on Board is cryptic
**Severity: Low**

In `board.tsx`, tapping the link emoji next to a category copies a deep link for Apple Shortcuts automation. There is no label, tooltip, or hint. A first-time user will likely tap it accidentally and not understand the resulting alert.

**Mitigation:**
- Replace the icon with a text label or move the action to the item detail overflow menu as "Kopiér Shortcuts-link".
- Show a one-line explanation in the alert or use a toast instead.

---

### 10. Settings tab is a dead-end and push-token display is too technical
**Severity: Low**

`settings.tsx` exposes the raw push token, dark-mode toggle, and logout. There is no help, privacy policy link, account management, or role overview. The token is shown as a monospace block with no explanation of what it is.

**Mitigation:**
- Replace token display with a simple status: "Push-notifikationer: til / slået fra".
- Add a "Hjælp & feedback" link and a "Privatlivspolitik" link (noted in backlog as required for CHAT-001).
- Move less-used technical actions (copy token) behind a "Avanceret" section.

---

## Biggest usability risk right now

The onboarding cliff combined with an overloaded creation flow. A first-time user enters the app, sees an empty project list, opens `+ Tilføj`, and is immediately asked to choose a type, title, content, category, photo, OCR language, and assignee before understanding the basic capture model. The proposed `Context Lists`/`GEOFENCE-001` work would amplify this risk by adding another layer of concepts before the core loop is validated.

## First-time user struggle map

| Step | Likely struggle |
|------|-----------------|
| Welcome | Understands name prompt, but no value proposition. |
| Projects tab | Does not know what a project is or why one is needed. |
| Board tab | Unsure how it relates to the project; empty state is generic. |
| Capture | Overwhelmed by type/category/photo/OCR/assignee options. |
| Voice capture | Caught off-guard by auto-save; unsure if item was created. |
| Search | Sees results but cannot tell which project they belong to. |
| Item detail | Comments are hidden at the bottom; raw status looks unfinished. |

---

## Suggested prioritised next steps

1. **Fix onboarding** (high impact, low effort): sample project + 1–2 welcome screens.
2. **Simplify the creation flow** (high impact, medium effort): progressive disclosure, shared capture component.
3. **Decide the product identity gate** (strategic): personal vs. team vs. execution companion, before approving `Context Lists` MVP.
4. **Build consistency primitives** (medium effort): shared item card, shared status translation, project name in search.
5. **Harden RBAC surfacing** (low effort): hide unavailable actions, fix stub `ownerId` role lookups.
