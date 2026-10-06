import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isPrepareHuskyMain,
  runPrepareHuskyCliIfMain,
  runPrepareHusky
} from '../scripts/prepare-husky.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('runPrepareHusky skips in CI environments', () => {
  const localThis = {
    exitCode: null,
    huskyCalled: false
  };

  const result = runPrepareHusky({
    existsSyncImpl: () => true,
    execSyncImpl: () => {
      localThis.huskyCalled = true;
    },
    env: { CI: 'true' },
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, 0);
  assert.equal(localThis.huskyCalled, false);
  assert.equal(result.skipped, true);
});

test('runPrepareHusky skips outside git repositories', () => {
  const localThis = {
    exitCode: null,
    huskyCalled: false
  };

  runPrepareHusky({
    existsSyncImpl: () => false,
    execSyncImpl: () => {
      localThis.huskyCalled = true;
    },
    env: {},
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, 0);
  assert.equal(localThis.huskyCalled, false);
});

test('isPrepareHuskyMain matches the executed module path', () => {
  const scriptPath = resolve('scripts/prepare-husky.mjs');

  assert.equal(
    isPrepareHuskyMain(pathToFileURL(scriptPath).href, scriptPath),
    true
  );
  assert.equal(
    isPrepareHuskyMain(pathToFileURL(scriptPath).href, resolve('test/prepare-husky.test.js')),
    false
  );
  assert.equal(isPrepareHuskyMain(pathToFileURL(scriptPath).href, null), false);
});

test('runPrepareHuskyCliIfMain delegates to the husky runner', () => {
  const localThis = {
    called: false
  };

  runPrepareHuskyCliIfMain({
    isPrepareHuskyMainImpl: () => true,
    existsSyncImpl: () => true,
    execSyncImpl: () => {
      localThis.called = true;
    },
    env: {},
    exit() {}
  });

  assert.equal(localThis.called, true);
});

test('runPrepareHusky installs hooks in local git repositories', () => {
  const localThis = {
    huskyCalled: false
  };

  const result = runPrepareHusky({
    existsSyncImpl: () => true,
    execSyncImpl: (command, options) => {
      assert.equal(command, 'husky');
      assert.deepEqual(options, { stdio: 'inherit' });
      localThis.huskyCalled = true;
    },
    env: {},
    exit() {
      throw new Error('should not exit');
    }
  });

  assert.equal(localThis.huskyCalled, true);
  assert.equal(result.skipped, false);
});
