import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UNKNOWN_ROUTE_HINT } from '../src/responses.js';
import { createApp } from '../src/server.js';

const strictRateLimitConfig = { windowMs: 60_000, max: 2 };

async function startServer(app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}

test('throttles /api/no after the configured limit is exceeded', async () => {
  const { baseUrl, close } = await startServer(createApp({ rateLimitConfig: strictRateLimitConfig }));

  try {
    for (let index = 0; index < strictRateLimitConfig.max; index += 1) {
      const response = await fetch(`${baseUrl}/api/no`);

      assert.equal(response.status, 200);
      assert.equal(await response.text(), 'No!');
    }

    const throttled = await fetch(`${baseUrl}/api/no`);

    assert.equal(throttled.status, 429);
    assert.equal(throttled.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(await throttled.text(), UNKNOWN_ROUTE_HINT);
  } finally {
    await close();
  }
});

test('throttles /api/yes after the configured limit is exceeded', async () => {
  const { baseUrl, close } = await startServer(createApp({ rateLimitConfig: strictRateLimitConfig }));

  try {
    for (let index = 0; index < strictRateLimitConfig.max; index += 1) {
      const response = await fetch(`${baseUrl}/api/yes`);

      assert.equal(response.status, 200);
      assert.equal(await response.text(), 'Yes!');
    }

    const throttled = await fetch(`${baseUrl}/api/yes`);

    assert.equal(throttled.status, 429);
    assert.equal(await throttled.text(), UNKNOWN_ROUTE_HINT);
  } finally {
    await close();
  }
});

test('throttles unknown routes after the configured limit is exceeded', async () => {
  const { baseUrl, close } = await startServer(createApp({ rateLimitConfig: strictRateLimitConfig }));

  try {
    for (let index = 0; index < strictRateLimitConfig.max; index += 1) {
      const response = await fetch(`${baseUrl}/anything-${index}`);

      assert.equal(response.status, 404);
      assert.equal(await response.text(), UNKNOWN_ROUTE_HINT);
    }

    const throttled = await fetch(`${baseUrl}/anything-else`);

    assert.equal(throttled.status, 429);
    assert.equal(await throttled.text(), UNKNOWN_ROUTE_HINT);
  } finally {
    await close();
  }
});

test('does not throttle GET /version, GET /health, GET /metrics, static assets, or web pages', async () => {
  const { baseUrl, close } = await startServer(createApp({ rateLimitConfig: { windowMs: 60_000, max: 2 } }));

  try {
    const styles = await fetch(`${baseUrl}/styles.css`);
    assert.equal(styles.status, 200);

    const root = await fetch(`${baseUrl}/`);
    assert.equal(root.status, 404);
    assert.equal(await root.text(), UNKNOWN_ROUTE_HINT);

    const yesPage = await fetch(`${baseUrl}/yes`);
    assert.equal(yesPage.status, 200);
    assert.match(yesPage.headers.get('content-type'), /^text\/html/);

    const noPage = await fetch(`${baseUrl}/no`);
    assert.equal(noPage.status, 200);
    assert.match(noPage.headers.get('content-type'), /^text\/html/);

    await fetch(`${baseUrl}/anything`);
    const throttled = await fetch(`${baseUrl}/anything-again`);
    assert.equal(throttled.status, 429);

    const version = await fetch(`${baseUrl}/version`);
    assert.equal(version.status, 200);

    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);

    const metrics = await fetch(`${baseUrl}/metrics`);
    assert.equal(metrics.status, 200);

    const openapi = await fetch(`${baseUrl}/openapi.yaml`);
    assert.equal(openapi.status, 200);
  } finally {
    await close();
  }
});

test('does not consume API quota when loading web pages', async () => {
  const { baseUrl, close } = await startServer(createApp({ rateLimitConfig: { windowMs: 60_000, max: 1 } }));

  try {
    const yesPage = await fetch(`${baseUrl}/yes`);
    const noPage = await fetch(`${baseUrl}/no`);
    const apiResponse = await fetch(`${baseUrl}/api/yes`);
    const throttled = await fetch(`${baseUrl}/api/yes`);

    assert.equal(yesPage.status, 200);
    assert.equal(noPage.status, 200);
    assert.equal(apiResponse.status, 200);
    assert.equal(await apiResponse.text(), 'Yes!');
    assert.equal(throttled.status, 429);
  } finally {
    await close();
  }
});

test('does not throttle GET /metrics even after the configured limit is exhausted', async () => {
  const { baseUrl, close } = await startServer(createApp({ rateLimitConfig: { windowMs: 60_000, max: 1 } }));

  try {
    await fetch(`${baseUrl}/api/no`);
    const throttled = await fetch(`${baseUrl}/api/no`);
    assert.equal(throttled.status, 429);

    const metrics = await fetch(`${baseUrl}/metrics`);
    assert.equal(metrics.status, 200);
    assert.match(metrics.headers.get('content-type'), /^text\/plain; charset=utf-8; version=0\.0\.4$/);
  } finally {
    await close();
  }
});

