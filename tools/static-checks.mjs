#!/usr/bin/env node
// Static security and policy checks for this extension. Run: node tools/static-checks.mjs
// Exits non-zero when any violation is found, so CI-style gates can rely on it.
"use strict";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const violations = [];

function fail(message) { violations.push(message); }

// --- 1. Forbidden patterns in shipped sources ------------------------------
const sourcePatterns = [
  { re: /\beval\s*\(/, why: "eval() is forbidden (no dynamic code)" },
  { re: /new\s+Function\b/, why: "new Function() is forbidden (no dynamic code)" },
  { re: /\.innerHTML\s*=/, why: "innerHTML assignment is forbidden" },
  { re: /\.outerHTML\s*=/, why: "outerHTML assignment is forbidden" },
  { re: /insertAdjacentHTML/, why: "insertAdjacentHTML is forbidden" },
  { re: /document\.write/, why: "document.write is forbidden" },
  { re: /setTimeout\s*\(\s*["'`]/, why: "string setTimeout is forbidden (dynamic code)" },
  { re: /setInterval\s*\(\s*["'`]/, why: "string setInterval is forbidden (dynamic code)" },
  { re: /importScripts/, why: "importScripts is forbidden (remote code loading)" },
  { re: /https?:\/\/[^"' )]+\.(js|mjs)(?![\w.-]*\/)/i, why: "possible remote script URL" }
];

const sourceDir = join(root, "content", "src");
const files = readdirSync(sourceDir).filter(f => f.endsWith(".js"));
for (const file of files) {
  const text = readFileSync(join(sourceDir, file), "utf8");
  for (const { re, why } of sourcePatterns) {
    if (re.test(text)) fail(`${file}: ${why}`);
  }
}

// --- 2. Manifest policy -----------------------------------------------------
let manifest;
try {
  manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
} catch (error) {
  fail(`manifest.json does not parse as JSON: ${error.message}`);
  manifest = null;
}

if (manifest) {
  if (manifest.manifest_version !== 3) fail("manifest_version must be 3");

  if (manifest.permissions && manifest.permissions.length > 0)
    fail(`permissions must be empty, found: ${JSON.stringify(manifest.permissions)}`);

  if (manifest.host_permissions && manifest.host_permissions.length > 0)
    fail(`host_permissions must be empty, found: ${JSON.stringify(manifest.host_permissions)}`);

  if (manifest.web_accessible_resources !== undefined)
    fail("web_accessible_resources must not be declared");

  if (manifest.background !== undefined)
    fail("no background/service worker should be declared yet");

  const scripts = manifest.content_scripts?.[0]?.js ?? [];
  const expectedOrder = [
    "content/src/detector.js",
    "content/src/visibility.js",
    "content/src/playback.js",
    "content/src/metadata.js",
    "content/src/scorer.js",
    "content/src/selection.js",
    "content/src/content.js"
  ];
  if (JSON.stringify(scripts) !== JSON.stringify(expectedOrder))
    fail(`content script order mismatch.\n  expected: ${expectedOrder.join(",")}\n  actual:   ${scripts.join(",")}`);

  const matches = manifest.content_scripts?.[0]?.matches ?? [];
  if (matches.some(m => m.startsWith("<")))
    fail("match patterns must not use wildcard schemes like <all_urls>");

  if (!/^\d+\.\d+\.\d+$/.test(String(manifest.version)))
    fail("version must be semver-like x.y.z");
}

// --- Report ------------------------------------------------------------------
if (violations.length > 0) {
  console.error(`static-checks: ${violations.length} violation(s):`);
  for (const v of violations) console.error("  ✗ " + v);
  process.exit(1);
}

console.log(`static-checks: OK (${files.length} source files checked, manifest policy clean)`);
