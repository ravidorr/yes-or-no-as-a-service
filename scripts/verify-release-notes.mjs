import { execSync } from 'node:child_process';
import { verifyReleaseNotesAgainstBase } from './release-notes.mjs';

const baseRef = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'origin/main';

if (!baseRef) {
  console.error('Missing value for --base.');
  process.exit(1);
}

try {
  execSync(`git rev-parse --verify ${baseRef}`, { stdio: 'ignore' });
} catch {
  console.error(`Base ref not found: ${baseRef}`);
  console.error('Fetch the base branch first, for example: git fetch origin main');
  process.exit(1);
}

const errors = verifyReleaseNotesAgainstBase(baseRef);

if (errors.length > 0) {
  console.error('Release notes verification failed:');

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(`Release notes verified against ${baseRef}.`);
