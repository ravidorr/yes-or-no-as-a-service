import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { test } from 'node:test';
import { detectVersionBump } from '../scripts/detect-version-bump.mjs';

test('detectVersionBump skips when no before SHA is available', () => {
  assert.deepEqual(detectVersionBump(undefined), {
    bumped: false,
    reason: 'no-before-sha'
  });
  assert.deepEqual(detectVersionBump('0000000000000000000000000000000000000000'), {
    bumped: false,
    reason: 'no-before-sha'
  });
});

test('detectVersionBump skips when the version is unchanged', () => {
  const result = detectVersionBump('HEAD');

  assert.equal(result.bumped, false);
  assert.equal(result.reason, 'unchanged');
  assert.equal(result.version, readHeadVersion());
});

test('detectVersionBump detects a version increase against main', () => {
  const mainVersion = execSync('git show origin/main:package.json', {
    encoding: 'utf8'
  });

  const result = detectVersionBump('origin/main');

  if (JSON.parse(mainVersion).version === readHeadVersion()) {
    assert.equal(result.bumped, false);
    return;
  }

  assert.equal(result.bumped, true);
  assert.match(result.tag, /^v\d+\.\d+\.\d+$/);
  assert.match(result.notes, /^-/m);
});

function readHeadVersion() {
  return JSON.parse(execSync('git show HEAD:package.json', { encoding: 'utf8' })).version;
}
