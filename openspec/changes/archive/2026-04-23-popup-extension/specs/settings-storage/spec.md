## ADDED Requirements

### Requirement: Persist tracked sites across sessions
The extension SHALL store the tracked site list in `chrome.storage.sync` so settings are preserved across browser restarts and synced across devices.

#### Scenario: Settings survive browser restart
- **WHEN** the browser is restarted
- **THEN** the previously saved `trackedSites` list SHALL be available to both the popup UI and the service worker

### Requirement: Default threshold of 300 seconds
Each tracked site SHALL have a time threshold stored in `chrome.storage.sync`. If no threshold is configured for a site, the default SHALL be 300 seconds (5 minutes).

#### Scenario: Default threshold applied
- **WHEN** a hostname is added to `trackedSites` without an explicit threshold
- **THEN** the service worker SHALL use 300 seconds as the threshold for that hostname

#### Scenario: Custom threshold respected
- **WHEN** a hostname has an explicit threshold value stored in `thresholds`
- **THEN** the service worker SHALL use that value instead of the default
