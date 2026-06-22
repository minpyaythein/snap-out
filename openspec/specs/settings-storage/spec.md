## ADDED Requirements

### Requirement: Persist tracked sites across sessions
The extension SHALL store the tracked site list in `chrome.storage.sync` so settings are preserved across browser restarts and synced across devices.

#### Scenario: Settings survive browser restart
- **WHEN** the browser is restarted
- **THEN** the previously saved `trackedSites` list SHALL be available to both the popup UI and the service worker

### Requirement: Default threshold of 300 seconds
Each tracked site SHALL use the value stored under `defaultThreshold` in `chrome.storage.sync` as the alert threshold. If no `defaultThreshold` is configured, the fallback SHALL be 300 seconds (5 minutes). Per-site overrides in the `thresholds` map take precedence over `defaultThreshold` when present.

#### Scenario: Default threshold applied when no per-site override
- **WHEN** a hostname is added to `trackedSites` without an explicit per-site threshold
- **AND** `defaultThreshold` is not set in storage
- **THEN** the service worker SHALL use 300 seconds as the threshold for that hostname

#### Scenario: Stored defaultThreshold used as fallback
- **WHEN** a hostname has no entry in the `thresholds` map
- **AND** `defaultThreshold` is set in storage
- **THEN** the service worker SHALL use `defaultThreshold` as the threshold for that hostname

#### Scenario: Per-site override takes precedence
- **WHEN** a hostname has an explicit threshold value stored in `thresholds`
- **THEN** the service worker SHALL use that per-site value instead of `defaultThreshold`

### Requirement: Persist difficulty level setting
The extension SHALL store the selected difficulty level as a string in `chrome.storage.sync` under the key `difficultyLevel`. The value SHALL be one of: "easy", "medium", "hard", "very-hard", "super-hard", or "impossible".

#### Scenario: Difficulty level persists across sessions
- **WHEN** the user selects a difficulty level and the browser is restarted
- **THEN** the previously selected difficulty level SHALL be available from storage

#### Scenario: Default difficulty when absent
- **WHEN** no `difficultyLevel` value exists in storage
- **THEN** the extension SHALL treat the difficulty as "hard"
