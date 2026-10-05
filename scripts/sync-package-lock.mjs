import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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

export function syncPackageLock({ execSyncImpl = execSync } = {}) {
  const manifestContents = readStagedFileContent('package.json');
  const lockfile = generatePackageLockFromManifest(manifestContents, { execSyncImpl });

  writeFileSync(resolve('package-lock.json'), lockfile);
  execSyncImpl('git add package-lock.json', { stdio: 'inherit' });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncPackageLock();
}
