"use strict";

// Task 4 suite: visibility analysis.

VD.defineSuite("task4", function (t) {
  const assertTrue = t.assertTrue;
  const assertFalse = t.assertFalse;
  const record = t.record;
  const makeVideo = t.makeVideo;
  const withHost = t.withHost;

  // Case 1 — visible video. position:fixed pins it inside the viewport so
  // "fully on-screen" holds no matter how tall the assertion list above grows.
  withHost(function (host) {
    const v = makeVideo({ id: "case-visible", width: "320", height: "180" },
      "position:fixed; top:10px; left:10px");
    host.appendChild(v);
    assertTrue(isVideoVisible(v), "visible video reports visible=true");
    record(getViewportIntersection(v).fraction === 1,
      "fully-on-screen video has viewport fraction 1", "fraction=" + getViewportIntersection(v).fraction);
  });

  // Case 2 — display:none
  withHost(function (host) {
    const v = makeVideo({ id: "case-display-none", width: "320", height: "180" }, "display:none");
    host.appendChild(v);
    assertFalse(isVideoVisible(v), "display:none video reports visible=false");
    record(getViewportIntersection(v).fraction === 0,
      "display:none video has viewport fraction 0", "fraction=" + getViewportIntersection(v).fraction);
  });

  // Case 3 — visibility:hidden (still keeps its layout box, so unlike
  // display:none it retains a measurable viewport intersection)
  withHost(function (host) {
    const v = makeVideo({ id: "case-hidden", width: "320", height: "180" },
      "visibility:hidden; position:fixed; top:10px; left:200px");
    host.appendChild(v);
    assertFalse(isVideoVisible(v), "visibility:hidden video reports visible=false");
    record(getViewportIntersection(v).fraction === 1,
      "visibility:hidden keeps its box, fraction stays 1", "fraction=" + getViewportIntersection(v).fraction);
  });

  // Case 4 — zero rendered size
  withHost(function (host) {
    const attrZero = makeVideo({ id: "case-zero-attr", width: "0", height: "0" });
    host.appendChild(attrZero);
    assertFalse(isVideoVisible(attrZero), "zero-size video (w/h attrs) reports visible=false");

    const styledZero = makeVideo({ id: "case-zero-style", width: "320" }, "height:0");
    host.appendChild(styledZero);
    assertFalse(isVideoVisible(styledZero), "zero-height video (style) reports visible=false");
  });

  // Case 5 — partially outside the viewport. The offset is computed from the
  // live viewport so exactly ~100px stays on-screen regardless of window size.
  withHost(function (host) {
    const leftEdge = Math.max(window.innerWidth - 100, 1);
    const v = makeVideo({ id: "case-partial", width: "640", height: "360" },
      "position:absolute; left:" + leftEdge + "px; top:10px");
    host.appendChild(v);
    const info = getViewportIntersection(v);
    assertTrue(isVideoVisible(v), "partially-offscreen video reports visible=true");
    record(info.fraction > 0 && info.fraction < 1,
      "partially-offscreen fraction strictly between 0 and 1", "fraction=" + info.fraction);
    record(typeof info.intersectingArea === "number" && info.intersectingArea > 0,
      "partially-offscreen intersecting area is a positive number", "area=" + info.intersectingArea);
  });

  // Bonus A — entirely outside the viewport: the element is still renderable,
  // so visible=true, but nothing intersects the viewport (fraction=0). This
  // shows the two functions answer different questions.
  withHost(function (host) {
    const v = makeVideo({ id: "case-far-left", width: "640", height: "360" },
      "position:absolute; left:-2000px; top:10px");
    host.appendChild(v);
    assertTrue(isVideoVisible(v), "fully-offscreen video is still renderable (visible=true)");
    record(getViewportIntersection(v).fraction === 0,
      "fully-offscreen video has viewport fraction 0", "fraction=" + getViewportIntersection(v).fraction);
  });

  // Bonus B — opacity thresholds around the epsilon
  withHost(function (host) {
    const transparent = makeVideo({ id: "case-opacity-0", width: "320", height: "180" }, "opacity:0");
    host.appendChild(transparent);
    assertFalse(isVideoVisible(transparent), "opacity:0 video reports visible=false");

    const ghost = makeVideo({ id: "case-opacity-tiny", width: "320", height: "180" }, "opacity:0.001");
    host.appendChild(ghost);
    assertFalse(isVideoVisible(ghost), "near-zero opacity (0.001) counts as invisible");

    const faded = makeVideo({ id: "case-opacity-half", width: "320", height: "180" }, "opacity:0.5");
    host.appendChild(faded);
    assertTrue(isVideoVisible(faded), "mid opacity (0.5) counts as visible");
  });

  // Shape of the intersection payload used by later tasks
  withHost(function (host) {
    const v = makeVideo({ id: "case-shape", width: "640", height: "360" });
    host.appendChild(v);
    const info = getViewportIntersection(v);
    record(
      typeof info.viewportWidth === "number" && typeof info.viewportHeight === "number" &&
      typeof info.intersectionWidth === "number" && typeof info.intersectionHeight === "number" &&
      typeof info.fraction === "number",
      "getViewportIntersection returns numeric fields"
    );
  });

  // No mutation: analysis must not change the element or its styles
  withHost(function (host) {
    const v = makeVideo({ id: "case-mutation", width: "320", height: "180" });
    host.appendChild(v);
    const beforeMarkup = v.outerHTML;
    const beforeStyleAttr = v.getAttribute("style");
    isVideoVisible(v);
    getViewportIntersection(v);
    record(beforeMarkup === v.outerHTML, "analysis does not modify the element");
    record(beforeStyleAttr === v.getAttribute("style"), "analysis does not change inline styles");
  });
});
