## Context

The popup overlay in `content.js` currently renders a message and a single "Dismiss" button. Clicking the button removes the overlay and sends `DISMISS_POPUP` to the background service worker. The change replaces that button with a math challenge UI — a generated arithmetic problem and an answer input — so dismissal requires a correct answer.

## Goals / Non-Goals

**Goals:**
- Replace the dismiss button with an inline arithmetic challenge
- Generate random problems using +, -, × with reasonable number ranges
- Validate the answer client-side in the content script
- Show a brief error and regenerate the problem on a wrong answer
- Keep all logic self-contained in `content.js` (no new files, no external libs)

**Non-Goals:**
- Difficulty settings or configurable operators (can be added later)
- Server-side validation or tamper-proofing
- Persistent challenge history or scoring

## Decisions

### Generate and validate in content.js

The math challenge is purely presentational — it's friction, not security. Keeping it in `content.js` avoids adding a new module and keeps the change minimal.

**Alternative considered:** A separate `math-challenge.js` module. Rejected because the logic is ~20 lines and doesn't justify a new file.

### Regenerate problem on wrong answer

On a wrong answer, show a brief error message (e.g., "Wrong! Try again.") and swap in a new problem after a short delay (300–500ms). This prevents brute-forcing by making each attempt slightly annoying.

**Alternative considered:** Keep the same problem on wrong answer. Rejected — users could easily count on fingers; a new problem adds more friction.

### Number ranges per operator

- Addition: 1–50 + 1–50
- Subtraction: result always ≥ 0 (larger - smaller)
- Multiplication: 2–12 × 2–12 (times-table range)

These ranges keep answers mental-math friendly, which is the intent.

## Risks / Trade-offs

- **[Risk] Trivially bypassable** → The challenge is intentional friction, not a security gate. Users determined to ignore it can inspect the DOM. This is acceptable given the use case.
- **[Risk] Wrong-answer UX feels jarring** → Mitigation: use a short delay + friendly message rather than an immediate hard reset.

## Migration Plan

No data migration needed. The change is a UI-only modification to `content.js` and `content.css`. Rolling back means reverting those two files.
