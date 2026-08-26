"use strict";

// Deterministic relevance scoring for one video-candidate metadata object
// (as produced by getVideoMetadata). Pure function over plain data: no DOM
// access here, no ML, no external APIs, no page modification.
//
// All tuning constants live at the top so the model can be adjusted in one
// place. Contributions are additive; a perfect candidate totals 100.

// --- Tuning constants ---------------------------------------------------
const SCORE_FOR_VISIBLE = 25;
const SCORE_FOR_LARGE_AREA = 25;
const LARGE_AREA_THRESHOLD_PX = 250000;        // e.g. ~640 x 390
const SCORE_FOR_MEDIUM_AREA = 12;
const MEDIUM_AREA_THRESHOLD_PX = 50000;       // e.g. ~320 x 156
const SCORE_FOR_MOSTLY_IN_VIEWPORT = 15;
const MOSTLY_IN_VIEWPORT_FRACTION = 0.75;
const SCORE_FOR_PLAYING = 15;
const SCORE_FOR_HAS_AUDIO = 10;
const SCORE_FOR_MEANINGFUL_DURATION = 10;
const MIN_MEANINGFUL_DURATION_SECONDS = 10;

/**
 * Scores one candidate metadata object.
 *
 * Returns { score, reasons }: score is a number (max 100), reasons lists the
 * explicit contributions that applied. Missing fields simply earn nothing,
 * so a malformed candidate cannot throw.
 */
function scoreVideo(candidate) {
  if (!candidate) return { score: 0, reasons: [] };

  let score = 0;
  const reasons = [];

  // 1. Visibility
  if (candidate.visible === true) {
    score += SCORE_FOR_VISIBLE;
    reasons.push("visible");
  }

  // 2. Rendered area (two tiers; large dominates medium)
  const area = typeof candidate.area === "number" ? candidate.area : 0;
  if (area >= LARGE_AREA_THRESHOLD_PX) {
    score += SCORE_FOR_LARGE_AREA;
    reasons.push("large-rendered-area");
  } else if (area >= MEDIUM_AREA_THRESHOLD_PX) {
    score += SCORE_FOR_MEDIUM_AREA;
    reasons.push("medium-rendered-area");
  }

  // 3. Viewport intersection
  const fraction = candidate.viewportIntersection && candidate.viewportIntersection.fraction;
  if (typeof fraction === "number" && fraction >= MOSTLY_IN_VIEWPORT_FRACTION) {
    score += SCORE_FOR_MOSTLY_IN_VIEWPORT;
    reasons.push("mostly-in-viewport");
  }

  // 4. Currently playing (conservative playback analysis from playback.js)
  if (candidate.playbackState && candidate.playbackState.isPlaying === true) {
    score += SCORE_FOR_PLAYING;
    reasons.push("currently-playing");
  }

  // 5. Audio: unmuted with non-silent volume
  if (candidate.muted === false &&
      typeof candidate.volume === "number" && candidate.volume > 0) {
    score += SCORE_FOR_HAS_AUDIO;
    reasons.push("has-audio");
  }

  // 6. Meaningful duration: known and not just a clip/loop fragment
  if (typeof candidate.duration === "number" &&
      candidate.duration >= MIN_MEANINGFUL_DURATION_SECONDS) {
    score += SCORE_FOR_MEANINGFUL_DURATION;
    reasons.push("meaningful-duration");
  }

  return { score: Math.round(score), reasons: reasons };
}

// Shared top-level name so the same file works in the content script and in
// the verification harness (no bundler; classic scripts share this scope).
window.scoreVideo = scoreVideo;
