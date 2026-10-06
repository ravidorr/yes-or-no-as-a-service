import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isBrowserContext } from '../public/runtime-context.js';

test('isBrowserContext detects browser globals', () => {
  assert.equal(
    isBrowserContext({
      windowObj: {},
      documentObj: {}
    }),
    true
  );
  assert.equal(
    isBrowserContext({
      windowObj: undefined,
      documentObj: {}
    }),
    false
  );
});
