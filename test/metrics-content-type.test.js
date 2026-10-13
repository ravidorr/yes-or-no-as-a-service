import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertMetricsContentType, METRICS_CONTENT_TYPE } from './metrics-content-type.js';

test('METRICS_CONTENT_TYPE accepts charset before version', () => {
  assert.match('text/plain; charset=utf-8; version=0.0.4', METRICS_CONTENT_TYPE);
  assertMetricsContentType('text/plain; charset=utf-8; version=0.0.4');
});

test('METRICS_CONTENT_TYPE accepts version before charset', () => {
  assert.match('text/plain; version=0.0.4; charset=utf-8', METRICS_CONTENT_TYPE);
  assertMetricsContentType('text/plain; version=0.0.4; charset=utf-8');
});

test('METRICS_CONTENT_TYPE rejects unrelated types', () => {
  assert.throws(() => assertMetricsContentType('application/json; charset=utf-8'));
});
