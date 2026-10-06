import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { runCli, runIfMain, USAGE } from '../src/cli.js';

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

test('CLI random subcommand returns Yes! when the injected source selects yes', () => {
  const localThis = {
    stdout: '',
    exitCode: null
  };

  const status = runCli({
    argv: ['node', cliPath, 'random'],
    stdout: {
      write(text) {
        localThis.stdout += text;
      }
    },
    stderr: {
      write() {}
    },
    exit(code) {
      localThis.exitCode = code;
    },
    randomNumberSource: () => 0
  });

  assert.equal(status, 0);
  assert.equal(localThis.stdout, 'Yes!\n');
  assert.equal(localThis.exitCode, null);
});

test('CLI random subcommand returns No! when the injected source selects no', () => {
  const localThis = {
    stdout: ''
  };

  const status = runCli({
    argv: ['node', cliPath, 'random'],
    stdout: {
      write(text) {
        localThis.stdout += text;
      }
    },
    stderr: {
      write() {}
    },
    exit() {},
    randomNumberSource: () => 0.5
  });

  assert.equal(status, 0);
  assert.equal(localThis.stdout, 'No!\n');
});

test('CLI without arguments exits with usage on stderr', () => {
  const result = spawnSync(process.execPath, [cliPath], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, USAGE);
});

test('CLI with invalid subcommand exits with usage on stderr', () => {
  const result = spawnSync(process.execPath, [cliPath, 'invalid'], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, USAGE);
});

test('runIfMain starts the CLI for the executed module', (t) => {
  const start = t.mock.fn();

  runIfMain({
    moduleUrl: pathToFileURL(cliPath).href,
    argvPath: cliPath,
    start
  });

  assert.equal(start.mock.calls.length, 1);
});

test('runIfMain skips CLI startup when imported as a dependency', (t) => {
  const start = t.mock.fn();

  runIfMain({
    moduleUrl: pathToFileURL(cliPath).href,
    argvPath: resolve('test/cli.test.js'),
    start
  });

  assert.equal(start.mock.calls.length, 0);
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
