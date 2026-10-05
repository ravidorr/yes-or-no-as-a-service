import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
import packageInfo from '../package.json' with { type: 'json' };

const serverPath = resolve('src/server.js');

test('graceful drain returns 503 from health before exiting cleanly', async () => {
  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      PORT: '0',
      SHUTDOWN_READINESS_GRACE_MS: '500',
      SHUTDOWN_TIMEOUT_MS: '5000'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });

  const ready = new Promise((resolvePromise, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('server startup timed out')), 5000);

    const checkReady = () => {
      const match = stdout.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        clearTimeout(timeoutId);
        resolvePromise(match[1]);
      }
    };

    child.stdout.on('data', checkReady);
    child.on('error', reject);
    checkReady();
  });

  const port = await ready;
  const healthUrl = `http://127.0.0.1:${port}/health`;

  const readyResponse = await fetch(healthUrl);
  assert.equal(readyResponse.status, 200);
  assert.deepEqual(await readyResponse.json(), { status: 'YorNaaS', version: packageInfo.version });

  child.kill('SIGTERM');

  const drainingResponse = await new Promise((resolvePromise, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('health did not drain')), 3000);
    const poll = async () => {
      try {
        const response = await fetch(healthUrl);
        if (response.status === 503) {
          clearTimeout(timeoutId);
          resolvePromise(response);
          return;
        }
      } catch {
        // Keep polling until the server reports draining.
      }

      setTimeout(poll, 50);
    };

    poll();
  });

  assert.equal(drainingResponse.status, 503);
  assert.deepEqual(await drainingResponse.json(), { status: 'YorNaaS', version: packageInfo.version });

  const exitCode = await new Promise((resolvePromise) => {
    child.on('close', resolvePromise);
  });

  assert.equal(exitCode, 0);
  assert.match(stdout, /Received SIGTERM, starting graceful shutdown/);
  assert.match(stdout, /Graceful shutdown complete/);
});
