# CHECKLIST-001 + GEOFENCE-001 – Creative Enrichment

> Role: Creative / AI Challenger
> Scope: Ideas, UX framing and product enrichment. Does not modify the original case files.

---

## 1. Creative Feature Ideas for CHECKLIST-001 (beyond the current case)

The existing case already covers the basics well: named lists, dynamic saved-search lists, status sync, deduplication, sharing, AI grouping and voice input. The ideas below push the concept from "a better checklist" toward a daily-life execution companion.

### 1.1. "Run the List" focused-execution mode
A full-screen, distraction-free mode that shows **one item at a time**, pulled from a chosen list. It surfaces the original case context (photo, OCR, comments) inline so the user can act immediately: check off, snooze, add a note or open the source case. This turns a long shopping/errand/project list into a guided flow, especially useful when the user is walking around with the phone in one hand.

### 1.2. Cross-list intelligence and conflict warnings
Because every list item is tied to a real case, the app can detect when the **same source case appears in multiple active lists** (e.g., "Buy mælk" in both "Uge 29" and "Indkøb før weekend"). The app quietly flags the overlap and warns if one instance is checked while the other remains open. This prevents the common failure mode where a user marks something done in one context but forgets the duplicate elsewhere.

### 1.3. Weekly / daily "Done-log" digest
Treat completion as valuable data. The app can generate a lightweight summary of what was checked off, when and from which list: "Du klarede 12 punkter fra 3 lister denne uge. 2 udestående røg til næste uge." It can be viewed as a personal log or shared as a status update with a project owner. This makes the tool attractive for both personal productivity and lightweight project reporting.

### 1.4. Natural-language "delegate" from a list item
When a list item needs someone else to act, the user can long-press and choose **"Deleger"**. This creates a new source case with an assignee, deadline and a back-link to the original item, rather than just flipping a status. The original list item then becomes a read-only shadow of that delegated case and updates automatically when the assignee acts. This respects the PO rule that new items must first become real cases.

### 1.5. Pattern-based list suggestions
After a few weeks of usage, the AI suggests new lists based on recurring language patterns, times or contexts: "Du laver ofte en 'Indkøb'-liste torsdag aften. Vil du oprette en til næste uge?" Suggestions are always optional and one-tap-dismissible. This turns the app from reactive to proactive without becoming noisy.

### 1.6. Smart template harvest from search results
When a user creates a list from a search, the app can detect recurring structural patterns (e.g., "Køb X i butik Y", "Rapportér fejl i Z") and offer to save the current list as a reusable template. The template remembers which fields were extracted (title, category, OCR chunk, assignee) so future lists from similar searches can be generated in one tap.

---

## 2. Creative Feature Ideas for GEOFENCE-001 / Location + Lists

The original case correctly anchors geofencing to phone automation + deep links. The ideas below extend that anchor without adding background location tracking inside the app.

### 2.1. Leave-behind guard on departure
When the user **leaves** a location tied to a list, the app can check whether items intended for that place are still unchecked and show a gentle lock-screen prompt via the OS automation: "Du forlader PostNord – 2 af 3 pakker stadig ikke markeret. Vil du tjekke listen?" This uses the departure trigger the user already configured and never runs in the app background.

### 2.2. Multi-condition "location recipes"
Let users build richer Shortcuts / Tasker recipes from inside the app: trigger = (arrives at place X) AND (time is after 17:00) OR (Bluetooth disconnects from car). The app generates the recipe as a copy-paste JSON/Shortcut-file/Tasker XML and a deep link. The app does not evaluate the logic; the phone automation does. Example use case: "Åbn indkøbslisten kun når jeg er ved Netto efter arbejde."

### 2.3. NFC tag as an alternative entry point
Not every useful place is GPS-friendly (basement garage, rural addresses, inside large malls). The app can register an NFC tap as another trigger: a tag by the front door, on the car dashboard or on the washing machine opens the right list via the same deep-link mechanism. The wizard offers "NFC" as an option alongside geofencing.

