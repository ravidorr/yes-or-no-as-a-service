# Changelog

## 2.2.5 - 2026-10-09

- Advance the sole supported release version to 2.2.5.

## 2.2.4 - 2026-10-09

- Repair dependency-lock consistency, release validation, and browser UI state
  handling.
- Add supported-version security policy validation to local hooks and CI.

## 2.2.3 - 2026-10-09

- Establish the project quality, release, documentation, and UI-token baseline.

## 2.2.2 - 2026-10-06

- Document the official Render-hosted YESorNOaaS demo and health check.

## 2.2.1 - 2026-10-06

- Add Pendo Track Events to the web UI for answered questions, shared-link
  replays, failed answer requests, and share link copies. The events send only
  categorical and numeric details, never question text, and are sent only when
  Pendo is enabled for the deployment.
- Describe the product analytics events in the privacy policy.

## 2.2.0 - 2026-10-06

- Support opt-in Novus by Pendo analytics for configured deployments, excluding
  shared question text from captured URLs and share interactions.
- Load an optional local `.env` file with `npm start` and add Docker Compose
  startup for local development.

## 2.1.5 - 2026-10-06

- Harden release scripts against shell injection, improve shutdown and healthcheck reliability, add security headers, validate theme bootstrap storage, and expand behavioral test coverage from the code review.

## 2.1.4 - 2026-10-06

- Enforce 100% unit test coverage for all production JavaScript in `src/`, `public/`, and `scripts/`.

## 2.1.3 - 2026-10-06

- Align Yes and No answer panel colors and correct the email share icon.

## 2.1.2 - 2026-10-06

- Add a GitHub Sponsors funding link for the project.

## 2.1.1 - 2026-10-06

- Update the HTML validator development dependency.

## 2.1.0 - 2026-10-05

- Replace the answer pages with a shared responsive template, persistent theme
  toggle, loading and error states, replay links, and sharing controls.
- Return a branded HTML 404 page for unmatched web, API, and non-GET requests.

## 2.0.0 - 2026-10-05

- Rebrand YorNaaS to YESorNOaaS across the API, CLI, MCP server, docs, and web UI.
- Rename npm package to `@ravidor/yesornoaas` with `yesornoaas` and
  `yesornoaas-mcp` binaries.
- Rename HTTP metrics prefix to `yesornoaas_http_*`.
- Add `/api/random`, `/random`, `yesornoaas random`, and MCP tool `random` that
  return a randomly selected `Yes!` or `No!`.
- Preserve deterministic `/api/yes`, `/api/no`, `yesornoaas yes|no`, and MCP
  `yes`/`no` behavior.
- Send `Cache-Control: no-store` on random API responses so shared links reroll
  on each open.
- Extend metrics route labels with `api_random` and `web_random`.
- Update OpenAPI, README, and route hints for the random interface.
- Refresh web UI headings, form label, and replay links below the share section.

## 1.0.3 - 2026-10-05

- Reuse an existing local dev server for Playwright when port 3000 is already in use.
- Exclude Playwright `test-results` artifacts from Markdown linting.

## 1.0.2 - 2026-10-05

- Reject shutdown readiness grace values greater than the shutdown timeout.
- Validate `PORT` as an integer TCP port and skip server startup when imported
  without a script path.
- Make the Docker health check fail on non-200 `/health` responses.
- Document legacy root share redirects and sync OpenAPI metadata with releases.
- Disclose user-initiated third-party sharing in the privacy policy.
- Add browser, container, tarball, OpenAPI, and graceful-drain integration tests.
- Run CI smoke checks against the built Docker image instead of the host checkout.
- Restore publish-time npm safeguards by removing `--ignore-scripts`.

## 1.0.1 - 2026-10-05

- Exempt the Yes and No web UI pages from the API rate-limit quota.
- Redirect legacy root share links to the corresponding Yes or No page.
- Submit long shared requests immediately rather than delaying on animation.
- Correct contributor links, package names, commands, and GHCR instructions.

## 1.0.0 - 2026-10-05

- Launch YorNaaS (Yes or No as a Service) combining yes and no answer routes.
- Add `/api/yes` returning `Yes!` and keep `/api/no` returning `No!`.
- Return `404 text/plain` with a route hint for unknown paths; rate-limited
  requests return `429` with the same hint.
- Rename package to `@ravidor/yornaas` with `yornaas` and `yornaas-mcp` binaries.
- Add MCP `yes` and `no` tools on server `yornaas`.
- Update CLI to `yornaas yes` and `yornaas no` subcommands.
- Rename HTTP metrics prefix to `yornaas_http_*` with `api_yes`, `api_no`, and
  `not_found` route labels.
- Update web UI with yes/no answer mode, share links, and YorNaaS branding.
- Replace `src/no.js` with `src/responses.js` for shared constants.

## 0.6.2 - 2026-10-01

- Require `npm run lint` in the Husky pre-commit hook before coverage checks.
- Gitignore `npm pack` tarballs and document local tarball smoke-test steps in
  CONTRIBUTING.md.

## 0.6.1 - 2026-10-01

- Document `/metrics` exposure, in-memory rate-limit scaling, and `TRUST_PROXY`
  deployment guidance in README and SECURITY.md.
