## Why

The current popup overlay can be dismissed with a single click, making it easy to ignore. Requiring users to solve a simple calculation problem before dismissing adds intentional friction, encouraging a moment of focus before returning to the tracked site.

## What Changes

- The popup overlay's dismiss mechanism is replaced with a math challenge UI
- A randomly generated arithmetic problem (addition, subtraction, multiplication) is displayed inside the popup
- The user must enter the correct answer to dismiss the overlay
- Incorrect answers show an error and generate a new problem
- The existing one-click dismiss button is removed

## Capabilities

### New Capabilities

- `math-challenge`: Generates random arithmetic problems and validates user answers before allowing popup dismissal

### Modified Capabilities

- `popup-overlay`: Dismiss behavior changes — instead of a button, users must solve a math challenge to close the overlay

## Impact

- `content.js` (or equivalent content script): Popup UI updated to include challenge input and validation
- `popup-overlay` spec: Dismiss requirement is modified
- No new dependencies required (pure JS arithmetic, no external libs)
