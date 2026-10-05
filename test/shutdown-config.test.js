import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_READINESS_GRACE_MS,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  MAX_SHUTDOWN_TIMEOUT_MS,
  parseShutdownConfig,
  validateShutdownConfig
} from '../src/shutdown-config.js';

test('parseShutdownConfig uses default when env var is unset', () => {
  assert.deepEqual(parseShutdownConfig({}), {
    timeoutMs: DEFAULT_SHUTDOWN_TIMEOUT_MS,
    readinessGraceMs: DEFAULT_READINESS_GRACE_MS
  });
});

test('parseShutdownConfig reads configured env var', () => {
  assert.deepEqual(parseShutdownConfig({ SHUTDOWN_TIMEOUT_MS: '60000' }), {
    timeoutMs: 60000,
    readinessGraceMs: DEFAULT_READINESS_GRACE_MS
  });
});

test('parseShutdownConfig reads readiness grace env var', () => {
  assert.deepEqual(parseShutdownConfig({ SHUTDOWN_READINESS_GRACE_MS: '500' }), {
    timeoutMs: DEFAULT_SHUTDOWN_TIMEOUT_MS,
    readinessGraceMs: 500
  });
});

test('parseShutdownConfig rejects zero', () => {
  assert.throws(
    () => parseShutdownConfig({ SHUTDOWN_TIMEOUT_MS: '0' }),
    /SHUTDOWN_TIMEOUT_MS must be a positive integer/
  );
});

test('parseShutdownConfig rejects negative values', () => {
  assert.throws(
    () => parseShutdownConfig({ SHUTDOWN_TIMEOUT_MS: '-1' }),
    /SHUTDOWN_TIMEOUT_MS must be a positive integer/
  );
});

test('parseShutdownConfig rejects fractional values', () => {
  assert.throws(
    () => parseShutdownConfig({ SHUTDOWN_TIMEOUT_MS: '1.5' }),
    /SHUTDOWN_TIMEOUT_MS must be a positive integer/
  );
});

test('parseShutdownConfig rejects nonnumeric values', () => {
  assert.throws(
    () => parseShutdownConfig({ SHUTDOWN_TIMEOUT_MS: 'bad' }),
    /SHUTDOWN_TIMEOUT_MS must be a positive integer/
  );
});

test('validateShutdownConfig rejects invalid values', () => {
  assert.throws(
    () => validateShutdownConfig({ timeoutMs: 0, readinessGraceMs: DEFAULT_READINESS_GRACE_MS }),
    /timeoutMs must be a positive integer/
  );
  assert.throws(
    () =>
      validateShutdownConfig({
        timeoutMs: DEFAULT_SHUTDOWN_TIMEOUT_MS,
        readinessGraceMs: 0
      }),
    /readinessGraceMs must be a positive integer/
  );
  assert.throws(
    () => validateShutdownConfig({ timeoutMs: MAX_SHUTDOWN_TIMEOUT_MS + 1, readinessGraceMs: 1 }),
    /timeoutMs must not exceed 2147483647, the maximum Node.js timer delay/
  );
});

test('parseShutdownConfig rejects values beyond the Node.js timer limit', () => {
  assert.throws(
    () => parseShutdownConfig({ SHUTDOWN_TIMEOUT_MS: String(MAX_SHUTDOWN_TIMEOUT_MS + 1) }),
    /timeoutMs must not exceed 2147483647, the maximum Node.js timer delay/
  );
});
