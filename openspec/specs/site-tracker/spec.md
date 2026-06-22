## ADDED Requirements

### Requirement: Track active time per hostname
The background service worker SHALL track how many continuous seconds the user has spent on each tracked hostname. Time SHALL only increment while the tab is active and the browser window is focused.

#### Scenario: Timer starts on navigation to tracked site
- **WHEN** the user navigates to a tab whose hostname is in the tracked list
- **THEN** the service worker SHALL start or resume a timer for that hostname

#### Scenario: Timer pauses on tab switch
- **WHEN** the user switches to a different tab
- **THEN** the service worker SHALL pause the timer for the previously active hostname

#### Scenario: Timer pauses on window blur
- **WHEN** the browser window loses focus
- **THEN** the service worker SHALL pause the timer for the currently active hostname

#### Scenario: Timer resumes on tab focus
- **WHEN** the user returns to a tab whose hostname is in the tracked list
- **THEN** the service worker SHALL resume the existing elapsed time for that hostname

### Requirement: Trigger popup at threshold
The service worker SHALL send a message to the content script when the elapsed time for a hostname reaches or exceeds the configured threshold (default 300 seconds).

#### Scenario: Threshold reached
- **WHEN** the elapsed seconds for a hostname equals the threshold value
- **THEN** the service worker SHALL send a `SHOW_POPUP` message to the active tab's content script

#### Scenario: Timer resets after popup dismiss
- **WHEN** the content script sends a `DISMISS_POPUP` message
- **THEN** the service worker SHALL reset the elapsed time for that hostname to 0
