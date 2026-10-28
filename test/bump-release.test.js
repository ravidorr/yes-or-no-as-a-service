import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  addChangelogEntry,
  nextPatchVersion,
  replaceNth,
  runBumpRelease,
  runBumpReleaseCliIfMain,
  sanitizeSummary,
  VERSION_FILES
} from '../scripts/bump-release.mjs';
import { readWorkflow } from './workflow-utils.js';

const CHANGELOG = '# Changelog\n\n## 1.2.3 - 2026-01-01\n\n- Earlier change.\n';

function createFiles() {
  return {
    'package.json': '{\n  "name": "x",\n  "version": "1.2.3"\n}\n',
    'package-lock.json':
      '{\n  "version": "1.2.3",\n  "packages": {\n    "": {\n      "version": "1.2.3"\n    },\n    "node_modules/dep": {\n      "version": "1.2.3"\n    }\n  }\n}\n',
    'SECURITY.md': '| Version | Supported |\n| --- | --- |\n| 1.2.3 | ✓ |\n| Earlier releases | ✘ |\n',
    'public/openapi.yaml': 'info:\n  title: X\n  version: 1.2.3\n',
    'CHANGELOG.md': CHANGELOG
  };
}

function runWith({ files = createFiles(), head = '1.2.3', base = '1.2.3', changelog = CHANGELOG, errors = ['err'], env = {} } = {}) {
  const writes = [];
  const output = [];
  const result = runBumpRelease({
    env,
    now: () => new Date('2026-10-28T12:00:00Z'),
    verifyImpl: () => errors,
    readVersionImpl: (ref) => (ref === 'HEAD' ? head : base),
    readChangelogImpl: () => changelog,
    readFileImpl: (path) => files[path],
    writeFileImpl: (path, contents) => {
      files[path] = contents;
      writes.push(path);
    },
    stdout: { write: (value) => output.push(value) }
  });

  return { result, files, writes, output };
}

test('nextPatchVersion increments the patch number', () => {
  assert.equal(nextPatchVersion('2.2.12'), '2.2.13');
  assert.throws(() => nextPatchVersion('2.2'), /Invalid semver/);
});

test('replaceNth replaces the requested number of occurrences and fails when missing', () => {
  assert.equal(replaceNth('a a a', 'a', 'b', 2), 'b b a');
  assert.equal(replaceNth('a a a', 'a', 'b'), 'b a a');
  assert.throws(() => replaceNth('a', 'a', 'b', 2), /Could not find a/);
});

test('sanitizeSummary collapses whitespace, truncates, and falls back to a default', () => {
  assert.equal(sanitizeSummary('  bump   x\nfrom 1 to 2 '), 'bump x from 1 to 2');
  assert.equal(sanitizeSummary('x'.repeat(500)).length, 200);
  assert.equal(sanitizeSummary(''), 'Update dependencies.');
  assert.equal(sanitizeSummary(undefined), 'Update dependencies.');
});

test('addChangelogEntry inserts the newest entry first', () => {
  assert.equal(
    addChangelogEntry(CHANGELOG, '1.2.4', '2026-10-28', 'Bump x.'),
    '# Changelog\n\n## 1.2.4 - 2026-10-28\n\n- Bump x.\n\n## 1.2.3 - 2026-01-01\n\n- Earlier change.\n'
  );
});

test('runBumpRelease does nothing when release metadata is already valid', () => {
  const { result, writes, output } = runWith({ errors: [] });

  assert.deepEqual(result, { bumped: false });
  assert.deepEqual(writes, []);
  assert.match(output.join(''), /nothing to bump/);
});

test('runBumpRelease bumps every version file and adds a changelog entry', () => {
  const { result, files, writes } = runWith({ env: { RELEASE_BUMP_SUMMARY: 'Bump dep from 1 to 2' } });

  assert.deepEqual(result, { bumped: true, version: '1.2.4' });
  assert.deepEqual(writes, [...VERSION_FILES.map(({ path }) => path), 'CHANGELOG.md']);
  assert.match(files['package.json'], /"version": "1.2.4"/);
  assert.equal(files['package-lock.json'].match(/"version": "1\.2\.4"/g).length, 2);
  assert.match(files['package-lock.json'], /node_modules\/dep[^}]*"version": "1\.2\.3"/);
  assert.match(files['SECURITY.md'], /\| 1\.2\.4 \| ✓ \|/);
  assert.match(files['public/openapi.yaml'], / {2}version: 1\.2\.4\n/);
  assert.match(files['CHANGELOG.md'], /## 1\.2\.4 - 2026-10-28\n\n- Bump dep from 1 to 2\n/);
});

