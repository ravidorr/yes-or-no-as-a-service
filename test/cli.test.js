import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';

const cliPath = resolve('src/cli.js');

test('CLI yes subcommand returns Yes!', () => {
  const result = spawnSync(process.execPath, [cliPath, 'yes'], { encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'Yes!\n');
  assert.equal(result.stderr, '');
});

test('CLI no subcommand returns No!', () => {
  const result = spawnSync(process.execPath, [cliPath, 'no'], { encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'No!\n');
  assert.equal(result.stderr, '');
});

test('CLI without arguments exits with usage on stderr', () => {
  const result = spawnSync(process.execPath, [cliPath], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'Usage: yornaas <yes|no>\n');
});

test('CLI with invalid subcommand exits with usage on stderr', () => {
  const result = spawnSync(process.execPath, [cliPath, 'maybe'], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'Usage: yornaas <yes|no>\n');
});

test('CLI ignores extra arguments after the subcommand', () => {
  const result = spawnSync(process.execPath, [cliPath, 'yes', '--payload', 'no'], {
    encoding: 'utf8',
    input: '{"question":"please?"}'
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'Yes!\n');
  assert.equal(result.stderr, '');
});
