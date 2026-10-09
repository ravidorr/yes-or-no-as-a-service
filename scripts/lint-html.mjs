import { execFileSync, spawnSync } from "node:child_process";
import { isExecutedModule } from "../src/run-if-main.js";

export function listHtmlFiles({ execFileSyncImpl = execFileSync } = {}) {
  return execFileSyncImpl(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "*.html"],
    { encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
}

export function runLintHtml({
  execFileSyncImpl = execFileSync,
  spawnSyncImpl = spawnSync,
  stdout = process.stdout,
  exit = process.exit,
} = {}) {
  const files = listHtmlFiles({ execFileSyncImpl });

  if (files.length === 0) {
    stdout.write("lint-html: no HTML files, nothing to validate.\n");
    exit(0);
    return { status: 0 };
  }

  const result = spawnSyncImpl("npx", ["html-validate", ...files], { stdio: "inherit" });
  const status = result.status ?? 1;
  exit(status);
  return { status };
}

if (isExecutedModule(import.meta.url)) {
  runLintHtml();
}
