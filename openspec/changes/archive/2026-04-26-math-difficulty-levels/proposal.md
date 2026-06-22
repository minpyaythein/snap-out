## Why

The math challenge currently uses a single fixed difficulty (addition 1–50, subtraction 1–50, multiplication 2–12). Users who find the problems too easy or too hard have no way to adjust. Adding selectable difficulty levels lets users customize the friction to their preference, making the extension more useful for a wider range of people.

## What Changes

- Add five difficulty levels: **easy**, **medium**, **hard** (default), **very hard**, and **impossible**
- Each level defines its own operator set and number ranges for problem generation
- Store the selected difficulty level in `chrome.storage.sync` alongside existing settings
- Add a difficulty selector dropdown to the extension popup UI
- Update `content.js` to read the stored difficulty level and generate problems accordingly
- Pass the difficulty level from the service worker to the content script via the `SHOW_POPUP` message

## Capabilities

### New Capabilities
- `difficulty-levels`: Defines the five difficulty tiers (easy through impossible), their number ranges and operator sets, and the default level selection

### Modified Capabilities
- `math-challenge`: Problem generation now varies by difficulty level instead of using fixed ranges
- `settings-storage`: Storage now includes a `difficultyLevel` setting with a default of `"hard"`

## Impact

- **`content.js`**: `generateProblem()` updated to accept a difficulty parameter and use level-specific ranges
- **`storage.js`**: New `difficultyLevel` field in storage, getter/setter functions
- **`popup/popup.js`**: New dropdown UI for selecting difficulty
- **`popup/popup.html`**: New section for the difficulty selector
- **`popup/popup.css`**: Styles for the difficulty dropdown
- **`background.js`**: Reads difficulty level from storage and includes it in the `SHOW_POPUP` message
