"use strict";

// Content-script entry point. Read-only pipeline:
// 1. discover videos            (detector.js)
// 2. collect metadata           (metadata.js)
// 3. determine visibility       (visibility.js, via metadata)
// 4. determine playback state   (playback.js, via metadata)
// 5. score candidates           (scorer.js)
// 6. select the best candidate  (selection.js)
// 7. print the report           (this file)
(function () {
  // 1. Discover videos in the current document.
  const videos = findVideoElements();
  console.log("Detected videos: " + videos.length);

  const rows = [];
  // 2–5. Metadata includes visibility and playback analysis; scoring appends
  // score/reasons to produce the candidate objects selection consumes.
  const candidates = videos.map(function (video) {
    const meta = getVideoMetadata(video);
    const outcome = scoreVideo(meta);

    rows.push({
      width: meta.width,
      height: meta.height,
      area: meta.area,
      currentTime: meta.currentTime,
      duration: meta.duration,
      paused: meta.paused,
      muted: meta.muted,
      volume: meta.volume,
      readyState: meta.readyState,
      controls: meta.controls,
      hasSource: meta.hasSource,
      visible: meta.visible,
      viewportCoverage: meta.viewportIntersection.fraction,
      playing: meta.playbackState.isPlaying,
      score: outcome.score
    });

    // Candidates stay plain-data objects carrying their live element ref.
    return Object.assign({}, meta, {
      score: outcome.score,
      reasons: outcome.reasons
    });
  });

  // Candidate list report.
  console.table(rows);

  // 6. Select the best candidate (never rescans, never mutates candidates).
  const best = selectBestVideo(candidates);

  // 7. Print the selected candidate separately from the table.
  if (!best) {
    console.log("No suitable video candidate.");
    return;
  }
  const selectedIndex = candidates.indexOf(best);
  const sourceLabel = best.hasSource ? "with source" : "without source";
  const reasonText = best.reasons.length > 0 ? " [" + best.reasons.join(", ") + "]" : "";
  console.log(
    "Selected video: #" + selectedIndex + " (" + sourceLabel + ") — " +
    best.width + "x" + best.height + ", score " + best.score + reasonText
  );
})();