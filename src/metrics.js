import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics
} from '@prometheus-io/client';

const KNOWN_ROUTES = new Map([
  ['/version', 'version'],
  ['/health', 'health'],
  ['/metrics', 'metrics'],
  ['/api/yes', 'api_yes'],
  ['/api/no', 'api_no'],
  ['/yes', 'web_yes'],
  ['/no', 'web_no']
]);

export function normalizeRoute(path) {
  return KNOWN_ROUTES.get(path) ?? 'not_found';
}

export function createMetrics() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const requestsTotal = new Counter({
    name: 'yornaas_http_requests_total',
    help: 'Total number of HTTP requests handled by the service',
    labelNames: ['route', 'method', 'status_code'],
    registers: [registry]
  });

  const requestDurationSeconds = new Histogram({
    name: 'yornaas_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['route', 'method', 'status_code'],
    registers: [registry]
  });

  const requestsInFlight = new Gauge({
    name: 'yornaas_http_requests_in_flight',
    help: 'Number of HTTP requests currently being handled',
    labelNames: ['route', 'method'],
    registers: [registry]
  });

  function middleware(req, res, next) {
    if (req.path === '/metrics' && req.method === 'GET') {
      next();
      return;
    }

    const route = normalizeRoute(req.path);
    const method = req.method;
    const labels = { route, method };

    requestsInFlight.inc(labels);
    const endTimer = requestDurationSeconds.startTimer({ route, method });
    let finalized = false;

    function finalize() {
      if (finalized) {
        return;
      }

      finalized = true;
      const statusCode = String(res.statusCode || 499);

      requestsInFlight.dec(labels);
      endTimer({ status_code: statusCode });
      requestsTotal.inc({ route, method, status_code: statusCode });
    }

    res.on('finish', finalize);
    res.on('close', () => {
      if (!res.writableFinished) {
        finalize();
      }
    });
    req.on('close', () => {
      if (!finalized) {
        finalize();
      }
    });

    next();
  }

  return {
    registry,
    contentType: registry.contentType,
    middleware,
    metrics() {
      return registry.metrics();
    }
  };
}
