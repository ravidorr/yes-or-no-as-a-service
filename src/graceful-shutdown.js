import {
  DEFAULT_FORCE_EXIT_GRACE_MS,
  DEFAULT_READINESS_GRACE_MS
} from './shutdown-config.js';

export function createGracefulShutdown({
  server,
  timeoutMs,
  readinessGraceMs = DEFAULT_READINESS_GRACE_MS,
  forceExitGraceMs = DEFAULT_FORCE_EXIT_GRACE_MS,
  processRef = process,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  log = console.log,
  error = console.error,
  exit = process.exit.bind(process)
}) {
  let draining = false;
  let shutdownStarted = false;
  let readinessTimerId;
  let deadlineTimerId;
  let forceExitTimerId;

  function isDraining() {
    return draining;
  }

  function clearTimers() {
    if (readinessTimerId !== undefined) {
      clearTimeoutFn(readinessTimerId);
      readinessTimerId = undefined;
    }

    if (deadlineTimerId !== undefined) {
      clearTimeoutFn(deadlineTimerId);
      deadlineTimerId = undefined;
    }

    if (forceExitTimerId !== undefined) {
      clearTimeoutFn(forceExitTimerId);
      forceExitTimerId = undefined;
    }
  }

  function finishShutdown(exitCode = 0) {
    clearTimers();
    log('Graceful shutdown complete');
    exit(exitCode);
  }

  function forceCloseRemainingConnections() {
    log(`Shutdown timeout of ${timeoutMs}ms reached, force-closing remaining connections`);
    server.closeAllConnections();
    forceExitTimerId = setTimeoutFn(() => {
      error('Server close callback did not complete after force-close; exiting');
      finishShutdown(1);
    }, forceExitGraceMs);
  }

  function beginClosingConnections() {
    server.close(() => {
      finishShutdown(0);
    });
    server.closeIdleConnections();
  }

  function shutdown(signal) {
    if (shutdownStarted) {
      error(`Received ${signal} again, forcing immediate exit`);
      exit(1);
      return;
    }

    shutdownStarted = true;
    draining = true;

    log(`Received ${signal}, starting graceful shutdown`);

    // Phase 1: mark draining so /health returns 503, then wait for probes to notice.
    // Phase 2: close idle connections and stop accepting new work.
    // Phase 3: force-close any stragglers, then exit even if close() never callbacks.
    if (readinessGraceMs === 0) {
      beginClosingConnections();
    } else {
      readinessTimerId = setTimeoutFn(beginClosingConnections, readinessGraceMs);
    }

    deadlineTimerId = setTimeoutFn(forceCloseRemainingConnections, timeoutMs);
  }

  function install() {
    processRef.on('SIGTERM', () => shutdown('SIGTERM'));
    processRef.on('SIGINT', () => shutdown('SIGINT'));
  }

  return {
    isDraining,
    install,
    shutdown
  };
}
