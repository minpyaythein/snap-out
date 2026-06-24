# snap-out

<div align="center">

[![English](https://img.shields.io/badge/README-English-2563eb?style=for-the-badge)](README.md)
[![日本語](https://img.shields.io/badge/README-日本語-lightgrey?style=for-the-badge)](README.ja.md)

</div>

A Chrome extension that interrupts mindless scrolling and watching by forcing you to solve a math problem before you can continue.

You pick the sites. When you've been on one too long, a popup blocks the screen. Solve the math — then you're free.

---

## Why I built this

I kept catching myself doomscrolling — looking up an hour later with nothing to show for it.
I wanted something that would actually *interrupt* the habit, so I built it. I'd **never built a
browser extension before**, so this was a from-scratch learning project. Building it taught me:

- **Chrome Extension architecture (Manifest V3)** — how a service worker, content scripts, and
  the popup are three separate worlds that only talk through message passing.
- **A service worker as a timer engine** — tracking active-tab time with the `alarms` API and
  `tabs`/`windows` events, and keeping state across service-worker restarts.
- **Two kinds of storage** — `chrome.storage.sync` for persistent settings vs
  `chrome.storage.session` for runtime state, and why mixing them up bites you.
- **Injecting into live pages** — content scripts and the `chrome.scripting` fallback, plus the
  pages you're *not* allowed to touch (`chrome://`, the Web Store, `file://`).
- **Real concurrency** — serializing state writes with a lock because event handlers fire at the
  same time and storage writes aren't atomic (my first proper race-condition bug).
- **Multi-tab state sync** — one shared timer per site across all its tabs, and tearing the nudge
  down everywhere when it's solved on any one.
- **Rolling my own i18n** — `chrome.i18n` can't switch at runtime, so I built an EN/JA layer with
  a live language toggle.
- **Vanilla JS with some security hygiene** — no framework, no build step, and using `textContent`
  (not `innerHTML`) for anything derived from user input.

---

## Features

- **Per-site soft limits** — track up to 6 sites, each with your own time threshold (default 5 min, up to 30)
- **Escalating math difficulty** — 7 tiers from single-digit arithmetic all the way to logarithms, derivatives, integrals, and factorials
- **Alert-only mode** — set difficulty to *None* for a plain dismissible banner when you want a gentle nudge, not a puzzle
- **Multi-tab aware** — one timer per site across all its tabs; the nudge fires on every tab, and clearing it on one clears it everywhere
- **Reload-proof** — opening a new tab or refreshing the page won't sneak you past the nudge
- **Bilingual** — full English / 日本語 interface with an instant in-app language toggle
- **Live timer** — the popup shows your accumulated time on the current site in real time
- **Privacy-first** — everything lives in Chrome's local/synced storage; no servers, no accounts, no analytics

---

## Why

Ever looked up and realized you've been scrolling for an hour without meaning to? snap-out is a pattern interrupt. It doesn't block sites or set strict limits — it just makes you *consciously* choose to stay.

---

## How it works

1. Add up to **6** sites you want to watch (e.g. `www.youtube.com`, `www.reddit.com`)
2. Set how long you can stay before the alert fires (default 5 min, up to 30)
3. After the time threshold is reached, a math challenge overlay appears
4. Solve it correctly to dismiss — a quick *Nice work!* confirmation, then you're back. A wrong answer shakes and generates a new problem
5. Timer resets after dismissal

Prefer a gentler nudge? Set the difficulty to **None** and you'll get a plain dismissible banner instead of a math challenge — no solving required.

**Available in English and 日本語.** Pick your language from the popup — it switches the whole UI and the challenge overlay instantly. (The math itself is language-neutral, so only the wording changes.)

**Works across tabs.** Time on a site is counted across every tab of that site (two YouTube tabs share one timer). When the alert fires it appears on *all* of them, and solving it on any one tab clears it everywhere. Opening a new tab — or reloading the page — won't sneak you past it.

---

## Difficulty levels

| Level | Type | Example |
|---|---|---|
| None | No math — plain dismissible banner | _(just click Dismiss)_ |
| Easy | 2 values, +−×÷, 1–10 | `8 ÷ 2 = ?` |
| Medium | 2 values, +−×÷, 10–99 | `63 × 47 = ?` |
| **Hard** *(default)* | 2 values, +−×÷, 100–999 | `847 ÷ 7 = ?` |
| Very Hard | 3 values, +−×÷, 100–999 | `(4800 ÷ 20) − 153 = ?` |
| Super Hard | Single complex expression | `d/dx(x³) at x=4 = ?` |
| Impossible | Two complex expressions combined | `[log₂(32)] × [5!] = ?` |

Super Hard and Impossible include logarithms, derivatives, integrals, and factorials.

---

## Installation

> Chrome Web Store listing coming soon. For now, load it manually.

1. Clone or download this repo
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder
5. Pin the extension for easy access

---

## Usage

1. Click the snap-out icon in your toolbar
2. Add a hostname (e.g. `www.youtube.com`)
3. Set the alert duration (minutes + seconds) and click **Apply**
4. Pick your difficulty level from the dropdown (or **None** for an alert-only banner)
5. Choose your language (English / 日本語) — the UI and overlay update right away
6. Browse normally — snap-out watches in the background, and the popup shows your live time on the current site
7. When the timer hits, solve the problem to dismiss

---

## Files

```
background.js     Service worker — tracks time, triggers popup
content.js        Injects the math challenge overlay
content.css       Overlay styles
storage.js        chrome.storage.sync helpers
i18n.js           Shared EN/JA dictionary + lookup (popup + content script)
popup/            Extension popup UI (site list, alert duration, difficulty selector, language, live timer)
```

---

## Permissions

| Permission | Why |
|---|---|
| `tabs` | Detect which site is active |
| `storage` | Save tracked sites and difficulty setting |
| `alarms` | Check elapsed time every 30 seconds |
| `scripting` | Inject content script if needed |
| `host_permissions: <all_urls>` | Work on any site you choose to track |

---

## Built with

- Vanilla JS — no frameworks, no build step
- Chrome Extension Manifest V3
