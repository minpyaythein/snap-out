# Development Log

A narrative of how **snap-out** was built, reconstructed from the git history and the OpenSpec change archive (`openspec/changes/archive/`). Use this to catch up on *why* the code is shaped the way it is — for the *how it works today*, see `CLAUDE.md`.

> **Note on dates**: OpenSpec change folders carry the date each change was *designed*; git commits carry the date code *landed*. The first commit bundles three already-archived changes, so the OpenSpec dates are the finer-grained timeline.

---

## Timeline at a glance

| Date | Change | Lands in commit |
|---|---|---|
| 2026-04-23 | `popup-extension` — greenfield MV3 build | `d8c4944` |
| 2026-04-23 | `math-challenge-dismiss` — replace dismiss button with math gate | `d8c4944` |
| 2026-04-26 | `math-difficulty-levels` — selectable difficulty tiers | `d8c4944` |
| 2026-04-26 | **first commit** — all of the above committed together | `d8c4944` |
| 2026-05-14 | `configurable-duration` — user-set threshold | `5db5bb9` |
| 2026-05-14 | `add-duration-apply-button` — explicit Apply instead of auto-save | `5db5bb9` |
| 2026-05-14 | "no math option" + calculus tiers (not separately archived) | `5db5bb9` |
| 2026-05-14 | bug fixes — "not working properly after 2nd time" | `5df8865` |

---

## Phase 1 — Greenfield extension (`popup-extension`)

**Goal:** a passive nudge when you've spent too long on a self-flagged time-sink site.

This established the entire skeleton and the architecture that still holds:

- **Manifest V3**, vanilla JS, no build step. Permissions: `tabs`, `storage`, `alarms`, `scripting`.
- **`background.js`** service worker as the timer engine — tracks active hostname + elapsed seconds, pauses on tab switch / window blur, resumes on focus.
- **`content.js` / `content.css`** — injects a centered modal overlay when the threshold is hit.
- **`popup/`** — settings UI to add/remove tracked sites.
- **`storage.js`** — shared `chrome.storage.sync` wrappers (`trackedSites`, `thresholds`).
- Message contract born here: `SHOW_POPUP` (SW → content), `DISMISS_POPUP` (content → SW, resets the timer).

At this point dismissing was a **single button click**. Threshold default was 5 minutes.

## Phase 2 — Friction: the math gate (`math-challenge-dismiss`)

**Goal:** make dismissal a conscious act instead of reflex.

- Replaced the dismiss button with a **math challenge**: `generateProblem()` returns `{ question, answer }`.
- Correct answer → remove overlay + send `DISMISS_POPUP`. Wrong answer → error message, clear input, regenerate.
- Originally fixed difficulty: addition/subtraction 1–50, multiplication 2–12, subtraction forced non-negative.
- This is the moment the product identity shifted from "reminder" to "interrupt."

## Phase 3 — Difficulty tiers (`math-difficulty-levels`)

**Goal:** let users tune the friction.

- Introduced `DIFFICULTY_CONFIG` in `content.js` and a `difficultyLevel` setting in storage (default `"hard"`).
- Difficulty now travels SW → content **inside the `SHOW_POPUP` message** (so the SW reads the setting, content just renders).
- Added a dropdown to the popup UI; new `getDifficulty()` / `saveDifficulty()` helpers.
- The archived spec described five tiers (easy/medium/hard/very-hard/impossible). **The code has since grown to six** — `super-hard` and `impossible` now generate calculus-flavored expressions (logarithms, derivatives, integrals, factorials) via `generateComplexExpr()`, and `impossible` combines two of them (`double-complex`). This growth wasn't separately archived as its own OpenSpec change; it rode along with later work.

## Phase 4 — Configurable duration (`configurable-duration` + `add-duration-apply-button`)

**Goal:** stop hardcoding the threshold.

Two linked changes on the same day:

1. **`configurable-duration`** — added a minutes+seconds input (capped at 30 min, floor 10s) persisted as a single `defaultThreshold` (seconds) in `chrome.storage.sync`. `getThreshold()` resolution order became: per-site `thresholds[hostname]` → global `defaultThreshold` → hardcoded `DEFAULT_THRESHOLD` (300s). `background.js` needed no change since it already went through `getThreshold()`.
2. **`add-duration-apply-button`** — the initial version auto-saved on every `change` event (threshold shifting mid-edit). Replaced with an explicit **Apply** button that saves only on click, with a brief `✓` confirmation.

