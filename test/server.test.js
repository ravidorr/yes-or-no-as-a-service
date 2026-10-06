import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { after, before, test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import packageInfo from '../package.json' with { type: 'json' };
import {
  app,
  createApp,
  parseListenPort,
  resolveListenPort,
  resolveServerPort,
  runIfMain,
  startServer
} from '../src/server.js';

const serverPath = resolve('src/server.js');

function stubProcessExit() {
  const exitCodes = [];
  const originalExit = process.exit;

  process.exit = (code) => {
    exitCodes.push(code);
  };

  return {
    exitCodes,
    restore() {
      process.exit = originalExit;
    }
  };
}

let server;
let baseUrl;

function requestServer(url, method) {
  return new Promise((resolvePromise, reject) => {
    const request = httpRequest(url, { method }, (response) => {
      let body = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolvePromise({ body, headers: response.headers, status: response.statusCode });
      });
    });

    request.on('error', reject);
    request.end();
  });
}

async function assertNotFoundPage(response) {
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /^text\/html/);

  const body = await response.text();
  assert.match(body, /<body data-mode="404">/);
  assert.match(body, /<h1>Page not found<\/h1>/);
  assert.match(body, /<script src="\/theme-bootstrap\.js"><\/script>/);

  return body;
}

function assertRawNotFoundPage(response) {
  assert.equal(response.status, 404);
  assert.match(response.headers['content-type'], /^text\/html/);
  assert.match(response.body, /<body data-mode="404">/);
  assert.match(response.body, /<h1>Page not found<\/h1>/);
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolvePromise) => server.once('listening', resolvePromise));

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolvePromise, reject) => {
    server.close((err) => (err ? reject(err) : resolvePromise()));
  });
});

