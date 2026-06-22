## Why

People lose track of time on distracting websites (social media, news, video platforms) with no built-in mechanism to alert them. This extension gives users a passive nudge — a popup — when they've spent more than 5 minutes continuously on a site they themselves flagged as a time sink.

## What Changes

- New Chrome extension (Manifest V3) built from scratch
- Background service worker tracks active time per hostname
- Content script injects a popup overlay into the page at the time threshold
- Extension popup UI lets users manage their tracked site list
- Settings persisted in `chrome.storage.sync`

## Capabilities

### New Capabilities

- `site-tracker`: Tracks active time per hostname in the background; pauses on tab switch or window blur; resumes on focus
- `popup-overlay`: Content script that renders a dismissible popup overlay when the time threshold is reached
- `site-management`: Extension popup UI for adding and removing tracked websites
- `settings-storage`: Persists tracked site list and per-site thresholds using `chrome.storage.sync`

### Modified Capabilities

<!-- None — this is a greenfield build -->

## Impact

- New codebase: `manifest.json`, `background.js`, `content.js`, `content.css`, `popup/popup.html`, `popup/popup.js`, `popup/popup.css`
- Requires Chrome Extension permissions: `tabs`, `storage`, `alarms`, `scripting`
- No external dependencies — Vanilla JS only
- No backend — fully client-side
