import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  runSyncThemeBootstrapCliIfMain,
  syncThemeBootstrap
} from '../scripts/sync-theme-bootstrap.mjs';
import { renderThemeBootstrapScript } from '../public/theme-bootstrap-core.js';

test('syncThemeBootstrap writes the generated bootstrap script', () => {
  const localThis = {
    path: null,
    contents: null
  };

  syncThemeBootstrap({
    writeFileSyncImpl: (path, contents) => {
      localThis.path = path;
      localThis.contents = contents;
    },
    outputPath: '/tmp/theme-bootstrap.js'
  });

  assert.equal(localThis.path, '/tmp/theme-bootstrap.js');
  assert.equal(localThis.contents, renderThemeBootstrapScript());
});

test('runSyncThemeBootstrapCliIfMain delegates to the sync runner', () => {
  const localThis = {
    called: false
  };

  runSyncThemeBootstrapCliIfMain({
    isExecutedModuleImpl: () => true,
    writeFileSyncImpl: () => {
      localThis.called = true;
    }
  });

  assert.equal(localThis.called, true);
});
