# Contributing to YESorNOaaS

Thanks for helping improve Yes or No as a Service.

## Prerequisites

- Node.js 24.21.0
- npm

## Setup

```sh
git clone https://github.com/ravidorr/yes-or-no-as-a-service.git
cd yes-or-no-as-a-service
npm install
```

`npm install` also installs the Husky pre-commit hook.

## Interfaces

The [README](README.md) documents the deterministic and random answers across
the `/api/yes`, `/api/no`, and `/api/random` API routes, the `yesornoaas yes`,
`yesornoaas no`, and `yesornoaas random` CLI subcommands, the `yes`, `no`, and
`random` MCP tools, and the `/yes`, `/no`, and `/random` web UI pages.

## Validation

Run the fast test suite:

```sh
npm test
```

Before opening a pull request, run the same gates as the pre-commit hook and CI:

```sh
npm run lint
npm run test:coverage
```

Release requirements:

- bump the `"version"` field in `package.json` above the version on `main`
- add a matching release entry to `CHANGELOG.md` using the format `## X.Y.Z - YYYY-MM-DD`

Verify release notes locally:

```sh
npm run verify:release-notes
```

The pre-push hook and CI pull request checks enforce the same rules.

Coverage requirements:

- 100% line, branch, and function coverage for every file under `src/`
- every `src/**/*.js` file must appear in the coverage report

## Pull request expectations

1. Branch from the latest `main`.
2. Keep changes focused on one fix or feature.
3. Update or add tests when behavior changes.
4. Open a pull request against `main`.
5. Ensure the `test` and `release-notes` CI checks pass.
6. Request review and resolve all review conversations before merge.

Protected `main` requires:

- passing `test`, `release-notes`, `lint`, `smoke`, `package`, and `e2e` checks
- at least one approving review
- resolved review conversations

## Releases

When a version bump merges to `main`, GitHub Actions creates a GitHub Release
and publishes `@ravidor/yesornoaas` to npm via
[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC). No
long-lived `NPM_TOKEN` secret is required.

Before the first automated publish, maintainers must:

1. Authenticate to npm and confirm the account owns the `@ravidor` scope:

   ```sh
   npm login
   npm whoami
   ```

2. Publish once from a trusted machine after the release gates pass locally.
   This bootstrap publish uses the exact version in `package.json` and only
   needs to happen once for the new package name:

   ```sh
   npm run lint
   npm run test:coverage
   npm publish --access public --provenance
   npm view @ravidor/yesornoaas version
   ```

3. On npm, open `@ravidor/yesornoaas` → **Settings** → **Trusted Publisher** →
   **GitHub Actions** and link `ravidorr/yes-or-no-as-a-service` with workflow
   file `release.yml`.

When that same version later merges to `main`, the release workflow skips npm
publish if the version is already on the registry and still creates the GitHub
release and container image.

To smoke-test the publish tarball locally before a release:

```sh
pack_dir="$(mktemp -d)"
npm pack --pack-destination "$pack_dir"
npm install -g "$pack_dir"/ravidor-yesornoaas-*.tgz
yesornoaas yes
yesornoaas no
rm -rf "$pack_dir"
```

This creates the tarball outside the repository and removes it after the smoke
test.

## Git hooks

The pre-commit hook validates staged files. The pre-push hook runs linting,
syntax checks, 100% coverage, and the release gate. Never bypass a hook; fix
the underlying failure instead.

## Code style

Match the existing code in the file you are editing. Keep changes minimal and readable.

## Questions

Open a [GitHub issue](https://github.com/ravidorr/yes-or-no-as-a-service/issues) if something is unclear.
