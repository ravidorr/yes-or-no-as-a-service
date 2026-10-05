import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import express from 'express';
import { request as httpRequest } from 'node:http';
import { test } from 'node:test';
import { createMetrics, normalizeRoute } from '../src/metrics.js';

async function startApp(configure) {
  const app = express();
  configure(app);
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

test('normalizeRoute maps known service paths and collapses everything else', () => {
  assert.equal(normalizeRoute('/version'), 'version');
  assert.equal(normalizeRoute('/health'), 'health');
  assert.equal(normalizeRoute('/metrics'), 'metrics');
  assert.equal(normalizeRoute('/api/yes'), 'api_yes');
  assert.equal(normalizeRoute('/api/no'), 'api_no');
  assert.equal(normalizeRoute('/yes'), 'web_yes');
  assert.equal(normalizeRoute('/no'), 'web_no');
  assert.equal(normalizeRoute('/anything'), 'not_found');
  assert.equal(normalizeRoute('/health/anything'), 'not_found');
});

test('createMetrics exposes isolated registries with default and custom metric families', async () => {
  const first = createMetrics();
  const second = createMetrics();

  const firstText = await first.metrics();
  const secondText = await second.metrics();

  assert.notEqual(firstText, secondText);
  assert.match(firstText, /# HELP process_cpu_user_seconds_total/);
  assert.match(firstText, /# HELP yornaas_http_requests_total/);
  assert.match(firstText, /# HELP yornaas_http_request_duration_seconds/);
  assert.match(firstText, /# HELP yornaas_http_requests_in_flight/);
  assert.match(secondText, /# HELP yornaas_http_requests_total/);
});

test('middleware records normalized labels and decrements in-flight gauge on finish', async () => {
  const metrics = createMetrics();
  const { baseUrl, close } = await startApp((app) => {
    app.use(metrics.middleware);
    app.post('/api/no', (_req, res) => {
      res.status(201).send('created');
    });
  });

  try {
    const response = await fetch(`${baseUrl}/api/no`, { method: 'POST' });
    assert.equal(response.status, 201);

    const text = await metrics.metrics();

    assert.match(text, /yornaas_http_requests_total\{route="api_no",method="POST",status_code="201"\} 1/);
    assert.match(text, /yornaas_http_request_duration_seconds_count\{route="api_no",method="POST",status_code="201"\} 1/);
    assert.match(text, /yornaas_http_requests_in_flight\{route="api_no",method="POST"\} 0/);
  } finally {
    await close();
  }
});

test('middleware records api_yes route labels', async () => {
  const metrics = createMetrics();
  const { baseUrl, close } = await startApp((app) => {
    app.use(metrics.middleware);
    app.get('/api/yes', (_req, res) => {
      res.status(200).send('Yes!');
    });
  });

  try {
    const response = await fetch(`${baseUrl}/api/yes`);
    assert.equal(response.status, 200);

    const text = await metrics.metrics();

    assert.match(text, /yornaas_http_requests_total\{route="api_yes",method="GET",status_code="200"\} 1/);
  } finally {
    await close();
  }
});

test('middleware does not observe GET /metrics scrape traffic', async () => {
  const metrics = createMetrics();
  const { baseUrl, close } = await startApp((app) => {
    app.use(metrics.middleware);
    app.get('/metrics', (_req, res) => {
      res.status(200).send('metrics');
    });
  });

  try {
    const response = await fetch(`${baseUrl}/metrics`);
    assert.equal(response.status, 200);

    const text = await metrics.metrics();

    assert.doesNotMatch(text, /yornaas_http_requests_total\{route="metrics"/);
    assert.doesNotMatch(text, /yornaas_http_requests_in_flight\{route="metrics"/);
  } finally {
    await close();
  }
});

test('middleware observes non-GET /metrics not_found traffic', async () => {
  const metrics = createMetrics();
  const { baseUrl, close } = await startApp((app) => {
    app.use(metrics.middleware);
    app.all('/metrics', (req, res, next) => {
      if (req.method === 'GET') {
        res.status(200).send('metrics');
        return;
      }

      next();
    });
    app.use((_req, res) => {
      res.status(404).type('text/plain').send('not found');
    });
  });

  try {
    const response = await fetch(`${baseUrl}/metrics`, { method: 'POST' });
    assert.equal(response.status, 404);

    const text = await metrics.metrics();

    assert.match(text, /yornaas_http_requests_total\{route="metrics",method="POST",status_code="404"\} 1/);
    assert.match(text, /yornaas_http_requests_in_flight\{route="metrics",method="POST"\} 0/);
  } finally {
    await close();
  }
});

test('middleware decrements in-flight gauge when the client disconnects early', async () => {
  const metrics = createMetrics();
  const { baseUrl, close } = await startApp((app) => {
    app.use(metrics.middleware);
    app.get('/slow', (_req, res) => {
      setTimeout(() => {
        res.status(200).send('done');
      }, 1000);
    });
  });

  try {
    await new Promise((resolve) => {
      const client = httpRequest(`${baseUrl}/slow`, (response) => {
        response.on('data', () => {});
      });

      client.on('error', () => resolve());
      client.end();
      setTimeout(() => {
        client.destroy();
        resolve();
      }, 20);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const text = await metrics.metrics();

    assert.match(text, /yornaas_http_requests_in_flight\{route="not_found",method="GET"\} 0/);
  } finally {
    await close();
  }
});

test('request close is ignored after finish already finalized metrics', async () => {
  const metrics = createMetrics();
  const req = new EventEmitter();
  const res = new EventEmitter();

  req.path = '/version';
  req.method = 'GET';
  res.statusCode = 200;
  Object.defineProperty(res, 'writableFinished', {
    configurable: true,
    get() {
      return true;
    }
  });

  metrics.middleware(req, res, () => {});

  res.emit('finish');
  req.emit('close');

  const text = await metrics.metrics();

  assert.match(text, /yornaas_http_requests_total\{route="version",method="GET",status_code="200"\} 1/);
});

test('finalize runs only once across finish, response close, and request close', async () => {
  const metrics = createMetrics();
  const req = new EventEmitter();
  const res = new EventEmitter();

  req.path = '/api/no';
  req.method = 'GET';
  res.statusCode = 200;
  Object.defineProperty(res, 'writableFinished', {
    configurable: true,
    get() {
      return false;
    }
  });

  metrics.middleware(req, res, () => {});

  res.emit('finish');
  res.emit('close');
  req.emit('close');

  const text = await metrics.metrics();

  assert.match(text, /yornaas_http_requests_total\{route="api_no",method="GET",status_code="200"\} 1/);
  assert.match(text, /yornaas_http_requests_in_flight\{route="api_no",method="GET"\} 0/);
});

test('request close uses 499 when no response status was set', async () => {
  const metrics = createMetrics();
  const req = new EventEmitter();
  const res = new EventEmitter();

  req.path = '/abort';
  req.method = 'GET';
  Object.defineProperty(res, 'writableFinished', {
    configurable: true,
    get() {
      return false;
    }
  });

  metrics.middleware(req, res, () => {});
  req.emit('close');

  const text = await metrics.metrics();

  assert.match(text, /yornaas_http_requests_total\{route="not_found",method="GET",status_code="499"\} 1/);
});

test('request close finalizes metrics when the response never finishes', async () => {
  const metrics = createMetrics();
  const req = new EventEmitter();
  const res = new EventEmitter();

  req.path = '/slow';
  req.method = 'GET';
  res.statusCode = 499;
  Object.defineProperty(res, 'writableFinished', {
    configurable: true,
    get() {
      return false;
    }
  });

  metrics.middleware(req, res, () => {});
  req.emit('close');

  const text = await metrics.metrics();

  assert.match(text, /yornaas_http_requests_total\{route="not_found",method="GET",status_code="499"\} 1/);
  assert.match(text, /yornaas_http_requests_in_flight\{route="not_found",method="GET"\} 0/);
});

test('response close after finish does not double-count when writableFinished is true', async () => {
  const metrics = createMetrics();
  const req = new EventEmitter();
  const res = new EventEmitter();

  req.path = '/health';
  req.method = 'GET';
  res.statusCode = 200;
  Object.defineProperty(res, 'writableFinished', {
    configurable: true,
    get() {
      return true;
    }
  });

  metrics.middleware(req, res, () => {});

  res.emit('finish');
  res.emit('close');

  const text = await metrics.metrics();

  assert.match(text, /yornaas_http_requests_total\{route="health",method="GET",status_code="200"\} 1/);
});

test('middleware normalizes unmatched paths to not_found', async () => {
  const metrics = createMetrics();
  const { baseUrl, close } = await startApp((app) => {
    app.use(metrics.middleware);
    app.use((_req, res) => {
      res.status(404).type('text/plain').send('not found');
    });
  });

  try {
    await fetch(`${baseUrl}/anything/really`);

    const text = await metrics.metrics();

    assert.match(text, /yornaas_http_requests_total\{route="not_found",method="GET",status_code="404"\} 1/);
  } finally {
    await close();
  }
});
