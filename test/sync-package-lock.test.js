import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  execNpm,
  generatePackageLockFromManifest,
  listStagedFiles,
  resolveNpmExecutable,
  runSyncPackageLockCliIfMain,
  readStagedFileContent,
  shouldSyncPackageLock,
  syncPackageLock
} from '../scripts/sync-package-lock.mjs';

test('resolveNpmExecutable selects npm.cmd on Windows', () => {
  assert.equal(resolveNpmExecutable('win32'), 'npm.cmd');
  assert.equal(resolveNpmExecutable('linux'), 'npm');
});

test('execNpm enables shell execution on Windows', () => {
  const localThis = {
    command: null,
    args: null,
    options: null
  };

  execNpm(['install'], { cwd: '/tmp' }, {
    execFileSyncImpl: (command, args, options) => {
      localThis.command = command;
      localThis.args = args;
      localThis.options = options;
      return '';
    },
    platform: 'win32'
  });

  assert.equal(localThis.command, 'npm.cmd');
  assert.deepEqual(localThis.args, ['install']);
  assert.equal(localThis.options.shell, true);
});

test('shouldSyncPackageLock runs when package.json is staged', () => {
  assert.equal(shouldSyncPackageLock(['README.md', 'package.json']), true);
});

test('shouldSyncPackageLock skips commits without package.json', () => {
  assert.equal(shouldSyncPackageLock(['README.md', 'src/server.js']), false);
});

test('listStagedFiles reads staged paths from git', () => {
  const files = listStagedFiles();

  assert.ok(Array.isArray(files));
});

test('readStagedFileContent reads staged file contents from git', () => {
  const contents = readStagedFileContent('package.json');

  assert.match(contents, /"name": "@ravidor\/yesornoaas"/);
});

test('syncPackageLock writes and stages the regenerated lockfile', () => {
  const localThis = {
    writtenPath: null,
    writtenContents: null,
    staged: false
  };
  const manifest = JSON.stringify({ name: 'sync-test', version: '1.0.0' }, null, 2);

  syncPackageLock({
    readStagedFileContentImpl: () => manifest,
    generatePackageLockFromManifestImpl: () => '{"lockfileVersion":3}',
    writeFileSyncImpl: (path, contents) => {
      localThis.writtenPath = path;
      localThis.writtenContents = contents;
    },
    resolveImpl: (path) => `/repo/${path}`,
    execGitImpl: (args) => {
      if (args[0] === 'add' && args[1] === 'package-lock.json') {
        localThis.staged = true;
      }
    }
  });

  assert.equal(localThis.writtenPath, '/repo/package-lock.json');
  assert.match(localThis.writtenContents, /"lockfileVersion"/);
  assert.equal(localThis.staged, true);
});

test('runSyncPackageLockCliIfMain delegates to the sync runner', () => {
  const localThis = {
    called: false
  };

  runSyncPackageLockCliIfMain({
    isExecutedModuleImpl: () => true,
    readStagedFileContentImpl: () => '{"name":"sync-test"}',
    generatePackageLockFromManifestImpl: () => '{"lockfileVersion":3}',
    writeFileSyncImpl: () => {
      localThis.called = true;
    },
    resolveImpl: (path) => path,
    execGitImpl: () => {}
  });

  assert.equal(localThis.called, true);
});

test('generatePackageLockFromManifest uses the provided manifest contents', () => {
  const manifest = JSON.stringify({
    name: 'naas-lock-sync-test',
    version: '1.0.0',
    private: true,
    scripts: {
      prepare: 'node scripts/prepare-husky.mjs'
    }
  });

  const lockfile = generatePackageLockFromManifest(manifest);

  assert.match(lockfile, /"lockfileVersion"/);
  assert.match(lockfile, /"name": "naas-lock-sync-test"/);
});
