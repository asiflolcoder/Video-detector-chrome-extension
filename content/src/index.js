"use strict";

globalThis.VideoDetect = globalThis.VideoDetect || {};

(function () {
  const LOG_TAG = "[VideoDetect]";
  const RESCAN_DELAY_MS = 400;

  function describeCandidate(candidate) {
    if (candidate === null) return "no candidate video found";
    const video = candidate.element;
    const source = video.currentSrc || video.getAttribute("src") || video.src || "(no source)";
    return (
      "most relevant video: " + source +
      " | area: " + candidate.area +
      " | score: " + VideoDetect.scoreCandidate(candidate)
    );
  }

  function report() {
    const candidate = VideoDetect.detectMostRelevant(document);
    console.log(LOG_TAG, describeCandidate(candidate));
  }

  let rescanTimer = null;
  function scheduleRescan() {
    clearTimeout(rescanTimer);
    rescanTimer = setTimeout(report, RESCAN_DELAY_MS);
  }

  // Only re-scan when a video element itself changed: a video was added or
  // removed, or its src/controls/hidden attributes changed. Ignoring unrelated
  // mutations avoids wasted scans on busy pages and feedback loops when page
  // code writes to the DOM (e.g. chat feeds, log panels).
  function isMutationRelevant(record) {
    if (record.type === "attributes") {
      return record.target.tagName === "VIDEO";
    }
    const nodes = [];
    for (const node of record.addedNodes) nodes.push(node);
    for (const node of record.removedNodes) nodes.push(node);
    return nodes.some(function (node) {
      return (
        node.nodeType === Node.ELEMENT_NODE &&
        (node.tagName === "VIDEO" || node.querySelector("video") !== null)
      );
    });
  }

  function handleMutations(records) {
    for (const record of records) {
      if (isMutationRelevant(record)) {
        scheduleRescan();
        return;
      }
    }
  }

  function watchForLateVideos() {
    if (document.documentElement === null) return;
    const observer = new MutationObserver(handleMutations);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset", "controls", "hidden"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      report();
      watchForLateVideos();
    });
  } else {
    report();
    watchForLateVideos();
  }
})();
