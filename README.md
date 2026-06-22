# snap-out

A Chrome extension that interrupts mindless scrolling and watching by forcing you to solve a math problem before you can continue.

You pick the sites. When you've been on one too long, a popup blocks the screen. Solve the math — then you're free.

---

## Why

Ever looked up and realized you've been scrolling for an hour without meaning to? snap-out is a pattern interrupt. It doesn't block sites or set strict limits — it just makes you *consciously* choose to stay.

---

## How it works

1. Add sites you want to watch (e.g. `www.youtube.com`, `www.reddit.com`)
2. After the time threshold is reached, a math challenge overlay appears
3. Solve it correctly to dismiss — wrong answer generates a new problem
4. Timer resets after dismissal

---

## Difficulty levels

| Level | Type | Example |
|---|---|---|
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
3. Pick your difficulty level from the dropdown
4. Browse normally — snap-out watches in the background
5. When the timer hits, solve the problem to dismiss

---

## Files

```
background.js     Service worker — tracks time, triggers popup
content.js        Injects the math challenge overlay
content.css       Overlay styles
storage.js        chrome.storage.sync helpers
popup/            Extension popup UI (site list + difficulty selector)
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