test('returns Prometheus metrics with runtime and HTTP families', async () => {
  await fetch(`${baseUrl}/api/yes`);
  await fetch(`${baseUrl}/api/no`);
  const response = await fetch(`${baseUrl}/metrics`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/plain; charset=utf-8; version=0\.0\.4$/);
  assert.match(body, /# HELP process_cpu_user_seconds_total/);
  assert.match(body, /# HELP yesornoaas_http_requests_total/);
  assert.match(body, /# HELP yesornoaas_http_request_duration_seconds/);
  assert.match(body, /# HELP yesornoaas_http_requests_in_flight/);
  assert.match(body, /yesornoaas_http_requests_total\{route="api_yes",method="GET",status_code="200"\}/);
  assert.match(body, /yesornoaas_http_requests_total\{route="api_no",method="GET",status_code="200"\}/);
  assert.doesNotMatch(body, /yesornoaas_http_requests_total\{route="metrics"/);
});

test('returns the 404 page for POST /metrics', async () => {
  const response = await fetch(`${baseUrl}/metrics`, { method: 'POST' });

  await assertNotFoundPage(response);
});

test('returns the 404 page for unmatched paths below metrics', async () => {
  const response = await fetch(`${baseUrl}/metrics/anything`);

  await assertNotFoundPage(response);
});

test('returns metrics while health is draining', async () => {
  const drainingApp = createApp({ isShuttingDown: () => true });
  const drainingServer = drainingApp.listen(0);

  await new Promise((resolvePromise) => drainingServer.once('listening', resolvePromise));

  const { port } = drainingServer.address();

  try {
    const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
    const metricsResponse = await fetch(`http://127.0.0.1:${port}/metrics`);

    assert.equal(healthResponse.status, 503);
    assert.equal(metricsResponse.status, 200);
    assert.match(await metricsResponse.text(), /# HELP yesornoaas_http_requests_total/);
  } finally {
    await new Promise((resolvePromise, reject) => {
      drainingServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  }
});

test('returns health status and version as JSON', async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(await response.json(), { status: 'YESorNOaaS', version: packageInfo.version });
});

test('returns the package version as plain text', async () => {
  const response = await fetch(`${baseUrl}/version`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await response.text(), packageInfo.version);
});

test('returns the 404 page for POST /version', async () => {
  const response = await fetch(`${baseUrl}/version`, { method: 'POST' });

  await assertNotFoundPage(response);
});

test('returns the 404 page for unmatched paths below version', async () => {
  const response = await fetch(`${baseUrl}/version/anything`);

  await assertNotFoundPage(response);
});

test('returns 503 for GET /health while shutting down', async () => {
  const drainingApp = createApp({ isShuttingDown: () => true });
  const drainingServer = drainingApp.listen(0);

  await new Promise((resolvePromise) => drainingServer.once('listening', resolvePromise));

  const { port } = drainingServer.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);

    assert.equal(response.status, 503);
    assert.match(response.headers.get('content-type'), /^application\/json/);
    assert.deepEqual(await response.json(), { status: 'YESorNOaaS', version: packageInfo.version });
  } finally {
    await new Promise((resolvePromise, reject) => {
      drainingServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  }
});

test('returns the package version while shutting down', async () => {
  const drainingApp = createApp({ isShuttingDown: () => true });
  const drainingServer = drainingApp.listen(0);

  await new Promise((resolvePromise) => drainingServer.once('listening', resolvePromise));

  const { port } = drainingServer.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/version`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(await response.text(), packageInfo.version);
  } finally {
    await new Promise((resolvePromise, reject) => {
      drainingServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  }
});

test('returns the 404 page for unmatched paths below health', async () => {
  const response = await fetch(`${baseUrl}/health/anything`);

  await assertNotFoundPage(response);
});

test('returns the 404 page for POST /health', async () => {
  const response = await fetch(`${baseUrl}/health`, { method: 'POST' });

  await assertNotFoundPage(response);
});

test('returns the themed 404 page for unknown paths', async () => {
  const response = await fetch(`${baseUrl}/anything/really?x=1`);

  const body = await assertNotFoundPage(response);

  assert.match(body, /<div class="nf-code" role="img" aria-label="Error 404">404<\/div>/);
  assert.match(body, /href="\/yes"/);
  assert.match(body, /href="\/no"/);
  assert.match(body, /href="\/random"/);
});

test('serves the OpenAPI specification', async () => {
  const response = await fetch(`${baseUrl}/openapi.yaml`);
  const document = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/yaml; charset=utf-8');
  assert.match(document, /^openapi: 3\.1\.1$/m);
  assert.match(document, /^  title: YESorNOaaS API$/m);
  assert.match(document, new RegExp(`^  version: ${packageInfo.version.replace(/\./g, '\\.')}$`, 'm'));
  assert.match(document, /ThrottledResponse:/);
  assert.match(document, /x-yesornoaas-unknown-routes:/);
});

test('sets baseline security headers on responses', async () => {
  const response = await fetch(`${baseUrl}/yes`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('returns the 404 page for GET /', async () => {
  const response = await fetch(`${baseUrl}/`);

  await assertNotFoundPage(response);
});

test('returns the 404 page for GET / when request is not a string query value', async () => {
  const response = await requestServer(`${baseUrl}/?request=a&request=b`, 'GET');

  assertRawNotFoundPage(response);
});

test('redirects legacy root share links to the matching answer page', async () => {
  const noResponse = await fetch(`${baseUrl}/?answer=no&request=Can%20I%3F`, {
    redirect: 'manual'
  });
  const yesResponse = await fetch(`${baseUrl}/?answer=yes&request=Can%20I%3F`, {
    redirect: 'manual'
  });
  const randomResponse = await fetch(`${baseUrl}/?answer=random&request=Can%20I%3F`, {
    redirect: 'manual'
  });
  const defaultResponse = await fetch(`${baseUrl}/?request=Can%20I%3F`, {
    redirect: 'manual'
  });

  assert.equal(noResponse.status, 308);
  assert.equal(noResponse.headers.get('location'), '/no?request=Can+I%3F');
  assert.equal(yesResponse.status, 308);
  assert.equal(yesResponse.headers.get('location'), '/yes?request=Can+I%3F');
  assert.equal(randomResponse.status, 308);
  assert.equal(randomResponse.headers.get('location'), '/random?request=Can+I%3F');
  assert.equal(defaultResponse.status, 308);
  assert.equal(defaultResponse.headers.get('location'), '/no?request=Can+I%3F');
});

test('serves the yes UI at /yes', async () => {
  const response = await fetch(`${baseUrl}/yes`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.match(body, /<title>YESorNOaaS<\/title>/);
  assert.match(body, /<body data-mode="yes">/);
  assert.match(body, /id="page-heading"/);
  assert.match(body, /aria-label="Other answers"/);
  assert.match(body, /id="replays"/);
  assert.match(body, /id="ask-form"/);
  assert.match(body, /Ask a yes\/no question/);
  assert.match(body, />Ask<\/span>/);
  assert.match(body, /id="share-url"/);
  assert.match(body, /id="copy"/);
  assert.match(body, />Copy link<\/span>/);
  assert.match(body, /id="preview"/);
  assert.match(body, />Preview link<\/span>/);
  assert.match(body, /id="share-status"/);
  assert.match(body, /id="share-x-link"/);
  assert.match(body, /aria-label="X"/);
  assert.match(body, /id="share-facebook-link"/);
  assert.match(body, /aria-label="Facebook"/);
  assert.match(body, /id="share-linkedin-link"/);
  assert.match(body, /aria-label="LinkedIn"/);
  assert.match(body, /id="share-email-link"/);
  assert.match(body, /aria-label="Email"/);
  assert.match(body, /id="share-whatsapp-link"/);
  assert.match(body, /aria-label="WhatsApp"/);
  assert.match(body, />Share the link below\./);
  assert.match(body, /Try another answer/);
  assert.match(body, /id="theme-toggle"/);
  assert.match(body, /<script src="\/theme-bootstrap\.js"><\/script>/);
  assert.match(body, /id="empty"/);
  assert.match(body, /id="status"/);
  assert.match(body, /id="error"/);
  assert.match(body, /id="answer"/);
  assert.match(body, /type="module" src="\/app\.js"/);
  assert.doesNotMatch(body, /type="radio"/);
});

test('does not serve the unconfigured page template as a static asset', async () => {
  const response = await fetch(`${baseUrl}/index.html`);

  await assertNotFoundPage(response);
});

test('serves styles without an external Google Fonts request', async () => {
  const response = await fetch(`${baseUrl}/styles.css`);
  const stylesheet = await response.text();

  assert.equal(response.status, 200);
  assert.doesNotMatch(stylesheet, /fonts\.googleapis\.com/);
});

test('serves the no UI at /no', async () => {
  const response = await fetch(`${baseUrl}/no`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.match(body, /<title>YESorNOaaS<\/title>/);
  assert.match(body, /<body data-mode="no">/);
  assert.match(body, /id="page-heading"/);
  assert.match(body, /aria-label="Other answers"/);
  assert.match(body, /id="replays"/);
  assert.match(body, /id="ask-form"/);
  assert.match(body, /Ask a yes\/no question/);
  assert.match(body, />Ask<\/span>/);
  assert.match(body, /id="share-url"/);
  assert.match(body, /id="copy"/);
  assert.match(body, />Copy link<\/span>/);
  assert.match(body, /id="preview"/);
  assert.match(body, />Preview link<\/span>/);
  assert.match(body, /id="share-status"/);
  assert.match(body, /id="share-x-link"/);
  assert.match(body, /aria-label="X"/);
  assert.match(body, /id="share-facebook-link"/);
  assert.match(body, /aria-label="Facebook"/);
  assert.match(body, /id="share-linkedin-link"/);
  assert.match(body, /aria-label="LinkedIn"/);
  assert.match(body, /id="share-email-link"/);
  assert.match(body, /aria-label="Email"/);
  assert.match(body, /id="share-whatsapp-link"/);
  assert.match(body, /aria-label="WhatsApp"/);
  assert.match(body, />Share the link below\./);
  assert.match(body, /Try another answer/);
  assert.match(body, /type="module" src="\/app\.js"/);
  assert.doesNotMatch(body, /type="radio"/);
});

test('serves the random UI at /random', async () => {
  const response = await fetch(`${baseUrl}/random`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.match(body, /<title>YESorNOaaS<\/title>/);
  assert.match(body, /<body data-mode="random">/);
  assert.match(body, /id="page-heading"/);
  assert.match(body, /aria-label="Other answers"/);
  assert.match(body, /id="replays"/);
  assert.match(body, /Ask a yes\/no question/);
  assert.match(body, />Ask<\/span>/);
  assert.match(body, /type="module" src="\/app\.js"/);
});

test('createApp applies trust proxy when configured', () => {
  const trusted = createApp({ trustProxy: 1 });
  const untrusted = createApp({ trustProxy: false });

  assert.equal(trusted.get('trust proxy'), 1);
  assert.equal(untrusted.get('trust proxy'), false);
});

test('returns Yes! from the UI yes API endpoint', async () => {
  const response = await fetch(`${baseUrl}/api/yes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'please?' })
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await response.text(), 'Yes!');
});

test('returns No! from the UI no API endpoint', async () => {
  const response = await fetch(`${baseUrl}/api/no`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'please?' })
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await response.text(), 'No!');
});

test('returns Yes! for every documented /api/yes method', async () => {
  for (const method of ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'TRACE']) {
    const response = await requestServer(`${baseUrl}/api/yes`, method);

    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], 'text/plain; charset=utf-8');
    assert.equal(response.body, method === 'HEAD' ? '' : 'Yes!');
  }
});

