## Context

The extension currently generates math problems with fixed ranges (addition/subtraction 1–50, multiplication 2–12). Users have no way to adjust difficulty. The popup UI (`popup.html`/`popup.js`) manages tracked sites, and settings are stored via `storage.js` using `chrome.storage.sync`. The service worker (`background.js`) sends `SHOW_POPUP` messages to content scripts, which render the challenge overlay.

## Goals / Non-Goals

**Goals:**
- Let users pick a difficulty level from the extension popup
- Persist the choice across sessions via `chrome.storage.sync`
- Adjust problem generation ranges/operators based on difficulty
- Default to "hard" (matching current behavior)

**Non-Goals:**
- Custom/user-defined difficulty parameters
- Per-site difficulty settings
- Difficulty progression or adaptive difficulty
- Division operator (potential non-integer results)

## Decisions

### 1. Difficulty level definitions

Five levels with escalating ranges:

| Level | Operators | Range A | Range B | Notes |
|---|---|---|---|---|
| easy | +, − | 1–10 | 1–10 | Single-digit math |
| medium | +, −, × | 1–25 | 1–25 | × uses 2–9 for both |
| hard | +, −, × | 1–50 | 1–50 | × uses 2–12 (current behavior) |
| very-hard | +, −, × | 1–100 | 1–100 | × uses 5–20 |
| impossible | +, −, × | 100–999 | 100–999 | × uses 10–50 |

**Rationale**: "hard" matches the current ranges so existing users see no change. Each tier roughly doubles the mental effort. Multiplication ranges are capped separately to keep problems solvable without paper (except "impossible", which is intentionally brutal).

**Alternative considered**: Using number of operands (e.g., `a + b + c`) — rejected because multi-operand parsing is more complex and less intuitive than bigger numbers.

### 2. Storage key: `difficultyLevel`

Store as a string value (`"easy"`, `"medium"`, `"hard"`, `"very-hard"`, `"impossible"`) in `chrome.storage.sync` alongside `trackedSites` and `thresholds`. Default to `"hard"` when absent.

**Rationale**: A single string is simple, syncs across devices, and is easy to extend later.

### 3. Pass difficulty via `SHOW_POPUP` message

The service worker reads `difficultyLevel` from storage and includes it in the `SHOW_POPUP` message payload: `{ type: 'SHOW_POPUP', hostname, difficulty }`. The content script uses it to configure `generateProblem()`.

**Rationale**: Content scripts don't have guaranteed access to `chrome.storage` in all contexts. Passing it through the message keeps the content script stateless.

### 4. UI: dropdown in popup below site list

Add a `<select>` dropdown in the extension popup (`popup.html`) with a label, placed below the site list section. Changes are saved immediately on selection (no save button needed).

**Rationale**: A dropdown is the simplest UI for 5 fixed options. Immediate save avoids a "forgot to save" footgun.

## Risks / Trade-offs

- **"Impossible" may frustrate users** → It's opt-in and clearly labeled. Users choose it knowing what they're getting into.
- **No per-site difficulty** → Keeps the implementation simple. Can be added later if requested.
- **Multiplication ranges at "impossible" level produce large products** → This is intentional — the level is called "impossible" for a reason.
