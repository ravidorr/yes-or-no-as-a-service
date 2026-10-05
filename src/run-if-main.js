import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function isExecutedModule(moduleUrl, argvPath = process.argv[1]) {
  if (typeof argvPath !== 'string') {
    return false;
  }

  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(resolve(argvPath));
  } catch {
    return moduleUrl === pathToFileURL(resolve(argvPath)).href;
  }
}
