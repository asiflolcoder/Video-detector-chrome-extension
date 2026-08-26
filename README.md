# Distraction-Free Video — Phase 1: Video Detection

Chrome Extension (Manifest V3), vanilla JavaScript, no dependencies, no bundler.

## What Phase 1 does
Finds the "most relevant" `<video>` element in a page and logs it to the
DevTools console. It never modifies the page: no CSS injection, no DOM changes,
no moving/cloning/removing video elements.

## How detection works
1. `collect.js` — gathers every `<video>` element and filters out non-candidates:
   hidden by styles (`display:none`, `visibility:hidden`), zero rendered area,
   or marked `aria-hidden` (decorative / background content).
2. `score.js` — scores each candidate:
   - base score = visible area (width × height)
   - `+50%` when the video has a loadable source (`src`, `<source>`, `srcObject`)
   - `+25%` when the video shows native controls
3. `detect.js` — picks the highest-scoring candidate; ties go to the first
   video in document order.

The content-script entry (`index.js`) runs detection on load and re-runs it
(debounced) when a video element appears, disappears, or changes its
`src`/`controls`/`hidden` attributes, because many sites build players late.

## Why these weights
- **Area is the dominant signal.** The main player is almost always the largest
  `<video>` on the page.
- **Source bonus (`0.5 × area`)** only reorders candidates of comparable size,
  so a sourced in-content player beats a slightly larger element without media.
- **Controls bonus (`0.25 × area`)** further favors real players over
  autoplaying loops.
- **`aria-hidden` is a disqualifier.** Per WCAG it marks decorative content
  (e.g. background/hero loops), not something a user watches.

## Known limitations (Phase 1)
- Top frame only; cross-origin iframes (e.g. YouTube embeds) are not scanned.
- Videos inside shadow DOM are not seen by `querySelectorAll`.
- A large hero video *without* `aria-hidden` can outrank a smaller in-content
  player.
- No viewport-proximity logic; an off-screen large video may win.

## Project layout
- `manifest.json` — MV3, zero permissions, injects into `http`/`https`.
- `content/src/collect.js`, `score.js`, `detect.js` — pure detection logic.
- `content/src/index.js` — content-script entry point.
- `test/run.html` — unit test harness (open in any browser).
- `test/fixtures/` — sample pages for manual extension testing.

## How to test
### Unit tests
Open `test/run.html` in a browser (or serve the folder). Every assertion runs
and renders PASS/FAIL with a summary.

### Extension behavior
1. Open `chrome://extensions`, enable Developer mode.
2. "Load unpacked" → select this project folder.
3. Serve this folder over HTTP: `py -m http.server 8765` (or `python -m http.server 8765`).
4. Visit one of:
   - http://127.0.0.1:8765/test/fixtures/single.html
   - http://127.0.0.1:8765/test/fixtures/multiple.html
   - http://127.0.0.1:8765/test/fixtures/dynamic.html
   - http://127.0.0.1:8765/test/fixtures/decorative.html
   - http://127.0.0.1:8765/test/fixtures/negative.html
5. Open the DevTools console and look for `[VideoDetect] most relevant video: …`
   or `[VideoDetect] no candidate video found`.