test('returns No! for every documented /api/no method', async () => {
  for (const method of ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'TRACE']) {
    const response = await requestServer(`${baseUrl}/api/no`, method);

    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], 'text/plain; charset=utf-8');
    assert.equal(response.body, method === 'HEAD' ? '' : 'No!');
  }
});

test('returns Yes! from /api/random when the injected source selects yes', async () => {
  const randomApp = createApp({ randomNumberSource: () => 0 });
  const randomServer = randomApp.listen(0);

  await new Promise((resolvePromise) => randomServer.once('listening', resolvePromise));

  const { port } = randomServer.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/random`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(await response.text(), 'Yes!');
  } finally {
    await new Promise((resolvePromise, reject) => {
      randomServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  }
});

test('returns No! from /api/random when the injected source selects no', async () => {
  const randomApp = createApp({ randomNumberSource: () => 0.5 });
  const randomServer = randomApp.listen(0);

  await new Promise((resolvePromise) => randomServer.once('listening', resolvePromise));

  const { port } = randomServer.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/random`);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'No!');
  } finally {
    await new Promise((resolvePromise, reject) => {
      randomServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  }
});

test('returns a selected answer for every documented /api/random method', async () => {
  const randomApp = createApp({ randomNumberSource: () => 0 });
  const randomServer = randomApp.listen(0);

  await new Promise((resolvePromise) => randomServer.once('listening', resolvePromise));

  const { port } = randomServer.address();
  const randomBaseUrl = `http://127.0.0.1:${port}`;

  try {
    for (const method of ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'TRACE']) {
      const response = await requestServer(`${randomBaseUrl}/api/random`, method);

      assert.equal(response.status, 200);
      assert.equal(response.headers['content-type'], 'text/plain; charset=utf-8');
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.body, method === 'HEAD' ? '' : 'Yes!');
    }
  } finally {
    await new Promise((resolvePromise, reject) => {
      randomServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  }
});

