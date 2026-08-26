"use strict";

globalThis.VideoDetect = globalThis.VideoDetect || {};

/**
 * Returns the rendered visible area of an element in square pixels.
 */
function visibleArea(element) {
  const rect = element.getBoundingClientRect();
  const width = Math.max(0, rect.width);
  const height = Math.max(0, rect.height);
  return width * height;
}

/**
 * True when the element is not hidden through styles.
 * The "hidden" attribute resolves to display:none in the UA stylesheet,
 * so the computed-style check covers it as well.
 */
function isNotHiddenByStyle(element) {
  const style = element.ownerDocument.defaultView.getComputedStyle(element);
  if (style.display === "none") return false;
  if (style.visibility === "hidden" || style.visibility === "collapse") return false;
  return true;
}

/**
 * Builds a candidate descriptor for a video element, or null when the video
 * is not a plausible on-page candidate.
 *
 * aria-hidden marks decorative content (e.g. background/hero loops) per WCAG;
 * such videos are not something a user watches, so they are excluded.
 */
function toCandidate(video) {
  if (video.getAttribute("aria-hidden") === "true") return null;
  if (!isNotHiddenByStyle(video)) return null;
  const area = visibleArea(video);
  if (area === 0) return null;
  return { element: video, area };
}

/**
 * Returns every <video> element in a document, in document order.
 */
function collectVideos(doc) {
  return Array.from(doc.querySelectorAll("video"));
}

/**
 * Returns candidate descriptors for every visible, rendered video in a document.
 * A descriptor is { element, area } so later steps avoid re-reading layout.
 */
function collectCandidates(doc) {
  const candidates = [];
  for (const video of collectVideos(doc)) {
    const candidate = toCandidate(video);
    if (candidate !== null) candidates.push(candidate);
  }
  return candidates;
}

VideoDetect.collectVideos = collectVideos;
VideoDetect.collectCandidates = collectCandidates;
VideoDetect.toCandidate = toCandidate;
