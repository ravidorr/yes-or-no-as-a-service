import express from 'express';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import packageInfo from '../package.json' with { type: 'json' };
import { createGracefulShutdown } from './graceful-shutdown.js';
import { createMetrics } from './metrics.js';
import {
  DEFAULT_RANDOM_NUMBER_SOURCE,
  NO_RESPONSE,
  selectRandomAnswer,
  SERVICE_NAME,
  YES_RESPONSE
} from './responses.js';
import { createRateLimitMiddleware } from './rate-limit.js';
import { parseRateLimitConfig, validateRateLimitConfig } from './rate-limit-config.js';
import { parseShutdownConfig } from './shutdown-config.js';
import { parseTrustProxyConfig } from './trust-proxy-config.js';
import { isExecutedModule } from './run-if-main.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PENDO_PUBLIC_APP_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let gracefulShutdownController;

export function createPendoSnippet(publicAppId) {
  if (typeof publicAppId !== 'string' || !PENDO_PUBLIC_APP_ID_PATTERN.test(publicAppId)) {
    return '';
  }

  return `<script>
      (function (apiKey) {
        (function (p, e, n, d, o) {
          var v, w, x, y, z;
          o = p[d] = p[d] || {};
          o._q = o._q || [];
          v = ['initialize', 'identify', 'updateOptions', 'pageLoad', 'track'];

          for (w = 0, x = v.length; w < x; ++w) {
            (function (m) {
              o[m] = o[m] || function () {
                o._q[m === v[0] ? 'unshift' : 'push'](
                  [m].concat([].slice.call(arguments, 0))
                );
              };
            })(v[w]);
          }

          y = e.createElement(n);
          y.async = true;
          y.src = 'https://cdn.pendo.io/agent/static/' + apiKey + '/pendo.js';
          z = e.getElementsByTagName(n)[0];
          z.parentNode.insertBefore(y, z);
        })(window, document, 'script', 'pendo');
      })('${publicAppId}');

      pendo.initialize({
        visitor: {
          id: ''
        },
        location: {
          transforms: [{
            attr: 'search',
            action: 'ExcludeKeys',
            data: ['request']
          }]
        }
      });
    </script>`;
}

export function createApp({
  rateLimitConfig,
  isShuttingDown = () => false,
  metrics = createMetrics(),
  trustProxy = parseTrustProxyConfig(),
  randomNumberSource = DEFAULT_RANDOM_NUMBER_SOURCE,
  pendoPublicAppId = process.env.PENDO_PUBLIC_APP_ID
} = {}) {
  const app = express();
  const publicPath = resolve(__dirname, '../public');
  const pageTemplate = readFileSync(resolve(publicPath, 'index.html'), 'utf8');
  const notFoundTemplate = readFileSync(resolve(publicPath, '404.html'), 'utf8');
  const staticAssets = express.static(publicPath, { index: false });
  const pendoSnippet = createPendoSnippet(pendoPublicAppId);

  function renderPage(mode, res) {
    res
      .status(200)
      .type('html')
      .send(
        pageTemplate
          .replaceAll('__PAGE_MODE__', mode)
          .replace('__PENDO_SNIPPET__', pendoSnippet)
          .replace('__APP_VERSION__', packageInfo.version)
      );
  }
  const resolvedRateLimitConfig = rateLimitConfig
    ? validateRateLimitConfig(rateLimitConfig)
    : parseRateLimitConfig();

  if (trustProxy !== false) {
    app.set('trust proxy', trustProxy);
  }

  app.use((_req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  app.use(metrics.middleware);
  app.use((req, res, next) => {
    // Do not serve the unconfigured template; only /yes, /no, and /random render it.
    if (req.path === '/index.html') {
      next();
      return;
    }

    staticAssets(req, res, next);
  });

  app.all('/version', (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    res.status(200).type('text/plain').send(packageInfo.version);
  });

  app.all('/health', (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const statusCode = isShuttingDown() ? 503 : 200;

    res.status(statusCode).json({ status: SERVICE_NAME, version: packageInfo.version });
  });

  app.all('/metrics', async (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    res.set('Content-Type', metrics.contentType);
    res.status(200).send(await metrics.metrics());
  });

  app.get('/', (req, res, next) => {
    if (typeof req.query.request !== 'string') {
      next();
      return;
    }

    let answer = 'no';

    if (req.query.answer === 'yes') {
      answer = 'yes';
    } else if (req.query.answer === 'random') {
      answer = 'random';
    }

    const query = new URLSearchParams({ request: req.query.request });

    res.redirect(308, `/${answer}?${query}`);
  });

  app.get('/yes', (_req, res) => {
    renderPage('yes', res);
  });

  app.get('/no', (_req, res) => {
    renderPage('no', res);
  });

  app.get('/random', (_req, res) => {
    renderPage('random', res);
  });

  // Rate limiting applies only to routes registered below (API routes and the 404 handler).
  app.use(createRateLimitMiddleware(resolvedRateLimitConfig));

  app.all('/api/yes', (req, res) => {
    res.status(200).type('text/plain').send(YES_RESPONSE);
  });

  app.all('/api/no', (req, res) => {
    res.status(200).type('text/plain').send(NO_RESPONSE);
  });

  app.all('/api/random', (_req, res) => {
    res
      .status(200)
      .type('text/plain')
      .set('Cache-Control', 'no-store')
      .send(selectRandomAnswer(randomNumberSource));
  });

  app.use((req, res) => {
    res
      .status(404)
      .type('html')
      .send(
        notFoundTemplate
          .replace('__PENDO_SNIPPET__', pendoSnippet)
          .replace('__APP_VERSION__', packageInfo.version)
      );
  });

  return app;
}

export const app = createApp({
  isShuttingDown: () => gracefulShutdownController?.isDraining() ?? false
});

export function resolveListenPort(address, fallbackPort) {
  return typeof address === 'object' && address ? address.port : fallbackPort;
}

export function parseListenPort(value) {
  const raw = String(value ?? process.env.PORT ?? 3000);
  const port = Number.parseInt(raw, 10);

  if (!/^\d+$/.test(raw) || port < 0 || port > 65_535) {
    throw new Error('PORT must be an integer between 0 and 65535');
  }

  return port;
}

export function resolveServerPort(port = process.env.PORT ?? 3000) {
  return parseListenPort(port);
}

export function startServer(
  port = resolveServerPort(),
  { shutdownConfig = parseShutdownConfig() } = {}
) {
  const listenPort = parseListenPort(port);
  const server = app.listen(listenPort, () => {
    const actualPort = resolveListenPort(server.address(), listenPort);

    console.log(`${SERVICE_NAME} listening on http://localhost:${actualPort}`);
  });

  gracefulShutdownController = createGracefulShutdown({
    server,
    timeoutMs: shutdownConfig.timeoutMs,
    readinessGraceMs: shutdownConfig.readinessGraceMs
  });

  server.gracefulShutdown = gracefulShutdownController;

  return server;
}

export function runIfMain({
  moduleUrl = import.meta.url,
  argvPath = process.argv[1],
  start = startServer
} = {}) {
  if (isExecutedModule(moduleUrl, argvPath)) {
    start().gracefulShutdown.install();
  }
}

runIfMain();
