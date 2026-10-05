import assert from 'node:assert/strict';
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  compareVersions,
  extractChangelogSection,
  hasChangelogEntry,
  parseVersion,
  readChangedFilesSince,
  readChangelogAtRef,
  readPackageVersionAtRef,
  shouldValidateReleaseNotes,
  validateReleaseNotes
} from '../scripts/release-notes.mjs';

test('parseVersion reads semver triples', () => {
  assert.deepEqual(parseVersion('1.2.3'), [1, 2, 3]);
});

test('compareVersions detects newer versions', () => {
  assert.equal(compareVersions('0.1.1', '0.1.0') > 0, true);
  assert.equal(compareVersions('0.1.0', '0.1.0'), 0);
  assert.equal(compareVersions('0.1.0', '0.2.0') < 0, true);
});

test('hasChangelogEntry matches release headings', () => {
  const changelog = `# Changelog

## 0.1.1 - 2026-10-01

- Add docs.
`;

  assert.equal(hasChangelogEntry(changelog, '0.1.1'), true);
  assert.equal(hasChangelogEntry(changelog, '0.1.0'), false);
});

test('extractChangelogSection returns the release body for a version', () => {
  const changelog = `# Changelog

## 0.2.0 - 2026-10-01

- Publish to npm.
- Automate releases.

## 0.1.0 - 2026-05-10

- Initial release.
`;

  assert.equal(
    extractChangelogSection(changelog, '0.2.0'),
    '- Publish to npm.\n- Automate releases.'
  );
});

test('extractChangelogSection rejects missing or empty sections', () => {
  const changelog = '# Changelog\n\n## 0.2.0 - 2026-10-01\n';

  assert.throws(
    () => extractChangelogSection(changelog, '0.2.0'),
    /empty/
  );
  assert.throws(
    () => extractChangelogSection(changelog, '9.9.9'),
    /no release entry/
  );
});

test('validateReleaseNotes requires a version bump and changelog entry', () => {
  const errors = validateReleaseNotes({
    headVersion: '0.1.0',
    baseVersion: '0.1.0',
    changelog: '# Changelog\n'
  });

  assert.deepEqual(errors, [
    'package.json version must be bumped above 0.1.0, found 0.1.0.',
    'CHANGELOG.md must include a release entry heading for version 0.1.0 (for example: ## 0.1.0 - YYYY-MM-DD).'
  ]);
});

test('validateReleaseNotes passes when version and changelog are updated', () => {
  const errors = validateReleaseNotes({
    headVersion: '0.1.1',
    baseVersion: '0.1.0',
    changelog: '# Changelog\n\n## 0.1.1 - 2026-10-01\n\n- Add docs.\n'
  });

  assert.deepEqual(errors, []);
});

test('shouldValidateReleaseNotes skips workflow-only changes', () => {
  assert.equal(
    shouldValidateReleaseNotes([
      '.github/workflows/ci.yml',
      '.github/workflows/release.yml'
    ]),
    false
  );
  assert.equal(
    shouldValidateReleaseNotes(['scripts/release-notes.mjs']),
    true
  );
});

test('readChangedFilesSince includes both paths for a rename into workflows', () => {
  const repositoryPath = mkdtempSync(join(tmpdir(), 'naas-release-notes-'));
  const runGit = (...args) =>
    execFileSync('git', args, { cwd: repositoryPath, encoding: 'utf8' });

  try {
    runGit('init', '--initial-branch=main');
    runGit('config', 'user.email', 'test@example.com');
    runGit('config', 'user.name', 'Test User');

    mkdirSync(join(repositoryPath, 'src'));
    writeFileSync(join(repositoryPath, 'src', 'app.js'), 'export {};\n');
    runGit('add', '.');
    runGit('commit', '-m', 'add source file');

    const baseRef = runGit('rev-parse', 'HEAD').trim();
    mkdirSync(join(repositoryPath, '.github', 'workflows'), { recursive: true });
    runGit('mv', 'src/app.js', '.github/workflows/app.yml');
    runGit('commit', '-m', 'move source file to workflow');

    const changedFiles = readChangedFilesSince(baseRef, repositoryPath);

    assert.deepEqual(changedFiles, [
      '.github/workflows/app.yml',
      'src/app.js'
    ]);
    assert.equal(shouldValidateReleaseNotes(changedFiles), true);
  } finally {
    rmSync(repositoryPath, { force: true, recursive: true });
  }
});

test('readChangedFilesSince skips a rename within workflows', () => {
  const repositoryPath = mkdtempSync(join(tmpdir(), 'naas-release-notes-'));
  const runGit = (...args) =>
    execFileSync('git', args, { cwd: repositoryPath, encoding: 'utf8' });

  try {
    runGit('init', '--initial-branch=main');
    runGit('config', 'user.email', 'test@example.com');
    runGit('config', 'user.name', 'Test User');

    mkdirSync(join(repositoryPath, '.github', 'workflows'), { recursive: true });
    writeFileSync(join(repositoryPath, '.github/workflows/ci.yml'), 'name: CI\n');
    runGit('add', '.');
    runGit('commit', '-m', 'add workflow');

    const baseRef = runGit('rev-parse', 'HEAD').trim();
    runGit('mv', '.github/workflows/ci.yml', '.github/workflows/release.yml');
    runGit('commit', '-m', 'rename workflow');

    assert.equal(
      shouldValidateReleaseNotes(
        readChangedFilesSince(baseRef, repositoryPath)
      ),
      false
    );
  } finally {
    rmSync(repositoryPath, { force: true, recursive: true });
  }
});

test('readPackageVersionAtRef reads the committed HEAD version', () => {
  const headVersion = readPackageVersionAtRef('HEAD');
  const committedVersion = JSON.parse(
    execSync('git show HEAD:package.json', { encoding: 'utf8' })
  ).version;

  assert.equal(headVersion, committedVersion);
});

test('readChangelogAtRef reads the committed HEAD changelog', () => {
  const headChangelog = readChangelogAtRef('HEAD');
  const committedChangelog = execSync('git show HEAD:CHANGELOG.md', {
    encoding: 'utf8'
  });

  assert.equal(headChangelog, committedChangelog);
});
