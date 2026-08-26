"use strict";

// Task 2 suite: video discovery. Requires the hosting page to contain exactly
// the three static <video> elements declared in its markup.

VD.defineSuite("task2", function (t) {
  const record = t.record;
  const assertEqual = t.assertEqual;

  // Discovers the three <video> elements in this document.
  const videos = findVideoElements();
  assertEqual(videos.length, 3, "findVideoElements returns the 3 videos in the document");

  // Each item really is an HTMLVideoElement (querySelectorAll('video')).
  record(
    videos.every(function (v) { return v instanceof HTMLVideoElement; }),
    "every returned item is an HTMLVideoElement",
    "got " + videos.map(function (v) { return v.constructor.name; }).join(", ")
  );

  // Safe with no videos: an empty detached document yields an empty array.
  const emptyDoc = document.implementation.createHTMLDocument("");
  const none = findVideoElements(emptyDoc);
  assertEqual(none.length, 0, "findVideoElements returns [] when there are no videos");

  // The discovery call must not modify the page: outerHTML is unchanged.
  const before = document.body.innerHTML;
  findVideoElements();
  record(document.body.innerHTML === before, "discovery does not modify the page");
});
