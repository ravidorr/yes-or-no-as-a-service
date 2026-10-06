import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertValidGitRef,
  assertValidStagedPath,
  execGit
} from '../scripts/git-exec.mjs';

test('assertValidGitRef accepts common ref names', () => {
  assert.doesNotThrow(() => assertValidGitRef('HEAD'));
  assert.doesNotThrow(() => assertValidGitRef('origin/main'));
});

test('assertValidGitRef rejects shell metacharacters', () => {
  assert.throws(
    () => assertValidGitRef('origin/main; rm -rf /'),
    /Invalid git ref/
  );
});

test('assertValidStagedPath accepts tracked manifest paths', () => {
  assert.doesNotThrow(() => assertValidStagedPath('package.json'));
});

test('assertValidStagedPath rejects unexpected staged paths', () => {
  assert.throws(
    () => assertValidStagedPath('package.json; rm -rf /'),
    /Invalid staged path/
  );
});

test('execGit runs git with argument arrays', () => {
  const output = execGit(['show', 'HEAD:package.json']);

  assert.match(output, /"name": "@ravidor\/yesornoaas"/);
});
