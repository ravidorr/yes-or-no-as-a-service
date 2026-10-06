import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  detectVersionBump,
  runDetectVersionBumpCliIfMain,
  runDetectVersionBumpCli,
  writeVersionBumpOutputs
} from '../scripts/detect-version-bump.mjs';

test('detectVersionBump returns an error reason when validation fails', () => {
  const result = detectVersionBump('before-ref', {
    readPackageVersionAtRefImpl: () => {
      throw new Error('boom');
    }
  });

  assert.deepEqual(result, {
    bumped: false,
    reason: 'boom'
  });
});

test('detectVersionBump returns release metadata when the version increases', () => {
  const result = detectVersionBump('before-ref', {
    readPackageVersionAtRefImpl: (ref) => (ref === 'HEAD' ? '1.2.0' : '1.1.0'),
    readChangelogAtRefImpl: () => '# Changelog\n\n## 1.2.0 - 2026-10-01\n\n- Ship it.\n',
    extractChangelogSectionImpl: () => '- Ship it.'
  });

  assert.deepEqual(result, {
    bumped: true,
    version: '1.2.0',
    tag: 'v1.2.0',
    notes: '- Ship it.'
  });
});

test('runDetectVersionBumpCli prints the release message when a bump is required', () => {
  const localThis = {
    stdout: '',
    exitCode: null
  };

  runDetectVersionBumpCli({
    argv: ['node', 'script', 'before-ref'],
    env: {},
    detectVersionBumpImpl: () => ({
      bumped: true,
      version: '1.2.0',
      tag: 'v1.2.0',
      notes: '- Ship it.'
    }),
    writeVersionBumpOutputsImpl: () => {},
    stdout: {
      write(value) {
        localThis.stdout += value;
      }
    },
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.match(localThis.stdout, /Release required for v1\.2\.0/);
  assert.equal(localThis.exitCode, null);
});

test('runDetectVersionBumpCliIfMain delegates to the CLI runner', () => {
  const localThis = {
    called: false
  };

  runDetectVersionBumpCliIfMain({
    isExecutedModuleImpl: () => true,
    argv: ['node', 'script'],
    env: {},
    detectVersionBumpImpl: () => ({ bumped: false, reason: 'unchanged' }),
    writeVersionBumpOutputsImpl: () => {},
    stdout: { write() {} },
    exit: () => {
      localThis.called = true;
    }
  });

  assert.equal(localThis.called, true);
});

test('detectVersionBump skips when no before SHA is available', () => {
  assert.deepEqual(detectVersionBump(undefined), {
    bumped: false,
    reason: 'no-before-sha'
  });
  assert.deepEqual(detectVersionBump(''), {
    bumped: false,
    reason: 'no-before-sha'
  });
  assert.deepEqual(detectVersionBump('0000000000000000000000000000000000000000'), {
    bumped: false,
    reason: 'no-before-sha'
  });
});

test('runDetectVersionBumpCli prints the skip message without a reason', () => {
  const localThis = {
    stdout: ''
  };

  runDetectVersionBumpCli({
    argv: ['node', 'script'],
    env: {},
    detectVersionBumpImpl: () => ({ bumped: false }),
    writeVersionBumpOutputsImpl: () => {},
    stdout: {
      write(value) {
        localThis.stdout += value;
      }
    },
    exit() {}
  });

  assert.match(localThis.stdout, /No release required \(skipped\)/);
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

test('writeVersionBumpOutputs skips when no output path is configured', () => {
  assert.doesNotThrow(() =>
    writeVersionBumpOutputs({ bumped: false, reason: 'unchanged' }, '')
  );
});

test('writeVersionBumpOutputs writes GitHub Actions outputs', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'yesornoaas-gh-output-'));
  const outputPath = join(outputDir, 'output');

  try {
    writeVersionBumpOutputs(
      {
        bumped: true,
        version: '1.2.3',
        tag: 'v1.2.3',
        notes: '- Ship it.'
      },
      outputPath
    );

    assert.equal(
      readFileSync(outputPath, 'utf8'),
      'bumped=true\nversion=1.2.3\ntag=v1.2.3\nnotes<<EOF\n- Ship it.\nEOF\n'
    );
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
