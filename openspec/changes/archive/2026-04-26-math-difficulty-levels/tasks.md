## 1. Storage Layer

- [x] 1.1 Add `difficultyLevel` to `getSettings()` with default value `"hard"` in `storage.js`
- [x] 1.2 Add `getDifficulty()` and `saveDifficulty(level)` helper functions in `storage.js`

## 2. Difficulty Configuration

- [x] 2.1 Define the difficulty config object in `content.js` mapping each level (easy, medium, hard, very-hard, impossible) to its operator set and number ranges
- [x] 2.2 Update `generateProblem()` to accept a difficulty parameter and use the config to determine operators and ranges

## 3. Message Passing

- [x] 3.1 Update `background.js` to read `difficultyLevel` from storage and include it in the `SHOW_POPUP` message payload
- [x] 3.2 Update `content.js` message listener to pass the received difficulty to `showPopup()` and through to `generateProblem()`

## 4. Popup UI

- [x] 4.1 Add a difficulty selector section with a `<select>` dropdown to `popup/popup.html`
- [x] 4.2 Add styles for the difficulty selector section in `popup/popup.css`
- [x] 4.3 Add logic in `popup/popup.js` to load the current difficulty on popup open and save on change

## 5. Manual Verification

- [x] 5.1 Verify the dropdown shows all five levels and defaults to "hard" on fresh install
- [x] 5.2 Verify changing difficulty persists after closing and reopening the popup
- [x] 5.3 Verify the popup overlay generates problems matching the selected difficulty ranges
- [x] 5.4 Verify "easy" uses only addition/subtraction with small numbers (1–10)
- [x] 5.5 Verify "impossible" produces large-number problems (100–999 for +/−, 10–50 for ×)
