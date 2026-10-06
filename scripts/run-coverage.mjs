import { spawnSync } from 'node:child_process';
import { isExecutedModule } from '../src/run-if-main.js';
import {
  findCoverageInventoryMismatches,
  listSourceFiles,
  PRODUCTION_DIRECTORIES
} from './coverage-inventory.mjs';

export function buildCoverageArgs() {
  return [
    '--test',
    '--experimental-test-coverage',
    ...PRODUCTION_DIRECTORIES.map((directory) => `--test-coverage-include=${directory}/**`),
    '--test-coverage-exclude=test/**',
    '--test-coverage-lines=100',
    '--test-coverage-branches=100',
    '--test-coverage-functions=100'
  ];
}

export function runCoverage({
  execPath = process.execPath,
  spawnSyncImpl = spawnSync,
  stdout = process.stdout,
  stderr = process.stderr,
  exit = process.exit,
  expectedFiles = listSourceFiles()
} = {}) {
  const result = spawnSyncImpl(execPath, buildCoverageArgs(), {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['inherit', 'pipe', 'inherit']
  });

  stdout.write(result.stdout);

  if (result.status !== 0) {
    exit(result.status ?? 1);
    return { status: result.status ?? 1, stdout: result.stdout };
  }

  const { missingFiles, unexpectedFiles } = findCoverageInventoryMismatches(
    result.stdout,
    expectedFiles
  );

  if (missingFiles.length > 0 || unexpectedFiles.length > 0) {
    stderr.write('Coverage inventory mismatch for production files:\n');

    for (const file of missingFiles) {
      stderr.write(`- missing from coverage report: ${file}\n`);
    }

    for (const file of unexpectedFiles) {
      stderr.write(`- unexpected coverage entry: ${file}\n`);
    }

    exit(1);
    return { status: 1, stdout: result.stdout, missingFiles, unexpectedFiles };
  }

  return { status: 0, stdout: result.stdout };
}

export function runCoverageCli(options = {}) {
  return runCoverage(options);
}

export function runCoverageCliIfMain({
  isExecutedModuleImpl = isExecutedModule,
  ...options
} = {}) {
  if (isExecutedModuleImpl(import.meta.url)) {
    runCoverageCli(options);
  }
}

runCoverageCliIfMain();
