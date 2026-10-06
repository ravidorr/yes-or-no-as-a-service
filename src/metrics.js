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
  ['/api/random', 'api_random'],
  ['/yes', 'web_yes'],
  ['/no', 'web_no'],
  ['/random', 'web_random']
]);

export function normalizeRoute(path) {
  return KNOWN_ROUTES.get(path) ?? 'not_found';
}

export function createMetrics() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const requestsTotal = new Counter({
    name: 'yesornoaas_http_requests_total',
    help: 'Total number of HTTP requests handled by the service',
    labelNames: ['route', 'method', 'status_code'],
    registers: [registry]
  });

  const requestDurationSeconds = new Histogram({
    name: 'yesornoaas_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['route', 'method', 'status_code'],
    registers: [registry]
  });

  const requestsInFlight = new Gauge({
    name: 'yesornoaas_http_requests_in_flight',
    help: 'Number of HTTP requests currently being handled',
    labelNames: ['route', 'method'],
    registers: [registry]
  });

  function middleware(req, res, next) {
    // Do not instrument /metrics scrapes; they would recurse into request metrics.
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

    // Listen on finish, close, and req.close so aborted clients decrement in-flight
    // exactly once and record status 499 when no response was fully sent.
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
