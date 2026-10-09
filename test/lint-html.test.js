import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { listHtmlFiles, runLintHtml } from "../scripts/lint-html.mjs";

test("listHtmlFiles returns tracked HTML files", () => {
  assert.deepEqual(
    listHtmlFiles({
      execFileSyncImpl: () => "public/index.html\npublic/404.html\n",
    }),
    ["public/index.html", "public/404.html"],
  );
});

test("runLintHtml succeeds without HTML files", () => {
  const localThis = { output: "", exitCode: null };

  const result = runLintHtml({
    execFileSyncImpl: () => "",
    stdout: { write: (message) => (localThis.output += message) },
    exit: (code) => {
      localThis.exitCode = code;
    },
  });

  assert.deepEqual(result, { status: 0 });
  assert.equal(localThis.output, "lint-html: no HTML files, nothing to validate.\n");
  assert.equal(localThis.exitCode, 0);
});

test("runLintHtml returns the HTML validator status", () => {
  const localThis = { command: null, args: null, options: null, exitCode: null };

  const result = runLintHtml({
    execFileSyncImpl: () => "public/index.html\n",
    spawnSyncImpl: (command, args, options) => {
      localThis.command = command;
      localThis.args = args;
      localThis.options = options;
      return { status: 1 };
    },
    exit: (code) => {
      localThis.exitCode = code;
    },
  });

  assert.deepEqual(result, { status: 1 });
  assert.equal(localThis.command, "npx");
  assert.deepEqual(localThis.args, ["html-validate", "public/index.html"]);
  assert.deepEqual(localThis.options, { stdio: "inherit" });
  assert.equal(localThis.exitCode, 1);
});

test("runLintHtml treats a missing validator exit status as failure", () => {
  const localThis = { exitCode: null };

  const result = runLintHtml({
    execFileSyncImpl: () => "public/index.html\n",
    spawnSyncImpl: () => ({ status: null }),
    exit: (code) => {
      localThis.exitCode = code;
    },
  });

  assert.deepEqual(result, { status: 1 });
  assert.equal(localThis.exitCode, 1);
});

test("runs the HTML linter from the command line", () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../scripts/lint-html.mjs", import.meta.url))],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0);
});
