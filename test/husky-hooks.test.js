import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const preCommitPath = resolve('.husky/pre-commit');

test('pre-commit hook syncs lockfile, runs linters, and enforces coverage', () => {
  const hook = readFileSync(preCommitPath, 'utf8');

  assert.match(hook, /^node scripts\/sync-package-lock\.mjs$/m);
  assert.match(hook, /^npm run lint$/m);
  assert.match(hook, /^npm run test:coverage$/m);

  const syncIndex = hook.indexOf('node scripts/sync-package-lock.mjs');
  const lintIndex = hook.indexOf('npm run lint');
  const coverageIndex = hook.indexOf('npm run test:coverage');

  assert.ok(syncIndex < lintIndex);
  assert.ok(lintIndex < coverageIndex);
});
