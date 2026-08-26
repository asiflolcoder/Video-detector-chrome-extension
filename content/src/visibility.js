"use strict";

// Read-only visibility analysis for <video> elements. Only inspects geometry
// (getBoundingClientRect) and computed styles (getComputedStyle); never
// touches the element, the page, or playback state.

// Opacity at or below this value reads as invisible to a viewer because any
// remaining alpha produces less than ~1% pixel intensity change.
const OPACITY_EPSILON = 0.01;

/**
 * True when the element has been laid out with nonzero rendered size.
 */
function rectHasSize(rect) {
  return rect.width > 0 && rect.height > 0;
}

/**
 * A video is visible when it renders with size, is displayed, is not marked
 * hidden, and is not transparent. Deliberately no occlusion detection here
 * (later scope) and no scoring (a later task).
 *
 * Callers that already measured the element may pass its bounding rect as the
 * optional second argument to avoid forcing another layout.
 */
function isVideoVisible(video, rect) {
  const measured = rect || video.getBoundingClientRect();
  if (!rectHasSize(measured)) return false;

  const style = window.getComputedStyle(video);
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;

  const opacity = parseFloat(style.opacity);
  if (!Number.isFinite(opacity) || opacity <= OPACITY_EPSILON) return false;

  return true;
}

/**
 * How much of the element intersects the browser viewport.
 *
 * Returns { viewportWidth, viewportHeight, intersectionWidth,
 * intersectionHeight, intersectingArea, fraction } where fraction is the
 * share of the element's own area inside the viewport (0..1). A zero-size
 * element yields fraction 0 instead of dividing by zero.
 *
 * An already-measured bounding rect may be passed via the optional second
 * argument so one measurement serves metadata, visibility, and intersection.
 */
function getViewportIntersection(video, rect) {
  const measured = rect || video.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const left = Math.max(measured.left, 0);
  const top = Math.max(measured.top, 0);
  const right = Math.min(measured.right, viewportWidth);
  const bottom = Math.min(measured.bottom, viewportHeight);

  const intersectionWidth = Math.max(right - left, 0);
  const intersectionHeight = Math.max(bottom - top, 0);
  const intersectingArea = intersectionWidth * intersectionHeight;

  const elementArea = measured.width * measured.height;
  const rawFraction = elementArea > 0 ? intersectingArea / elementArea : 0;
  // Rounded so log output stays readable; 4 decimals is plenty for ranking.
  const fraction = Math.round(rawFraction * 10000) / 10000;

  return {
    viewportWidth: viewportWidth,
    viewportHeight: viewportHeight,
    intersectionWidth: intersectionWidth,
    intersectionHeight: intersectionHeight,
    intersectingArea: intersectingArea,
    fraction: fraction
  };
}

// Shared top-level names so the same files work in the content script and in
// the verification harness (no bundler; classic scripts share this scope).
window.isVideoVisible = isVideoVisible;
window.getViewportIntersection = getViewportIntersection;
