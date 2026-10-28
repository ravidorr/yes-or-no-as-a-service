import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  addChangelogEntry,
  describeChanges,
  listDependencyChanges,
  nextPatchVersion,
  readManifestAtRef,
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

function runWith({
  files = createFiles(),
  head = '1.2.3',
  base = '1.2.3',
  changelog = CHANGELOG,
  errors = ['err'],
  env = {},
  manifests = { base: {}, head: {} }
} = {}) {
  const writes = [];
  const output = [];
  const result = runBumpRelease({
    env,
    now: () => new Date('2026-10-28T12:00:00Z'),
    verifyImpl: () => errors,
    readVersionImpl: (ref) => (ref === 'HEAD' ? head : base),
    readChangelogImpl: () => changelog,
    readManifestImpl: (ref) => (ref === 'HEAD' ? manifests.head : manifests.base),
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

test('sanitizeSummary puts @mentions in code so release notes cannot notify anyone', () => {
  assert.equal(
    sanitizeSummary('bump @types/node and (@scope/pkg) with `@x` plus user@example.com'),
    'bump `@types/node` and (`@scope/pkg`) with `@x` plus user@example.com'
  );
});

test('listDependencyChanges reports added and changed ranges only', () => {
  const base = {
    dependencies: { express: '^5.3.0', zod: '^4.0.0' },
    devDependencies: { eslint: '^10.11.0' },
    overrides: { katex: { nested: '1.0.0' } }
  };
  const head = {
    dependencies: { express: '^5.3.1', zod: '^4.0.0' },
    devDependencies: { eslint: '^10.11.0', '@playwright/test': '^1.64.1' },
    overrides: { katex: { nested: '1.0.1' }, 'smol-toml': '1.6.1' }
  };

  assert.deepEqual(listDependencyChanges(base, head), [
    '`express` ^5.3.1',
    '`@playwright/test` ^1.64.1',
    '`smol-toml` 1.6.1'
  ]);
  assert.deepEqual(listDependencyChanges({}, {}), []);
});

test('describeChanges lists dependency changes or falls back to the sanitized summary', () => {
  assert.equal(describeChanges(['`a` 1', '`b` 2'], 'ignored'), 'Update `a` 1, `b` 2.');
  assert.equal(describeChanges([], 'Bump @types/node'), 'Bump `@types/node`');
  assert.equal(describeChanges([], undefined), 'Update dependencies.');
});

test('readManifestAtRef parses package.json at a git ref', () => {
  const calls = [];
  const manifest = readManifestAtRef('origin/main', {
    execGitImpl: (args) => {
      calls.push(args);
      return '{"version":"1.2.3"}';
    }
  });

  assert.deepEqual(manifest, { version: '1.2.3' });
  assert.deepEqual(calls, [['show', 'origin/main:package.json']]);
  assert.throws(() => readManifestAtRef('bad ref;'), /Invalid git ref/);
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

test('runBumpRelease describes the dependency changes in the changelog entry', () => {
  const { files } = runWith({
    env: { RELEASE_BUMP_SUMMARY: 'bump the npm-development group across 1 directory' },
    manifests: {
      base: { devDependencies: { eslint: '^10.11.0' } },
      head: { devDependencies: { eslint: '^10.13.0', '@playwright/test': '^1.64.1' } }
    }
  });

  assert.match(
    files['CHANGELOG.md'],
    /## 1\.2\.4 - 2026-10-28\n\n- Update `eslint` \^10\.13\.0, `@playwright\/test` \^1\.64\.1\.\n/
  );
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
      readManifestImpl: () => ({}),
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
  const stepNamed = (name) => job.steps.find((step) => step.name === name);
  const runs = job.steps.filter((step) => step.run).map((step) => step.run);

  assert.equal(workflow.permissions.contents, 'read');
  assert.match(job.if, /github\.event\.pull_request\.user\.login == 'dependabot\[bot\]'/);
  assert.match(job.if, /github\.actor == 'dependabot\[bot\]'/);
  assert.equal(stepNamed('Check out pull request branch').with.token, '${{ secrets.RELEASE_BUMP_TOKEN }}');
  assert.equal(stepNamed('Check out pull request branch').with['fetch-depth'], 0);
  assert.ok(runs.length > 0);

  for (const run of runs) {
    assert.doesNotMatch(run, /\$\{\{/);
  }

  const bumpStep = stepNamed('Bump version and changelog');
  const trustedStep = stepNamed('Check out trusted release scripts from the base branch');

  assert.equal(bumpStep.run, 'node trusted/scripts/bump-release.mjs');
  assert.equal(bumpStep.env.RELEASE_BUMP_SUMMARY, '${{ github.event.pull_request.title }}');
  assert.equal(trustedStep.with.path, 'trusted');
  assert.equal(trustedStep.with.ref, '${{ github.event.pull_request.base.ref }}');
});

test('Dependabot release bump workflow fails clearly without its token and serializes runs per PR', () => {
  const workflow = readWorkflow('.github/workflows/dependabot-release-bump.yml');
  const [tokenStep, checkoutStep] = workflow.jobs.bump.steps;

  assert.equal(tokenStep.name, 'Require the release bump token');
  assert.match(tokenStep.run, /-z "\$\{RELEASE_BUMP_TOKEN\}"/);
  assert.match(tokenStep.run, /exit 1/);
  assert.equal(tokenStep.env.RELEASE_BUMP_TOKEN, '${{ secrets.RELEASE_BUMP_TOKEN }}');
  assert.equal(checkoutStep.name, 'Check out pull request branch');
  assert.equal(workflow.concurrency.group, 'dependabot-release-bump-${{ github.event.pull_request.number }}');
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
});
