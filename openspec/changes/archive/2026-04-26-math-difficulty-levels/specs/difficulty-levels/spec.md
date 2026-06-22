## ADDED Requirements

### Requirement: Six difficulty levels available
The extension SHALL provide six difficulty levels for math challenges: easy, medium, hard, very-hard, super-hard, and impossible. Each level SHALL define its own problem type, operator set, and number ranges.

#### Scenario: Easy level
- **WHEN** the difficulty level is set to "easy"
- **THEN** problems SHALL use two operands with +, −, ×, ÷ and values ranging from 1 to 10

#### Scenario: Medium level
- **WHEN** the difficulty level is set to "medium"
- **THEN** problems SHALL use two operands with +, −, ×, ÷ and values ranging from 10 to 99

#### Scenario: Hard level
- **WHEN** the difficulty level is set to "hard"
- **THEN** problems SHALL use two operands with +, −, ×, ÷ and values ranging from 100 to 999

#### Scenario: Very-hard level
- **WHEN** the difficulty level is set to "very-hard"
- **THEN** problems SHALL use three operands with +, −, ×, ÷ and values ranging from 100 to 999, including compound patterns such as (a ÷ b) + c and a × b − c

#### Scenario: Super-hard level
- **WHEN** the difficulty level is set to "super-hard"
- **THEN** problems SHALL be a single complex mathematical expression chosen from: logarithm (log base 2/3/5/10), derivative (d/dx of xⁿ at x=k), definite integral (∫ nxⁿ⁻¹ dx from 0 to k), or factorial (n! where n is 5–7)

#### Scenario: Impossible level
- **WHEN** the difficulty level is set to "impossible"
- **THEN** problems SHALL combine two independently generated complex expressions (from the super-hard pool) with a +, −, or × operator, requiring the user to evaluate both expressions and then combine the results

### Requirement: Default difficulty is hard
The extension SHALL use "hard" as the default difficulty level when no level has been explicitly selected by the user.

#### Scenario: No difficulty previously set
- **WHEN** the extension loads and no difficulty level is stored in settings
- **THEN** the difficulty level SHALL default to "hard"

### Requirement: Difficulty selector in popup UI
The extension popup SHALL display a dropdown selector allowing the user to choose from all six difficulty levels. The selector SHALL reflect the currently stored selection.

#### Scenario: User changes difficulty
- **WHEN** the user selects a different difficulty level from the dropdown
- **THEN** the selected level SHALL be saved to storage immediately without requiring a separate save action

#### Scenario: Dropdown reflects stored value
- **WHEN** the extension popup is opened
- **THEN** the difficulty dropdown SHALL display the currently stored difficulty level as selected

### Requirement: Division produces integer answers
For all arithmetic difficulty levels, division problems SHALL be generated such that the dividend is always an exact multiple of the divisor, ensuring the answer is always a whole number.

#### Scenario: Division answer is always an integer
- **WHEN** a division problem is generated at any arithmetic difficulty level
- **THEN** the dividend SHALL equal the divisor multiplied by a whole-number quotient so the answer has no remainder