- Add optional `TRUST_PROXY` environment variable for reverse-proxy deployments.
- Require CI `lint` and `smoke` checks, add Docker build to smoke, and align the
  release workflow on Node.js 22.
- Migrate from deprecated `prom-client` to `@prometheus-io/client`.
- Extract share URL helpers to `public/share-utils.js` with unit tests.
- Extract frontend request, clipboard, and autoplay behavior to
  `public/app-behavior.js` with unit tests.
- Add ESLint, html-validate, and markdownlint-cli2.
- Clarify PRIVACY.md: NaaS does not track users; operators may scrape
  operational metrics.
- Fix ROADMAP and CONTRIBUTING drift; include `scripts/prepare-husky.mjs` in the
  published npm package.

## 0.6.0 - 2026-10-01

- Add `GET /metrics` for Prometheus scraping with HTTP service metrics and
  standard Node.js runtime metrics.
- Exempt the metrics endpoint from rate limiting and document the contract in
  OpenAPI and the README.
- Extend CI smoke checks to validate the metrics endpoint.

## 0.5.0 - 2026-10-01

- Publish the production Docker image to GHCR on release as
  `ghcr.io/ravidorr/no-as-a-service`, tagged with the package version and
  `latest`.
- Document GHCR pull and run commands in the README.

## 0.4.1 - 2026-10-01

- Add CI smoke checks for `/api/no`, `/health`, and `/version`.
- Sync OpenAPI and README version examples with the package release.

## 0.4.0 - 2026-10-01

- Add `GET /version`, returning the package version as plain text.
- Document the endpoint in OpenAPI and the README.

## 0.3.1 - 2026-10-01

- Add graceful shutdown for SIGTERM and SIGINT with configurable
  `SHUTDOWN_TIMEOUT_MS` (default 30 seconds).
- Return `503` from `GET /health` while the server is draining connections.
- Document container shutdown behavior in README and mark the roadmap item complete.

## 0.3.0 - 2026-10-01

- Add IP-keyed HTTP rate limiting with env-configured limits, modern rate-limit
  headers, and `429` responses that return `No!`.
- Exempt static assets and `GET /health` from rate limiting.
- Document rate-limit configuration in README and OpenAPI.

## 0.2.7 - 2026-10-01

- Add a production Docker image with a `/health` health check and README run instructions.

## 0.2.6 - 2026-10-01

- Publish an OpenAPI specification at `GET /openapi.yaml` for health, `/api/no`, and fallback behavior.

## 0.2.5 - 2026-10-01

- Add `GET /health`, returning JSON NaaS status and the package version.

## 0.2.4 - 2026-10-01

- Add ROADMAP.md with completed work, Phase 3 plan, and release reminders.
- Link the roadmap from README.

## 0.2.3 - 2026-10-01

- Publish as `@ravidor/naas` to match the npm account scope (GitHub org/user remains `ravidorr`).
- Parse Node.js 24 info-prefixed coverage reports in the inventory check.
- Run coverage explicitly in the release workflow before publishing without lifecycle scripts.

## 0.2.2 - 2026-10-01

- Preserve non-workflow paths when classifying renamed files for release-note validation.

## 0.2.1 - 2026-10-01

- Skip release-note validation for pull requests that only update GitHub workflows.

## 0.2.0 - 2026-10-01

- Publish the package to npm as `@ravidor/naas` with global `naas` and `naas-mcp` binaries.
- Automate GitHub Releases and npm publish when a version bump lands on `main`.
- Split release-notes verification into its own required CI job for pull requests and pushes.
- Add Dependabot updates for npm dependencies and GitHub Actions.
- Refresh the README with Node.js 22+, npm install instructions, and community doc links.
- Skip Husky setup during CI and non-git installs so global npm installs stay clean.

## 0.1.1 - 2026-10-01

- Enforce 100% `src/` coverage in tests, CI, and the pre-commit hook.
- Verify every `src/**/*.js` file appears in the coverage report.
- Require Node.js 22 for coverage threshold support.
- Add community docs: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `PRIVACY.md`, and `SUPPORT.md`.
- Block pushes and pull requests unless `package.json` is version-bumped and `CHANGELOG.md` has a matching release entry.
- Regenerate and stage `package-lock.json` automatically when `package.json` is committed.

## 0.1.0 - 2026-05-10

- Initial NaaS API.
- Return `No!` as plain text for any request path, method, or payload.
- Add `naas` CLI that returns `No!`.
- Add `naas-mcp` stdio MCP server with a `no` tool.
- Add vanilla HTML, CSS, and JavaScript UI.
- Clear the UI response when the request input is cleared.
- Add UI timeout/error handling for stuck or failed requests.
- Add shareable NaaS links that autoplay a request and response.
- Move the share link below the response and explain what it does.
- Reveal sharing controls only after a successful NaaS reply and add Preview.
- Clarify the request field label and primary action copy.
- Rename the share action to `Copy link`.
- Rename `Preview` to `Preview link`.
- Add social share links for X, Facebook, LinkedIn, Email, and WhatsApp.
- Replace social share text labels with accessible icon links.
- Rename the social share label to `Share link`.
- Replace rough social SVG paths with package-sourced icons.
- Add MIT license.
- Replace social icons with Font Awesome Free icons.
- Match social icon buttons to service colors.
- Use black for the email share icon.
- Simplify the generated link explanation.