test('rate limits non-GET /health requests through unknown routes', async () => {
  const { baseUrl, close } = await startServer(createApp({ rateLimitConfig: { windowMs: 60_000, max: 1 } }));

  try {
    const first = await fetch(`${baseUrl}/health`, { method: 'POST' });
    assert.equal(first.status, 404);
    assert.equal(await first.text(), UNKNOWN_ROUTE_HINT);

    const throttled = await fetch(`${baseUrl}/health`, { method: 'POST' });
    assert.equal(throttled.status, 429);
    assert.equal(await throttled.text(), UNKNOWN_ROUTE_HINT);
  } finally {
    await close();
  }
});

test('rate limits non-GET /version requests through unknown routes', async () => {
  const { baseUrl, close } = await startServer(createApp({ rateLimitConfig: { windowMs: 60_000, max: 1 } }));

  try {
    const first = await fetch(`${baseUrl}/version`, { method: 'POST' });
    assert.equal(first.status, 404);
    assert.equal(await first.text(), UNKNOWN_ROUTE_HINT);

    const throttled = await fetch(`${baseUrl}/version`, { method: 'POST' });
    assert.equal(throttled.status, 429);
    assert.equal(await throttled.text(), UNKNOWN_ROUTE_HINT);
  } finally {
    await close();
  }
});

test('returns modern rate-limit headers without legacy headers', async () => {
  const { baseUrl, close } = await startServer(createApp({ rateLimitConfig: strictRateLimitConfig }));

  try {
    const allowed = await fetch(`${baseUrl}/api/no`);
    assert.equal(allowed.status, 200);
    assert.ok(allowed.headers.get('ratelimit-limit'));
    assert.ok(allowed.headers.get('ratelimit-remaining'));
    assert.ok(allowed.headers.get('ratelimit-reset'));
    assert.equal(allowed.headers.get('x-ratelimit-limit'), null);

    await fetch(`${baseUrl}/api/no`);
    const throttled = await fetch(`${baseUrl}/api/no`);

    assert.equal(throttled.status, 429);
    assert.ok(throttled.headers.get('retry-after'));
    assert.equal(throttled.headers.get('x-ratelimit-limit'), null);
  } finally {
    await close();
  }
});

test('tracks clients separately when proxy trust and forwarded headers differ', async () => {
  const app = createApp({
    rateLimitConfig: { windowMs: 60_000, max: 1 },
    trustProxy: 1
  });
  const { baseUrl, close } = await startServer(app);

  try {
    const firstClient = await fetch(`${baseUrl}/api/no`, {
      headers: { 'x-forwarded-for': '203.0.113.1' }
    });
    const firstClientAgain = await fetch(`${baseUrl}/api/no`, {
      headers: { 'x-forwarded-for': '203.0.113.1' }
    });
    const secondClient = await fetch(`${baseUrl}/api/no`, {
      headers: { 'x-forwarded-for': '203.0.113.2' }
    });

    assert.equal(firstClient.status, 200);
    assert.equal(firstClientAgain.status, 429);
    assert.equal(secondClient.status, 200);
  } finally {
    await close();
  }
});

test('allows requests again after the configured window elapses', async () => {
  const { baseUrl, close } = await startServer(
    createApp({ rateLimitConfig: { windowMs: 100, max: 1 } })
  );

  try {
    const first = await fetch(`${baseUrl}/api/no`);
    assert.equal(first.status, 200);

    const throttled = await fetch(`${baseUrl}/api/no`);
    assert.equal(throttled.status, 429);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const afterWindow = await fetch(`${baseUrl}/api/no`);
    assert.equal(afterWindow.status, 200);
  } finally {
    await close();
  }
});

test('createApp rejects invalid configured rate limits at startup', () => {
  assert.throws(
    () => createApp({ rateLimitConfig: { windowMs: 0, max: 1 } }),
    /windowMs/
  );
});

test('shares rate-limit quota across answer routes and unknown paths', async () => {
  const { baseUrl, close } = await startServer(createApp({ rateLimitConfig: { windowMs: 60_000, max: 2 } }));

  try {
    const yesResponse = await fetch(`${baseUrl}/api/yes`);
    const noResponse = await fetch(`${baseUrl}/api/no`);
    const throttled = await fetch(`${baseUrl}/anything`);

    assert.equal(yesResponse.status, 200);
    assert.equal(noResponse.status, 200);
    assert.equal(throttled.status, 429);
    assert.equal(await throttled.text(), UNKNOWN_ROUTE_HINT);
  } finally {
    await close();
  }
});

test('createApp rejects invalid environment configuration at startup', () => {
  const previousWindow = process.env.RATE_LIMIT_WINDOW_MS;

  try {
    process.env.RATE_LIMIT_WINDOW_MS = '0';
    assert.throws(() => createApp(), /RATE_LIMIT_WINDOW_MS must be a positive integer/);
  } finally {
    if (previousWindow === undefined) {
      delete process.env.RATE_LIMIT_WINDOW_MS;
    } else {
      process.env.RATE_LIMIT_WINDOW_MS = previousWindow;
    }
  }
});
