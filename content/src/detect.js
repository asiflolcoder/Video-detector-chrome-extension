"use strict";

globalThis.VideoDetect = globalThis.VideoDetect || {};

/**
 * Returns the highest-scoring candidate, or null when given none.
 * Ties resolve to the earliest candidate so results follow document order.
 */
function selectBest(candidates) {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (VideoDetect.scoreCandidate(candidate) > VideoDetect.scoreCandidate(best)) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Detects the most relevant video in a document, or null when there is none.
 */
function detectMostRelevant(doc) {
  return selectBest(VideoDetect.collectCandidates(doc));
}

VideoDetect.selectBest = selectBest;
VideoDetect.detectMostRelevant = detectMostRelevant;
