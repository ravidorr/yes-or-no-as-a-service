import { spawnSync } from 'node:child_process';
import {
  findCoverageInventoryMismatches,
  listSourceFiles
} from './coverage-inventory.mjs';

const expectedFiles = listSourceFiles().sort();
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--experimental-test-coverage',
    '--test-coverage-include=src/**',
    '--test-coverage-exclude=test/**',
    '--test-coverage-lines=100',
    '--test-coverage-branches=100',
    '--test-coverage-functions=100'
  ],
  {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['inherit', 'pipe', 'inherit']
  }
);

process.stdout.write(result.stdout);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const { missingFiles, unexpectedFiles } = findCoverageInventoryMismatches(result.stdout, expectedFiles);

if (missingFiles.length > 0 || unexpectedFiles.length > 0) {
  console.error('Coverage inventory mismatch for src/:');

  for (const file of missingFiles) {
    console.error(`- missing from coverage report: src/${file}`);
  }

  for (const file of unexpectedFiles) {
    console.error(`- unexpected coverage entry: ${file}`);
  }

  process.exit(1);
}