test('returns the 404 page for unknown API routes', async () => {
  const response = await fetch(`${baseUrl}/api`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answer: 'yes', nested: { still: true } })
  });

  await assertNotFoundPage(response);
});

test('returns the 404 page for other HTTP methods on unknown paths', async () => {
  for (const method of ['PUT', 'PATCH', 'DELETE']) {
    const response = await fetch(`${baseUrl}/nope`, {
      method,
      body: method === 'DELETE' ? undefined : 'whatever'
    });

    await assertNotFoundPage(response);
  }
});

test('resolveListenPort uses the socket address when available', () => {
  assert.equal(resolveListenPort({ port: 4242 }, 3000), 4242);
});

test('resolveListenPort falls back when the address is not an object', () => {
  assert.equal(resolveListenPort('/tmp/yesornoaas.sock', 3000), 3000);
  assert.equal(resolveListenPort(null, 3000), 3000);
});

test('resolveServerPort falls back to 3000 when PORT is unset', () => {
  const previousPort = process.env.PORT;

  try {
    delete process.env.PORT;
    assert.equal(resolveServerPort(), 3000);
  } finally {
    if (previousPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }
  }
});

test('resolveServerPort uses PORT from the environment', () => {
  const previousPort = process.env.PORT;

  try {
    process.env.PORT = '8080';
    assert.equal(resolveServerPort(), 8080);
  } finally {
    if (previousPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }
  }
});

