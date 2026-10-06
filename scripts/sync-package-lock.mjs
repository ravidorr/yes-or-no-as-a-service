import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { isExecutedModule } from '../src/run-if-main.js';
import { assertValidStagedPath, execGit } from './git-exec.mjs';

export function resolveNpmExecutable(platform = process.platform) {
  return platform === 'win32' ? 'npm.cmd' : 'npm';
}

export function execNpm(
  args,
  options = {},
  { execFileSyncImpl = execFileSync, platform = process.platform } = {}
) {
  return execFileSyncImpl(resolveNpmExecutable(platform), args, {
    ...options,
    ...(platform === 'win32' ? { shell: true } : {})
  });
}

export function listStagedFiles({ execGitImpl = execGit } = {}) {
  const output = execGitImpl(['diff', '--cached', '--name-only']);

  return output
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function shouldSyncPackageLock(stagedFiles) {
  return stagedFiles.includes('package.json');
}

export function readStagedFileContent(filePath, { execGitImpl = execGit } = {}) {
  assertValidStagedPath(filePath);
  return execGitImpl(['show', `:${filePath}`]);
}

export function generatePackageLockFromManifest(
  manifestContents,
  { execNpmImpl = execNpm } = {}
) {
  const tempDir = mkdtempSync(join(tmpdir(), 'yesornoaas-lock-sync-'));

  try {
    writeFileSync(join(tempDir, 'package.json'), manifestContents);
    execNpmImpl(['install', '--package-lock-only', '--ignore-scripts'], {
      cwd: tempDir,
      stdio: 'pipe'
    });

    return readFileSync(join(tempDir, 'package-lock.json'), 'utf8');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export function syncPackageLock({
  execGitImpl = execGit,
  readStagedFileContentImpl = readStagedFileContent,
  writeFileSyncImpl = writeFileSync,
  resolveImpl = resolve,
  generatePackageLockFromManifestImpl = generatePackageLockFromManifest
} = {}) {
  const manifestContents = readStagedFileContentImpl('package.json', { execGitImpl });
  const lockfile = generatePackageLockFromManifestImpl(manifestContents);

  writeFileSyncImpl(resolveImpl('package-lock.json'), lockfile);
  execGitImpl(['add', 'package-lock.json'], { stdio: 'inherit' });
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
