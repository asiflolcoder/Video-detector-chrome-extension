"use strict";

// Task 7 suite: best-candidate selection (pure function over plain data).

VD.defineSuite("task7", function (t) {
  const assertEqual = t.assertEqual;
  const assertTrue = t.assertTrue;
  const record = t.record;
  const makeVideo = t.makeVideo;
  const withHost = t.withHost;

  // Small factory so each case states its intent explicitly.
  function candidate(score, area, label) {
    return { score: score, area: area, width: 0, height: 0, label: label || "" };
  }

  // Empty and invalid input must be null, never a throw.
  assertEqual(selectBestVideo([]), null, "empty array returns null");
  assertEqual(selectBestVideo(null), null, "null input returns null");
  assertEqual(selectBestVideo(undefined), null, "undefined input returns null");
  assertEqual(selectBestVideo("nope"), null, "non-array input returns null");

  // A single candidate is returned as-is (same reference).
  const only = candidate(10, 100);
  assertTrue(selectBestVideo([only]) === only, "single candidate returned by reference");

  // Rule 1 — higher score wins regardless of order.
  const lowFirst = [candidate(10, 999999), candidate(50, 1)];
  assertTrue(selectBestVideo(lowFirst) === lowFirst[1],
    "higher score wins even when listed second");

  // Rule 2 — score tie falls back to larger rendered area.
  const tied = [candidate(40, 50000), candidate(40, 200000)];
  assertTrue(selectBestVideo(tied) === tied[1],
    "score tie prefers larger rendered area");

  // Rule 3 — full tie keeps the earliest candidate (document-order stability).
  const identical = [candidate(30, 1000), candidate(30, 1000)];
  assertTrue(selectBestVideo(identical) === identical[0],
    "full tie resolves to the first candidate");

  // Junk entries neither throw nor win.
  const mixed = [null, {}, { score: NaN, area: -5 }, candidate(20, 4000)];
  assertTrue(selectBestVideo(mixed) === mixed[3],
    "malformed entries are ignored safely");

  // Purity: freezing inputs proves candidates are never mutated.
  const frozen = Object.freeze([
    Object.freeze(candidate(10, 100)),
    Object.freeze({ score: 90, area: 80000 })
  ]);
  assertTrue(selectBestVideo(frozen) === frozen[1],
    "works on frozen candidates without mutating them");

  // Determinism: repeated runs pick the same winner.
  const input = [candidate(15, 200), candidate(70, 300000), candidate(70, 310000)];
  const runA = selectBestVideo(input);
  const runB = selectBestVideo(input);
  assertTrue(runA === runB && runA === input[2],
    "selection is deterministic across repeated calls");

  // Integration: the real pipeline's scored candidates flow into selection,
  // and the strongest on-screen video wins over a small and a hidden one.
  withHost(function (host) {
    if (typeof getVideoMetadata !== "function") {
      record(true, "pipeline integration with selection", "skipped: metadata.js not loaded on this page");
      return;
    }
    const hiddenBox = document.createElement("div");
    hiddenBox.setAttribute("style", "display:none");
    host.appendChild(hiddenBox);

    const bigVisible = makeVideo(
      { src: "big.mp4", width: "700", height: "400" },
      "position:fixed; top:10px; left:10px");
    const tiny = makeVideo({ src: "tiny.mp4", width: "240", height: "120" });
    const concealed = makeVideo({ src: "gone.mp4", width: "480", height: "270" });
    host.appendChild(bigVisible); host.appendChild(tiny);
    hiddenBox.appendChild(concealed);

    const pipelineCandidates = findVideoElements().map(function (video) {
      const meta = getVideoMetadata(video);
      const outcome = scoreVideo(meta);
      return Object.assign({}, meta, { score: outcome.score, reasons: outcome.reasons });
    });

    const winner = selectBestVideo(pipelineCandidates);
    assertTrue(winner.element === bigVisible,
      "pipeline integration selects the dominant visible video",
      "reasons=" + (winner.reasons || []).join(","));
    record(concealed.parentElement === hiddenBox,
      "selection leaves DOM structure untouched");
    // Exactly the three injected videos remain: nothing removed or moved.
    assertEqual(findVideoElements().length, 3, "no videos were removed or moved");
  });
});
