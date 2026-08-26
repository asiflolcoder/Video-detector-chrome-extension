"use strict";

// Product-level suites added during the audit phase.

// stress — many mixed videos: detection completes fast and scoring stays
// deterministic (exactly one winner among the created candidates).
VD.defineSuite("stress", function (t) {
  const assertTrue = t.assertTrue;
  const assertEqual = t.assertEqual;
  const record = t.record;
  const makeVideo = t.makeVideo;
  const withHost = t.withHost;

  const MIX_COUNT = 50;

  withHost(function (host) {
    const created = [];
    for (let i = 0; i < MIX_COUNT; i += 1) {
      let attrs = { width: "320", height: "180" };
      let styleText = "";
      const kind = i % 5;
      if (kind === 1) styleText = "display:none";
      else if (kind === 2) styleText = "visibility:hidden";
      else if (kind === 3) attrs = { width: "0", height: "0" };
      else if (kind === 4) styleText = "position:absolute; left:-3000px; top:10px";
      if (kind !== 0 && i % 2 === 0) attrs.src = "clip-" + i + ".mp4";

      const v = makeVideo(attrs, styleText);
      host.appendChild(v);
      created.push(v);
    }
    // One crafted best video: large (>=250000px²) yet fully inside an
    // 800x600-class viewport, so both its area and coverage tiers apply.
    const best = makeVideo(
      { src: "best.mp4", width: "700", height: "400" },
      "position:fixed; top:10px; left:10px"
    );
    host.appendChild(best);
    created.push(best);

    // Detection sees at least everything we just appended.
    assertTrue(findVideoElements().length >= created.length,
      "discovery finds every injected video (" + findVideoElements().length + " >= " + created.length + ")");

    // Bounded runtime for the full analysis pipeline over all candidates.
    const startedAt = performance.now();
    const scoredList = created.map(function (v) { return scoreVideo(getVideoMetadata(v)); });
    const elapsedMs = performance.now() - startedAt;
    assertTrue(elapsedMs < 500, "scoring 51 candidates stays well under 500ms",
      elapsedMs.toFixed(1) + "ms");

    // Deterministic single winner: exactly one maximum, and it is `best`.
    const maxScore = Math.max.apply(null, scoredList.map(function (r) { return r.score; }));
    const winners = scoredList.filter(function (r) { return r.score === maxScore; }).length;
    assertEqual(winners, 1, "exactly one candidate reaches the top score");
    const bestIndex = scoredList.findIndex(function (r) { return r.score === maxScore; });
    // Diagnostic output so a mismatch identifies itself in the runner.
    record(created[bestIndex] === best,
      "the crafted visible/large video wins deterministically",
      "winner=" + scoredList[bestIndex].reasons.join("|") +
      " score=" + maxScore +
      " craftedScore=" + scoredList[scoredList.length - 1].score +
      " craftedReasons=" + scoredList[scoredList.length - 1].reasons.join("|"));
    record(maxScore >= 50, "winner score reflects its strong signals",
      "score=" + maxScore);
  });
});
