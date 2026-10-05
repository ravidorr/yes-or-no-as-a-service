import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { parse as parseYaml } from 'yaml';
import packageInfo from '../package.json' with { type: 'json' };
import { UNKNOWN_ROUTE_HINT } from '../src/responses.js';
import { app } from '../src/server.js';

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
  assert.deepEqual(await healthResponse.json(), { status: 'YorNaaS', version: packageInfo.version });

  const metricsResponse = await fetch(`${baseUrl}/metrics`);
  assert.equal(metricsResponse.status, 200);
  assert.match(metricsResponse.headers.get('content-type'), /^text\/plain; charset=utf-8; version=0\.0\.4$/);

  const yesResponse = await fetch(`${baseUrl}/api/yes`, { method: 'POST' });
  assert.equal(yesResponse.status, 200);
  assert.equal(await yesResponse.text(), 'Yes!');

  const noResponse = await fetch(`${baseUrl}/api/no`, { method: 'POST' });
  assert.equal(noResponse.status, 200);
  assert.equal(await noResponse.text(), 'No!');

  const redirectResponse = await fetch(`${baseUrl}/?request=Can%20I%3F&answer=yes`, {
    redirect: 'manual'
  });
  assert.equal(redirectResponse.status, 308);
  assert.equal(redirectResponse.headers.get('location'), '/yes?request=Can+I%3F');

  const unknownResponse = await fetch(`${baseUrl}/unknown-path`);
  assert.equal(unknownResponse.status, 404);
  assert.equal(await unknownResponse.text(), UNKNOWN_ROUTE_HINT);
});
