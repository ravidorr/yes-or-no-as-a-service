import { execSync } from 'node:child_process';
import { isExecutedModule } from '../src/run-if-main.js';
import { verifyReleaseNotesAgainstBase } from './release-notes.mjs';

export function resolveBaseRef(argv = process.argv) {
  if (!argv.includes('--base')) {
    return 'origin/main';
  }

  return argv[argv.indexOf('--base') + 1];
}

export function runVerifyReleaseNotes({
  argv = process.argv,
  execSyncImpl = execSync,
  verifyReleaseNotesAgainstBaseImpl = verifyReleaseNotesAgainstBase,
  stderr = process.stderr,
  stdout = process.stdout,
  exit = process.exit
} = {}) {
  const baseRef = resolveBaseRef(argv);

  if (!baseRef) {
    stderr.write('Missing value for --base.\n');
    exit(1);
    return { ok: false, reason: 'missing-base' };
  }

  try {
    execSyncImpl(`git rev-parse --verify ${baseRef}`, { stdio: 'ignore' });
  } catch {
    stderr.write(`Base ref not found: ${baseRef}\n`);
    stderr.write('Fetch the base branch first, for example: git fetch origin main\n');
    exit(1);
    return { ok: false, reason: 'missing-ref', baseRef };
  }

  const errors = verifyReleaseNotesAgainstBaseImpl(baseRef);

  if (errors.length > 0) {
    stderr.write('Release notes verification failed:\n');

    for (const error of errors) {
      stderr.write(`- ${error}\n`);
    }

    exit(1);
    return { ok: false, reason: 'validation', errors, baseRef };
  }

  stdout.write(`Release notes verified against ${baseRef}.\n`);
  return { ok: true, baseRef };
}

export function runVerifyReleaseNotesCli(options = {}) {
  return runVerifyReleaseNotes(options);
}

export function runVerifyReleaseNotesCliIfMain({
  isExecutedModuleImpl = isExecutedModule,
  ...options
} = {}) {
  if (isExecutedModuleImpl(import.meta.url)) {
    runVerifyReleaseNotesCli(options);
  }
}

runVerifyReleaseNotesCliIfMain();
