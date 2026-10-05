import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  extractChangelogSection,
  readChangelogAtRef,
  readPackageVersionAtRef
} from './release-notes.mjs';

export function detectVersionBump(beforeRef) {
  if (!beforeRef || /^0+$/.test(beforeRef)) {
    return { bumped: false, reason: 'no-before-sha' };
  }

  try {
    const beforeVersion = readPackageVersionAtRef(beforeRef);
    const headVersion = readPackageVersionAtRef('HEAD');

    if (beforeVersion === headVersion) {
      return {
        bumped: false,
        reason: 'unchanged',
        version: headVersion
      };
    }

    const changelog = readChangelogAtRef('HEAD');
    const notes = extractChangelogSection(changelog, headVersion);

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

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const beforeRef = process.env.GITHUB_EVENT_BEFORE ?? process.argv[2];
  const result = detectVersionBump(beforeRef);

  writeVersionBumpOutputs(result);

  if (!result.bumped) {
    console.log(`No release required (${result.reason ?? 'skipped'}).`);
    process.exit(0);
  }

  console.log(`Release required for ${result.tag}.`);
}
