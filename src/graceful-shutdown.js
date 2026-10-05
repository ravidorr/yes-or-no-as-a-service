import { DEFAULT_READINESS_GRACE_MS } from './shutdown-config.js';

export function createGracefulShutdown({
  server,
  timeoutMs,
  readinessGraceMs = DEFAULT_READINESS_GRACE_MS,
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
  }

  function finishShutdown() {
    clearTimers();
    log('Graceful shutdown complete');
    exit(0);
  }

  function forceCloseRemainingConnections() {
    log(`Shutdown timeout of ${timeoutMs}ms reached, force-closing remaining connections`);
    server.closeAllConnections();
  }

  function beginClosingConnections() {
    server.close(() => {
      finishShutdown();
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
