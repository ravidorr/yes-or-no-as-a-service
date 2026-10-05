import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  generatePackageLockFromManifest,
  shouldSyncPackageLock
} from '../scripts/sync-package-lock.mjs';

test('shouldSyncPackageLock runs when package.json is staged', () => {
  assert.equal(shouldSyncPackageLock(['README.md', 'package.json']), true);
});

test('shouldSyncPackageLock skips commits without package.json', () => {
  assert.equal(shouldSyncPackageLock(['README.md', 'src/server.js']), false);
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
