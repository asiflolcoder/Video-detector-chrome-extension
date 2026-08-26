"use strict";

globalThis.VideoDetect = globalThis.VideoDetect || {};

// Relevance bonuses relative to the candidate's visible area.
// Area is the dominant signal; these bonuses only reorder candidates whose
// sizes are within a similar magnitude.
const SOURCE_BONUS_RATIO = 0.5;
const CONTROLS_BONUS_RATIO = 0.25;

/**
 * True when the video has a loadable media source: src attribute, srcObject,
 * or a <source> child with src/srcset.
 */
function hasLoadableSource(video) {
  if (video.getAttribute("src")) return true;
  if (video.srcObject) return true;
  const sources = video.querySelectorAll("source");
  for (const source of sources) {
    if (source.getAttribute("src") || source.getAttribute("srcset")) return true;
  }
  return false;
}

/**
 * True when the video exposes native playback controls.
 */
function hasControls(video) {
  return video.controls;
}

/**
 * Relevance score for one candidate. Higher means more relevant.
 * A loadable source signals a real player; controls signal an interactive one.
 */
function scoreCandidate(candidate) {
  const { element, area } = candidate;
  if (area <= 0) return 0;
  let score = area;
  if (hasLoadableSource(element)) score += area * SOURCE_BONUS_RATIO;
  if (hasControls(element)) score += area * CONTROLS_BONUS_RATIO;
  return score;
}

VideoDetect.hasLoadableSource = hasLoadableSource;
VideoDetect.hasControls = hasControls;
VideoDetect.scoreCandidate = scoreCandidate;
