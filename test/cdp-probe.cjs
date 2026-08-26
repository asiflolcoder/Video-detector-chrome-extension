"use strict";
// Throwaway CDP harness (no npm; uses Node's built-in WebSocket) to inspect a
// real page's DOM and validate our video-detection assumptions against the
// live page. Walks open shadow roots and compares with our current detection.
// Usage: node test/cdp-probe.cjs <chromePath> <url>

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const chromePath = process.argv[2];
const targetUrl = process.argv[3];
if (!chromePath || !targetUrl) {
  console.error("usage: node test/cdp-probe.cjs <chromePath> <url>");
  process.exit(1);
}

const PORT = 9333;
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-profile-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jsonGet(urlPath) {
  return new Promise((resolve, reject) => {
    const http = require("http");
    http
      .get({ host: "127.0.0.1", port: PORT, path: urlPath }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(JSON.parse(d)));
      })
      .on("error", reject);
  });
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = () => reject(new Error("websocket error"));
      this.ws.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id && this.pending.has(m.id)) {
          const { resolve, reject } = this.pending.get(m.id);
          this.pending.delete(m.id);
          if (m.error) reject(new Error(JSON.stringify(m.error)));
          else resolve(m.result);
        }
      };
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}
// Embed our real source + a deep-walk probe into a single expression to eval
// on the live page. Inlined directly: the source modules use plain string
// concatenation (no template literals), so they embed safely.
function buildExpression() {
  const base = path.join(__dirname, "..", "content", "src");
  const src = ["collect.js", "score.js", "detect.js"]
    .map((f) => fs.readFileSync(path.join(base, f), "utf8"))
    .join(";");

  const probe = `
    (function () {
      const result = {};
      result.url = location.href;

      result.shallowVideos = document.querySelectorAll("video").length;
      const cands = VideoDetect.collectCandidates(document);
      result.currentCandidatesListed = cands.length;
      const detected = VideoDetect.detectMostRelevant(document);
      result.currentDetected = detected === null
        ? null
        : { area: detected.area, src: detected.element.currentSrc || detected.element.getAttribute("src") };

      const deep = [];
      function describe(el) {
        const r = el.getBoundingClientRect();
        return {
          area: Math.round(r.width * r.height),
          dims: Math.round(r.width) + "x" + Math.round(r.height),
          display: getComputedStyle(el).display,
          visibility: getComputedStyle(el).visibility,
          ariaHidden: el.getAttribute("aria-hidden") || null,
          controls: el.controls,
          src: el.currentSrc || el.getAttribute("src") || el.src || null
        };
      }
      let openShadowHosts = 0;
      function scan(root, pathStr) {
        const all = root.querySelectorAll ? Array.from(root.querySelectorAll("*")) : [];
        for (const el of all) {
          if (el.tagName === "VIDEO") deep.push({ path: pathStr, ...describe(el) });
          if (el.shadowRoot) { openShadowHosts++; scan(el.shadowRoot, pathStr + " > " + el.tagName + "::shadow"); }
        }
      }
      scan(document, "document");
      result.deepVideos = deep;
      result.openShadowHosts = openShadowHosts;

      result.deepCandidates = deep.filter(function (v) {
        return v.display !== "none" && v.visibility !== "hidden" &&
               v.ariaHidden !== "true" && v.area > 0;
      }).length;
      return result;
    })()
  `;
  return "(function(){ " + src + " ; return (" + probe + ") })()";
}
async function main() {
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
      "--remote-debugging-port=" + PORT,
      "--user-data-dir=" + profileDir,
      "--no-first-run",
      "--window-size=1280,900",
      targetUrl
    ],
    { stdio: "ignore" }
  );

  try {
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try {
        targets = await jsonGet("/json/list");
        if (targets.length) break;
      } catch (e) {}
      await sleep(500);
    }
    if (!targets) throw new Error("Chrome CDP never came up");

    const page = targets.find((t) => t.type === "page" && t.url.indexOf("youtube") !== -1);
    if (!page) throw new Error("No youtube page target: " + JSON.stringify(targets.map((t) => t.url)));

    const cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    for (let i = 0; i < 40; i++) {
      const r = await cdp.send("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
      if (r.result.value === "complete") break;
      await sleep(500);
    }
    await sleep(8000); // allow YouTube to build its player

    const expr = buildExpression();
    const out = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true });
    if (out.exceptionDetails) {
      console.log("PROBE_EXCEPTION_BEGIN");
      console.log(JSON.stringify(out.exceptionDetails, null, 2));
      console.log("PROBE_EXCEPTION_END");
    } else {
      console.log("PROBE_RESULT_BEGIN");
      console.log(JSON.stringify(out.result && out.result.value, null, 2));
      console.log("PROBE_RESULT_END");
      if (out.result && out.result.value === undefined) {
        console.log("PROBE_RAW_OUT_BEGIN");
        console.log(JSON.stringify(out, null, 2).slice(0, 4000));
        console.log("PROBE_RAW_OUT_END");
      }
    }
  } finally {
    chrome.kill();
    try {
      require("child_process").execSync("rmdir /s /q " + profileDir, { stdio: "ignore" });
    } catch (e) {}
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("PROBE ERROR:", e && e.stack ? e.stack : e);
  process.exit(1);
});