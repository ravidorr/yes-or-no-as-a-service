import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  extractCoverageReport,
  findCoverageInventoryMismatches,
  listJsFilesInDirectory,
  listSourceFiles,
  parseCoverageFiles,
  PRODUCTION_DIRECTORIES
} from '../scripts/coverage-inventory.mjs';

test('listSourceFiles discovers every production module', () => {
  const files = listSourceFiles().sort();

  assert.ok(files.every((file) => PRODUCTION_DIRECTORIES.some((dir) => file.startsWith(`${dir}/`))));
  assert.ok(files.includes('src/server.js'));
  assert.ok(files.includes('public/app.js'));
  assert.ok(files.includes('scripts/run-coverage.mjs'));
});

test('listJsFilesInDirectory discovers nested modules in temporary directories', () => {
  const directory = mkdtempSync(join(tmpdir(), 'yesornoaas-coverage-inventory-'));

  try {
    mkdirSync(join(directory, 'nested'));
    writeFileSync(join(directory, 'root.js'), 'export {};\n');
    writeFileSync(join(directory, 'nested', 'child.mjs'), 'export {};\n');
    writeFileSync(join(directory, 'ignored.txt'), 'skip\n');

    assert.deepEqual(listJsFilesInDirectory(directory).sort(), [
      `${directory}/nested/child.mjs`,
      `${directory}/root.js`
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('listJsFilesInDirectory discovers nested modules', () => {
  assert.deepEqual(listJsFilesInDirectory('src').sort(), [
    'src/cli.js',
    'src/graceful-shutdown.js',
    'src/mcp.js',
    'src/metrics.js',
    'src/rate-limit-config.js',
    'src/rate-limit.js',
    'src/responses.js',
    'src/run-if-main.js',
    'src/server.js',
    'src/shutdown-config.js',
    'src/trust-proxy-config.js'
  ]);
});

test('parseCoverageFiles reads production entries from the coverage report', () => {
  const output = `
# start of coverage report
# -----------------------------------------------------------
# file                   | line % | branch % | funcs % | uncovered lines
# -----------------------------------------------------------
# src                    |        |          |         |
#  cli.js                | 100.00 |   100.00 |  100.00 |
# public                 |        |          |         |
#  app.js                | 100.00 |   100.00 |  100.00 |
# scripts                |        |          |         |
#  run-coverage.mjs      | 100.00 |   100.00 |  100.00 |
# -----------------------------------------------------------
# all files              | 100.00 |   100.00 |  100.00 |
# -----------------------------------------------------------
# end of coverage report
`;

  assert.deepEqual([...parseCoverageFiles(output)].sort(), [
    'public/app.js',
    'scripts/run-coverage.mjs',
    'src/cli.js'
  ]);
});

test('parseCoverageFiles reads info-prefixed coverage rows from Node 24 output', () => {
  const output = `
ℹ start of coverage report
ℹ -----------------------------------------------------------
ℹ file                   | line % | branch % | funcs % | uncovered lines
ℹ -----------------------------------------------------------
ℹ src                    |        |          |         |
ℹ  cli.js                | 100.00 |   100.00 |  100.00 |
ℹ public                 |        |          |         |
ℹ  app.js                | 100.00 |   100.00 |  100.00 |
ℹ -----------------------------------------------------------
ℹ end of coverage report
`;

  assert.deepEqual([...parseCoverageFiles(output)].sort(), ['public/app.js', 'src/cli.js']);
});

test('parseCoverageFiles ignores diagnostic lines outside the report', () => {
  const output = `
# Error: startup failed
#     at TestContext.<anonymous> (file:///tmp/example.test.js:1:1)
# start of coverage report
# public                 |        |          |         |
#  app.js                | 100.00 |   100.00 |  100.00 |
# end of coverage report
`;

  assert.deepEqual([...parseCoverageFiles(output)], ['public/app.js']);
});

test('extractCoverageReport returns an empty string when markers are missing', () => {
  assert.equal(extractCoverageReport('no coverage report here'), '');
});

test('findCoverageInventoryMismatches flags production files missing from coverage', () => {
  const output = `
# start of coverage report
# src                    |        |          |         |
#  cli.js                | 100.00 |   100.00 |  100.00 |
# public                 |        |          |         |
#  app.js                | 100.00 |   100.00 |  100.00 |
# end of coverage report
`;

  const { missingFiles, unexpectedFiles } = findCoverageInventoryMismatches(output, [
    'src/cli.js',
    'public/app.js',
    'scripts/run-coverage.mjs',
    'src/server.js'
  ]);

  assert.deepEqual(missingFiles, ['scripts/run-coverage.mjs', 'src/server.js']);
  assert.deepEqual(unexpectedFiles, []);
});
