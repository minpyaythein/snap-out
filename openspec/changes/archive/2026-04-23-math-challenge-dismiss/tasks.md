## 1. Math Challenge Logic (content.js)

- [x] 1.1 Add `generateProblem()` function that randomly picks +, −, or × and returns `{ question, answer }`
- [x] 1.2 Ensure subtraction always produces a non-negative result (swap operands if needed)
- [x] 1.3 Use multiplication range 2–12 × 2–12 and addition/subtraction range 1–50

## 2. Popup UI Update (content.js)

- [x] 2.1 Replace the dismiss button in `showPopup()` with a math challenge UI (problem text, number input, "Check" button)
- [x] 2.2 Wire "Check" button click to validate the answer numerically (trim + parseInt)
- [x] 2.3 Wire Enter key on the input to trigger the same validation
- [x] 2.4 On correct answer: remove overlay and send `DISMISS_POPUP` message
- [x] 2.5 On wrong answer: show brief error message, clear input, and regenerate a new problem

## 3. Styling (content.css)

- [x] 3.1 Add styles for the challenge input field and "Check" button to match the existing popup look
- [x] 3.2 Add styles for the error message (e.g., red text, small font)

## 4. Verification

- [x] 4.1 Load extension and confirm the popup shows a math problem instead of a dismiss button
- [x] 4.2 Confirm correct answer removes the overlay and resets the timer
- [x] 4.3 Confirm wrong answer shows error, clears input, and shows a new problem
- [x] 4.4 Confirm Enter key submits the answer
