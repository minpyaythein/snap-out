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

## Phase 6 — Code-review hardening (2026-06-22)

A review pass focused on the timer engine. No behavior contract changed; these tighten correctness and robustness:

- **Serialized session-state mutations.** All event handlers (periodic alarm, `tabs.onActivated`/`onUpdated`, `windows.onFocusChanged`, the one-shot threshold alarm, the short-threshold `setTimeout`, and the `RESET_TIMER`/`DISMISS_POPUP` messages) now run through a single-promise lock (`runExclusive`). They each read-modify-write `chrome.storage.session`, which isn't atomic — concurrent handlers could clobber each other (lost elapsed seconds, a `popupShown` flag that never stuck). Internal helpers (`checkThreshold`, `updateActiveTab`, …) deliberately do **not** lock, so they can be called from within an already-held lock without deadlocking.
- **Fixed slow timer drift.** `flushElapsed` used to reset `lastActiveTime` to `now`, discarding the sub-second remainder on every flush; with flushes firing on each event the dropped fractions accumulated and the timer under-counted. It now advances `lastActiveTime` by exactly `delta * 1000`, carrying the remainder forward.
- **Same-domain tab switches no longer drop time.** `updateActiveTab` used to flush only when the hostname *changed*, but reset `lastActiveTime` unconditionally — so switching between two tabs of the same domain discarded the un-flushed seconds each time. It now flushes on every call (attributed to the old `activeHostname`) before moving `lastActiveTime`. Time is tracked per-hostname, so multiple tabs of one domain correctly share a single counter.
- **Stale-schedule cleanup.** Leaving a site now clears its `pendingTimeouts` entry and one-shot `threshold-trigger-*` alarm, so they don't fire stray wakeups later.
- **`tab.id` guard** before `sendPopupMessage` (skip tabs with no id instead of throwing).
- **content.js**: hostname / problem text now set via `textContent` instead of being interpolated into `innerHTML` (defensive, cleaner), and the math input auto-focuses when the overlay appears.
- **popup.js**: the live session timer only adds un-flushed time when the popup's site is the one actually being tracked right now (active tab + focused window); otherwise it's paused.

## Phase 7 — Multi-tab overlays (2026-06-22)

The nudge now spans every open tab of a hostname instead of only the tab that happened to be active when the threshold hit.

