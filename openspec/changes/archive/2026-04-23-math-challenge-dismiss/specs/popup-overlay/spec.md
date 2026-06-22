## MODIFIED Requirements

### Requirement: Dismiss popup and reset timer
The popup SHALL include a math challenge (arithmetic problem + answer input + submit button) instead of a plain dismiss button. The overlay SHALL only be removed when the user submits the correct answer, at which point a `DISMISS_POPUP` message SHALL be sent to the service worker.

#### Scenario: User solves challenge correctly
- **WHEN** the user enters the correct answer and submits
- **THEN** the overlay SHALL be removed from the DOM and a `DISMISS_POPUP` message SHALL be sent to the service worker

#### Scenario: User submits wrong answer
- **WHEN** the user enters an incorrect answer and submits
- **THEN** the overlay SHALL remain visible, an error message SHALL be shown, and a new problem SHALL be generated
