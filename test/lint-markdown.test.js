import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

function runMarkdownLint() {
  execFileSync('npm', ['run', 'lint:md'], { stdio: 'pipe' });
}

test('Markdown lint ignores ignored worktree files but validates repository files', () => {
  const worktreesDirectory = join(process.cwd(), '.worktrees');
  mkdirSync(worktreesDirectory, { recursive: true });
  const ignoredDirectory = mkdtempSync(join(worktreesDirectory, 'markdown-lint-'));
  const ignoredFile = join(ignoredDirectory, 'invalid.md');
  const visibleFile = join(process.cwd(), 'markdown-lint-visible-fixture.md');

  writeFileSync(ignoredFile, '## Invalid heading\n');

  try {
    assert.doesNotThrow(runMarkdownLint);

    writeFileSync(visibleFile, '## Invalid heading\n');
    assert.throws(runMarkdownLint);
  } finally {
    rmSync(ignoredDirectory, { force: true, recursive: true });
    rmSync(visibleFile, { force: true });
  }
});