- **Broadcast on fire.** `checkThreshold` resolves all tabs of the hostname (`getTabsForHostname`, across every window) and sends `SHOW_POPUP` to each.
- **Dismiss-on-one = dismiss-on-all.** Solving the challenge on any tab resets the timer *and* tears down the overlay on every other tab of that hostname (`hideOverlaysForHostname`, invoked from the `DISMISS_POPUP` handler). Same teardown runs on duration change (`RESET_TIMER`) and site removal (new `HIDE_ALL_OVERLAYS` message the popup sends).
- **Catch-up for late tabs + reload-escape fix.** `SHOW_POPUP` now carries a `force` flag. The fire path uses `force: true` (rebuild + fresh problem). A new `checkThreshold` branch — when the threshold is already met and `popupShown` is set — pushes `SHOW_POPUP` with `force: false` to the active tab, so a tab opened/navigated/**reloaded** into the site after the broadcast still gets the overlay. `content.js` ignores a `force: false` message when an overlay is already present, so it never wipes a half-typed answer or regenerates the problem on the 30s tick. This also closes the old "reload the page to escape the nudge" gap.

Time is still tracked per-hostname (one shared counter), so multiple tabs of one site don't double-count.

## Phase 8 — Apply no longer resets the timer (2026-06-22)

Previously clicking **Apply** on the duration setting wiped the active site's elapsed counter. Two problems: it was an escape hatch (re-apply → fresh countdown, bypassing the whole interrupt), and it was inconsistent — the duration is *global* but the reset only touched the active tab's site.

New model: the threshold is "nudge me once I've been here this long," elapsed is real time spent, and changing the threshold doesn't erase reality.

- `RESET_TIMER` renamed to **`THRESHOLD_CHANGED`**. The popup just persists the new `defaultThreshold` and sends the message; it no longer deletes `elapsed`/`popupShown`.
- The handler drops the stale schedule, flushes, then compares accumulated time to the *new* threshold via `checkThreshold`. Already over → nudge fires immediately. Raised the limit back above your current time while a nudge was showing → it clears the overlay + `popupShown` and keeps counting (this clear-on-raise is the one thing `checkThreshold` can't do itself, since it only ever sets `popupShown`).
- Only the active site is re-evaluated; backgrounded tracked sites re-evaluate naturally on `tabs.onActivated`/`onUpdated` when you return to them.

## Phase 9 — Duration input validation (2026-06-22)

The duration fields previously only clamped *minutes* (≥30 → 30), on Apply. Seconds were never capped — typing `90` in the seconds box gave a 90-second component — and `type="number"` let you enter `e`/`.`/`-`. Now:

- **Live in `popup.js`:** a `beforeinput` guard rejects any non-digit insertion (typing or mixed paste), and an `input` handler clamps minutes to 0–30 and seconds to 0–59, with seconds forced to 0 once minutes hits 30 (the 30:00 overall cap).
- **On Apply:** `saveDuration` computes the total and clamps it to `[MIN_DURATION 10s, MAX_DURATION 1800s]`, then reflects the normalized value back into both fields. Belt-and-suspenders over the live clamps.

## Phase 10 — Session-timer freeze fix + empty states (2026-06-22)

**Bug:** removing a tracked site left the popup's countdown + hostname frozen on screen. Root cause was CSS, not JS: `.hidden { display: none }` and `.session-timer { display: flex }` have equal specificity, and `.session-timer` is defined *later* in `popup.css`, so it won out — `classList.add('hidden')` never actually hid the bar. Fixed `.hidden` with `!important`.

**Also:** the timer used to vanish whenever you weren't on a tracked site. Now `updateSessionTimer` always renders a meaningful state — the live countdown on a tracked site, or a muted, centered placeholder otherwise: `No active timer` (non-web tab), `Not tracking this site` (untracked site, others exist), or `No sites tracked yet` (nothing tracked at all). The placeholder uses a new `.session-timer.placeholder` style.

## Phase 11 — Add-site validation (2026-06-22)

The add box used to accept anything after stripping protocol/path — typing `hello` happily tracked a bogus "site." Now `popup.js`:

- Extracts the hostname via the `URL` parser (handles protocol, path, port, query, and non-ASCII → punycode) instead of regex string-stripping.
- Validates it with `isValidHostname` — dot-separated labels ending in a 2+ char alphabetic TLD — so bare words (`hello`, `youtube`), malformed input (`-bad.com`, `site.c`), IPs, and `localhost` are rejected with **"Enter a valid site, e.g. youtube.com"**.

Trade-off noted: IP addresses and `localhost` are intentionally rejected (not the target use case for a distraction tracker).

## Phase 12 — Visual refresh: polished light + glass (2026-06-22)

Cosmetic only, no behavior change. Both surfaces got a "fancier" pass with rounder corners:

- **Overlay (`content.css`):** frosted-glass backdrop (`backdrop-filter: blur`), card with 24px radius + a gradient accent tab and layered shadow, fade + pop-in animations, gradient indigo→violet problem text and buttons. The math input now shakes with a red ring on a wrong answer (new `.time-nudge-wrong` class toggled from `content.js`). Banner gets a gradient + slide-down.
- **Check button gating:** the Check button starts `disabled` and is only enabled while the input has a value (`updateCheckState` on `input`, re-disabled after a wrong answer clears the field); `validate()` also no-ops on empty input. Styled `:disabled` grey + `not-allowed`.
- **Popup (`popup.css`):** gradient title text, 12–14px rounded inputs/cards/buttons, focus glow rings, gradient buttons with hover-lift, soft shadows on the site cards, a gradient-tinted session timer, and a subtle container fade-in. File normalized to 4-space indentation while rewriting.

Palette unchanged at heart: `#6366f1 → #8b5cf6` indigo/violet.

## Phase 13 — Add/remove no longer resets the active site's timer (2026-06-22)

**Bug:** adding or removing *another* (non-active) site reset the timer of the site you were currently on — visibly to zero if it hadn't hit a 30s background flush yet.

**Cause:** the popup's add/remove handlers wrote `chrome.storage.session` directly with `lastActiveTime: Date.now()`. `lastActiveTime` is a *single shared* value (the active site's flush boundary), so resetting it discarded the active site's un-flushed live time. If `elapsed[activeSite]` wasn't populated yet (first 30s), the displayed timer — which was coming entirely from `now − lastActiveTime` — dropped to 0. The direct writes also bypassed the background's `runExclusive` lock.

**Fix:** new **`RESET_SITE`** message. The popup now calls `addSite`/`removeSite` then sends `RESET_SITE`; the background (under the lock) flushes the active site first, deletes only the target site's `elapsed`/`popupShown`, clears its schedule, hides its overlays, and **only** resets `lastActiveTime` when the target *is* the active site. The popup no longer writes runtime session state at all. The now-unused `HIDE_ALL_OVERLAYS` message was removed (`RESET_SITE` hides overlays itself).

## Phase 14 — Cap tracked sites at 6 (2026-06-22)

Added `MAX_SITES = 6` in `popup.js`. The add handler rejects a new site once 6 are tracked with **"You can track up to 6 sites. Remove one to add another."** (message derives from the constant). Checked *after* the duplicate check, so re-submitting an already-tracked site still gets the "already tracked" message rather than the cap message. Keeps the list intentional and stays well under Chrome's ~8 KB per-item `chrome.storage.sync` quota for the `trackedSites` array.

## Phase 15 — Success message after solving (2026-06-22)

A correct answer used to remove the overlay instantly. Now `content.js` swaps the card to a success state — an animated gradient checkmark, "Nice work!", and "Back to it — make these minutes count. 🌿" (reusing the existing pop-in/fade-in keyframes) — holds it ~1.5s, then removes the overlay and sends `DISMISS_POPUP` (which resets the timer and clears overlays on the other tabs). Applies to the math popup only; the `none`-mode banner still dismisses immediately.

## Phase 16 — Graceful injection fallback (2026-06-22)

The content-script injection fallback in `sendPopupMessage` logged a scary `console.error` ("Cannot access contents of the page…") when it tried to inject into a non-scriptable page — `chrome://`, the Web Store, the new-tab page, or an **error page** (a tracked tab showing "site can't be reached" still reports its normal URL). Surfaced when switching between two timed-up tabs (catch-up injection). Now `sendPopupMessage` takes the whole `tab` object, skips injection entirely for non-`http(s)` URLs (`canInjectInto`), and downgrades the residual failures (error pages / Web Store, which look like https) to a soft `console.warn`. Purely cosmetic/log hygiene — the fallback was already caught and nothing broke.

## Phase 17 — Survive "Extension context invalidated" (2026-06-22)

When the extension reloads/updates while a page stays open, its already-injected content script is orphaned — `chrome.runtime` is dead and any call throws "Extension context invalidated." This surfaced as an uncaught error from the success-path `setTimeout` calling `chrome.runtime.sendMessage` (DISMISS_POPUP) 2s after a solve. Added a `safeSendMessage()` wrapper in `content.js` (try/catch) and routed both DISMISS_POPUP sends (success path + `none`-banner dismiss) through it. Can happen in production on auto-update, not just dev reloads.

Note: the `window.__snapOutListener` once-guard still means an orphaned tab won't get a *working* overlay from the new background until the page is reloaded (the stale guard blocks the freshly-injected script from re-registering) — consistent with the documented "reload the page after reloading the extension" caveat.

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
