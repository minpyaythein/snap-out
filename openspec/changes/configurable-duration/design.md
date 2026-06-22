## Context

The extension currently uses `DEFAULT_THRESHOLD = 30` (seconds) hardcoded in `storage.js`. The `getThreshold(hostname)` function reads per-site overrides from `thresholds[hostname]` and falls back to this constant. The background service worker calls `getThreshold()` on every alarm tick to decide when to show the popup. The popup UI has no duration control at all.

## Goals / Non-Goals

**Goals:**
- Let users set a global alert threshold (0–30 minutes) via minutes + seconds inputs in the popup
- Persist the setting as `defaultThreshold` (integer, seconds) in `chrome.storage.sync`
- Replace the hardcoded constant with the stored value at runtime

**Non-Goals:**
- Per-site threshold overrides (the `thresholds` map stays but remains unused in the UI for now)
- Validating seconds beyond clamping (browser number inputs handle it)
- Migration of existing users' thresholds (fallback to 300s is acceptable)

## Decisions

### Store as total seconds, not as `{ minutes, seconds }`
Storing a single integer is simpler — the background worker just compares `elapsed >= threshold`. The UI converts to/from minutes + seconds on load/save. Avoids any sync issues between two fields.

**Alternative considered**: Store `{ minutes, seconds }` object — rejected because every consumer would need to reconstruct seconds and there is no benefit to splitting the value.

### Global default, not per-site
The proposal scopes this to a single global setting. Per-site overrides add UI complexity (inline editing per row) that is out of scope for this change. The existing `thresholds` map remains in storage but is not surfaced in the UI.

### Cap at 30 minutes (1800s) enforced at save time
The `max` attribute on the minutes input prevents >30, but we also clamp in JS before saving to guard against direct storage manipulation. The minimum is 10 seconds to prevent accidental zero-duration alerts.

**Alternative considered**: Allow 0 seconds (disable tracking) — deferred; a dedicated enable/disable toggle is a cleaner UX for that.

### No separate save button — save on input change
Matches the existing pattern for the difficulty selector (`change` event → immediate save). Keeps the UI lightweight.

## Risks / Trade-offs

- **Risk**: User sets 0 min 0 sec, triggering instant popup on every page load → **Mitigation**: Enforce minimum of 10 seconds in the save handler.
- **Risk**: Existing users had `DEFAULT_THRESHOLD = 30`; after update their stored `defaultThreshold` is absent, falling back to 300s — behaviour change. → **Mitigation**: Document that fallback is 300s (5 min); acceptable since 30s was a dev default anyway.