Also landed in this commit (commit message "add timer settings and **no math option**"):

- **`none` difficulty** → shows a plain dismissible **banner** (`showBanner()`) instead of a math challenge, for users who want a gentle nudge without the puzzle.

## Phase 5 — Stability fixes (`5df8865`, "fix bugs of not working properly after 2nd time")

**Goal:** make repeat triggers reliable — the popup worked the *first* time but broke on every cycle after. The diff (`background.js`, `content.js`, `content.css`, `popup/popup.js`, `popup/popup.html`, `storage.js`) reveals four distinct root causes, all flavors of "stale state never gets reset, and keys don't line up."

**Root cause 1 — hostname normalization mismatch (the big one).** `storage.js` stored tracked sites without `www.`, but `background.js` and `popup.js` compared against raw `new URL(tab.url).hostname` (*with* `www.`). So `www.youtube.com` would be tracked as `youtube.com` yet checked as `www.youtube.com` → the elapsed counter and `popupShown` flag were keyed differently than the tracked entry, so thresholds silently never matched on subsequent visits. Fix: `normalizeHostname()` was hoisted into shared `storage.js`, `getSettings()` now de-dupes+normalizes `trackedSites`, and every URL parse in `background.js` and `popup.js` runs through it.

**Root cause 2 — overlays that refused to re-show.** `showPopup()` / `showBanner()` opened with `if (document.getElementById(OVERLAY_ID)) return;` — a hard bail. A leftover overlay node (or a re-trigger) meant the function exited and nothing appeared. Changed to `document.getElementById(OVERLAY_ID)?.remove()` so it always tears down and rebuilds.

**Root cause 3 — the timer never re-armed.** `DISMISS_POPUP` used to fire-and-forget `setSessionState(...)` and stop. After the reset there was nothing to schedule the *next* threshold check, so the popup never came back. Fix: the handler is now `async`, awaits the reset, then calls `checkThreshold('dismiss-reset')` to re-arm. A new **`RESET_TIMER`** message (popup → SW) does the same after a duration change. Stale schedules are now cleared too: `pendingTimeouts[hostname]` is `clearTimeout`'d on dismiss/reset, and the `<30s` path uses an in-memory `setTimeout` while `≥30s` keeps the one-shot alarm.

**Root cause 4 — duplicate message listeners on re-injection.** The injection fallback re-runs `content.js`, which re-registered the `onMessage` listener every time → duplicate handlers firing. Wrapped in a `window.__snapOutListener` once-guard, and the listener now calls `sendResponse({ ok: true })` so the service worker's `sendMessage` callback resolves cleanly (this is what the injection-fallback uses to detect whether a content script is even present).

**Supporting changes that fell out of the above:**

- **Popup actions now reset counters.** Removing a site, adding a site, and changing the duration each clear that hostname from **both** `elapsed` and `popupShown` in `chrome.storage.session`, push a fresh `lastActiveTime`, and (for remove/duration) send `HIDE_OVERLAY` to tear down any visible overlay. Without this, re-adding a site or retuning the duration inherited stale state and "didn't work the 2nd time."
- **New `HIDE_OVERLAY` message** (popup → content) to dismiss an on-screen overlay when its site is removed or the duration is retuned.
- **CSS specificity split** — `#time-nudge-overlay` → `#time-nudge-overlay.time-nudge-popup`, so the full-screen fixed-modal styling only applies to the math popup; the `none`-mode banner (which lacks that class) keeps its lightweight look.
- **`updateSessionTimer()` hardening** — bails and hides the live timer cleanly for non-trackable / non-URL tabs instead of throwing.

---

## How the shape evolved

```
v1  add site → timer → overlay → click Dismiss
v2  add site → timer → overlay → solve math → Dismiss
v3  add site → timer → overlay → solve math (easy…impossible) → Dismiss
v4  add site + set duration (Apply) → timer → overlay (math OR plain banner) → Dismiss
v5  …all of the above, reliable across repeated triggers (popupShown gate, dual scheduling, injection fallback)
```

## Naming archaeology

