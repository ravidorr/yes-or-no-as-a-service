import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (!existsSync('.git') || process.env.CI === 'true') {
  process.exit(0);
}

execSync('husky', { stdio: 'inherit' });