test('parseListenPort accepts valid TCP ports including zero', () => {
  assert.equal(parseListenPort('0'), 0);
  assert.equal(parseListenPort('3000'), 3000);
  assert.equal(parseListenPort('65535'), 65535);
});

test('parseListenPort reads PORT from the environment when no value is passed', () => {
  const previousPort = process.env.PORT;

  try {
    process.env.PORT = '4000';
    assert.equal(parseListenPort(), 4000);
    delete process.env.PORT;
    assert.equal(parseListenPort(), 3000);
  } finally {
    if (previousPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }
  }
});

test('parseListenPort rejects invalid port values', () => {
  assert.throws(() => parseListenPort('not-a-port'), /PORT must be an integer between 0 and 65535/);
  assert.throws(() => parseListenPort('-1'), /PORT must be an integer between 0 and 65535/);
  assert.throws(() => parseListenPort('65536'), /PORT must be an integer between 0 and 65535/);
  assert.throws(() => parseListenPort('1.5'), /PORT must be an integer between 0 and 65535/);
});

test('startServer rejects invalid PORT values before listening', () => {
  assert.throws(() => startServer('not-a-port'), /PORT must be an integer between 0 and 65535/);
});

test('runIfMain starts the server and installs graceful shutdown for the executed module', (t) => {
  const install = t.mock.fn();
  const start = t.mock.fn(() => ({
    gracefulShutdown: { install }
  }));

  runIfMain({
    moduleUrl: pathToFileURL(serverPath).href,
    argvPath: serverPath,
    start
  });

  assert.equal(start.mock.calls.length, 1);
  assert.equal(install.mock.calls.length, 1);
});

test('runIfMain skips startup when imported as a dependency', (t) => {
  const start = t.mock.fn();

  runIfMain({
    moduleUrl: pathToFileURL(serverPath).href,
    argvPath: resolve('test/server.test.js'),
    start
  });

  assert.equal(start.mock.calls.length, 0);
});

test('runIfMain skips startup when argvPath is absent', (t) => {
  const start = t.mock.fn();

  runIfMain({
    moduleUrl: pathToFileURL(serverPath).href,
    argvPath: null,
    start
  });

  assert.equal(start.mock.calls.length, 0);
});

