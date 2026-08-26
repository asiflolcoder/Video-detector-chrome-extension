"use strict";

// Tiny shared test harness. Suites register themselves via defineSuite(); a
// page then runs selected suites with runSuites(). No framework, and the only
// global added is the single window.VD namespace object.

window.VD = (function () {

  const registry = [];

  /**
   * Registers a named test suite. The body receives a recorder object with
   * record()/assertTrue()/assertFalse()/assertEqual()/assertNull() helpers.
   */
  function defineSuite(name, body) {
    registry.push({ name: name, body: body });
  }

  /**
   * Creates assertion helpers appending PASS/FAIL entries to listElement.
   */
  function createRecorder(listElement) {
    const counts = { passed: 0, failed: 0 };

    function record(ok, name, detail) {
      const li = document.createElement("li");
      li.className = ok ? "pass" : "fail";
      li.textContent = (ok ? "PASS " : "FAIL ") + name +
        (detail !== undefined && detail !== null && detail !== "" ? " — " + detail : "");
      listElement.appendChild(li);
      counts[ok ? "passed" : "failed"] += 1;
    }

    return {
      record: record,
      assertTrue: function (value, name) { record(value === true, name, "got " + value); },
      assertFalse: function (value, name) { record(value === false, name, "got " + value); },
      assertEqual: function (actual, expected, name) {
        record(actual === expected, name, "expected " + expected + ", got " + actual);
      },
      assertNull: function (value, name) { record(value === null, name, "expected null, got " + value); },
      counts: function () { return { passed: counts.passed, failed: counts.failed }; }
    };
  }

  // Creates a configured <video> for layout-dependent tests.
  function makeVideo(attrs, styleText) {
    const video = document.createElement("video");
    Object.keys(attrs || {}).forEach(function (key) { video.setAttribute(key, attrs[key]); });
    if (styleText) video.setAttribute("style", styleText);
    return video;
  }

  // Appends a temporary container, runs fn(host), always removes it again.
  function withHost(fn) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    try { fn(host); } finally { host.remove(); }
  }

  /**
   * Runs the named suites into containerEl (one section per suite) and
   * returns aggregate totals plus a per-suite breakdown. A missing suite or
   * an exception thrown inside one becomes a recorded failure, never a crash
   * of the whole run.
   */
  function runSuites(containerEl, suiteNames) {
    let totalPassed = 0;
    let totalFailed = 0;
    const perSuite = [];

    suiteNames.forEach(function (name) {
      const heading = document.createElement("h3");
      heading.textContent = "Suite: " + name;
      containerEl.appendChild(heading);

      const suite = registry.find(function (entry) { return entry.name === name; });
      if (!suite) {
        totalFailed += 1;
        perSuite.push({ name: name, passed: 0, failed: 1 });
        heading.textContent = "Suite: " + name + " (not registered)";
        return;
      }

      const list = document.createElement("ul");
      containerEl.appendChild(list);

      // Suites see one object: assertion helpers plus shared DOM utilities.
      const helpers = Object.assign(createRecorder(list), {
        makeVideo: makeVideo,
        withHost: withHost
      });
      try {
        suite.body(helpers);
      } catch (error) {
        helpers.record(false, "suite threw an exception", String(error));
      }

      const result = helpers.counts();
      totalPassed += result.passed;
      totalFailed += result.failed;
      perSuite.push({ name: name, passed: result.passed, failed: result.failed });
    });

    return { totalPassed: totalPassed, totalFailed: totalFailed, perSuite: perSuite };
  }

  return {
    defineSuite: defineSuite,
    runSuites: runSuites,
    makeVideo: makeVideo,
    withHost: withHost
  };
})();
