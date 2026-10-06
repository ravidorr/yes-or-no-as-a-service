import { parsePositiveInteger } from './rate-limit-config.js';

export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;
export const DEFAULT_READINESS_GRACE_MS = 1_000;
export const DEFAULT_FORCE_EXIT_GRACE_MS = 2_000;
export const MAX_SHUTDOWN_TIMEOUT_MS = 2_147_483_647;

function parseNonNegativeInteger(value, name) {
  if (value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return parsed;
}

function validateTimeoutMs(value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('timeoutMs must be a positive integer');
  }

  if (value > MAX_SHUTDOWN_TIMEOUT_MS) {
    throw new Error(
      `timeoutMs must not exceed ${MAX_SHUTDOWN_TIMEOUT_MS}, the maximum Node.js timer delay`
    );
  }
}

function validateReadinessGraceMs(value, timeoutMs) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('readinessGraceMs must be a non-negative integer');
  }

  if (value > timeoutMs) {
    throw new Error('readinessGraceMs must not exceed timeoutMs');
  }
}

export function validateShutdownConfig(config) {
  validateTimeoutMs(config.timeoutMs);
  validateReadinessGraceMs(config.readinessGraceMs, config.timeoutMs);

  return config;
}

export function parseShutdownConfig(env = process.env) {
  return validateShutdownConfig({
    timeoutMs:
      parsePositiveInteger(env.SHUTDOWN_TIMEOUT_MS, 'SHUTDOWN_TIMEOUT_MS') ??
      DEFAULT_SHUTDOWN_TIMEOUT_MS,
    readinessGraceMs:
      parseNonNegativeInteger(env.SHUTDOWN_READINESS_GRACE_MS, 'SHUTDOWN_READINESS_GRACE_MS') ??
      DEFAULT_READINESS_GRACE_MS
  });
}
