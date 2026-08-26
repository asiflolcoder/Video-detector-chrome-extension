"use strict";

// Best-candidate selection over already-scored candidate objects (plain data,
// typically metadata extended with score/reasons by the caller). Pure function:
// no DOM access, no page rescans, no mutation of the given candidates.

/**
 * Safe score read. Malformed or unscored entries sort below every real
 * candidate instead of throwing.
 */
function candidateScore(candidate) {
  if (!candidate || typeof candidate !== "object") return -1;
  const value = candidate.score;
  return (typeof value === "number" && Number.isFinite(value)) ? value : -1;
}

/**
 * Safe rendered-area read; malformed entries cannot win a size tie-break.
 */
function candidateArea(candidate) {
  if (!candidate || typeof candidate !== "object") return -1;
  const value = candidate.area;
  return (typeof value === "number" && Number.isFinite(value) && value >= 0) ? value : -1;
}

/**
 * True when challenger should displace incumbent under the documented rules:
 * 1. higher score wins,
 * 2. equal score falls back to larger rendered area,
 * 3. equal score AND area keeps the incumbent, which makes ties resolve to
 *    the earliest candidate in the original document order (strictly-greater
 *    comparisons are what guarantee this stability).
 */
function isStrongerThan(challenger, incumbent) {
  const scoreDifference = candidateScore(challenger) - candidateScore(incumbent);
  if (scoreDifference > 0) return true;
  if (scoreDifference < 0) return false;
  return candidateArea(challenger) > candidateArea(incumbent);
}

/**
 * Returns the strongest candidate, or null for empty/invalid input. The
 * returned value is one of the given objects (same reference), never a copy.
 */
function selectBestVideo(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  let best = candidates[0];
  for (let index = 1; index < candidates.length; index += 1) {
    if (isStrongerThan(candidates[index], best)) best = candidates[index];
  }
  return best;
}

// Shared top-level name so the same file works in the content script and in
// the verification harness (no bundler; classic scripts share this scope).
window.selectBestVideo = selectBestVideo;
