## Why

The alert threshold is currently hardcoded to 30 seconds in `storage.js`, giving users no control over when the popup triggers. Users need to set their own limit (up to 30 minutes) via a minutes + seconds input so the extension fits their actual usage habits.

## What Changes

- Add a global duration setting (minutes + seconds) to the popup UI, capped at 30 minutes
- Persist the chosen duration as a single `defaultThreshold` value (in seconds) in `chrome.storage.sync`
- Replace the hardcoded `DEFAULT_THRESHOLD = 30` in `storage.js` with the stored value
- The setting applies to all tracked sites globally (per-site overrides are out of scope)

## Capabilities

### New Capabilities

- `duration-setting`: UI control (min + sec inputs) for setting the global alert threshold, with validation and persistence

### Modified Capabilities

- `settings-storage`: The default threshold is no longer a hardcoded constant — it is now a user-configurable value stored under `defaultThreshold` in `chrome.storage.sync`. The fallback when absent remains 5 minutes (300 seconds).

## Impact

- `popup/popup.html` — new duration input section
- `popup/popup.js` — load/save duration setting
- `popup/popup.css` — styles for duration inputs
- `storage.js` — add `saveDefaultThreshold`, update `getThreshold` to read `defaultThreshold` from storage
- `background.js` — no direct changes needed; already reads threshold via `getThreshold()`
