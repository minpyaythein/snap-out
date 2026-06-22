## 1. Project Setup

- [x] 1.1 Create `manifest.json` with MV3 config, required permissions (`tabs`, `storage`, `alarms`, `scripting`), and content script registration
- [x] 1.2 Create `icons/` directory and add a placeholder icon

## 2. Settings Storage

- [x] 2.1 Define the storage schema (`trackedSites`, `thresholds`) in a shared `storage.js` helper with get/set wrappers around `chrome.storage.sync`
- [x] 2.2 Initialize default storage values on extension install via `chrome.runtime.onInstalled`

## 3. Background Service Worker (Site Tracker)

- [x] 3.1 Create `background.js` and set up `chrome.alarms.create` for a recurring 1-second tick
- [x] 3.2 Track current active hostname and elapsed seconds in `chrome.storage.session`
- [x] 3.3 Listen to `chrome.tabs.onActivated` and `chrome.windows.onFocusChanged` to pause/resume the timer on tab switch and window blur/focus
- [x] 3.4 On each alarm tick, increment elapsed time for the active hostname (only if window is focused and tab is on a tracked site)
- [x] 3.5 When elapsed time reaches the threshold, send a `SHOW_POPUP` message to the active tab via `chrome.tabs.sendMessage`
- [x] 3.6 Listen for `DISMISS_POPUP` message from content script and reset elapsed time for that hostname to 0

## 4. Popup Overlay (Content Script)

- [x] 4.1 Create `content.js` — listen for `SHOW_POPUP` message from the service worker
- [x] 4.2 On `SHOW_POPUP`, inject a fixed overlay div into the page DOM (only if one doesn't already exist)
- [x] 4.3 Create `content.css` — style the overlay as a centered modal on top of page content
- [x] 4.4 Add a dismiss button to the overlay; on click, remove the overlay from the DOM and send `DISMISS_POPUP` to the service worker

## 5. Extension Popup UI (Site Management)

- [x] 5.1 Create `popup/popup.html` with an input field, add button, and a list container for tracked sites
- [x] 5.2 Create `popup/popup.js` — on load, read `trackedSites` from storage and render the list
- [x] 5.3 Implement add site: validate input is non-empty and not a duplicate, save to storage, update the UI list
- [x] 5.4 Implement remove site: on remove button click, delete hostname from storage and remove it from the UI list
- [x] 5.5 Create `popup/popup.css` — basic styles for the settings UI

## 6. Integration & Verification

- [x] 6.1 Load the unpacked extension in Chrome and verify the popup UI opens and site list renders
- [x] 6.2 Add a test site, visit it, and confirm the timer triggers the overlay after the threshold
- [x] 6.3 Confirm dismiss resets the timer (revisiting the site starts the count from 0)
- [x] 6.4 Confirm switching tabs pauses the timer and returning resumes it
- [x] 6.5 Confirm settings persist after closing and reopening the browser
<!-- Manual verification — to be done by user in Chrome -->
