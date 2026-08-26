# Distraction-Free Video

Chrome Extension (Manifest V3). Vanilla JavaScript — no dependencies, no
bundler, no frameworks, no remote code.

## What it does (Phase 1)
On page load the extension detects every `<video>` element in the top frame,
analyzes each one, and reports the most relevant candidate in the DevTools
console. **It never modifies the page** — analysis is strictly read-only.

Pipeline (`content/src/`):

```
detector.js    findVideoElements(doc)        discovery only; returns []
                                             safely when none exist
visibility.js  isVideoVisible(video[,rect])  rendered size / display /
               getViewportIntersection(...)  visibility / opacity checks,
                                               viewport coverage (0..1)
playback.js    getPlaybackState(video)       paused/ended/time/duration and
                                             a conservative isPlaying verdict
metadata.js    getVideoMetadata(video)       one plain object per video;
                                             measures the bounding rect ONCE
                                             and shares it with visibility.js
scorer.js      scoreVideo(candidate)         deterministic additive score +
                                             explicit reason strings
selection.js   selectBestVideo(candidates)   highest score wins; ties fall
                                             back to larger area, then stay
                                             stable in document order;
                                             null for empty input
content.js     entry point                   the seven-step pipeline report:
                                             console.table list plus a
                                             separate selected-video line
```

## Scoring model (tune constants at the top of scorer.js)
| Factor | Condition | Points | Reason |
|---|---|---|---|
| Visibility | `visible === true` | 25 | `visible` |
| Large area | `area >= 250000px²` | 25 | `large-rendered-area` |
| Medium area | `area >= 50000px²` | 12 | `medium-rendered-area` |
| In viewport | coverage `>= 0.75` | 15 | `mostly-in-viewport` |
| Playing | conservative check | 15 | `currently-playing` |
| Audio | unmuted & volume > 0 | 10 | `has-audio` |
| Duration | finite & >= 10s | 10 | `meaningful-duration` |

Max 100. "Playing" is deliberately strict (`readyState >= HAVE_FUTURE_DATA`),
so a stalling stream is never ranked as playing. Ties resolve to the earliest
video in document order.

## Security & privacy stance
- Zero permissions, zero host permissions; no background worker.
- Content scripts run in Chrome's isolated world; the page cannot observe them.
- No storage, no messaging ports, no cookies, no network requests, no user-data
  inspection. See [AUDIT.md](AUDIT.md).

## Testing
- `test/all.html` — runs **all suites** with one PASS/FAIL verdict.
- `tools/run-all.ps1` — headless runner for every page (exit code = gate).
- `tools/static-checks.mjs` — security/policy linter.
- Per-task suites live in `test/task2..task6/tests.js`; robustness suites in
  `test/product/`.

```powershell
node --check content/src/detector.js   # syntax (repeat per file)
node tools/static-checks.mjs           # security gate
powershell -ExecutionPolicy Bypass -File tools\run-all.ps1   # full test run
```

Manual: load unpacked at `chrome://extensions`, serve fixtures with
`py -m http.server 8765`, then visit e.g.
`http://127.0.0.1:8765/test/fixtures/three-videos.html` and read the console.

## Current limitations
Top frame only; no Shadow DOM piercing; no iframe traversal; no occlusion
detection beyond geometry/styles; single-pass reporting (no MutationObserver).
These are queued as later tasks by design.
