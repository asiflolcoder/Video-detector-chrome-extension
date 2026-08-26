"use strict";

// Read-only playback analysis. Never calls play()/pause(), never seeks, and
// never attaches event listeners (a later phase may observe state instead).

// Conservative threshold: HAVE_FUTURE_DATA (3) means the browser holds the
// current frame AND data for upcoming frames, so playback would not stall
// immediately. HAVE_CURRENT_DATA (2) only guarantees the current frame.
// False "playing" reports would corrupt later ranking, so we prefer under-
// reporting over over-reporting here.
const MINIMUM_READY_STATE_FOR_PLAYBACK = 3;

/**
 * Playback snapshot for one video as a plain object.
 *
 * isPlaying is deliberately conservative: not paused, not ended, and enough
 * buffered data to keep rendering frames (readyState >= 3).
 */
function getPlaybackState(video) {
  const paused = video.paused;
  const ended = video.ended;
  const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  const duration = Number.isFinite(video.duration) ? video.duration : null;

  return {
    paused: paused,
    ended: ended,
    currentTime: currentTime,
    duration: duration,
    isPlaying: !paused && !ended && video.readyState >= MINIMUM_READY_STATE_FOR_PLAYBACK
  };
}

// Shared top-level name so the same file works in the content script and in
// the verification harness (no bundler; classic scripts share this scope).
window.getPlaybackState = getPlaybackState;
