import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  findCoverageInventoryMismatches,
  listSourceFiles,
  parseCoverageFiles
} from '../scripts/coverage-inventory.mjs';

test('listSourceFiles discovers every src module', () => {
  assert.deepEqual(listSourceFiles().sort(), [
    'cli.js',
    'graceful-shutdown.js',
    'mcp.js',
    'metrics.js',
    'rate-limit-config.js',
    'rate-limit.js',
    'responses.js',
    'run-if-main.js',
    'server.js',
    'shutdown-config.js',
    'trust-proxy-config.js'
  ]);
});

test('parseCoverageFiles reads src entries from the coverage report', () => {
  const output = `
# start of coverage report
# -----------------------------------------------------------
# file       | line % | branch % | funcs % | uncovered lines
# -----------------------------------------------------------
# src        |        |          |         |
#  cli.js    | 100.00 |   100.00 |  100.00 |
#  mcp.js    | 100.00 |   100.00 |  100.00 |
# -----------------------------------------------------------
# all files  | 100.00 |   100.00 |  100.00 |
# -----------------------------------------------------------
# end of coverage report
`;

  assert.deepEqual([...parseCoverageFiles(output)].sort(), ['cli.js', 'mcp.js']);
});

test('parseCoverageFiles reads info-prefixed coverage rows from Node 24 output', () => {
  const output = `
ℹ start of coverage report
ℹ -----------------------------------------------------------
ℹ file       | line % | branch % | funcs % | uncovered lines
ℹ -----------------------------------------------------------
ℹ src        |        |          |         |
ℹ  cli.js    | 100.00 |   100.00 |  100.00 |
ℹ  mcp.js    | 100.00 |   100.00 |  100.00 |
ℹ -----------------------------------------------------------
ℹ end of coverage report
`;

  assert.deepEqual([...parseCoverageFiles(output)].sort(), ['cli.js', 'mcp.js']);
});

test('parseCoverageFiles ignores diagnostic lines outside the report', () => {
  const output = `
# Error: startup failed
#     at TestContext.<anonymous> (file:///tmp/example.test.js:1:1)
# start of coverage report
#  cli.js    | 100.00 |   100.00 |  100.00 |
# end of coverage report
`;

  assert.deepEqual([...parseCoverageFiles(output)], ['cli.js']);
});

test('findCoverageInventoryMismatches flags src files missing from coverage', () => {
  const output = `
# start of coverage report
#  cli.js    | 100.00 |   100.00 |  100.00 |
#  mcp.js    | 100.00 |   100.00 |  100.00 |
# end of coverage report
`;

  const { missingFiles, unexpectedFiles } = findCoverageInventoryMismatches(output, [
    'cli.js',
    'mcp.js',
    'responses.js',
    'server.js'
  ]);

  assert.deepEqual(missingFiles, ['responses.js', 'server.js']);
  assert.deepEqual(unexpectedFiles, []);
});
