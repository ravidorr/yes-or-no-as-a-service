import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  runVerifyReleaseNotesCliIfMain,
  resolveBaseRef,
  runVerifyReleaseNotes
} from '../scripts/verify-release-notes.mjs';

test('resolveBaseRef defaults to origin/main', () => {
  assert.equal(resolveBaseRef(['node', 'script']), 'origin/main');
});

test('resolveBaseRef reads explicit base arguments', () => {
  assert.equal(resolveBaseRef(['node', 'script', '--base', 'origin/devel']), 'origin/devel');
});

test('runVerifyReleaseNotes exits when --base has no value', () => {
  const localThis = {
    exitCode: null,
    stderr: ''
  };

  runVerifyReleaseNotes({
    argv: ['node', 'script', '--base'],
    stderr: {
      write(value) {
        localThis.stderr += value;
      }
    },
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, 1);
  assert.match(localThis.stderr, /Missing value for --base/);
});

test('runVerifyReleaseNotes exits when the base ref is missing', () => {
  const localThis = {
    exitCode: null,
    stderr: ''
  };

  runVerifyReleaseNotes({
    argv: ['node', 'script', '--base', 'origin/missing'],
    execGitImpl: () => {
      throw new Error('missing ref');
    },
    stderr: {
      write(value) {
        localThis.stderr += value;
      }
    },
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, 1);
  assert.match(localThis.stderr, /Base ref not found: origin\/missing/);
});

test('runVerifyReleaseNotes reports validation failures', () => {
  const localThis = {
    exitCode: null,
    stderr: ''
  };

  runVerifyReleaseNotes({
    argv: ['node', 'script', '--base', 'origin/main'],
    execGitImpl: () => 'abc123',
    verifyReleaseNotesAgainstBaseImpl: () => ['package.json version must be bumped'],
    stderr: {
      write(value) {
        localThis.stderr += value;
      }
    },
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, 1);
  assert.match(localThis.stderr, /Release notes verification failed/);
  assert.match(localThis.stderr, /package\.json version must be bumped/);
});

test('runVerifyReleaseNotesCliIfMain delegates to the verifier', () => {
  const localThis = {
    stdout: ''
  };

  runVerifyReleaseNotesCliIfMain({
    isExecutedModuleImpl: () => true,
    argv: ['node', 'script', '--base', 'origin/main'],
    execGitImpl: () => 'abc123',
    verifyReleaseNotesAgainstBaseImpl: () => [],
    stderr: { write() {} },
    stdout: {
      write(value) {
        localThis.stdout += value;
      }
    },
    exit() {}
  });

  assert.match(localThis.stdout, /Release notes verified against origin\/main/);
});

test('runVerifyReleaseNotes succeeds when validation passes', () => {
  const localThis = {
    exitCode: null,
    stdout: ''
  };

  const result = runVerifyReleaseNotes({
    argv: ['node', 'script', '--base', 'origin/main'],
    execGitImpl: () => 'abc123',
    verifyReleaseNotesAgainstBaseImpl: () => [],
    stderr: { write() {} },
    stdout: {
      write(value) {
        localThis.stdout += value;
      }
    },
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, null);
  assert.match(localThis.stdout, /Release notes verified against origin\/main/);
  assert.equal(result.ok, true);
});
