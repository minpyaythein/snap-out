## Why

The duration inputs currently auto-save on every `change` event, meaning the timer threshold updates as the user is still adjusting values. An explicit Apply button gives users intentional control — the setting only takes effect when they confirm it.

## What Changes

- Add an "Apply" button next to the duration inputs in the popup UI
- Remove the auto-save `change` event listeners from the duration inputs
- Save `defaultThreshold` only when the Apply button is clicked

## Capabilities

### New Capabilities

- `duration-apply-button`: Apply button that triggers saving the duration setting explicitly, replacing the auto-save-on-change behaviour

### Modified Capabilities

_(none — no existing spec-level requirements are changing)_

## Impact

- `popup/popup.html` — add Apply button inside the duration section
- `popup/popup.css` — style the Apply button
- `popup/popup.js` — wire click handler, remove `change` event listeners from duration inputs