test('runBumpRelease bumps above the base version when the branch is behind it', () => {
  const { result } = runWith({ head: '1.2.3', base: '1.2.5' });

  assert.equal(result.version, '1.2.6');
});

test('runBumpRelease only adds the changelog entry when the version is already bumped', () => {
  const files = createFiles();
  const { result, writes } = runWith({ files, head: '1.2.4', base: '1.2.3' });

  assert.deepEqual(result, { bumped: true, version: '1.2.4' });
  assert.deepEqual(writes, ['CHANGELOG.md']);
  assert.match(files['CHANGELOG.md'], /## 1\.2\.4 - 2026-10-28\n\n- Update dependencies\.\n/);
});

test('runBumpRelease leaves an existing changelog entry alone', () => {
  const changelog = '# Changelog\n\n## 1.2.4 - 2026-10-01\n\n- Done.\n';
  const { result, writes } = runWith({ head: '1.2.4', base: '1.2.3', changelog });

  assert.deepEqual(result, { bumped: true, version: '1.2.4' });
  assert.deepEqual(writes, []);
});

test('runBumpRelease rejects an invalid base ref', () => {
  assert.throws(() => runBumpRelease({ baseRef: 'bad ref;' }), /Invalid git ref/);
});

test('runBumpRelease reads and writes real files by default', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bump-release-'));
  const previous = process.cwd();
  const files = createFiles();

  try {
    mkdirSync(join(directory, 'public'));

    for (const [path, contents] of Object.entries(files)) {
      writeFileSync(join(directory, path), contents);
    }

    process.chdir(directory);
    const written = [];

    runBumpRelease({
      env: {},
      verifyImpl: () => ['err'],
      readVersionImpl: () => '1.2.3',
      readChangelogImpl: () => CHANGELOG,
      stdout: { write: (value) => written.push(value) }
    });

    assert.match(readFileSync('package.json', 'utf8'), /"version": "1\.2\.4"/);
    assert.match(readFileSync('CHANGELOG.md', 'utf8'), /## 1\.2\.4 - \d{4}-\d{2}-\d{2}/);
  } finally {
    process.chdir(previous);
    rmSync(directory, { recursive: true, force: true });
  }
});

test('runBumpReleaseCliIfMain delegates to the bump runner only when executed', () => {
  const localThis = { output: '' };
  const options = {
    verifyImpl: () => [],
    stdout: { write: (value) => { localThis.output += value; } }
  };

  runBumpReleaseCliIfMain({ isExecutedModuleImpl: () => false, ...options });
  assert.equal(localThis.output, '');

  runBumpReleaseCliIfMain({ isExecutedModuleImpl: () => true, ...options });
  assert.match(localThis.output, /nothing to bump/);
});

test('Dependabot release bump workflow only runs for Dependabot and passes untrusted values via env', () => {
  const workflow = readWorkflow('.github/workflows/dependabot-release-bump.yml');
  const job = workflow.jobs.bump;
  const runs = job.steps.filter((step) => step.run).map((step) => step.run);

  assert.equal(workflow.permissions.contents, 'read');
  assert.match(job.if, /github\.event\.pull_request\.user\.login == 'dependabot\[bot\]'/);
  assert.match(job.if, /github\.actor == 'dependabot\[bot\]'/);
  assert.equal(job.steps[0].with.token, '${{ secrets.RELEASE_BUMP_TOKEN }}');
  assert.equal(job.steps[0].with['fetch-depth'], 0);
  assert.ok(runs.length > 0);

  for (const run of runs) {
    assert.doesNotMatch(run, /\$\{\{/);
  }

  const bumpStep = job.steps.find((step) => step.name === 'Bump version and changelog');

  assert.equal(bumpStep.run, 'node trusted/scripts/bump-release.mjs');
  assert.equal(job.steps[1].with.path, 'trusted');
  assert.equal(job.steps[1].with.ref, '${{ github.event.pull_request.base.ref }}');
  assert.equal(bumpStep.env.RELEASE_BUMP_SUMMARY, '${{ github.event.pull_request.title }}');
});
