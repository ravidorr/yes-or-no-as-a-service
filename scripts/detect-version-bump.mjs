import { appendFileSync } from 'node:fs';
import { isExecutedModule } from '../src/run-if-main.js';
import {
  extractChangelogSection,
  readChangelogAtRef,
  readPackageVersionAtRef
} from './release-notes.mjs';

export function detectVersionBump(
  beforeRef,
  {
    readPackageVersionAtRefImpl = readPackageVersionAtRef,
    readChangelogAtRefImpl = readChangelogAtRef,
    extractChangelogSectionImpl = extractChangelogSection
  } = {}
) {
  // GitHub Actions uses an all-zero before SHA on the first push to a branch.
  if (!beforeRef || /^0+$/.test(beforeRef)) {
    return { bumped: false, reason: 'no-before-sha' };
  }

  try {
    const beforeVersion = readPackageVersionAtRefImpl(beforeRef);
    const headVersion = readPackageVersionAtRefImpl('HEAD');

    if (beforeVersion === headVersion) {
      return {
        bumped: false,
        reason: 'unchanged',
        version: headVersion
      };
    }

    const changelog = readChangelogAtRefImpl('HEAD');
    const notes = extractChangelogSectionImpl(changelog, headVersion);

    return {
      bumped: true,
      version: headVersion,
      tag: `v${headVersion}`,
      notes
    };
  } catch (error) {
    return {
      bumped: false,
      reason: error.message
    };
  }
}

export function runDetectVersionBumpCli({
  argv = process.argv,
  env = process.env,
  detectVersionBumpImpl = detectVersionBump,
  writeVersionBumpOutputsImpl = writeVersionBumpOutputs,
  stdout = process.stdout,
  exit = process.exit
} = {}) {
  const beforeRef = env.GITHUB_EVENT_BEFORE ?? argv[2];
  const result = detectVersionBumpImpl(beforeRef);

  writeVersionBumpOutputsImpl(result);

  if (!result.bumped) {
    stdout.write(`No release required (${result.reason ?? 'skipped'}).\n`);
    exit(0);
    return result;
  }

  stdout.write(`Release required for ${result.tag}.\n`);
  return result;
}

export function writeVersionBumpOutputs(result, outputPath = process.env.GITHUB_OUTPUT) {
  if (!outputPath) {
    return;
  }

  appendFileSync(outputPath, `bumped=${result.bumped}\n`);

  if (result.version) {
    appendFileSync(outputPath, `version=${result.version}\n`);
  }

  if (result.tag) {
    appendFileSync(outputPath, `tag=${result.tag}\n`);
  }

  if (result.notes) {
    appendFileSync(outputPath, `notes<<EOF\n${result.notes}\nEOF\n`);
  }
}

export function runDetectVersionBumpCliIfMain({
  isExecutedModuleImpl = isExecutedModule,
  ...options
} = {}) {
  if (isExecutedModuleImpl(import.meta.url)) {
    runDetectVersionBumpCli(options);
  }
}

runDetectVersionBumpCliIfMain();
