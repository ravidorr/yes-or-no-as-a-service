import { parsePositiveInteger } from './rate-limit-config.js';

export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;
export const DEFAULT_READINESS_GRACE_MS = 1_000;
export const MAX_SHUTDOWN_TIMEOUT_MS = 2_147_483_647;

function validateTimerMs(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  if (value > MAX_SHUTDOWN_TIMEOUT_MS) {
    throw new Error(
      `${fieldName} must not exceed ${MAX_SHUTDOWN_TIMEOUT_MS}, the maximum Node.js timer delay`
    );
  }
}

export function validateShutdownConfig(config) {
  validateTimerMs(config.timeoutMs, 'timeoutMs');
  validateTimerMs(config.readinessGraceMs, 'readinessGraceMs');

  return config;
}

export function parseShutdownConfig(env = process.env) {
  return validateShutdownConfig({
    timeoutMs:
      parsePositiveInteger(env.SHUTDOWN_TIMEOUT_MS, 'SHUTDOWN_TIMEOUT_MS') ??
      DEFAULT_SHUTDOWN_TIMEOUT_MS,
    readinessGraceMs:
      parsePositiveInteger(env.SHUTDOWN_READINESS_GRACE_MS, 'SHUTDOWN_READINESS_GRACE_MS') ??
      DEFAULT_READINESS_GRACE_MS
  });
}
