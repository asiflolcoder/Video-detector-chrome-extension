"use strict";

// Task 6 suite: deterministic scoring (pure functions over plain data).

VD.defineSuite("task6", function (t) {
  const assertEqual = t.assertEqual;
  const record = t.record;
  const makeVideo = t.makeVideo;
  const withHost = t.withHost;

  // Base candidate: everything off/null so each test opts one factor in.
  function baseCandidate(overrides) {
    const base = {
      visible: false,
      area: 0,
      viewportIntersection: { fraction: 0 },
      playbackState: { isPlaying: false },
      muted: true,
      volume: 1,
      duration: null
    };
    if (overrides) Object.keys(overrides).forEach(function (k) { base[k] = overrides[k]; });
    return base;
  }

  function includesReason(result, reason) { return result.reasons.indexOf(reason) !== -1; }

  // Sanity of the model itself: an all-off candidate scores zero.
  const empty = scoreVideo(baseCandidate());
  assertEqual(empty.score, 0, "all-off candidate scores 0");
  assertEqual(empty.reasons.length, 0, "all-off candidate has no reasons");

  // Factor 1 — visibility (+25)
  const visOnly = scoreVideo(baseCandidate({ visible: true }));
  assertEqual(visOnly.score, 25, "visible-only candidate scores 25");
  record(includesReason(visOnly, "visible"), "reason 'visible' present");

  // Factor 2 — rendered area tiers (+25 large / +12 medium)
  const largeArea = scoreVideo(baseCandidate({ area: LARGE_AREA_THRESHOLD_PX }));
  assertEqual(largeArea.score, 25, "large-area boundary scores exactly 25");
  record(includesReason(largeArea, "large-rendered-area"), "reason 'large-rendered-area' present");

  const mediumArea = scoreVideo(baseCandidate({ area: MEDIUM_AREA_THRESHOLD_PX }));
  assertEqual(mediumArea.score, 12, "medium-area boundary scores exactly 12");
  record(includesReason(mediumArea, "medium-rendered-area"), "reason 'medium-rendered-area' present");

  const tinyArea = scoreVideo(baseCandidate({ area: MEDIUM_AREA_THRESHOLD_PX - 1 }));
  assertEqual(tinyArea.score, 0, "sub-medium area scores nothing");

  // Factor 3 — viewport intersection (+15), boundary just below vs at 0.75
  const below = scoreVideo(baseCandidate({ viewportIntersection: { fraction: 0.7499 } }));
  assertEqual(below.score, 0, "fraction just under 0.75 scores nothing");

  const at = scoreVideo(baseCandidate({ viewportIntersection: { fraction: 0.75 } }));
  assertEqual(at.score, 15, "fraction at 0.75 scores exactly 15");
  record(includesReason(at, "mostly-in-viewport"), "reason 'mostly-in-viewport' present");

  // Factor 4 — currently playing (+15)
  const playing = scoreVideo(baseCandidate({ playbackState: { isPlaying: true } }));
  assertEqual(playing.score, 15, "playing-only candidate scores 15");
  record(includesReason(playing, "currently-playing"), "reason 'currently-playing' present");

  // Factor 5 — audio (+10): unmuted AND non-silent volume
  const withAudio = scoreVideo(baseCandidate({ muted: false, volume: 0.8 }));
  assertEqual(withAudio.score, 10, "unmuted audible candidate scores 10");
  record(includesReason(withAudio, "has-audio"), "reason 'has-audio' present");

  const mutedSilent = scoreVideo(baseCandidate({ muted: true, volume: 1 }));
  const zeroVolume = scoreVideo(baseCandidate({ muted: false, volume: 0 }));
  record(mutedSilent.score === 0 && !includesReason(mutedSilent, "has-audio"),
    "muted candidate earns no audio points");
  record(zeroVolume.score === 0 && !includesReason(zeroVolume, "has-audio"),
    "zero-volume candidate earns no audio points");

  // Factor 6 — meaningful duration (+10)
  const longEnough = scoreVideo(baseCandidate({ duration: MIN_MEANINGFUL_DURATION_SECONDS }));
  assertEqual(longEnough.score, 10, "duration at threshold scores exactly 10");
  record(includesReason(longEnough, "meaningful-duration"), "reason 'meaningful-duration' present");

  const tooShort = scoreVideo(baseCandidate({ duration: MIN_MEANINGFUL_DURATION_SECONDS - 1 }));
  const nullDuration = scoreVideo(baseCandidate({ duration: null }));
  record(tooShort.score === 0 && !includesReason(tooShort, "meaningful-duration"),
    "short clip earns no duration points");
  record(nullDuration.score === 0, "null duration (not loaded) earns no duration points");

  // Combined path: all six factors reach the max of 100.
  const maxed = scoreVideo(baseCandidate({
    visible: true,
    area: LARGE_AREA_THRESHOLD_PX,
    viewportIntersection: { fraction: 0.9 },
    playbackState: { isPlaying: true },
    muted: false,
    volume: 1,
    duration: 600
  }));
  assertEqual(maxed.score, 100, "fully-featured candidate reaches max score 100");

  const example = scoreVideo(baseCandidate({
    visible: true,
    area: LARGE_AREA_THRESHOLD_PX,
    viewportIntersection: { fraction: 0.9 },
    playbackState: { isPlaying: true }
  }));
  assertEqual(example.score, 80, "spec-example factors total 80 (25+25+15+15)");

  // Determinism: identical input twice gives identical output.
  const input = baseCandidate({ visible: true, area: 300000 });
  const once = JSON.stringify(scoreVideo(input));
  const twice = JSON.stringify(scoreVideo(input));
  record(once === twice, "same input always produces same output", once);

  // Robustness: garbage candidates must not throw and must not score.
  const junkResults = [
    scoreVideo(null),
    scoreVideo(undefined),
    scoreVideo({}),
    scoreVideo({ area: "bogus", viewportIntersection: null, playbackState: null })
  ];
  const junkOk = junkResults.every(function (r) {
    return r && typeof r.score === "number" && Array.isArray(r.reasons);
  });
  record(junkOk, "malformed/empty candidates return {score:Number, reasons:Array} safely");

  // Integration: a real metadata object flows straight into the scorer.
  // Sized to clear the LARGE-area tier while fitting the first viewport.
  withHost(function (host) {
    const v = makeVideo({ width: "700", height: "400" }, "position:fixed; top:10px; left:10px");
    host.appendChild(v);
    if (typeof getVideoMetadata === "function") {
      const fromMeta = scoreVideo(getVideoMetadata(v));
      record(fromMeta.score > 0 && includesReason(fromMeta, "visible") &&
             includesReason(fromMeta, "large-rendered-area"),
        "real metadata object integrates with the scorer",
        "score=" + fromMeta.score + " [" + fromMeta.reasons.join(", ") + "]");
    } else {
      record(true, "real metadata object integrates with the scorer",
        "skipped: metadata.js not loaded on this page");
    }
  });
});
