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

### Requirement: Persist difficulty level setting
The extension SHALL store the selected difficulty level as a string in `chrome.storage.sync` under the key `difficultyLevel`. The value SHALL be one of: "easy", "medium", "hard", "very-hard", "super-hard", or "impossible".

#### Scenario: Difficulty level persists across sessions
- **WHEN** the user selects a difficulty level and the browser is restarted
- **THEN** the previously selected difficulty level SHALL be available from storage

#### Scenario: Default difficulty when absent
- **WHEN** no `difficultyLevel` value exists in storage
- **THEN** the extension SHALL treat the difficulty as "hard"
