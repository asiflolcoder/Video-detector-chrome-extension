# Security Audit

Scope: Phase 1 detection pipeline (`manifest.json`, `content/src/*.js`).

## Verified properties (automated via tools/static-checks.mjs)
- Manifest V3; **no `permissions`, no `host_permissions`** — least privilege.
- No `web_accessible_resources`; no background/service worker declared yet.
- Match patterns limited to plain `http://*/*` and `https://*/*`.
- Sources contain no `eval()`, `new Function()`, string timers,
  `document.write`, HTML-injection sinks (`innerHTML`/`outerHTML`/
  `insertAdjacentHTML`), or remote script URLs.

## Isolation model
Content scripts execute in Chromium's **isolated world**: our variables are
invisible to page scripts and vice versa. All module output is data objects;
the only cross-boundary act is reading DOM state.

## Data handling
- Nothing is persisted (no `chrome.storage`, no cookies, no `localStorage`).
- Nothing is transmitted (no fetch/XHR/WebSocket anywhere).
- Extracted fields are limited to media/layout/playback properties of `<video>`
  elements themselves (Tasks 3–5 field lists). No page text, no user data.

## Mutation safety
Every suite asserts read-only behavior: markup unchanged, playback untouched,
no listeners attached, repeated reads stable.

## Forward-looking risk register (for later phases, not implemented)
| Future feature | Risk | Mitigation rule |
|---|---|---|
| Overlay UI injection | style/DOM leakage into pages | shadow-DOM isolated host; CSP-safe construction via createElement only |
| Popup/options pages | excess permissions creeping in | keep zero-permission posture; justify any addition in this audit first |
| Messaging to background | data exfiltration channel | never add without an explicit schema review here |
