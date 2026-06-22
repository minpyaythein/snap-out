## Context

This is a greenfield Chrome Extension (Manifest V3) with no existing codebase. The extension monitors active browsing time on user-defined hostnames and displays a popup overlay when the threshold is exceeded. It runs entirely client-side with no backend or external dependencies.

## Goals / Non-Goals

**Goals:**
- Reliable per-hostname timer that only counts active, focused time
- Dismissible popup overlay injected via content script
- Simple settings UI to manage tracked sites
- Persistent settings via `chrome.storage.sync`

**Non-Goals:**
- Cross-browser support (Firefox, Safari) — Chrome only for MVP
- Backend sync or analytics
- Configurable threshold per site in the UI (stored in data model but not exposed in MVP UI)
- Any form of blocking or redirecting the user

## Decisions

### Decision 1: Use `chrome.alarms` for the timer, not `setInterval`

Service workers in MV3 are ephemeral — they spin down after ~30 seconds of inactivity. `setInterval` inside a service worker will stop firing when it goes idle. `chrome.alarms` persists across service worker restarts and is the recommended MV3 approach for periodic work.

**Alternatives considered:** `setInterval` — unreliable in MV3 service workers due to lifecycle termination.

### Decision 2: Track elapsed time in `chrome.storage.session` (in-memory per session)

Elapsed timer state (`{ hostname: elapsedSeconds }`) is session-specific and does not need to survive browser restarts. `chrome.storage.session` is fast, scoped to the browser session, and survives service worker restarts within the same session — unlike plain in-memory variables which are lost when the service worker terminates.

**Alternatives considered:** Plain in-memory object — lost on service worker termination. `chrome.storage.sync` — unnecessary persistence and sync overhead for ephemeral state.

### Decision 3: Content script for popup overlay, not `chrome.notifications`

`chrome.notifications` shows a system-level OS notification outside the browser. A content script overlay appears inside the page, is harder to ignore, and gives full styling control. Since the goal is a "nudge" within the browsing context, an in-page overlay is more appropriate.

**Alternatives considered:** `chrome.notifications` — dismissed too easily, outside browsing context.

### Decision 4: Vanilla JS, no framework

The extension is small (4–5 files). A framework (React, Vue) adds build tooling overhead with no meaningful benefit at this scale. Plain HTML/CSS/JS keeps the project simple and loadable directly by Chrome without a build step.

## Risks / Trade-offs

- **Service worker termination resets in-memory state** → Mitigated by using `chrome.storage.session` for elapsed time
- **`chrome.alarms` minimum interval is 1 minute in some contexts** → Use a 1-second alarm or track time via `Date.now()` delta on wake-up to maintain accuracy
- **Content script injection timing** → The content script must be already injected before the alarm fires; handle via `scripting.executeScript` fallback if needed
- **Tab/window focus detection edge cases** → Use both `chrome.tabs.onActivated` and `chrome.windows.onFocusChanged` to cover all switching scenarios

## Open Questions

- Should the popup overlay block interaction with the page (modal) or just sit in a corner (toast)? → Defaulting to a centered modal-style overlay for MVP; can be made a toast later.
