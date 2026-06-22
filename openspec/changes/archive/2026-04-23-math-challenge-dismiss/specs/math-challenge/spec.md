## ADDED Requirements

### Requirement: Generate random arithmetic problem
The math challenge module SHALL generate a random arithmetic problem using one of three operators: addition (+), subtraction (−), or multiplication (×). Number ranges SHALL be: addition 1–50, subtraction with result ≥ 0, multiplication 2–12 for both operands.

#### Scenario: Problem is generated on popup show
- **WHEN** the popup overlay is injected into the page
- **THEN** a random arithmetic problem SHALL be generated and displayed inside the overlay

#### Scenario: Subtraction result is non-negative
- **WHEN** a subtraction problem is generated
- **THEN** the minuend SHALL be greater than or equal to the subtrahend so the answer is ≥ 0

### Requirement: Validate user answer
The math challenge module SHALL compare the user's submitted answer against the correct answer. The comparison SHALL be numeric (not string-based) and SHALL trim whitespace from input.

#### Scenario: Correct answer dismisses the popup
- **WHEN** the user enters the correct answer and submits
- **THEN** the overlay SHALL be removed from the DOM and a `DISMISS_POPUP` message SHALL be sent to the service worker

#### Scenario: Wrong answer shows error and regenerates
- **WHEN** the user enters an incorrect answer and submits
- **THEN** an error message SHALL be displayed briefly, the input SHALL be cleared, and a new problem SHALL be generated

### Requirement: Submit via button or Enter key
The challenge input SHALL accept submission both by clicking a "Check" button and by pressing the Enter key.

#### Scenario: Submit with Enter key
- **WHEN** the user presses Enter while the answer input is focused
- **THEN** the answer SHALL be validated as if the "Check" button was clicked
