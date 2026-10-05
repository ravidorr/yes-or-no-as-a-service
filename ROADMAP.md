# YorNaaS roadmap

Living plan for [yes-or-no-as-a-service](https://github.com/ravidorr/yes-or-no-as-a-service). Update this file when scope or priorities change.

**Current release:** [`@ravidor/yornaas`](https://www.npmjs.com/package/@ravidor/yornaas) — version on `main` lives in [`package.json`](./package.json); tags and notes on [GitHub Releases](https://github.com/ravidorr/yes-or-no-as-a-service/releases).

## Decisions (locked in)

| Topic | Choice |
| --- | --- |
| npm package | `@ravidor/yornaas` (matches npm user `ravidor`; GitHub stays `ravidorr`) |
| CI publish | [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) via `release.yml` (no `NPM_TOKEN`) |
| Required checks on `main` | `test`, `release-notes`, `lint`, `smoke` |
| Rate limit | HTTP `429`, body route hint (plain text) |
| Container registry | [GHCR](https://ghcr.io) `ghcr.io/ravidorr/yes-or-no-as-a-service` on release |

## Done

- [x] Core API, CLI, MCP, and web UI
- [x] 100% `src/` coverage enforced (pre-commit + CI)
- [x] Community docs (`CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, `PRIVACY`, `SUPPORT`)
- [x] Branch protection (review, resolved threads, required CI)
- [x] Release notes guard (pre-push + CI)
- [x] Auto lockfile sync from staged `package.json`
- [x] Dependabot (npm + GitHub Actions)
- [x] GitHub Releases on version bump to `main`
- [x] npm publish `@ravidor/yornaas` + Trusted Publisher for `ravidorr/yes-or-no-as-a-service` / `release.yml`
- [x] README install and contributor guidance
- [x] Phase 3a: Health endpoint (`GET /health` JSON status and version)
- [x] Phase 3b: OpenAPI specification at `GET /openapi.yaml`
- [x] Phase 3c: Production Docker image with `/health` health check
- [x] Phase 3d: IP-keyed rate limiting with env-configured limits and `429` + route hint
- [x] Graceful shutdown (SIGTERM/SIGINT) for containers with draining `/health`
- [x] `GET /version` plain-text package version endpoint
- [x] E2E smoke in CI (`curl /api/yes`, `/api/no`, `/health`, `/version`, `/metrics`, 404 smoke)
- [x] GHCR publish on release (`ghcr.io/ravidorr/yes-or-no-as-a-service`)
- [x] YorNaaS 1.0: dual `/api/yes` and `/api/no` routes, CLI subcommands, MCP yes/no tools
- [x] Prometheus `/metrics` with HTTP and Node.js runtime metrics

## Next

Product work is complete. Optional follow-ups:

- Shared rate-limit store for multi-instance deployments (for example Redis)

## Release process (reminder)

1. Branch from `main`
2. Implement + tests (keep 100% `src/` coverage)
3. Bump `package.json` version and add `## X.Y.Z - date` to `CHANGELOG.md`
4. Open PR → pass `test`, `release-notes`, `lint`, and `smoke` → review → merge
5. Merge triggers GitHub Release, npm publish (Trusted Publishing), and GHCR image publish

Manual publish is only needed for bootstrap or recovery; routine releases are automated.

## Tracking

- **This file:** high-level plan and status
- **GitHub issues:** create one issue per feature PR when work starts (optional but recommended)
- **CHANGELOG.md:** shipped work per version
