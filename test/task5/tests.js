"use strict";

// Task 5 suite: playback state.

VD.defineSuite("task5", function (t) {
  const assertTrue = t.assertTrue;
  const assertFalse = t.assertFalse;
  const assertEqual = t.assertEqual;
  const record = t.record;
  const makeVideo = t.makeVideo;
  const withHost = t.withHost;

  // Case 1 — paused video (a fresh element is always paused)
  withHost(function (host) {
    const v = makeVideo({ id: "case-paused", src: "p.mp4", width: "320", height: "180" });
    host.appendChild(v);
    const s = getPlaybackState(v);
    assertTrue(s.paused, "paused video reports paused=true");
    assertFalse(s.isPlaying, "paused video reports isPlaying=false");
    assertTrue(typeof s.currentTime === "number", "currentTime is a number");
    record(s.duration === null || (typeof s.duration === "number" && isFinite(s.duration)),
      "duration is null or finite");
  });

  // Case 2 — playing video. Real playback needs playable media, which this
  // repo does not ship, so we override the instance properties the same way a
  // playing browser would report them and assert isPlaying reacts correctly.
  // The stall-guard (readyState=1) proves readiness is genuinely enforced.
  withHost(function (host) {
    const v = makeVideo({ id: "case-playing", src: "p.mp4" });
    host.appendChild(v);
    Object.defineProperty(v, "paused", { configurable: true, value: false });
    Object.defineProperty(v, "ended", { configurable: true, value: false });
    Object.defineProperty(v, "readyState", { configurable: true, value: 4 });

    let s = getPlaybackState(v);
    assertFalse(s.paused, "playing setup reports paused=false");
    assertTrue(s.isPlaying, "not-paused + readyState=4 reports isPlaying=true");

    Object.defineProperty(v, "readyState", { configurable: true, value: 3 });
    assertTrue(getPlaybackState(v).isPlaying, "readyState=3 still counts as playing");

    // Stall guard: without enough data for future frames, not really playing.
    Object.defineProperty(v, "readyState", { configurable: true, value: 1 });
    assertFalse(getPlaybackState(v).isPlaying, "readyState=1 (may stall) reports isPlaying=false");
  });

  // Case 3 — ended video
  withHost(function (host) {
    const v = makeVideo({ id: "case-ended", src: "p.mp4" });
    host.appendChild(v);
    Object.defineProperty(v, "paused", { configurable: true, value: false });
    Object.defineProperty(v, "ended", { configurable: true, value: true });
    Object.defineProperty(v, "readyState", { configurable: true, value: 4 });
    assertFalse(getPlaybackState(v).isPlaying, "ended video reports isPlaying=false");
    assertTrue(getPlaybackState(v).ended, "ended video reports ended=true");
  });

  // Case 4 — video with no source
  withHost(function (host) {
    const v = makeVideo({ id: "case-no-source", width: "320", height: "180" });
    host.appendChild(v);
    const s = getPlaybackState(v);
    assertFalse(s.isPlaying, "source-less paused video reports isPlaying=false");
    assertEqual(s.duration, null, "source-less video has null duration");
    assertEqual(s.currentTime, 0, "currentTime falls back to 0");
  });

  // Shape: exactly the required keys
  withHost(function (host) {
    const v = makeVideo({ id: "case-shape", src: "p.mp4" });
    host.appendChild(v);
    const keys = Object.keys(getPlaybackState(v)).sort();
    const expected = ["currentTime", "duration", "ended", "isPlaying", "paused"];
    record(JSON.stringify(keys) === JSON.stringify(expected),
      "playback state exposes exactly the five required fields", keys.join(","));
  });

  // Integration: metadata carries playbackState from playback.js
  withHost(function (host) {
    const v = makeVideo({ id: "case-integration", src: "p.mp4" });
    host.appendChild(v);
    const meta = getVideoMetadata(v);
    record(meta.playbackState && typeof meta.playbackState.isPlaying === "boolean",
      "metadata includes playbackState.isPlaying");
    assertFalse(meta.playbackState.isPlaying, "fresh element reports not playing through metadata too");
  });

  // No mutation / no listeners: repeated calls identical, markup unchanged.
  withHost(function (host) {
    const v = makeVideo({ id: "case-mutation", src: "p.mp4" });
    host.appendChild(v);
    const beforeMarkup = v.outerHTML;
    const first = JSON.stringify(Object.assign({}, getPlaybackState(v), { duration: null }));
    getPlaybackState(v); getPlaybackState(v);
    const second = JSON.stringify(Object.assign({}, getPlaybackState(v), { duration: null }));
    record(beforeMarkup === v.outerHTML, "analysis does not modify the element");
    record(first === second, "repeated reads are stable (no hidden state)");
  });
});
