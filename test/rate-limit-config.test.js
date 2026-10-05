import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  MAX_RATE_LIMIT_WINDOW_MS,
  parsePositiveInteger,
  parseRateLimitConfig,
  validateRateLimitConfig
} from '../src/rate-limit-config.js';

test('parsePositiveInteger returns undefined for unset values', () => {
  assert.equal(parsePositiveInteger(undefined, 'RATE_LIMIT_MAX'), undefined);
  assert.equal(parsePositiveInteger('', 'RATE_LIMIT_MAX'), undefined);
});

test('parsePositiveInteger accepts positive integers', () => {
  assert.equal(parsePositiveInteger('100', 'RATE_LIMIT_MAX'), 100);
  assert.equal(parsePositiveInteger('1', 'RATE_LIMIT_MAX'), 1);
});

test('parsePositiveInteger rejects invalid values', () => {
  assert.throws(
    () => parsePositiveInteger('0', 'RATE_LIMIT_MAX'),
    /RATE_LIMIT_MAX must be a positive integer/
  );
  assert.throws(
    () => parsePositiveInteger('-1', 'RATE_LIMIT_MAX'),
    /RATE_LIMIT_MAX must be a positive integer/
  );
  assert.throws(
    () => parsePositiveInteger('1.5', 'RATE_LIMIT_MAX'),
    /RATE_LIMIT_MAX must be a positive integer/
  );
  assert.throws(
    () => parsePositiveInteger('abc', 'RATE_LIMIT_MAX'),
    /RATE_LIMIT_MAX must be a positive integer/
  );
});

test('parseRateLimitConfig uses defaults when env vars are unset', () => {
  assert.deepEqual(parseRateLimitConfig({}), {
    windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
    max: DEFAULT_RATE_LIMIT_MAX
  });
});

test('parseRateLimitConfig reads configured env vars', () => {
  assert.deepEqual(
    parseRateLimitConfig({
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX: '5'
    }),
    {
      windowMs: 60000,
      max: 5
    }
  );
});

test('parseRateLimitConfig rejects invalid env vars', () => {
  assert.throws(
    () => parseRateLimitConfig({ RATE_LIMIT_WINDOW_MS: '0' }),
    /RATE_LIMIT_WINDOW_MS must be a positive integer/
  );
  assert.throws(
    () => parseRateLimitConfig({ RATE_LIMIT_MAX: 'bad' }),
    /RATE_LIMIT_MAX must be a positive integer/
  );
});

test('validateRateLimitConfig rejects invalid values', () => {
  assert.throws(
    () => validateRateLimitConfig({ windowMs: 0, max: 1 }),
    /windowMs must be a positive integer/
  );
  assert.throws(
    () => validateRateLimitConfig({ windowMs: 1000, max: 0 }),
    /max must be a positive integer/
  );
  assert.throws(
    () => validateRateLimitConfig({ windowMs: MAX_RATE_LIMIT_WINDOW_MS + 1, max: 1 }),
    /windowMs must not exceed 2147483647, the maximum Node.js timer delay/
  );
});

test('parseRateLimitConfig rejects windows beyond the Node.js timer limit', () => {
  assert.throws(
    () => parseRateLimitConfig({ RATE_LIMIT_WINDOW_MS: String(MAX_RATE_LIMIT_WINDOW_MS + 1) }),
    /windowMs must not exceed 2147483647, the maximum Node.js timer delay/
  );
});
