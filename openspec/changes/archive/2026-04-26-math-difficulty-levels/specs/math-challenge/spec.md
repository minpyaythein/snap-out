## MODIFIED Requirements

### Requirement: Generate random arithmetic problem
The math challenge module SHALL generate a problem based on the active difficulty level. For arithmetic levels (easy through very-hard), problems SHALL use +, −, ×, ÷ with operand ranges and operand count defined by the level. For super-hard, problems SHALL be a single complex expression (log, derivative, integral, or factorial). For impossible, problems SHALL combine two complex expressions with a +, −, or × operator.

#### Scenario: Problem is generated on popup show
- **WHEN** the popup overlay is injected into the page
- **THEN** a problem SHALL be generated according to the active difficulty level and displayed inside the overlay

#### Scenario: Subtraction result is non-negative
- **WHEN** a subtraction operation is generated at any difficulty level
- **THEN** the result SHALL be greater than or equal to zero
