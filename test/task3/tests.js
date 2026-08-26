"use strict";

// Task 3 suite: metadata extraction.

VD.defineSuite("task3", function (t) {
  const record = t.record;
  const assertTrue = t.assertTrue;
  const assertFalse = t.assertFalse;
  const assertEqual = t.assertEqual;
  const makeVideo = t.makeVideo;
  const withHost = t.withHost;

  withHost(function (host) {
    const v = makeVideo({ width: "640", height: "360" });
    host.appendChild(v);
    const meta = getVideoMetadata(v);
    record(typeof meta === "object" && meta !== null && !Array.isArray(meta), "getVideoMetadata returns a plain object");
    assertEqual(meta.element, v, "metadata keeps the element reference");
    assertEqual(meta.width, 640, "width is read from layout");
    assertEqual(meta.height, 360, "height is read from layout");
    assertEqual(meta.area, 640 * 360, "area is width x height");
    assertFalse(meta.hasSource, "hasSource is false without a source");
    assertTrue(typeof meta.paused === "boolean", "paused is a plain boolean");
    assertFalse(meta.muted, "muted defaults to false");
    assertEqual(meta.controls, false, "controls defaults to false");
    // readyState / duration can vary; they must just be numbers or null, never NaN.
    record(typeof meta.readyState === "number", "readyState is a number");
    record(typeof meta.volume === "number" && isFinite(meta.volume), "volume is a finite number");
    record(meta.duration === null || (typeof meta.duration === "number" && isFinite(meta.duration)), "duration is null or a finite number, never NaN/Infinity");
  });

  withHost(function (host) {
    const v = makeVideo({ src: "m.mp4", controls: "" });
    // Per HTML spec, the muted CONTENT ATTRIBUTE only seeds the mute state
    // when applied by the parser; on script-created elements the muted
    // PROPERTY must be used instead.
    v.muted = true;
    host.appendChild(v);
    const meta = getVideoMetadata(v);
    assertTrue(meta.hasSource, "hasSource is true with a src attribute");
    assertTrue(meta.controls, "controls is true when present");
    assertTrue(meta.muted, "muted is true when present");
  });

  // No mutation: getVideoMetadata must not change the element or its playback.
  withHost(function (host) {
    const v = makeVideo({ width: "320", height: "180", src: "m.mp4" });
    host.appendChild(v);
    const before = v.outerHTML;
    const metaBefore = { paused: v.paused, muted: v.muted, volume: v.volume, currentTime: v.currentTime, readyState: v.readyState };
    getVideoMetadata(v);
    const after = v.outerHTML;
    const metaAfter = { paused: v.paused, muted: v.muted, volume: v.volume, currentTime: v.currentTime, readyState: v.readyState };
    record(before === after, "getVideoMetadata does not modify the element markup");
    record(
      metaBefore.paused === metaAfter.paused && metaBefore.muted === metaAfter.muted &&
      metaBefore.volume === metaAfter.volume && metaBefore.currentTime === metaAfter.currentTime &&
      metaBefore.readyState === metaAfter.readyState,
      "getVideoMetadata does not change playback state (no play/pause/seek)"
    );
  });

  // Explicit NaN/Infinity duration safety: synth a fake duration on the element.
  withHost(function (host) {
    const v = makeVideo({ width: "100", height: "100" });
    host.appendChild(v);
    Object.defineProperty(v, "duration", { configurable: true, value: NaN });
    assertEqual(getVideoMetadata(v).duration, null, "NaN duration becomes null");
    Object.defineProperty(v, "duration", { configurable: true, value: Infinity });
    assertEqual(getVideoMetadata(v).duration, null, "Infinity duration becomes null");
  });

  // Safe path used by content.js: build a plain row filtered to serializable values.
  withHost(function (host) {
    const v = makeVideo({ width: "640", height: "360", src: "m.mp4", controls: "", muted: "" });
    host.appendChild(v);
    const meta = getVideoMetadata(v);
    const row = {};
    Object.keys(meta).forEach(function (k) {
      if (k !== "element") row[k] = meta[k];
    });
    record(row.element === undefined, "content.js row mapper omits the live element key");
    record(typeof row.duration === "number" || row.duration === null, "content.js row duration is serializable (number or null)");
  });
});
