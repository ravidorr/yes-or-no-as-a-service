import { execSync } from 'node:child_process';

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

export function readPackageVersionAtRef(ref = 'HEAD') {
  const contents = execSync(`git show ${ref}:package.json`, { encoding: 'utf8' });

  return JSON.parse(contents).version;
}

export function readChangelogAtRef(ref = 'HEAD') {
  return execSync(`git show ${ref}:CHANGELOG.md`, { encoding: 'utf8' });
}

export function readChangedFilesSince(baseRef, cwd) {
  const output = execSync(`git diff --no-renames --name-only ${baseRef}...HEAD`, {
    cwd,
    encoding: 'utf8'
  });

  return output.split('\n').filter(Boolean);
}

export function shouldValidateReleaseNotes(changedFiles) {
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

  if (startIndex === -1) {
    throw new Error(`CHANGELOG.md has no release entry for version ${version}.`);
  }

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

export function verifyReleaseNotesAgainstBase(baseRef) {
  if (!shouldValidateReleaseNotes(readChangedFilesSince(baseRef))) {
    return [];
  }

  const headVersion = readPackageVersionAtRef('HEAD');
  const baseVersion = readPackageVersionAtRef(baseRef);
  const changelog = readChangelogAtRef('HEAD');

  return validateReleaseNotes({
    headVersion,
    baseVersion,
    changelog
  });
}
