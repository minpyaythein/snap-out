# Popup Extension — Time-Based Website Alert

## Overview

A browser extension that monitors how long you spend on specific websites and shows a popup alert when you've been on one for too long.

## Core Feature

- User defines a list of tracked websites (e.g. `twitter.com`, `youtube.com`)
- If the user stays on any tracked site for more than 5 minutes continuously, a popup appears
- The popup reminds the user they've been on the site and gives them the option to dismiss or leave

## User Flow

1. User installs the extension
2. User opens the extension settings and adds websites to track
3. User visits a tracked website
4. Timer starts counting from when the page becomes active
5. At the 5-minute mark, a popup/overlay appears in the browser
6. User dismisses the popup (timer resets) or navigates away

## Features

### MVP
- Add / remove websites from a tracked list
- Per-site timer that counts active time on tab
- Popup notification at the 5-minute threshold
- Dismiss button resets the timer for that session

### Nice to Have (post-MVP)
- Configurable time threshold per site (not just 5 min)
- Daily usage stats per site
- Pause/resume tracking toggle
- Custom popup message per site
- Sound alert option

## Tech Stack

- **Platform**: Chrome Extension (Manifest V3)
- **Languages**: HTML, CSS, Vanilla JavaScript (no framework needed for MVP)
- **Storage**: `chrome.storage.sync` for user settings (tracked sites, thresholds)
- **Key APIs**:
  - `chrome.tabs` — detect active tab and URL changes
  - `chrome.alarms` — reliable timer even when tab is backgrounded
  - `chrome.storage` — persist user settings
  - Content script — inject the popup overlay into the page

## Extension Structure

```
popup-extension/
├── manifest.json           # Extension config (MV3)
├── background.js           # Service worker — timer logic, tab tracking
├── content.js              # Injected into pages — renders the popup overlay
├── content.css             # Styles for the popup overlay
├── popup/
│   ├── popup.html          # Extension icon click → settings UI
│   ├── popup.js            # Add/remove tracked sites
│   └── popup.css
└── icons/
    └── icon.png
```

## Timer Logic

- Timer runs in `background.js` (service worker)
- Tracks `{ hostname: elapsedSeconds }` in memory
- On tab switch or window blur → pause timer for previous site
- On tab focus → resume or start timer for current site
- When elapsed >= threshold (300s default) → send message to content script to show popup
- On popup dismiss → reset elapsed for that hostname

## Data Model

```js
// chrome.storage.sync
{
  trackedSites: ["twitter.com", "youtube.com", "reddit.com"],
  thresholds: {
    "twitter.com": 300,   // seconds (default 300 = 5 min)
  }
}
```
