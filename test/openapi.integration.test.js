import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { parse as parseYaml } from 'yaml';
import packageInfo from '../package.json' with { type: 'json' };
import { UNKNOWN_ROUTE_HINT } from '../src/responses.js';
import { app, createApp } from '../src/server.js';

const openApiDocument = parseYaml(readFileSync(resolve('public/openapi.yaml'), 'utf8'));

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolvePromise) => server.once('listening', resolvePromise));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
});

test('OpenAPI metadata matches the package version and root redirect contract', () => {
  assert.equal(openApiDocument.info.version, packageInfo.version);
  assert.ok(openApiDocument.paths['/']);
  assert.ok(openApiDocument.paths['/'].get.responses['308']);
});

test('live endpoints match the OpenAPI response contracts', async () => {
  const versionResponse = await fetch(`${baseUrl}/version`);
  assert.equal(versionResponse.status, 200);
  assert.equal(versionResponse.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await versionResponse.text(), packageInfo.version);

  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { status: 'YESorNOaaS', version: packageInfo.version });

  const metricsResponse = await fetch(`${baseUrl}/metrics`);
  assert.equal(metricsResponse.status, 200);
  assert.match(metricsResponse.headers.get('content-type'), /^text\/plain; charset=utf-8; version=0\.0\.4$/);

  const yesResponse = await fetch(`${baseUrl}/api/yes`, { method: 'POST' });
  assert.equal(yesResponse.status, 200);
  assert.equal(await yesResponse.text(), 'Yes!');

  const noResponse = await fetch(`${baseUrl}/api/no`, { method: 'POST' });
  assert.equal(noResponse.status, 200);
  assert.equal(await noResponse.text(), 'No!');

  const randomApp = createApp({ randomNumberSource: () => 0 });
  const randomServer = randomApp.listen(0);
  await new Promise((resolvePromise) => randomServer.once('listening', resolvePromise));
  const randomPort = randomServer.address().port;

  try {
    const randomResponse = await fetch(`http://127.0.0.1:${randomPort}/api/random`, {
      method: 'POST'
    });
    assert.equal(randomResponse.status, 200);
    assert.equal(randomResponse.headers.get('cache-control'), 'no-store');
    assert.equal(await randomResponse.text(), 'Yes!');
  } finally {
    await new Promise((resolvePromise, reject) => {
      randomServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  }

  const redirectResponse = await fetch(`${baseUrl}/?request=Can%20I%3F&answer=yes`, {
    redirect: 'manual'
  });
  assert.equal(redirectResponse.status, 308);
  assert.equal(redirectResponse.headers.get('location'), '/yes?request=Can+I%3F');

  const unknownResponse = await fetch(`${baseUrl}/unknown-path`);
  assert.equal(unknownResponse.status, 404);
  assert.match(unknownResponse.headers.get('content-type'), /^text\/html/);
  assert.match(await unknownResponse.text(), /<body data-mode="404">/);
});

test('live throttled responses match the OpenAPI 429 contract', async () => {
  const throttledApp = createApp({ rateLimitConfig: { windowMs: 60_000, max: 1 } });
  const throttledServer = throttledApp.listen(0);
  await new Promise((resolvePromise) => throttledServer.once('listening', resolvePromise));
  const throttledBaseUrl = `http://127.0.0.1:${throttledServer.address().port}`;

  try {
    const first = await fetch(`${throttledBaseUrl}/unknown-path`);
    assert.equal(first.status, 404);

    const throttled = await fetch(`${throttledBaseUrl}/unknown-path`);
    assert.equal(throttled.status, 429);
    assert.equal(throttled.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(await throttled.text(), UNKNOWN_ROUTE_HINT);
  } finally {
    await new Promise((resolvePromise, reject) => {
      throttledServer.close((error) => (error ? reject(error) : resolvePromise()));
    });
  }
});
