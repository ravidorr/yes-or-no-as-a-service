import { readFileSync, writeFileSync } from 'node:fs';
import { isExecutedModule } from '../src/run-if-main.js';
import { assertValidGitRef } from './git-exec.mjs';
import {
  compareVersions,
  hasChangelogEntry,
  parseVersion,
  readChangelogAtRef,
  readPackageVersionAtRef,
  verifyReleaseNotesAgainstBase
} from './release-notes.mjs';

const DEFAULT_SUMMARY = 'Update dependencies.';
const MAX_SUMMARY_LENGTH = 200;

export function nextPatchVersion(version) {
  const [major, minor, patch] = parseVersion(version);

  return `${major}.${minor}.${patch + 1}`;
}

export function replaceNth(contents, search, replacement, count = 1) {
  let result = contents;
  let position = 0;

  for (let index = 0; index < count; index += 1) {
    const found = result.indexOf(search, position);

    if (found === -1) {
      throw new Error(`Could not find ${search} to replace.`);
    }

    result = result.slice(0, found) + replacement + result.slice(found + search.length);
    position = found + replacement.length;
  }

  return result;
}

export function sanitizeSummary(summary) {
  const text = String(summary ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_SUMMARY_LENGTH);

  return text || DEFAULT_SUMMARY;
}

export function addChangelogEntry(changelog, version, date, summary) {
  return replaceNth(
    changelog,
    '# Changelog\n\n',
    `# Changelog\n\n## ${version} - ${date}\n\n- ${sanitizeSummary(summary)}\n\n`
  );
}

export const VERSION_FILES = [
  {
    path: 'package.json',
    update: (contents, from, to) => replaceNth(contents, `"version": "${from}"`, `"version": "${to}"`)
  },
  {
    // The lockfile records the version for the root manifest and its "" package entry.
    path: 'package-lock.json',
    update: (contents, from, to) =>
      replaceNth(contents, `"version": "${from}"`, `"version": "${to}"`, 2)
  },
  {
    path: 'SECURITY.md',
    update: (contents, from, to) => replaceNth(contents, `| ${from} |`, `| ${to} |`)
  },
  {
    path: 'public/openapi.yaml',
    update: (contents, from, to) => replaceNth(contents, `  version: ${from}\n`, `  version: ${to}\n`)
  }
];

export function runBumpRelease({
  baseRef = 'origin/main',
  env = process.env,
  now = () => new Date(),
  verifyImpl = verifyReleaseNotesAgainstBase,
  readVersionImpl = readPackageVersionAtRef,
  readChangelogImpl = readChangelogAtRef,
  readFileImpl = (path) => readFileSync(path, 'utf8'),
  writeFileImpl = writeFileSync,
  stdout = process.stdout
} = {}) {
  assertValidGitRef(baseRef);

  if (verifyImpl(baseRef).length === 0) {
    stdout.write('Release metadata is already valid; nothing to bump.\n');
    return { bumped: false };
  }

  const headVersion = readVersionImpl('HEAD');
  const baseVersion = readVersionImpl(baseRef);
  const needsVersionBump = compareVersions(headVersion, baseVersion) <= 0;
  const version = needsVersionBump ? nextPatchVersion(baseVersion) : headVersion;

  if (needsVersionBump) {
    for (const { path, update } of VERSION_FILES) {
      writeFileImpl(path, update(readFileImpl(path), headVersion, version));
    }
  }

  const changelog = readChangelogImpl('HEAD');

  if (!hasChangelogEntry(changelog, version)) {
    const date = now().toISOString().slice(0, 10);

    writeFileImpl(
      'CHANGELOG.md',
      addChangelogEntry(readFileImpl('CHANGELOG.md'), version, date, env.RELEASE_BUMP_SUMMARY)
    );
  }

  stdout.write(`Prepared release ${version}.\n`);
  return { bumped: true, version };
}

export function runBumpReleaseCliIfMain({
  isExecutedModuleImpl = isExecutedModule,
  ...options
} = {}) {
  if (isExecutedModuleImpl(import.meta.url)) {
    runBumpRelease(options);
  }
}

runBumpReleaseCliIfMain();
