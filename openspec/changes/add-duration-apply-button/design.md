## Context

The `configurable-duration` change wired duration inputs to auto-save via `change` events. The user wants intentional confirmation via an Apply button instead. This is a small, focused UI-only change — no storage model changes needed.

## Goals / Non-Goals

**Goals:**
- Replace auto-save-on-change with an explicit Apply button click to save the duration

**Non-Goals:**
- Visual feedback beyond the button itself (e.g. toast/success message) — out of scope
- Validation error messages — clamping silently is sufficient per existing design

## Decisions

### Remove `change` listeners, add `click` listener on Apply button
The two `change` listeners on `durationMin` and `durationSec` are removed. A single `click` listener on the Apply button calls the same `saveDuration()` logic. No other changes to the save logic are needed.

**Alternative considered**: Keep `change` listeners but debounce — rejected, adds complexity and still doesn't give explicit user intent.

### Button placement: inline inside the duration section, after the inputs
Keeps the Apply action visually grouped with the inputs it affects, consistent with how the form Add button is placed next to the site input.

## Risks / Trade-offs

- **Risk**: User edits inputs and navigates away without clicking Apply — changes lost silently. → **Mitigation**: Acceptable UX trade-off; explicit apply is the requested behaviour.
