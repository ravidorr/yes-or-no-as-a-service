import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkDockerHealth, runDockerHealthcheckCliIfMain } from '../scripts/docker-healthcheck.mjs';

test('checkDockerHealth exits when the health endpoint is unavailable', async () => {
  const localThis = {
    exitCode: null
  };

  const result = await checkDockerHealth({
    fetchImpl: async () => ({ status: 503 }),
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, 1);
  assert.equal(result.healthy, false);
  assert.equal(result.reason, 'status');
});

test('checkDockerHealth exits when the payload is invalid', async () => {
  const localThis = {
    exitCode: null
  };

  const result = await checkDockerHealth({
    fetchImpl: async () => ({
      status: 200,
      async json() {
        return { status: 'broken' };
      }
    }),
    exit(code) {
      localThis.exitCode = code;
    }
  });

  assert.equal(localThis.exitCode, 1);
  assert.equal(result.reason, 'body');
});

test('runDockerHealthcheckCliIfMain delegates to the healthcheck runner', async () => {
  const localThis = {
    called: false
  };

  await runDockerHealthcheckCliIfMain({
    isExecutedModuleImpl: () => true,
    fetchImpl: async () => ({
      status: 200,
      async json() {
        return { status: 'YESorNOaaS', version: '2.1.3' };
      }
    }),
    exit() {
      localThis.called = true;
    }
  });

  assert.equal(localThis.called, false);
});

test('checkDockerHealth succeeds for a valid health payload', async () => {
  const localThis = {
    exitCode: null
  };

  const result = await checkDockerHealth({
    fetchImpl: async () => ({
      status: 200,
      async json() {
        return { status: 'YESorNOaaS', version: '2.1.3' };
      }
    }),
    exit(code) {
      localThis.exitCode = code;
    },
    port: '3000'
  });

  assert.equal(localThis.exitCode, null);
  assert.equal(result.healthy, true);
  assert.deepEqual(result.body, { status: 'YESorNOaaS', version: '2.1.3' });
});
