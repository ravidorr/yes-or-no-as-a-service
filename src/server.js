import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import packageInfo from '../package.json' with { type: 'json' };
import { createGracefulShutdown } from './graceful-shutdown.js';
import { createMetrics } from './metrics.js';
import {
  NO_RESPONSE,
  SERVICE_NAME,
  UNKNOWN_ROUTE_HINT,
  YES_RESPONSE
} from './responses.js';
import { createRateLimitMiddleware } from './rate-limit.js';
import { parseRateLimitConfig, validateRateLimitConfig } from './rate-limit-config.js';
import { parseShutdownConfig } from './shutdown-config.js';
import { parseTrustProxyConfig } from './trust-proxy-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let gracefulShutdownController;

export function createApp({
  rateLimitConfig,
  isShuttingDown = () => false,
  metrics = createMetrics(),
  trustProxy = parseTrustProxyConfig()
} = {}) {
  const app = express();
  const publicPath = resolve(__dirname, '../public');
  const resolvedRateLimitConfig = rateLimitConfig
    ? validateRateLimitConfig(rateLimitConfig)
    : parseRateLimitConfig();

  if (trustProxy !== false) {
    app.set('trust proxy', trustProxy);
  }

  app.use(metrics.middleware);
  app.use(express.static(publicPath));

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

    const answer = req.query.answer === 'yes' ? 'yes' : 'no';
    const query = new URLSearchParams({ request: req.query.request });

    res.redirect(308, `/${answer}?${query}`);
  });

  app.get('/yes', (_req, res) => {
    res.sendFile(resolve(publicPath, 'yes.html'));
  });

  app.get('/no', (_req, res) => {
    res.sendFile(resolve(publicPath, 'no.html'));
  });

  app.use(createRateLimitMiddleware(resolvedRateLimitConfig));

  app.all('/api/yes', (req, res) => {
    res.status(200).type('text/plain').send(YES_RESPONSE);
  });

  app.all('/api/no', (req, res) => {
    res.status(200).type('text/plain').send(NO_RESPONSE);
  });

  app.use((req, res) => {
    res.status(404).type('text/plain').send(UNKNOWN_ROUTE_HINT);
  });

  return app;
}

export const app = createApp({
  isShuttingDown: () => gracefulShutdownController?.isDraining() ?? false
});

export function resolveListenPort(address, fallbackPort) {
  return typeof address === 'object' && address ? address.port : fallbackPort;
}

export function resolveServerPort(port = process.env.PORT || 3000) {
  return port;
}

export function startServer(
  port = resolveServerPort(),
  { shutdownConfig = parseShutdownConfig() } = {}
) {
  const server = app.listen(port, () => {
    const actualPort = resolveListenPort(server.address(), port);

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
  if (moduleUrl === pathToFileURL(resolve(argvPath)).href) {
    start().gracefulShutdown.install();
  }
}

runIfMain();
