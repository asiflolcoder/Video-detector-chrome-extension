"use strict";

// Reads safe, computed properties from an HTMLVideoElement into a plain data
// object. Metadata only — never mutates the video and never changes playback
// state (no play()/pause(), no seeking). visibility.js must load before this
// module; playback.js likewise (used for playbackState). No score yet.

/**
 * True when the video exposes any media source: a src attribute, a MediaStream
 * via srcObject, or a <source> child. This backs the "src presence" field.
 */
function hasSource(video) {
  if (video.getAttribute("src")) return true;
  if (video.srcObject) return true;
  if (typeof video.querySelector === "function" && video.querySelector("source")) return true;
  return false;
}

/**
 * Rounds a rendered dimension, or 0 when the element has not been laid out.
 */
function roundedDimension(pixels) {
  return pixels > 0 ? Math.round(pixels) : 0;
}

/**
 * Collects metadata for one video element into a plain object.
 *
 * The bounding rect is measured exactly once and shared with visibility.js
 * (optional second argument), so analysis forces at most one layout pass per
 * video.
 *
 * Returns the raw values for booleans; returns numbers directly. For duration,
 * NaN and Infinity may legitimately occur before metadata loads, so those are
 * replaced with null here (the caller can decide how to treat them). width,
 * height, and area are never NaN because they come from safe rounding.
 */
function getVideoMetadata(video) {
  const rect = video.getBoundingClientRect();
  const width = roundedDimension(rect.width);
  const height = roundedDimension(rect.height);
  const duration = Number.isFinite(video.duration) ? video.duration : null;
  return {
    element: video,
    width: width,
    height: height,
    area: width * height,
    currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
    duration: duration,
    paused: video.paused,
    muted: video.muted,
    volume: Number.isFinite(video.volume) ? video.volume : null,
    readyState: video.readyState,
    controls: video.controls,
    hasSource: hasSource(video),
    // From visibility.js (analysis remains pure reads of geometry/styles):
    visible: isVideoVisible(video, rect),
    viewportIntersection: getViewportIntersection(video, rect),
    // From playback.js:
    playbackState: getPlaybackState(video)
  };
}

// Shared top-level name so the same file works in the content script and in
// the verification harness (no bundler; classic scripts share this scope).
window.getVideoMetadata = getVideoMetadata;