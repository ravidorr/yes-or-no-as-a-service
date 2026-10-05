import assert from 'node:assert/strict';
import { symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { isExecutedModule } from '../src/run-if-main.js';

const modulePath = resolve('src/run-if-main.js');

test('isExecutedModule matches the executed module path', () => {
  assert.equal(
    isExecutedModule(pathToFileURL(modulePath).href, modulePath),
    true
  );
});

test('isExecutedModule matches when argvPath is a symlink to the module', () => {
  const linkPath = join(tmpdir(), `yesornoaas-run-if-main-${process.pid}.js`);

  try {
    symlinkSync(modulePath, linkPath);
    assert.equal(
      isExecutedModule(pathToFileURL(modulePath).href, linkPath),
      true
    );
  } finally {
    unlinkSync(linkPath);
  }
});

test('isExecutedModule rejects imported modules and missing argv paths', () => {
  assert.equal(
    isExecutedModule(pathToFileURL(modulePath).href, resolve('test/run-if-main.test.js')),
    false
  );
  assert.equal(isExecutedModule(pathToFileURL(modulePath).href, undefined), false);
  assert.equal(isExecutedModule(pathToFileURL(modulePath).href, null), false);
});

test('isExecutedModule falls back to href comparison when realpath fails', () => {
  const missingPath = join(tmpdir(), `missing-yesornoaas-${process.pid}.js`);

  assert.equal(
    isExecutedModule(pathToFileURL(missingPath).href, missingPath),
    true
  );
  assert.equal(
    isExecutedModule(pathToFileURL(missingPath).href, join(tmpdir(), 'other-missing.js')),
    false
  );
});
