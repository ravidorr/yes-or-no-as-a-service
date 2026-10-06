import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isExecutedModule } from '../src/run-if-main.js';
import { renderThemeBootstrapScript } from '../public/theme-bootstrap-core.js';

export function syncThemeBootstrap({
  writeFileSyncImpl = writeFileSync,
  outputPath = resolve('public/theme-bootstrap.js')
} = {}) {
  writeFileSyncImpl(outputPath, renderThemeBootstrapScript());
}

export function runSyncThemeBootstrapCli(options = {}) {
  syncThemeBootstrap(options);
}

export function runSyncThemeBootstrapCliIfMain({
  isExecutedModuleImpl = isExecutedModule,
  ...options
} = {}) {
  if (isExecutedModuleImpl(import.meta.url)) {
    runSyncThemeBootstrapCli(options);
  }
}

runSyncThemeBootstrapCliIfMain();
