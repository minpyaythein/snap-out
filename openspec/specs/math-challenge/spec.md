## ADDED Requirements

### Requirement: Generate random arithmetic problem
The math challenge module SHALL generate a problem based on the active difficulty level. For arithmetic levels (easy through very-hard), problems SHALL use +, −, ×, ÷ with operand ranges and operand count defined by the level. For super-hard, problems SHALL be a single complex expression (log, derivative, integral, or factorial). For impossible, problems SHALL combine two complex expressions with a +, −, or × operator.

#### Scenario: Problem is generated on popup show
- **WHEN** the popup overlay is injected into the page
- **THEN** a problem SHALL be generated according to the active difficulty level and displayed inside the overlay

#### Scenario: Subtraction result is non-negative
- **WHEN** a subtraction operation is generated at any difficulty level
- **THEN** the result SHALL be greater than or equal to zero

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
