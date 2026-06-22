## ADDED Requirements

### Requirement: Persist difficulty level setting
The extension SHALL store the selected difficulty level as a string in `chrome.storage.sync` under the key `difficultyLevel`. The value SHALL be one of: "easy", "medium", "hard", "very-hard", "super-hard", or "impossible".

#### Scenario: Difficulty level persists across sessions
- **WHEN** the user selects a difficulty level and the browser is restarted
- **THEN** the previously selected difficulty level SHALL be available from storage

#### Scenario: Default difficulty when absent
- **WHEN** no `difficultyLevel` value exists in storage
- **THEN** the extension SHALL treat the difficulty as "hard"