### 2.4. Smart place extraction from item text
Use on-device text parsing (or a lightweight AI call) to pull addresses, store names and postal locations out of the source cases that feed a list. The wizard can then suggest: "3 af dine punkter nævner 'Føtex', 'Bilka' eller adresser i Valby. Vil du tilføje en genvej til Shortcuts?" This is a suggestion, never an auto-configuration.

### 2.5. Proximity preview via lock-screen widget / Live Activity
A widget or Live Activity shows the **single most relevant active list** based on the last known foreground location or the next scheduled location automation. It is read-only and refreshes only when the user opens the widget or the OS updates it; it does not request background location. This gives value at a glance without notifications.

### 2.6. Route-aware errand optimizer
If the user shares a planned route from Maps to the app via the share sheet, the app can order list items by proximity to stops along the route and surface them in a temporary "Route list" deep link. This is useful for Saturday errand runs: the app never tracks movement; it just consumes the shared route once and reorders a list.

---

## 3. Catchy Feature Name / Framing for the Combined Capability

**Primary name: Context Lists**

> The right list, in the right place, at the right time – without the app tracking you.

Why it works:
- "Context" covers both the content context (search, source case, assignee) and the real-world context (location, time, route).
- It signals intelligence without claiming the list itself is "smart".
- It is short, translatable and works as a tab label.

**Tagline options:**
- "Din liste, der ved, hvor du er."
- "From search to done – anywhere."
- "Opgaver med stedssans."

**Alternative names:**
- **Action Flows** – emphasizes execution and movement.
- **Situated Lists** – a bit more conceptual; good for internal architecture naming.
- **Smart Lists** – safe but generic; useful if marketing needs a familiar term.

**Recommendation:** Use **Context Lists** in the UI tab and docs; keep **Smart Lists** as an external/marketing alias if needed.

---

## 4. Edge Cases and Pitfalls

### 4.1. CHECKLIST-001 edge cases

| # | Edge case / pitfall | Proposed mitigation |
|---|---|---|
| 1 | **Status sync conflict** – the user checks an item in the list, but has already manually changed the source case status elsewhere. | Make status sync **append-only**: add a comment like "Udført via liste 'X'" and update a derived field (`completedViaList`). Never overwrite a newer manual status silently. Show a small conflict indicator if the two statuses diverge. |
| 2 | **Ghost item** – a list item references a source case that has been deleted or that the user no longer has permission to read. | Render the item as a "ghost" with the last-known title, disable the checkbox and offer "Unlink from source" or "Remove from list". This preserves the list history without crashing. |
| 3 | **Dynamic list explosion** – a saved search suddenly matches hundreds of items, turning the list into noise. | Cap dynamic lists (e.g., max 50 auto-added items) and require user approval for the rest. Show a banner: "+23 flere matcher – tilføj dem?" This respects the PO note that new-match notifications are too noisy. |
| 4 | **AI hallucinates duplicates** – semantic deduplication merges two items that look similar but are actually different (e.g., "Bestil 2 liter mælk" vs "Bestil 1 liter mælk"). | Never auto-merge. Present a side-by-side diff and ask the user. Default to "keep both". Use conservative thresholds: exact title match > OCR match > semantic match. |
| 5 | **Sharing leaks project context** – a user shares a personal project list via SMS and accidentally exposes internal case titles or client names. | Before sharing, show a preview with a warning label: "Denne liste indeholder 4 projektsager. Del kun med betroede modtagere." Offer a "sanitized text-only" option that strips source links and project names. |
| 6 | **Offline sync race** – the user edits the same list on two devices while offline; both come online and overwrite each other. | Use per-field timestamps and last-write-wins with a visible conflict banner. For checkboxes, treat completion as a timestamped event and surface "Also marked done on [device] at [time]" rather than silently reverting. |

### 4.2. GEOFENCE-001 edge cases

