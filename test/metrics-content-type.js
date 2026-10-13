import assert from 'node:assert/strict';

export const METRICS_CONTENT_TYPE =
  /^text\/plain; (?:charset=utf-8; version=0\.0\.4|version=0\.0\.4; charset=utf-8)$/;

export function assertMetricsContentType(value) {
  assert.match(value, METRICS_CONTENT_TYPE);
}
