import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const preCommitPath = resolve('.husky/pre-commit');

test('pre-commit hook runs fast staged validation', () => {
  const hook = readFileSync(preCommitPath, 'utf8');

  assert.match(hook, /^npx lint-staged$/m);
  assert.match(hook, /^npm run check:generated$/m);
});
