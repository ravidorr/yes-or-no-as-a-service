import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { isExecutedModule } from '../src/run-if-main.js';

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
  isExecutedModuleImpl = isExecutedModule,
  ...options
} = {}) {
  if (isExecutedModuleImpl(import.meta.url)) {
    runPrepareHuskyCli(options);
  }
}

runPrepareHuskyCliIfMain();
