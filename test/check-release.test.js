import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { requiresRelease, runCheckRelease, runCheckReleaseCli } from "../scripts/check-release.mjs";

test("requiresRelease identifies package, public asset, and source changes", () => {
  assert.equal(requiresRelease(["README.md"]), false);
  assert.equal(requiresRelease(["package.json"]), true);
  assert.equal(requiresRelease(["public/app.js"]), true);
  assert.equal(requiresRelease(["src/server.js"]), true);
});

test("runCheckRelease requires a base reference", () => {
  assert.throws(() => runCheckRelease({ baseRef: "" }), /BASE_REF is required/);
});

test("runCheckRelease skips first pushes and non-release changes", () => {
  const localThis = { called: false };
  const verifyReleaseNotesAgainstBaseImpl = () => {
    localThis.called = true;
    return [];
  };

  assert.deepEqual(
    runCheckRelease({
      baseRef: "0000000000000000000000000000000000000000",
      verifyReleaseNotesAgainstBaseImpl,
    }),
    [],
  );
  assert.deepEqual(
    runCheckRelease({
      baseRef: "origin/main",
      readChangedFilesImpl: () => ["README.md"],
      verifyReleaseNotesAgainstBaseImpl,
    }),
    [],
  );
  assert.equal(localThis.called, false);
});

test("runCheckRelease delegates release-relevant changes to the validator", () => {
  assert.deepEqual(
    runCheckRelease({
      baseRef: "origin/main",
      readChangedFilesImpl: () => ["src/server.js"],
      verifyReleaseNotesAgainstBaseImpl: () => ["version must increase"],
    }),
    ["version must increase"],
  );
});

test("runCheckRelease reads an empty Git diff by default", () => {
  assert.deepEqual(runCheckRelease({ baseRef: "HEAD" }), []);
});

test("runCheckReleaseCli reports validation failures", () => {
  const localThis = { output: "", exitCode: null };

  runCheckReleaseCli({
    baseRef: "origin/main",
    readChangedFilesImpl: () => ["src/server.js"],
    verifyReleaseNotesAgainstBaseImpl: () => ["version must increase"],
    stderr: { write: (message) => (localThis.output += message) },
    exit: (code) => {
      localThis.exitCode = code;
    },
  });

  assert.equal(localThis.output, "version must increase\n");
  assert.equal(localThis.exitCode, 1);
});

test("runCheckReleaseCli succeeds without validation errors", () => {
  const localThis = { exitCode: null };

  runCheckReleaseCli({
    baseRef: "origin/main",
    readChangedFilesImpl: () => ["src/server.js"],
    verifyReleaseNotesAgainstBaseImpl: () => [],
    exit: (code) => {
      localThis.exitCode = code;
    },
  });

  assert.equal(localThis.exitCode, null);
});

test("runs the release gate from the command line", () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../scripts/check-release.mjs", import.meta.url))],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        BASE_REF: "0000000000000000000000000000000000000000",
      },
    },
  );

  assert.equal(result.status, 0);
});