| # | Edge case / pitfall | Proposed mitigation |
|---|---|---|
| 1 | **Deep-link fragmentation** – iOS, Android and different OS versions handle URL schemes and universal links inconsistently, especially when the app is cold-started from a Shortcut. | Implement both a URL scheme (`datacapture://...`) and a verified universal/app link (`https://datacapture.example.com/open-list?id=...`). Add a fallback web page that redirects to the app store if the app is not installed. Test `Linking.getInitialURL()` and `Linking.addEventListener('url', ...)` for both warm and cold starts. |
| 2 | **Automation setup abandonment** – most users will not finish a multi-step Shortcuts or Tasker wizard. | Generate a one-tap importable file: `.shortcut` for iOS, `.xml`/`.prf.xml` for Tasker. If import is not possible, provide a 3-step visual guide with screenshots and a "Copy deep link" button. Track wizard completion only as a learning metric, never block usage. |
| 3 | **False triggers while passing by** – a user drives past a store at 80 km/h and the 1 km trigger fires, opening the list unwantedly. | Expose a configurable **dwell time** in the wizard: "Åbn kun hvis jeg er her i 2 minutter." This is configured in Shortcuts/Tasker, not in the app. Default to 1 km radius + 2 min dwell for arrival triggers. |
| 4 | **Battery optimization kills geofencing** – on some Android skins, Shortcuts/Tasker geofencing stops working after a few hours unless the automation app is whitelisted. | Add a lightweight **automation health check** in the app's settings that asks the OS whether the configured automation is still enabled. If not, show a help card with device-specific instructions. Do not request background-location permission yourself. |
| 5 | **Location metadata becomes sensitive when a list is shared** – place names, home address or work address attached to a list leak if the list is shared. | Store place metadata as **personal, non-shared fields** on `checklists/{id}/personalContext`. Shared recipients see the list content but not the geofence configuration unless the owner explicitly copies the automation recipe to them. |
| 6 | **App not logged in when automation fires** – a deep link to a project list opens the login screen, breaking the magic moment. | The deep-link handler should capture the target list ID before login, then redirect to it after authentication. If the user is anonymous, deep-link to a temporary local-only preview with a "Sign in to sync" nudge. |

---

## 5. MVP and Phase 2 Slices

### 5.1. CHECKLIST-001

**MVP slice (small, shippable, respects PO constraints):**
1. New **Context Lists** tab showing saved named lists.
2. **"Create list from search"** button on the search results screen.
3. Static lists only: select which search-result items become list rows; each row stores `sourceItemId`.
4. Basic list operations: check/uncheck, edit row text, delete row, reorder, sort open alphabetically, completed at bottom.
5. **Status sync back to source case** as an optional per-list toggle. When checked, append a comment and set status to `done` / `archived` if the source case is not already in a terminal state.
6. Deduplication on exact title match.
7. Share list as plain text via the native share sheet (no backend email needed).
8. Firestore `checklists` collection with owner-level security rules.

**Phase 2 slice (after MVP proves value):**
1. Dynamic saved-search lists with manual approval for large new matches.
2. AI-powered smart deduplication and auto-grouping (suggested, not forced).
3. Due dates + gentle reminder notifications per list/point (not per new match).
4. Templates and pattern-based list suggestions.
5. Voice addition to an existing list via the existing voice capture flow.
6. Sub-items / subtasks and cross-list conflict warnings.
7. "Run the List" focused-execution mode.
8. Natural-language delegate-to-case action.

### 5.2. GEOFENCE-001

**MVP slice (small, shippable, no background location):**
1. Deep-link handler registered in the app for `datacapture://open-list?id=<id>` and `datacapture://open-list?name=<name>`.
2. List-detail screen handles deep links: opens existing list, shows "List not found" with create option, and preserves target through login.
3. In-app place metadata on a checklist: one or more named places with address/coordinates and radius (stored as personal context, not shared).
4. Wizard that generates the correct deep link and plain-text Shortcuts / Tasker instructions with copy-to-clipboard.
5. One worked example in user-facing docs: "Indkøbsliste ved Elgiganten" with screenshots.
6. Ensure the app can be opened from cold start via the deep link on both iOS and Android.

