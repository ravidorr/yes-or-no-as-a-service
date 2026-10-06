import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCoverageArgs,
  runCoverageCliIfMain,
  runCoverage
} from '../scripts/run-coverage.mjs';

test('buildCoverageArgs includes every production directory', () => {
  assert.deepEqual(buildCoverageArgs(), [
    '--test',
    '--experimental-test-coverage',
    '--test-coverage-include=src/**',
    '--test-coverage-include=public/**',
    '--test-coverage-include=scripts/**',
    '--test-coverage-exclude=test/**',
    '--test-coverage-lines=100',
    '--test-coverage-branches=100',
    '--test-coverage-functions=100'
  ]);
});

test('runCoverage treats a missing exit status as failure', () => {
  const localThis = {
    exitCode: null
  };

  runCoverage({
    spawnSyncImpl: () => ({
      status: undefined,
      stdout: 'failed tests'
    }),
    stdout: { write() {} },
    stderr: { write() {} },
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, 1);
});

test('runCoverage exits when the test runner fails', () => {
  const localThis = {
    exitCode: null,
    stdout: ''
  };

  const result = runCoverage({
    spawnSyncImpl: () => ({
      status: 2,
      stdout: 'failed tests'
    }),
    stdout: {
      write(value) {
        localThis.stdout += value;
      }
    },
    stderr: { write() {} },
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, 2);
  assert.equal(localThis.stdout, 'failed tests');
  assert.equal(result.status, 2);
});

test('runCoverage exits when production inventory is incomplete', () => {
  const localThis = {
    exitCode: null,
    stderr: ''
  };

  const result = runCoverage({
    expectedFiles: ['src/cli.js', 'public/app.js'],
    spawnSyncImpl: () => ({
      status: 0,
      stdout: `
# start of coverage report
# src                    |        |          |         |
#  cli.js                | 100.00 |   100.00 |  100.00 |
# end of coverage report
`
    }),
    stdout: { write() {} },
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
  assert.match(localThis.stderr, /missing from coverage report: public\/app\.js/);
  assert.deepEqual(result.missingFiles, ['public/app.js']);
});

test('runCoverageCliIfMain delegates to the coverage runner', () => {
  const localThis = {
    exitCode: null
  };

  runCoverageCliIfMain({
    isExecutedModuleImpl: () => true,
    expectedFiles: ['src/cli.js'],
    spawnSyncImpl: () => ({
      status: 0,
      stdout: `
# start of coverage report
# src                    |        |          |         |
#  cli.js                | 100.00 |   100.00 |  100.00 |
# end of coverage report
`
    }),
    stdout: { write() {} },
    stderr: { write() {} },
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, null);
});

test('runCoverage reports both missing and unexpected inventory entries', () => {
  const localThis = {
    exitCode: null,
    stderr: ''
  };

  runCoverage({
    expectedFiles: ['src/cli.js', 'public/app.js'],
    spawnSyncImpl: () => ({
      status: 0,
      stdout: `
# start of coverage report
# src                    |        |          |         |
#  cli.js                | 100.00 |   100.00 |  100.00 |
# scripts                |        |          |         |
#  extra.mjs             | 100.00 |   100.00 |  100.00 |
# end of coverage report
`
    }),
    stdout: { write() {} },
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
  assert.match(localThis.stderr, /missing from coverage report: public\/app\.js/);
  assert.match(localThis.stderr, /unexpected coverage entry: scripts\/extra\.mjs/);
});

test('runCoverageCliIfMain skips when the module is imported', () => {
  assert.doesNotThrow(() =>
    runCoverageCliIfMain({
      isExecutedModuleImpl: () => false,
      exit() {
        throw new Error('should not exit');
      }
    })
  );
});

test('runCoverage exits when unexpected files are reported', () => {
  const localThis = {
    exitCode: null,
    stderr: ''
  };

  const result = runCoverage({
    expectedFiles: ['src/cli.js'],
    spawnSyncImpl: () => ({
      status: 0,
      stdout: `
# start of coverage report
# src                    |        |          |         |
#  cli.js                | 100.00 |   100.00 |  100.00 |
# scripts                |        |          |         |
#  extra.mjs             | 100.00 |   100.00 |  100.00 |
# end of coverage report
`
    }),
    stdout: { write() {} },
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
  assert.match(localThis.stderr, /unexpected coverage entry: scripts\/extra\.mjs/);
  assert.deepEqual(result.unexpectedFiles, ['scripts/extra.mjs']);
});

test('runCoverage succeeds when inventory matches', () => {
  const localThis = {
    exitCode: null
  };

  const result = runCoverage({
    expectedFiles: ['src/cli.js'],
    spawnSyncImpl: () => ({
      status: 0,
      stdout: `
# start of coverage report
# src                    |        |          |         |
#  cli.js                | 100.00 |   100.00 |  100.00 |
# end of coverage report
`
    }),
    stdout: { write() {} },
    stderr: { write() {} },
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, null);
  assert.equal(result.status, 0);
});
