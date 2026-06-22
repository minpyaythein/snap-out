## ADDED Requirements

### Requirement: Render dismissible popup overlay
The content script SHALL inject a popup overlay into the active page when it receives a `SHOW_POPUP` message from the service worker. The overlay SHALL appear on top of all page content without disrupting the page layout.

#### Scenario: Popup appears on message
- **WHEN** the content script receives a `SHOW_POPUP` message
- **THEN** a popup overlay SHALL be injected into the DOM and be visible to the user

#### Scenario: Popup is non-intrusive
- **WHEN** the popup is displayed
- **THEN** it SHALL not shift or hide the underlying page content (positioned fixed/absolute overlay)

### Requirement: Dismiss popup and reset timer
The popup SHALL include a math challenge (arithmetic problem + answer input + submit button) instead of a plain dismiss button. The overlay SHALL only be removed when the user submits the correct answer, at which point a `DISMISS_POPUP` message SHALL be sent to the service worker.

#### Scenario: User solves challenge correctly
- **WHEN** the user enters the correct answer and submits
- **THEN** the overlay SHALL be removed from the DOM and a `DISMISS_POPUP` message SHALL be sent to the service worker

#### Scenario: User submits wrong answer
- **WHEN** the user enters an incorrect answer and submits
- **THEN** the overlay SHALL remain visible, an error message SHALL be shown, and a new problem SHALL be generated

### Requirement: Popup is not duplicated
The content script SHALL ensure only one popup overlay exists in the DOM at any time.

#### Scenario: Prevent duplicate popups
- **WHEN** a `SHOW_POPUP` message is received while a popup is already visible
- **THEN** no additional overlay SHALL be injected
