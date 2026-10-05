import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  NO_RESPONSE,
  selectRandomAnswer,
  UNKNOWN_ROUTE_HINT,
  YES_RESPONSE
} from '../src/responses.js';

test('selectRandomAnswer returns Yes! when the random value is below 0.5', () => {
  assert.equal(selectRandomAnswer(() => 0), YES_RESPONSE);
  assert.equal(selectRandomAnswer(() => 0.499), YES_RESPONSE);
});

test('selectRandomAnswer returns No! when the random value is 0.5 or greater', () => {
  assert.equal(selectRandomAnswer(() => 0.5), NO_RESPONSE);
  assert.equal(selectRandomAnswer(() => 0.999), NO_RESPONSE);
});

test('UNKNOWN_ROUTE_HINT documents the random API route', () => {
  assert.match(UNKNOWN_ROUTE_HINT, /\/api\/random/);
});
