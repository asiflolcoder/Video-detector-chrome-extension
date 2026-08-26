"use strict";

// Returns every <video> element in the current document, in document order.
// Returns an empty array (never throws) when there are no videos.
// Scope of Task 2: no iframes, no Shadow DOM, no scoring, no page changes.
function findVideoElements(doc) {
  if (doc === undefined) {
    doc = window.document;
  }
  return Array.from(doc.querySelectorAll("video"));
}

// Shared top-level name so the same file works in the content script and in
// the verification test page (no bundler; classic scripts share this scope).
window.findVideoElements = findVideoElements;