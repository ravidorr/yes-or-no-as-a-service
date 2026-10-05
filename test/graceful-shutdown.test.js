import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGracefulShutdown } from '../src/graceful-shutdown.js';

function createFakeServer() {
  const calls = {
    close: [],
    closeIdleConnections: 0,
    closeAllConnections: 0
  };

  const server = {
    close(callback) {
      calls.close.push(callback);
    },
    closeIdleConnections() {
      calls.closeIdleConnections += 1;
    },
    closeAllConnections() {
      calls.closeAllConnections += 1;
    }
  };

  return { server, calls };
}

function createFakeProcess() {
  const handlers = new Map();

  return {
    handlers,
    on(event, handler) {
      handlers.set(event, handler);
    }
  };
}

function createFakeTimers() {
  const timers = new Map();
  let nextId = 1;

  return {
    timers,
    setTimeoutFn(callback, delay) {
      const id = nextId;
      nextId += 1;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeoutFn(id) {
      timers.delete(id);
    },
    runTimer(id) {
      const timer = timers.get(id);

      if (!timer) {
        throw new Error(`timer ${id} not found`);
      }

      timers.delete(id);
      timer.callback();
    }
  };
}

function createShutdownHarness({
  timeoutMs = 30_000,
  readinessGraceMs = 0,
  server: providedServer,
  processRef: providedProcessRef,
  timers: providedTimers
} = {}) {
  const { server, calls } = providedServer ?? createFakeServer();
  const processRef = providedProcessRef ?? createFakeProcess();
  const timers = providedTimers ?? createFakeTimers();
  const logs = [];
  const errors = [];
  const exits = [];

  const shutdown = createGracefulShutdown({
    server,
    timeoutMs,
    readinessGraceMs,
    processRef,
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
    log: (...args) => logs.push(args),
    error: (...args) => errors.push(args),
    exit: (code) => exits.push(code)
  });

  return {
    shutdown,
    server,
    calls,
    processRef,
    timers,
    logs,
    errors,
    exits
  };
}

test('install registers SIGTERM and SIGINT handlers', () => {
  const sigtermHarness = createShutdownHarness();
  const sigintHarness = createShutdownHarness();

  sigtermHarness.shutdown.install();
  sigintHarness.shutdown.install();

  assert.equal(typeof sigtermHarness.processRef.handlers.get('SIGTERM'), 'function');
  assert.equal(typeof sigintHarness.processRef.handlers.get('SIGINT'), 'function');

  sigtermHarness.processRef.handlers.get('SIGTERM')();
  sigintHarness.processRef.handlers.get('SIGINT')();

  assert.equal(sigtermHarness.shutdown.isDraining(), true);
  assert.equal(sigintHarness.shutdown.isDraining(), true);
  assert.equal(sigtermHarness.calls.close.length, 1);
  assert.equal(sigintHarness.calls.close.length, 1);
  assert.deepEqual(sigtermHarness.logs[0], ['Received SIGTERM, starting graceful shutdown']);
  assert.deepEqual(sigintHarness.logs[0], ['Received SIGINT, starting graceful shutdown']);
});

test('first signal defers closing until the readiness grace expires', () => {
  const { shutdown, calls, timers } = createShutdownHarness({
    timeoutMs: 1000,
    readinessGraceMs: 250
  });

  shutdown.shutdown('SIGTERM');

  assert.equal(shutdown.isDraining(), true);
  assert.equal(calls.close.length, 0);
  assert.equal(calls.closeIdleConnections, 0);
  assert.equal(timers.timers.size, 2);

  const readinessTimerId = [...timers.timers.entries()].find(([, timer]) => timer.delay === 250)?.[0];

  timers.runTimer(readinessTimerId);

  assert.equal(calls.close.length, 1);
  assert.equal(calls.closeIdleConnections, 1);
});

test('first signal marks draining, closes the server, and reaps idle connections', () => {
  const { shutdown, calls, logs, timers } = createShutdownHarness({ timeoutMs: 1000 });

  shutdown.shutdown('SIGTERM');

  assert.equal(shutdown.isDraining(), true);
  assert.equal(calls.close.length, 1);
  assert.equal(calls.closeIdleConnections, 1);
  assert.equal(calls.closeAllConnections, 0);
  assert.deepEqual(logs[0], ['Received SIGTERM, starting graceful shutdown']);
  assert.equal(timers.timers.size, 1);
  assert.equal([...timers.timers.values()][0].delay, 1000);
});

test('server close clears the deadline and exits cleanly', () => {
  const { shutdown, calls, timers, exits } = createShutdownHarness({ timeoutMs: 1000 });

  shutdown.shutdown('SIGINT');

  const timerId = [...timers.timers.keys()][0];
  const closeCallback = calls.close[0];

  closeCallback();

  assert.equal(timers.timers.has(timerId), false);
  assert.deepEqual(exits, [0]);
});

test('deadline expiration force-closes remaining connections', () => {
  const { shutdown, calls, timers } = createShutdownHarness({ timeoutMs: 1000 });

  shutdown.shutdown('SIGTERM');

  const timerId = [...timers.timers.keys()][0];

  timers.runTimer(timerId);

  assert.equal(calls.closeAllConnections, 1);
});

test('deadline expiration exits after the server close callback runs', () => {
  const { shutdown, calls, timers, exits } = createShutdownHarness({ timeoutMs: 1000 });

  shutdown.shutdown('SIGTERM');

  const timerId = [...timers.timers.keys()][0];

  timers.runTimer(timerId);
  calls.close[0]();

  assert.deepEqual(exits, [0]);
});

test('duplicate signals exit immediately with a non-zero status', () => {
  const { shutdown, calls, exits, errors } = createShutdownHarness({ timeoutMs: 1000 });

  shutdown.shutdown('SIGTERM');
  shutdown.shutdown('SIGTERM');

  assert.equal(calls.close.length, 1);
  assert.deepEqual(errors, [['Received SIGTERM again, forcing immediate exit']]);
  assert.deepEqual(exits, [1]);
});

test('second signal during shutdown exits without re-running close', () => {
  const { shutdown, calls, exits } = createShutdownHarness({ timeoutMs: 1000 });

  shutdown.shutdown('SIGTERM');
  shutdown.shutdown('SIGINT');

  assert.equal(calls.close.length, 1);
  assert.equal(calls.closeIdleConnections, 1);
  assert.deepEqual(exits, [1]);
});
