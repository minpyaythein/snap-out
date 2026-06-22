# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**snap-out** is a Chrome extension (Manifest V3, vanilla JS, no build step) that interrupts time spent on user-chosen sites by forcing a math challenge before dismissal. There is **no compile, bundle, or test command** — you edit the source files directly and reload the unpacked extension.

### Running / testing changes
There is no test suite or linter configured. To exercise changes:
1. Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, select the repo root.
2. After editing, click the reload icon on the extension card. Content-script changes also require reloading the target page; service-worker changes take effect on extension reload.
3. Debug the service worker via the "service worker" link on the extension card (logs are prefixed `[TimeNudge]`). Debug the popup by right-clicking it → Inspect. Content-script logs appear in the page's own console.

## Architecture

Three runtime contexts communicate via `chrome.runtime`/`chrome.tabs` messaging. **`storage.js` is shared** — loaded by the service worker via `importScripts('storage.js')` and by the popup via a `<script>` tag — so its functions (`getSettings`, `getThreshold`, `normalizeHostname`, etc.) are global in both.

- **`background.js`** (service worker) — the timer engine. Owns all time tracking. Tracks the active hostname and accumulated seconds in `chrome.storage.session` (survives SW restarts within a browser session). A recurring 30s alarm plus event listeners (`tabs.onActivated`, `tabs.onUpdated`, `windows.onFocusChanged`) call `checkThreshold()`, which flushes elapsed time and, when the threshold is hit, sends a `SHOW_POPUP` message to **every tab of that hostname** (`getTabsForHostname`).
- **`content.js`** — injected into every page; renders the overlay. Contains the **entire math-problem generator** (`generateProblem` and `DIFFICULTY_CONFIG`). On a correct answer it sends `DISMISS_POPUP` back to the background. The `none` difficulty shows a plain dismissible banner instead of a math challenge.
- **`popup/`** — the settings UI (add/remove sites, pick difficulty, set duration). Reads/writes settings via the shared `storage.js` helpers and reaches into `chrome.storage.session` directly to reset counters.

### Key invariants and gotchas
- **Hostnames are always normalized** by stripping a leading `www.` (`normalizeHostname` in `storage.js`). Anything used as a storage key, compared against `trackedSites`, or parsed from a URL must be normalized first, or lookups silently miss.
- **Two storage areas, different lifetimes**: `chrome.storage.sync` holds persistent *settings* (`trackedSites`, `thresholds`, `difficultyLevel`, `defaultThreshold`); `chrome.storage.session` holds *runtime state* (`elapsed`, `lastActiveTime`, `activeHostname`, `windowFocused`, `popupShown`). Don't conflate them.
- **`popupShown[hostname]` gates re-display** — once true the popup won't re-show until it's cleared. Flows that *reset* a timer (add site, remove site, dismiss) delete the hostname from **both** `elapsed` and `popupShown`. **Changing the duration does NOT reset elapsed** — it re-evaluates against the new threshold (`THRESHOLD_CHANGED`), only clearing `popupShown`/overlays if the new threshold is now above the accumulated time. `checkThreshold` only ever *sets* `popupShown`, never clears it, so any "the limit went up, take the nudge down" logic lives in the `THRESHOLD_CHANGED` handler.
- **Threshold resolution order** (`getThreshold`): per-site `thresholds[hostname]` → global `defaultThreshold` → hardcoded `DEFAULT_THRESHOLD` (300s).
- **Scheduling is dual-path**: thresholds ≥30s away use a one-shot `chrome.alarms` alarm (`threshold-trigger-<hostname>`); <30s away use an in-memory `setTimeout` (`pendingTimeouts`), because alarms can't fire reliably under a minute.
- **Content-script injection fallback**: `sendPopupMessage` first tries `tabs.sendMessage`; if the content script isn't present (e.g. page loaded before install), it injects `content.js`/`content.css` via `chrome.scripting` and retries.
- **Multi-tab overlays**: a nudge shows on every tab of the hostname, and solving/dismissing on any one tears them all down (`hideOverlaysForHostname`). `SHOW_POPUP` carries a `force` flag — `true` rebuilds with a fresh problem (initial fire); `false` is a catch-up for tabs that appear/reload after the fire and is ignored by `content.js` if an overlay is already up (so a half-typed answer isn't wiped).
- **Serialized state mutations**: every event/message handler that read-modify-writes `chrome.storage.session` runs through the `runExclusive` promise-chain lock in `background.js`, because those writes aren't atomic and handlers fire concurrently. Internal helpers (`checkThreshold`, `updateActiveTab`, …) must **not** lock themselves or they'd deadlock against the holding handler.
- **Message types** flowing between contexts: `SHOW_POPUP` (+`force`), `HIDE_OVERLAY`, `HIDE_ALL_OVERLAYS`, `DISMISS_POPUP`, `THRESHOLD_CHANGED`.
- **Naming**: the product is "Snap Out" / "snap-out" but log prefixes and some internals still say `TimeNudge` / `time-nudge` (overlay IDs, CSS classes). This is intentional legacy, not a bug to "fix" wholesale.

## Coding standards (from existing CLAUDE.md — keep)

- **Indentation: always 4 spaces**, no tabs, no 2-space. Applies to `.js`, `.css`, `.html`, `.json`. After editing any file, review indentation and fix anything that isn't 4-space before moving on.

## Development workflow

No formal process — this is a hobby project. The intended behavior of each part (the "what's this supposed to do" contract) and the development history live in `DEVELOPMENT_LOG.md`; check there before changing behavior, and jot a couple of lines there per change to keep it current.

> This project previously used the OpenSpec spec-driven workflow; it was removed mid-2026 as too heavy for a solo hobby project. `DEVELOPMENT_LOG.md` preserves the knowledge that lived in the specs and change archive.
