# Security Policy

## Supported Versions

Security fixes are provided for the latest release only.

| Version | Supported |
| --- | --- |
| 2.2.4 | ✓ |
| Earlier releases | ✘ |

## Reporting a vulnerability

Please do not open a public GitHub issue for security reports.

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/ravidorr/yes-or-no-as-a-service/security/advisories/new) or by opening a private security contact through GitHub if that option is unavailable.

Include:

- a description of the issue
- steps to reproduce
- affected components or files
- possible impact

## Response expectations

Maintainers will acknowledge valid reports as soon as possible and work on a fix on a private branch when needed. You will be credited in the advisory unless you ask to remain anonymous.

## Scope notes

YESorNOaaS is a small service that returns plain text yes or no responses. Reports about intentional behavior such as "answer routes always return `Yes!` or `No!`" are out of scope unless they expose an unintended security issue.

## Deployment guidance

### Prometheus metrics (`GET /metrics`)

The metrics endpoint is public and unauthenticated. It exposes operational data
such as CPU, memory, heap, garbage collection, and HTTP traffic patterns. That
is appropriate for internal Prometheus scraping, but risky on the public internet
without network controls.

When exposing YESorNOaaS beyond a trusted network:

- Bind the service to an internal interface or private network.
- Restrict `/metrics` at a reverse proxy or ingress (ACL, IP allowlist, or
  separate internal scrape URL).
- Do not rely on rate limiting to protect `/metrics`; the endpoint is exempt.

See the README for configuration details.

### Reverse proxies and rate limiting

Rate limits are enforced in memory inside each Node.js process. Horizontal
scaling gives every replica its own bucket, so effective limits scale with the
number of running instances unless you add a shared store (see ROADMAP.md).

Behind a reverse proxy or ingress, set `TRUST_PROXY` so rate limits key on the
client IP from `X-Forwarded-For` instead of the proxy IP. Without it, all
clients may share one bucket or limits may be ineffective.

Example for one trusted proxy hop:

```sh
TRUST_PROXY=1 npm start
```
