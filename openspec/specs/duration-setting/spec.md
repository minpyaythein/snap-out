### Requirement: User can set global alert duration
The popup UI SHALL provide two numeric inputs — minutes (0–30) and seconds (0–59) — that together define when the alert popup triggers. The combined value SHALL be saved as `defaultThreshold` (total seconds) in `chrome.storage.sync`.

#### Scenario: User sets 5 minutes 30 seconds
- **WHEN** the user enters 5 in the minutes field and 30 in the seconds field
- **THEN** `defaultThreshold` SHALL be saved as 330 in `chrome.storage.sync`

#### Scenario: Duration inputs load saved value on popup open
- **WHEN** the popup is opened and `defaultThreshold` exists in storage
- **THEN** the minutes and seconds fields SHALL be populated from that stored value

#### Scenario: Duration inputs show default when no value stored
- **WHEN** the popup is opened and no `defaultThreshold` exists in storage
- **THEN** the minutes field SHALL show 5 and the seconds field SHALL show 0

### Requirement: Duration is capped at 30 minutes
The total combined duration SHALL NOT exceed 1800 seconds (30 minutes). If a user sets minutes to 30, the seconds field SHALL be clamped to 0 before saving.

#### Scenario: Minutes at max clamps seconds to zero
- **WHEN** the user sets minutes to 30 and seconds to any value greater than 0
- **THEN** seconds SHALL be clamped to 0 and `defaultThreshold` SHALL be saved as 1800

### Requirement: Duration has a minimum of 10 seconds
The total combined duration SHALL be at least 10 seconds. If the combined value is below 10, it SHALL be clamped to 10 before saving.

#### Scenario: Zero duration is rejected
- **WHEN** the user sets both minutes and seconds to 0
- **THEN** `defaultThreshold` SHALL be saved as 10 (the minimum)
