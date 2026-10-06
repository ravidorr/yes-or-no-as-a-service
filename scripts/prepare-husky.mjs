import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function isPrepareHuskyMain(
  moduleUrl = import.meta.url,
  argvPath = process.argv[1]
) {
  if (typeof argvPath !== 'string') {
    return false;
  }

  return moduleUrl === pathToFileURL(argvPath).href;
}

export function runPrepareHusky({
  existsSyncImpl = existsSync,
  execSyncImpl = execSync,
  env = process.env,
  exit = process.exit
} = {}) {
  if (!existsSyncImpl('.git') || env.CI === 'true') {
    exit(0);
    return { skipped: true };
  }

  execSyncImpl('husky', { stdio: 'inherit' });
  return { skipped: false };
}

export function runPrepareHuskyCli(options = {}) {
  return runPrepareHusky(options);
}

export function runPrepareHuskyCliIfMain({
  isPrepareHuskyMainImpl = isPrepareHuskyMain,
  ...options
} = {}) {
  if (isPrepareHuskyMainImpl()) {
    runPrepareHuskyCli(options);
  }
}

runPrepareHuskyCliIfMain();
