### Requirement: Duration setting is saved via Apply button
The popup UI SHALL include an "Apply" button in the duration section. The `defaultThreshold` SHALL only be saved to storage when the user clicks Apply, not on input change.

#### Scenario: User clicks Apply after setting duration
- **WHEN** the user sets minutes and seconds and clicks the Apply button
- **THEN** `defaultThreshold` SHALL be saved to `chrome.storage.sync` with the clamped total seconds value

#### Scenario: Editing inputs without clicking Apply does not save
- **WHEN** the user edits the minutes or seconds inputs but does not click Apply
- **THEN** `defaultThreshold` SHALL NOT be updated in storage

#### Scenario: Apply button clamps invalid values before saving
- **WHEN** the user clicks Apply with a total below 10 seconds or minutes set to 30 with nonzero seconds
- **THEN** the inputs SHALL be corrected and the clamped value SHALL be saved
