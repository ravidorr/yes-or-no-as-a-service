# YESorNOaaS

Yes or No as a Service.

Call the answer routes:

```sh
curl http://localhost:3000/api/yes     # Yes!
curl http://localhost:3000/api/no      # No!
curl http://localhost:3000/api/random  # Yes! or No!
```

Unknown paths return the HTML 404 page. Rate-limited requests return `429`
with a route hint.

## Requirements

- Node.js 22 or newer
- npm

## Install

Install globally from npm:

```sh
npm install -g @ravidor/yesornoaas
npm view @ravidor/yesornoaas version
```

The first npm release must be published manually by a maintainer with access to
the `@ravidor` scope. See [CONTRIBUTING.md](CONTRIBUTING.md) for bootstrap
steps. Later releases are automated through GitHub Actions Trusted Publishing.

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

The yes UI is at `http://localhost:3000/yes`, the no UI is at
`http://localhost:3000/no`, and the random UI is at
`http://localhost:3000/random`. The root path returns the 404 page.
Use `?request=` on any answer page to open a shareable YESorNOaaS flow that types
and submits the request automatically. Long shared requests are entered
immediately instead of being animated character by character. Legacy root share
URLs redirect to the matching page, defaulting to `/no` when no answer is
specified. Shared random links reroll on each open and display the selected
`Yes!` or `No!`.

Health check:

```sh
curl http://localhost:3000/health
```

Output:

```json
{"status":"YESorNOaaS","version":"1.0.2"}
```

Prometheus metrics:

```sh
curl http://localhost:3000/metrics
```

Output is Prometheus text format (`text/plain; charset=utf-8; version=0.0.4`).
The endpoint is public, exempt from rate limiting, and remains available during
graceful shutdown.

Custom HTTP metrics:

- `yesornoaas_http_requests_total{route,method,status_code}`
- `yesornoaas_http_request_duration_seconds{route,method,status_code}`
- `yesornoaas_http_requests_in_flight{route,method}`

Route labels are normalized to `version`, `health`, `metrics`, `api_yes`,
`api_no`, `api_random`, `web_yes`, `web_no`, `web_random`, or `not_found`.
Scrape traffic to `/metrics` is not counted in the custom HTTP metrics.

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

Rate limiting applies to `/api/yes`, `/api/no`, `/api/random`, and unknown
routes. Static assets, `GET /health`, and `GET /metrics` are exempt.
Throttled requests return `429` with the route hint.

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

`SHUTDOWN_READINESS_GRACE_MS` may be `0`. It must not exceed
`SHUTDOWN_TIMEOUT_MS`.

`PORT` must be an integer between `0` and `65535`.

### Optional Pendo analytics

Pendo analytics are disabled by default. To enable anonymous page and
interaction tracking for an official deployment, set the Pendo public app ID:

```sh
PENDO_PUBLIC_APP_ID=<your-pendo-public-app-id> npm start
```

Do not set this variable for local development, CI, or self-hosted deployments
unless you want their activity sent to that Pendo application. The integration
excludes shared-link `request` query text from captured URLs. See
[the privacy policy](PRIVACY.md) for details.

## Docker

Build the image locally:

```sh
docker build -t yesornoaas .
docker run --rm -p 3000:3000 yesornoaas
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
docker run --rm -e PORT=8080 -p 8080:8080 yesornoaas
```

## CLI

After a global install:

```sh
yesornoaas yes
yesornoaas no
yesornoaas random
```

For local development:

```sh
npm link
yesornoaas yes
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
yesornoaas-mcp
```

It exposes three tools:

- `yes`: returns `Yes!`
- `no`: returns `No!`
- `random`: returns `Yes!` or `No!`

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
