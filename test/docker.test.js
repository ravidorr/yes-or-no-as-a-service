import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';
import packageInfo from '../package.json' with { type: 'json' };

const dockerfilePath = resolve('Dockerfile');
const dockerignorePath = resolve('.dockerignore');
const composePath = resolve('compose.yaml');

test('Dockerfile uses Node 22 Alpine with production runtime contract', () => {
  const dockerfile = readFileSync(dockerfilePath, 'utf8');

  assert.match(dockerfile, /^FROM node:22-alpine$/m);
  assert.match(dockerfile, /^ENV NODE_ENV=production \\$/m);
  assert.match(dockerfile, /^    PORT=3000$/m);
  assert.match(dockerfile, /^RUN npm ci --omit=dev$/m);
  assert.match(dockerfile, /^COPY --chown=node:node src \.\/src$/m);
  assert.match(dockerfile, /^COPY --chown=node:node public \.\/public$/m);
  assert.match(dockerfile, /^USER node$/m);
  assert.match(dockerfile, /^EXPOSE 3000$/m);
  assert.match(dockerfile, /^HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\$/m);
  assert.match(
    dockerfile,
    /^  CMD \["node", "scripts\/docker-healthcheck\.mjs"\]$/m
  );
  assert.match(
    dockerfile,
    /^CMD \["node", "src\/server\.js"\]$/m,
    'exec-form Node CMD forwards SIGTERM and SIGINT to the HTTP server'
  );
});

test('.dockerignore excludes development-only build context', () => {
  const dockerignore = readFileSync(dockerignorePath, 'utf8');

  assert.match(dockerignore, /^node_modules$/m);
  assert.match(dockerignore, /^\.git$/m);
  assert.match(dockerignore, /^\.github$/m);
  assert.match(dockerignore, /^test$/m);
  assert.match(dockerignore, /^docs$/m);
  assert.match(dockerignore, /^\*\.md$/m);
  assert.match(dockerignore, /^\.env$/m);
  assert.match(dockerignore, /^\.DS_Store$/m);
  assert.match(dockerignore, /^npm-debug\.log\*$/m);
});

test('Compose loads local environment values for the development container', () => {
  const compose = parse(readFileSync(composePath, 'utf8'));

  assert.deepEqual(compose.services.yesornoaas.env_file, [{ path: '.env', required: false }]);
  assert.equal(compose.services.yesornoaas.environment.PORT, '3000');
  assert.deepEqual(compose.services.yesornoaas.ports, ['3000:3000']);
});

test('npm start loads an optional local environment file', () => {
  assert.equal(packageInfo.scripts.start, 'node --env-file-if-exists=.env src/server.js');
  assert.equal(packageInfo.engines.node, '>=22.9.0');
});
