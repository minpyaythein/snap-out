## 1. Storage Layer

- [x] 1.1 Add `saveDefaultThreshold(seconds)` function to `storage.js`
- [x] 1.2 Update `getThreshold(hostname)` in `storage.js` to read `defaultThreshold` from storage as the fallback (instead of the hardcoded constant), keeping per-site `thresholds` map precedence
- [x] 1.3 Update the `DEFAULT_THRESHOLD` constant to 300 (align with spec fallback) and use it only when `defaultThreshold` is absent from storage

## 2. Popup UI

- [x] 2.1 Add duration input section to `popup.html` with minutes (0–30) and seconds (0–59) number inputs
- [x] 2.2 Add styles for the duration section to `popup.css`
- [x] 2.3 Add load logic in `popup.js` to read `defaultThreshold` from storage and populate the minutes/seconds inputs on popup open
- [x] 2.4 Add save logic in `popup.js` on input `change` event: clamp to min 10s and max 1800s (clamping seconds to 0 when minutes = 30), then call `saveDefaultThreshold`
