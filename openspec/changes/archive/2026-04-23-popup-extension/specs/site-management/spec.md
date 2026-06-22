## ADDED Requirements

### Requirement: Add a website to the tracked list
The extension popup UI SHALL allow the user to enter a hostname and add it to their tracked site list.

#### Scenario: User adds a valid hostname
- **WHEN** the user types a hostname (e.g. `twitter.com`) and submits
- **THEN** the hostname SHALL be added to `trackedSites` in storage and appear in the UI list

#### Scenario: Duplicate hostname is rejected
- **WHEN** the user submits a hostname that already exists in the tracked list
- **THEN** it SHALL NOT be added again and the UI SHALL indicate it is already tracked

### Requirement: Remove a website from the tracked list
The extension popup UI SHALL allow the user to remove any hostname from the tracked list.

#### Scenario: User removes a site
- **WHEN** the user clicks the remove button next to a hostname
- **THEN** that hostname SHALL be deleted from `trackedSites` in storage and removed from the UI list

### Requirement: Display current tracked sites
The extension popup UI SHALL display all currently tracked hostnames when opened.

#### Scenario: List loads on popup open
- **WHEN** the user opens the extension popup
- **THEN** all hostnames stored in `trackedSites` SHALL be displayed in the list
