import { assertValidGitRef, execGit } from './git-exec.mjs';

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(version) {
  const match = VERSION_PATTERN.exec(version);

  if (!match) {
    throw new Error(`Invalid semver: ${version}`);
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }

  return 0;
}

export function readPackageVersionAtRef(ref = 'HEAD', { execGitImpl = execGit } = {}) {
  assertValidGitRef(ref);
  const contents = execGitImpl(['show', `${ref}:package.json`]);

  return JSON.parse(contents).version;
}

export function readChangelogAtRef(ref = 'HEAD', { execGitImpl = execGit } = {}) {
  assertValidGitRef(ref);
  return execGitImpl(['show', `${ref}:CHANGELOG.md`]);
}

export function readChangedFilesSince(baseRef, cwd, { execGitImpl = execGit } = {}) {
  assertValidGitRef(baseRef);
  const output = execGitImpl(['diff', '--no-renames', '--name-only', `${baseRef}...HEAD`], {
    cwd
  });

  return output.split('\n').filter(Boolean);
}

export function shouldValidateReleaseNotes(changedFiles) {
  // Skip release-note checks when only GitHub workflow files changed.
  return changedFiles.some(
    (file) => !file.startsWith('.github/workflows/')
  );
}

export function hasChangelogEntry(changelog, version) {
  const escapedVersion = version.replace(/\./g, '\\.');
  const pattern = new RegExp(`^## ${escapedVersion} - `, 'm');

  return pattern.test(changelog);
}

export function extractChangelogSection(changelog, version) {
  if (!hasChangelogEntry(changelog, version)) {
    throw new Error(`CHANGELOG.md has no release entry for version ${version}.`);
  }

  const lines = changelog.split('\n');
  const headingPrefix = `## ${version} - `;
  const startIndex = lines.findIndex((line) => line.startsWith(headingPrefix));
  const sectionLines = [];
  const versionHeadingPattern = /^## \d+\.\d+\.\d+ - /;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (versionHeadingPattern.test(lines[index])) {
      break;
    }

    sectionLines.push(lines[index]);
  }

  const section = sectionLines.join('\n').trim();

  if (!section) {
    throw new Error(`CHANGELOG.md release entry for version ${version} is empty.`);
  }

  return section;
}

export function validateReleaseNotes({
  headVersion,
  baseVersion,
  changelog
}) {
  const errors = [];

  if (compareVersions(headVersion, baseVersion) <= 0) {
    errors.push(
      `package.json version must be bumped above ${baseVersion}, found ${headVersion}.`
    );
  }

  if (!hasChangelogEntry(changelog, headVersion)) {
    errors.push(
      `CHANGELOG.md must include a release entry heading for version ${headVersion} (for example: ## ${headVersion} - YYYY-MM-DD).`
    );
  }

  return errors;
}

export function verifyReleaseNotesAgainstBase(
  baseRef,
  {
    readChangedFilesSinceImpl = readChangedFilesSince,
    readPackageVersionAtRefImpl = readPackageVersionAtRef,
    readChangelogAtRefImpl = readChangelogAtRef,
    shouldValidateReleaseNotesImpl = shouldValidateReleaseNotes,
    validateReleaseNotesImpl = validateReleaseNotes
  } = {}
) {
  if (!shouldValidateReleaseNotesImpl(readChangedFilesSinceImpl(baseRef))) {
    return [];
  }

  const headVersion = readPackageVersionAtRefImpl('HEAD');
  const baseVersion = readPackageVersionAtRefImpl(baseRef);
  const changelog = readChangelogAtRefImpl('HEAD');

  return validateReleaseNotesImpl({
    headVersion,
    baseVersion,
    changelog
  });
}