**Phase 2 slice (after MVP proves value):**
1. One-tap export/import of Shortcuts `.shortcut` and Tasker `.xml` recipes.
2. Smart place extraction from item text / OCR (suggested places, not auto-added).
3. Leave-behind guard on departure triggers.
4. Multi-condition recipe builder (arrival + time + Bluetooth / Wi-Fi state).
5. NFC tag support as an alternative trigger.
6. Lock-screen widget / Live Activity showing the most relevant active list.
7. Route-aware temporary errand list from a shared Maps route.
8. Automation health-check diagnostic in app settings.

---

## 6. Rough UI/UX Sketch / Screen Sequence

### 6.1. Creating a Context List from search

1. **Search tab** – user searches for `mælk fejl vask`.
2. **Search results** – top action bar gains a **"Make Context List"** button (icon: list with a spark).
3. **Select items sheet** – user taps the items to include; each row shows title, category, assignee thumbnail. A counter reads "7 selected".
4. **List options sheet** – user names the list, toggles **"Sync status back to case"** on, and chooses a template if any.
5. **Context Lists tab** – the new list appears at the top. Opened, it shows:
   - Header: name, progress ring (3/7 done), share button, overflow menu.
   - Rows: checkbox left, title, optional due date pill, assignee avatar.
   - Completed rows slide to a collapsed "Done" section at the bottom.
6. **Check action** – tapping the checkbox briefly shows a confirmation toast: "Marked done on source case." If the source case is opened, a new comment appears: "Udført via liste 'Uge 29 indkøb'."

### 6.2. Setting up a location trigger

1. **Inside a Context List** – user taps **"Add place trigger"** (location pin icon).
2. **Place picker** – search for a place or drop a pin; pick radius (250 m, 1 km, 5 km) and trigger type (arrival / departure / dwell).
3. **Generated recipe screen** – shows:
   - The deep link: `datacapture://open-list?id=abc123`
   - A **"Copy for Shortcuts"** button and a **"Copy for Tasker"** button.
   - A 3-step visual guide with platform-specific screenshots.
   - An optional **"Export recipe file"** button for Phase 2.
4. **Shortcuts app** – user pastes the deep link into an Open URL action and sets the geofence radius.
5. **Real-world use** – user arrives at the place. Shortcuts opens the app straight to the list.
6. **Departure optional step** – if configured, leaving the place fires a second deep link: `datacapture://open-list?id=abc123&prompt=leave`. The app shows a sheet: "Forlader du stedet? 2 punkter stadig åbne."

### 6.3. "Run the List" focused mode

1. From an open Context List, user taps **"Run the List"**.
2. Screen transitions to a full-screen card stack showing one item at a time.
3. Card displays: title, source case photo/OCR preview, due date, assignee.
4. Bottom actions: **Done**, **Snooze 1h**, **Open case**, **Skip**.
5. After each action, the next card slides in. A progress bar at the top shows remaining count.
6. When complete, a lightweight summary: "Du klarede 5 punkter. 2 blev udsat." with a one-tap share option.

---

## 7. Synthesis: Why This Becomes a "Killer Feature"

The combined **Context Lists** capability turns Data Capture from a passive capture tool into an **active life companion**:

- **Capture friction is low:** voice, photo, OCR and search all funnel into real cases.
- **Execution friction is low:** lists are generated automatically, deduplicated, sorted and surfaced when and where they matter.
- **Trust is high:** status sync keeps the source of truth clean; AI is suggestive; the app never tracks location in the background.
- **Both personal and project use are served:** grocery lists and project bug lists live in the same model, distinguished by project context and sharing rules.

The killer framing is therefore not "another checklist app" but:

> **Context Lists – capture anything once, then let your phone bring it back at exactly the right moment.**

---

## Related

- [[CHECKLIST-001-search-action-list]] — original action-list case (read-only source).
- [[GEOFENCE-001-location-triggered-lists]] — original location-trigger case (read-only source).
- [[data-capture-rbac-strategy]] — sharing and role boundaries for project lists.
- [[data-capture-test-baseline]] — baseline functionality to regression-test against.