test('startServer uses PORT from the environment by default', async (t) => {
  const previousPort = process.env.PORT;
  const exitStub = stubProcessExit();

  try {
    process.env.PORT = '0';
    const log = t.mock.method(console, 'log');
    const startedServer = startServer();

    await new Promise((resolvePromise) => startedServer.once('listening', resolvePromise));

    const { port } = startedServer.address();
    assert.equal(log.mock.calls[0]?.arguments[0], `YESorNOaaS listening on http://localhost:${port}`);

    await new Promise((resolvePromise, reject) => {
      startedServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  } finally {
    exitStub.restore();

    if (previousPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }
  }
});

test('startServer listens and logs the assigned URL', async (t) => {
  const exitStub = stubProcessExit();
  const log = t.mock.method(console, 'log');

  try {
    const startedServer = startServer(0);

    await new Promise((resolvePromise) => startedServer.once('listening', resolvePromise));

    const { port } = startedServer.address();
    assert.notEqual(port, 0);
    assert.equal(log.mock.calls[0]?.arguments[0], `YESorNOaaS listening on http://localhost:${port}`);

    await new Promise((resolvePromise, reject) => {
      startedServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  } finally {
    exitStub.restore();
  }
});

test('startServer connects graceful shutdown state to the default app', async () => {
  const exitStub = stubProcessExit();
  const startedServer = startServer(0, {
    shutdownConfig: { timeoutMs: 30_000, readinessGraceMs: 5_000 }
  });

  await new Promise((resolvePromise) => startedServer.once('listening', resolvePromise));

  const { port } = startedServer.address();
  const healthUrl = `http://127.0.0.1:${port}/health`;
  const { gracefulShutdown } = startedServer;

  try {
    const readyResponse = await fetch(healthUrl);
    assert.equal(readyResponse.status, 200);
    assert.equal(gracefulShutdown.isDraining(), false);

    gracefulShutdown.shutdown('SIGTERM');

    assert.equal(gracefulShutdown.isDraining(), true);

    const drainingResponse = await fetch(healthUrl);
    assert.equal(drainingResponse.status, 503);
    assert.deepEqual(await drainingResponse.json(), { status: 'YESorNOaaS', version: packageInfo.version });

    await new Promise((resolvePromise, reject) => {
      startedServer.close((error) => (error ? reject(error) : resolvePromise()));
    });

    assert.deepEqual(exitStub.exitCodes, []);
  } finally {
    exitStub.restore();
  }
});

test('startServer exits cleanly after shutdown drain completes', async () => {
  const exitStub = stubProcessExit();
  const startedServer = startServer(0, {
    shutdownConfig: { timeoutMs: 30_000, readinessGraceMs: 0 }
  });

  await new Promise((resolvePromise) => startedServer.once('listening', resolvePromise));

  const { gracefulShutdown } = startedServer;

  try {
    gracefulShutdown.shutdown('SIGTERM');
    await new Promise((resolvePromise) => setImmediate(resolvePromise));
    assert.deepEqual(exitStub.exitCodes, [0]);
  } finally {
    exitStub.restore();
  }
});

test('startServer wires graceful shutdown using SHUTDOWN_TIMEOUT_MS', async () => {
  const previousTimeout = process.env.SHUTDOWN_TIMEOUT_MS;
  const exitStub = stubProcessExit();

  try {
    process.env.SHUTDOWN_TIMEOUT_MS = '5000';
    const startedServer = startServer(0);

    await new Promise((resolvePromise) => startedServer.once('listening', resolvePromise));

    assert.equal(startedServer.gracefulShutdown.isDraining(), false);

    await new Promise((resolvePromise, reject) => {
      startedServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  } finally {
    exitStub.restore();

    if (previousTimeout === undefined) {
      delete process.env.SHUTDOWN_TIMEOUT_MS;
    } else {
      process.env.SHUTDOWN_TIMEOUT_MS = previousTimeout;
    }
  }
});

test('server entrypoint starts when executed directly', async () => {
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });

  const ready = new Promise((resolvePromise, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('server startup timed out')), 5000);

    const checkReady = () => {
      if (stdout.includes('YESorNOaaS listening on http://localhost:')) {
        clearTimeout(timeoutId);
        resolvePromise();
      }
    };

    child.stdout.on('data', checkReady);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== null && code !== 0 && !stdout.includes('YESorNOaaS listening on http://localhost:')) {
        clearTimeout(timeoutId);
        reject(new Error(`server exited early with code ${code}`));
      }
    });

    checkReady();
  });

  await ready;

  const portMatch = stdout.match(/http:\/\/localhost:(\d+)/);
  assert.ok(portMatch);

  const response = await fetch(`http://127.0.0.1:${portMatch[1]}/anything`);
  await assertNotFoundPage(response);

  const closed = new Promise((resolvePromise) => child.on('close', resolvePromise));

  child.kill('SIGTERM');
  await closed;

  assert.match(stdout, /Received SIGTERM, starting graceful shutdown/);
  assert.match(stdout, /Graceful shutdown complete/);
  assert.equal(child.exitCode, 0);
});