The product is **Snap Out / snap-out**, but earlier internals were named **TimeNudge**. That legacy survives in log prefixes (`[TimeNudge]`), the overlay element id (`time-nudge-overlay`), and CSS classes (`.time-nudge-*`). It's intentional history, not a rename to chase.

---

## Behavior reference — what each part is *supposed* to do

> Distilled from the OpenSpec `specs/` (the "intended behavior" source of truth) so this knowledge survives independently of the spec tooling. This is the contract the code is meant to satisfy; where the as-built code diverges, that's flagged.

### Site tracking (`background.js`)
- Time accrues for a hostname **only while its tab is active AND the window is focused**. Switching tabs or blurring the window pauses it; returning resumes the *existing* elapsed total (it doesn't restart).
- When elapsed ≥ threshold, send `SHOW_POPUP` to the active tab.
- On `DISMISS_POPUP`, reset that hostname's elapsed to 0.

### Threshold / duration (`storage.js`, popup)
- Resolution order: per-site `thresholds[hostname]` → global `defaultThreshold` → hardcoded `300s` fallback.
- Duration UI = minutes (0–30) + seconds (0–59), saved as `defaultThreshold` (total seconds) in `chrome.storage.sync`.
- **Clamps:** max 1800s (if minutes = 30, seconds forced to 0); min 10s (0/0 becomes 10).
- Saved **only on Apply click**, never on input `change`. (Difficulty, by contrast, saves immediately on dropdown change — intentional asymmetry.)
- On popup open with no stored value, inputs show **5m 0s**.

### Math challenge (`content.js`)
- Generated fresh each time the overlay shows, per the active difficulty.
- **Subtraction is always non-negative** (operands swapped if needed).
- **Division always yields a whole number** (dividend = divisor × integer quotient — no remainders).
- Validation is **numeric** (parseInt + trim), not string compare.
- Submit via **Check button or Enter key**. Correct → remove overlay + `DISMISS_POPUP`. Wrong → brief error, clear input, regenerate.

### Difficulty levels (`DIFFICULTY_CONFIG`)
- **easy** — 2 operands, +−×÷, 1–10
- **medium** — 2 operands, +−×÷, 10–99
- **hard** *(default)* — 2 operands, +−×÷, 100–999
- **very-hard** — 3 operands, +−×÷, 100–999, with compound patterns like `(a÷b)+c`, `a×b−c`
- **super-hard** — one complex expression: log (base 2/3/5/10), derivative (d/dx of xⁿ at x=k), definite integral (∫ from 0 to k), or factorial (n!, n=5–7)
- **impossible** — two super-hard expressions combined with +, −, or ×
- `none` (as-built, not in the original spec) — shows a plain dismissible banner instead of a math challenge
- Stored under `difficultyLevel` in `chrome.storage.sync`; defaults to `"hard"` when absent.

### Popup overlay (`content.js` + `content.css`)
- Injected on `SHOW_POPUP`; positioned fixed so it overlays without shifting page content.
- **Only one overlay exists at a time.** *Spec intent* was "if one already exists, don't inject another." *As-built since `5df8865`* it instead removes any existing overlay and rebuilds — same single-overlay guarantee, but it replaces rather than skips (this was deliberate, to fix the "won't re-show" bug).

### Site management (popup)
- Add a hostname (protocol + `www.` stripped, lowercased); duplicates rejected with a message.
- Remove deletes from `trackedSites` and clears that hostname's runtime state.
- List renders all tracked hostnames on open.

### Settings storage (`chrome.storage.sync`)
- Persistent keys: `trackedSites`, `thresholds`, `difficultyLevel`, `defaultThreshold`. Synced across devices, survive restart.
- (Runtime-only state — `elapsed`, `popupShown`, `activeHostname`, etc. — lives in `chrome.storage.session`, not here.)

---

## Process note (historical)

Through `5df8865`, development followed the **OpenSpec** workflow (`OPENSPEC_WORKFLOW.md`): each feature was proposed → applied → verified → archived under `openspec/changes/archive/<date>-<name>/`. That archive is the primary source for this log's history, and the `openspec/specs/` were the source for the Behavior Reference above.

**As of mid-2026 the project is dropping OpenSpec** — the planning ceremony was too heavy for a solo hobby project. The knowledge worth keeping (the development arc + intended behavior) now lives in *this file* instead. Going forward, jot a couple of lines here per change rather than running the full propose/verify/archive cycle.
