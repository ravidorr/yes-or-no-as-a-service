import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import packageInfo from "../package.json" with { type: "json" };

import {
  validateSecurityPolicyFiles,
  validateSecurityPolicyVersion,
} from "./validate-security-policy-version.mjs";

const supportedStatus = String.fromCodePoint(0x2713);
const policyFor = (version) => `## Supported Versions

| Version | Supported |
| ------- | --------- |
| ${version} | ${supportedStatus} |
| Earlier releases | ✘ |
`;

test("accepts the exact package version", () => {
  assert.deepEqual(
    validateSecurityPolicyVersion('{"version":"1.2.3"}', policyFor("1.2.3")),
    { valid: true, version: "1.2.3" },
  );
});

test("rejects policies that support an additional release", () => {
  const policy = `## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.2.3 | ${supportedStatus} |
| 1.2.2 | ${supportedStatus} |
| Earlier releases | ✘ |
`;

  assert.deepEqual(
    validateSecurityPolicyVersion('{"version":"1.2.3"}', policy),
    {
      valid: false,
      error:
        "SECURITY.md supports 1.2.2 in addition to package.json version 1.2.3. Only the latest release may be supported.",
    },
  );
});

test("accepts SemVer build metadata when the policy matches exactly", () => {
  const version = "1.2.3+build.4";
  assert.deepEqual(
    validateSecurityPolicyVersion(`{"version":"${version}"}`, policyFor(version)),
    { valid: true, version },
  );
});

test("rejects prerelease package versions", () => {
  assert.equal(
    validateSecurityPolicyVersion('{"version":"1.2.3-beta.1"}', policyFor("1.2.3")).valid,
    false,
  );
});

test("rejects an invalid package manifest", () => {
  assert.deepEqual(
    validateSecurityPolicyVersion('{"version":', policyFor("1.2.3")),
    { valid: false, error: "package.json must contain an exact stable SemVer version." },
  );
});

test("uses only the table in the Supported Versions section", () => {
  const policy = `## Example

| Version | Supported |
| ------- | --------- |
| 1.2.2 | ${supportedStatus} |

${policyFor("1.2.3")}`;
  assert.deepEqual(
    validateSecurityPolicyVersion('{"version":"1.2.3"}', policy),
    { valid: true, version: "1.2.3" },
  );
});

test("rejects a malformed supported-versions table", () => {
  const policy = `## Supported Versions

| Version | Supported |
This is not a table delimiter.
| 1.2.3 | ${supportedStatus} |`;
  assert.equal(
    validateSecurityPolicyVersion('{"version":"1.2.3"}', policy).error,
    "SECURITY.md is missing a supported-versions table.",
  );
});

test("rejects a matching version that the policy marks unsupported", () => {
  const policy = `## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.2.3 | ✘ |
`;

  assert.deepEqual(
    validateSecurityPolicyVersion('{"version":"1.2.3"}', policy),
    {
      valid: false,
      error: "SECURITY.md declares 1.2.3 as unsupported. Mark the package version as supported.",
    },
  );
});

test("rejects a policy that supports a different version", () => {
  assert.deepEqual(
    validateSecurityPolicyVersion('{"version":"1.2.3"}', policyFor("1.2.2")),
    {
      valid: false,
      error: "SECURITY.md supports 1.2.2, but package.json declares 1.2.3. Update SECURITY.md.",
    },
  );
});

test("rejects a policy with no supported version", () => {
  const policy = `## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.2.2 | ✘ |
`;

  assert.deepEqual(
    validateSecurityPolicyVersion('{"version":"1.2.3"}', policy),
    { valid: false, error: "SECURITY.md has no enabled supported-version row." },
  );
});

test("reads package and policy files", () => {
  const directory = mkdtempSync(join(tmpdir(), "security-policy-"));

  try {
    const packageJsonPath = join(directory, "package.json");
    const policyPath = join(directory, "SECURITY.md");
    writeFileSync(packageJsonPath, '{"version":"1.2.3"}');
    writeFileSync(policyPath, policyFor("1.2.3"));

    assert.deepEqual(
      validateSecurityPolicyFiles(packageJsonPath, policyPath),
      { valid: true, version: "1.2.3" },
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("reports unreadable package or policy files", () => {
  assert.match(
    validateSecurityPolicyFiles("missing-package.json", "missing-security.md").error,
    /^Unable to read security policy files: ENOENT:/,
  );
});

test("reports an unreadable security policy after reading the package manifest", () => {
  const directory = mkdtempSync(join(tmpdir(), "security-policy-"));

  try {
    const packageJsonPath = join(directory, "package.json");
    writeFileSync(packageJsonPath, '{"version":"1.2.3"}');

    assert.match(
      validateSecurityPolicyFiles(packageJsonPath, join(directory, "missing-security.md")).error,
      /^Unable to read security policy files: ENOENT:/,
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("reports non-error file read failures", () => {
  assert.deepEqual(
    validateSecurityPolicyFiles("package.json", "SECURITY.md", {
      readFileSyncImpl: () => {
        throw "unavailable";
      },
    }),
    { valid: false, error: "Unable to read security policy files: unavailable" },
  );
});

test("runs successfully from the command line", () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./validate-security-policy-version.mjs", import.meta.url))],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout, `SECURITY.md supports package version ${packageInfo.version}.\n`);
  assert.equal(result.stderr, "");
});

test("reports validation failures from the command line", () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./validate-security-policy-version.mjs", import.meta.url)),
      "missing-package.json",
      "missing-security.md",
    ],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /^Unable to read security policy files: ENOENT:/);
});
