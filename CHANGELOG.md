# Changelog

All notable changes to this project will be documented here.

## [0.8.0] — Task 7: best candidate selection
- `content/src/selection.js`: `selectBestVideo(candidates)` — highest score
  wins, score ties prefer larger rendered area, full ties stay stable in
  document order; returns null for empty/invalid input; pure and non-mutating.
- `content.js` restructured into the explicit read-only pipeline
  (discover → metadata → visibility → playback → score → select → print),
  now logging a separate `Selected video: #N …` line after the candidate table.

## [0.7.0] — Productization & audit
- Shared test harness (`test/lib/harness.js`) replacing five copy-pasted
  harnesses; assertion bodies preserved verbatim as `test/taskN/tests.js`.
- `test/all.html`: one aggregated run of every suite with a single verdict.
- `tools/run-all.ps1`: headless-Chrome runner for all checks (CI-style gate).
- `tools/static-checks.mjs`: automated security/policy linter.
- `test/product/tests.js`: stress suite (51 mixed videos → deterministic
  single winner, bounded runtime).
- `test/product/smoke-e2e.html`: end-to-end run of the real content-script
  chain against fixture markup, asserting its console contract.
- Performance fix: one `getBoundingClientRect()` measurement per video
  (metadata.js now shares the rect with visibility.js).
- README rewritten as product documentation; AUDIT.md added.

## [0.6.0] — Task 6: video scoring
- `content/src/scorer.js`: deterministic additive scoring with explicit
  reason strings; constants grouped for tuning (max 100).
- Console table gained a `score` column plus a most-relevant-video summary line.

## [0.5.0] — Task 5: playback state
- `content/src/playback.js`: paused/ended/currentTime/duration/isPlaying with
  a conservative readyState-based playing verdict.

## [0.4.0] — Task 4: visibility analysis
- `content/src/visibility.js`: visibility predicate and viewport-intersection
  metrics; wired into metadata and the report table.

## [0.3.0] — Task 3: video metadata
- `content/src/metadata.js`: safe plain-object extraction including NaN/Infinity
  duration handling; reported via console.table.

## [0.2.0] — Task 2: basic discovery
- `content/src/detector.js` exposing `findVideoElements()`; count logged once.

## [0.1.0] — Scaffold
- Minimal MV3 manifest with zero permissions and a stub content script.
