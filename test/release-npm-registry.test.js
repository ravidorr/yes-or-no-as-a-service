import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const scriptPath = join(process.cwd(), 'scripts/release-npm-registry.sh');

function createMockNpm(responses) {
  const dir = mkdtempSync(join(tmpdir(), 'release-npm-registry-'));
  const npmPath = join(dir, 'npm');
  const body = `#!/usr/bin/env bash
set -euo pipefail
if [ "$1" = publish ]; then
  echo "npm publish --access public --provenance"
  exit 0
fi
if [ "$1" != view ]; then
  echo "unexpected npm command: $*" >&2
  exit 99
fi
spec="$2"
case "$spec" in
${Object.entries(responses)
  .map(([key, value]) => `  ${key}) ${value} ;;`)
  .join('\n')}
  *) echo "unexpected npm view spec: $spec" >&2; exit 99 ;;
esac
`;
  writeFileSync(npmPath, body);
  chmodSync(npmPath, 0o755);
  return dir;
}

function runScript(command, packageName, version, responses) {
  const mockDir = createMockNpm(responses);
  return spawnSync('bash', [scriptPath, command, packageName, version], {
    env: { ...process.env, PATH: `${mockDir}:${process.env.PATH}` },
    encoding: 'utf8'
  });
}

test('publish skips when the release version is already on npm', () => {
  const result = runScript('publish', '@ravidor/yesornoaas', '2.2.8', {
    '@ravidor/yesornoaas@2.2.8': 'echo "2.2.8"',
    '@ravidor/yesornoaas@latest': 'echo "2.2.8"'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /already on npm; skipping publish/);
});

test('publish skips bootstrap when the package is missing on npm', () => {
  const result = runScript('publish', '@ravidor/yesornoaas', '2.2.8', {
    '@ravidor/yesornoaas@2.2.8': 'echo "404 Not Found" >&2; exit 1',
    '@ravidor/yesornoaas@latest': 'echo "404 Not Found" >&2; exit 1'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /not on npm yet/);
  assert.match(result.stdout, /docs\/NPM_BOOTSTRAP\.md/);
});

test('publish runs npm publish when the package exists but the version is new', () => {
  const result = runScript('publish', '@ravidor/yesornoaas', '2.2.9', {
    '@ravidor/yesornoaas@2.2.9': 'echo "404 Not Found" >&2; exit 1',
    '@ravidor/yesornoaas@latest': 'echo "2.2.8"'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /access public --provenance/);
});

test('publish fails on non-404 npm view errors', () => {
  const result = runScript('publish', '@ravidor/yesornoaas', '2.2.8', {
    '@ravidor/yesornoaas@2.2.8': 'echo "503 Service Unavailable" >&2; exit 1',
    '@ravidor/yesornoaas@latest': 'echo "2.2.8"'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /registry error/);
});

test('publish treats npm E404 as a missing package', () => {
  const result = runScript('publish', '@ravidor/yesornoaas', '2.2.8', {
    '@ravidor/yesornoaas@2.2.8': 'echo "npm error code E404" >&2; echo "404 Not Found" >&2; exit 1',
    '@ravidor/yesornoaas@latest': 'echo "npm error code E404" >&2; echo "404 Not Found" >&2; exit 1'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /not on npm yet/);
});

test('verify fails when the package is not bootstrapped on npm', () => {
  const result = runScript('verify', '@ravidor/yesornoaas', '2.2.8', {
    '@ravidor/yesornoaas@latest': 'echo "404 Not Found" >&2; exit 1',
    '@ravidor/yesornoaas@2.2.8': 'echo "404 Not Found" >&2; exit 1'
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /not on npm/);
  assert.match(result.stdout, /docs\/NPM_BOOTSTRAP\.md/);
});

test('verify fails when the package exists but the version is missing', () => {
  const result = runScript('verify', '@ravidor/yesornoaas', '2.2.9', {
    '@ravidor/yesornoaas@latest': 'echo "2.2.8"',
    '@ravidor/yesornoaas@2.2.9': 'echo "404 Not Found" >&2; exit 1'
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /not on npm after the publish step/);
});

test('verify succeeds when the release version is on npm', () => {
  const result = runScript('verify', '@ravidor/yesornoaas', '2.2.8', {
    '@ravidor/yesornoaas@latest': 'echo "2.2.8"',
    '@ravidor/yesornoaas@2.2.8': 'echo "2.2.8"'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Verified @ravidor\/yesornoaas@2.2.8 on npm/);
});
