import rateLimit from 'express-rate-limit';
import { UNKNOWN_ROUTE_HINT } from './responses.js';

export function createRateLimitMiddleware(config) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      // Reuse the unknown-route hint as the throttle body by design.
      res.status(429).type('text/plain').send(UNKNOWN_ROUTE_HINT);
    }
  });
}
