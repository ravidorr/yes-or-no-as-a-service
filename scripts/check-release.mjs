import { execFileSync } from "node:child_process";

import { isExecutedModule } from "../src/run-if-main.js";
import { verifyReleaseNotesAgainstBase } from "./release-notes.mjs";

export function requiresRelease(changedFiles) {
  return changedFiles.some(
    (file) => file === "package.json" || file === "tsconfig.json" || file.startsWith("src/"),
  );
}

export function runCheckRelease({
  baseRef = process.env.BASE_REF,
  readChangedFilesImpl = (ref) =>
    execFileSync("git", ["diff", "--name-only", `${ref}...HEAD`], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean),
  verifyReleaseNotesAgainstBaseImpl = verifyReleaseNotesAgainstBase,
} = {}) {
  if (!baseRef) {
    throw new Error("BASE_REF is required");
  }

  if (/^0+$/.test(baseRef) || !requiresRelease(readChangedFilesImpl(baseRef))) {
    return [];
  }

  return verifyReleaseNotesAgainstBaseImpl(baseRef);
}

export function runCheckReleaseCli({
  stderr = process.stderr,
  exit = process.exit,
  ...options
} = {}) {
  const errors = runCheckRelease(options);

  if (errors.length > 0) {
    for (const error of errors) {
      stderr.write(`${error}\n`);
    }

    exit(1);
  }
}

if (isExecutedModule(import.meta.url)) {
  runCheckReleaseCli();
}
