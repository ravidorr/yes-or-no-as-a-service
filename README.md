# YorNaaS

Yes or No as a Service.

Call the answer routes:

```sh
curl http://localhost:3000/api/yes   # Yes!
curl http://localhost:3000/api/no    # No!
```

Unknown paths return `404 text/plain` with a hint. Rate-limited requests return
`429` with the same hint.

## Requirements

- Node.js 22 or newer
- npm

## Install

Install globally from npm:

```sh
npm install -g @ravidor/yornaas
```

Or clone and run locally:

```sh
git clone https://github.com/ravidorr/yes-or-no-as-a-service.git
cd yes-or-no-as-a-service
npm install
```

## Run

```sh
npm start
```

The API listens on `http://localhost:3000` by default.

The yes UI is at `http://localhost:3000/yes` and the no UI is at
`http://localhost:3000/no`. The root path returns `404` with the route hint.
Use `?request=` on either page to open a shareable YorNaaS flow that types and
submits the request automatically. Long shared requests are entered immediately
instead of being animated character by character. Legacy root share URLs redirect
to the matching page, defaulting to `/no` when no answer is specified.

Health check:

```sh
curl http://localhost:3000/health
```

Output:

```json
{"status":"YorNaaS","version":"1.0.1"}
```

Prometheus metrics:

```sh
curl http://localhost:3000/metrics
```

Output is Prometheus text format (`text/plain; charset=utf-8; version=0.0.4`).
The endpoint is public, exempt from rate limiting, and remains available during
graceful shutdown.

Custom HTTP metrics:

- `yornaas_http_requests_total{route,method,status_code}`
- `yornaas_http_request_duration_seconds{route,method,status_code}`
- `yornaas_http_requests_in_flight{route,method}`

Route labels are normalized to `version`, `health`, `metrics`, `api_yes`,
`api_no`, `web_yes`, `web_no`, or `not_found`. Scrape traffic to `/metrics` is
not counted in the custom HTTP metrics.

Standard Node.js process and runtime metrics (CPU, memory, event loop, GC) are
also included.

Treat `/metrics` as an internal operations endpoint. On the public internet,
bind to a private network, restrict access at your reverse proxy, or scrape
from an internal URL only. See [SECURITY.md](SECURITY.md) for deployment
guidance.

Version:

```sh
curl http://localhost:3000/version
```

OpenAPI specification:

```sh
curl http://localhost:3000/openapi.yaml
```

Use a different port:

```sh
PORT=8080 npm start
```

Rate limiting applies to `/api/yes`, `/api/no`, and unknown routes. Static
assets, `GET /health`, and `GET /metrics` are exempt. Throttled requests return
`429` with the route hint.

Configure the limit with environment variables:

```sh
RATE_LIMIT_WINDOW_MS=900000 RATE_LIMIT_MAX=100 npm start
```

Defaults are 100 requests per client IP every 15 minutes. Limits are stored in
process memory, so multiple instances do not share quota state.

Behind a reverse proxy or ingress, set `TRUST_PROXY` so limits key on the
client IP from `X-Forwarded-For` instead of the proxy IP:

```sh
TRUST_PROXY=1 npm start
```

Graceful shutdown applies when the process receives `SIGTERM` or `SIGINT`.
During drain, `GET /health` returns `503` with the same JSON body.

Configure the drain deadline and readiness grace with:

```sh
SHUTDOWN_TIMEOUT_MS=30000 SHUTDOWN_READINESS_GRACE_MS=1000 npm start
```

## Docker

Build the image locally:

```sh
docker build -t yornaas .
docker run --rm -p 3000:3000 yornaas
```

Pull the published release image from GHCR:

```sh
docker pull ghcr.io/ravidorr/yes-or-no-as-a-service:latest
docker run --rm -p 3000:3000 ghcr.io/ravidorr/yes-or-no-as-a-service:latest
```

Verify the health check:

```sh
curl http://localhost:3000/health
```

Use a different port:

```sh
docker run --rm -e PORT=8080 -p 8080:8080 yornaas
```

## CLI

After a global install:

```sh
yornaas yes
yornaas no
```

For local development:

```sh
npm link
yornaas yes
```

Output:

```text
Yes!
```

## MCP

Run the stdio MCP server:

```sh
npm run mcp
```

After a global install or `npm link`, MCP clients can use:

```sh
yornaas-mcp
```

It exposes two tools:

- `yes`: returns `Yes!`
- `no`: returns `No!`

## Test

```sh
npm test
```

Contributors should also run the coverage gate before opening a pull request:

```sh
npm run test:coverage
npm run lint
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for completed work and the release process.

## Community

- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Support](SUPPORT.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Privacy](PRIVACY.md)

Release policy: every merged change must bump the version in `package.json` and add a matching entry to `CHANGELOG.md`. See [Contributing](CONTRIBUTING.md) for details.

## License

MIT

Social icons are from Font Awesome Free.
