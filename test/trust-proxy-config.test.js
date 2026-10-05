import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTrustProxy, parseTrustProxyConfig } from '../src/trust-proxy-config.js';

test('parseTrustProxy returns false when unset', () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy(''), false);
});

test('parseTrustProxy accepts boolean strings', () => {
  assert.equal(parseTrustProxy('true'), true);
  assert.equal(parseTrustProxy('false'), false);
});

test('parseTrustProxy accepts non-negative integer hop counts', () => {
  assert.equal(parseTrustProxy('0'), 0);
  assert.equal(parseTrustProxy('1'), 1);
});

test('parseTrustProxy rejects invalid values', () => {
  assert.throws(() => parseTrustProxy('yes'), /TRUST_PROXY must be true, false, or a non-negative integer/);
  assert.throws(() => parseTrustProxy('-1'), /TRUST_PROXY must be true, false, or a non-negative integer/);
  assert.throws(() => parseTrustProxy('1.5'), /TRUST_PROXY must be true, false, or a non-negative integer/);
});

test('parseTrustProxyConfig reads TRUST_PROXY from the environment', () => {
  const previous = process.env.TRUST_PROXY;

  try {
    process.env.TRUST_PROXY = '2';
    assert.equal(parseTrustProxyConfig(), 2);
  } finally {
    if (previous === undefined) {
      delete process.env.TRUST_PROXY;
    } else {
      process.env.TRUST_PROXY = previous;
    }
  }
});
