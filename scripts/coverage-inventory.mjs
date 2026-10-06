import { readdirSync } from 'node:fs';
import { join, sep } from 'node:path';

export const PRODUCTION_DIRECTORIES = ['src', 'public', 'scripts'];

const PRODUCTION_FILE_PATTERN = /\.(?:js|mjs)$/;

export function normalizePath(path) {
  return path.split(sep).join('/');
}

export function listJsFilesInDirectory(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listJsFilesInDirectory(path);
    }

    return PRODUCTION_FILE_PATTERN.test(entry.name) ? [normalizePath(path)] : [];
  });
}

export function listSourceFiles(directories = PRODUCTION_DIRECTORIES) {
  return directories.flatMap((directory) => listJsFilesInDirectory(directory));
}

const COVERAGE_REPORT_PREFIX = '[#ℹ]';

export function extractCoverageReport(output) {
  const startMatch = output.match(
    new RegExp(`${COVERAGE_REPORT_PREFIX} start of coverage report`)
  );
  const endMatch = output.match(
    new RegExp(`${COVERAGE_REPORT_PREFIX} end of coverage report`)
  );

  if (!startMatch || !endMatch || endMatch.index <= startMatch.index) {
    return '';
  }

  return output.slice(startMatch.index, endMatch.index);
}

const COVERAGE_DIRECTORY_PATTERN = new RegExp(
  `^${COVERAGE_REPORT_PREFIX} (src|public|scripts)\\s+\\|`
);
const COVERAGE_FILE_PATTERN = new RegExp(
  `^${COVERAGE_REPORT_PREFIX} {2}([A-Za-z0-9._-]+\\.(?:js|mjs))\\s+\\|`
);

export function parseCoverageFiles(output) {
  const files = new Set();
  const report = extractCoverageReport(output);
  let currentDirectory = null;

  for (const line of report.split('\n')) {
    const directoryMatch = line.match(COVERAGE_DIRECTORY_PATTERN);

    if (directoryMatch) {
      currentDirectory = directoryMatch[1];
      continue;
    }

    const fileMatch = line.match(COVERAGE_FILE_PATTERN);

    if (fileMatch && currentDirectory) {
      files.add(normalizePath(`${currentDirectory}/${fileMatch[1].trim()}`));
    }
  }

  return files;
}

export function findCoverageInventoryMismatches(output, expectedFiles = listSourceFiles()) {
  const reportedFiles = [...parseCoverageFiles(output)].sort();
  const expected = [...expectedFiles].sort();

  return {
    missingFiles: expected.filter((file) => !reportedFiles.includes(file)),
    unexpectedFiles: reportedFiles.filter((file) => !expected.includes(file))
  };
}
