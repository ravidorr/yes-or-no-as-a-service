import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { isExecutedModule } from '../src/run-if-main.js';

export function listStagedFiles() {
  const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });

  return output
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function shouldSyncPackageLock(stagedFiles) {
  return stagedFiles.includes('package.json');
}

export function readStagedFileContent(filePath) {
  return execSync(`git show :${filePath}`, { encoding: 'utf8' });
}

export function generatePackageLockFromManifest(
  manifestContents,
  { execSyncImpl = execSync } = {}
) {
  const tempDir = mkdtempSync(join(tmpdir(), 'yesornoaas-lock-sync-'));

  try {
    writeFileSync(join(tempDir, 'package.json'), manifestContents);
    execSyncImpl('npm install --package-lock-only --ignore-scripts', {
      cwd: tempDir,
      stdio: 'pipe'
    });

    return readFileSync(join(tempDir, 'package-lock.json'), 'utf8');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export function syncPackageLock({
  execSyncImpl = execSync,
  readStagedFileContentImpl = readStagedFileContent,
  writeFileSyncImpl = writeFileSync,
  resolveImpl = resolve,
  generatePackageLockFromManifestImpl = generatePackageLockFromManifest
} = {}) {
  const manifestContents = readStagedFileContentImpl('package.json');
  const lockfile = generatePackageLockFromManifestImpl(manifestContents, { execSyncImpl });

  writeFileSyncImpl(resolveImpl('package-lock.json'), lockfile);
  execSyncImpl('git add package-lock.json', { stdio: 'inherit' });
}

export function runSyncPackageLockCli(options = {}) {
  return syncPackageLock(options);
}

export function runSyncPackageLockCliIfMain({
  isExecutedModuleImpl = isExecutedModule,
  ...options
} = {}) {
  if (isExecutedModuleImpl(import.meta.url)) {
    runSyncPackageLockCli(options);
  }
}

runSyncPackageLockCliIfMain();
