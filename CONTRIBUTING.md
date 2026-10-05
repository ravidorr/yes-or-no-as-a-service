# Contributing to YorNaaS

Thanks for helping improve Yes or No as a Service.

## Prerequisites

- Node.js 22 or newer
- npm

## Setup

```sh
git clone https://github.com/ravidorr/yes-or-no-as-a-service.git
cd yes-or-no-as-a-service
npm install
```

`npm install` also installs the Husky pre-commit hook.

## Interfaces

The [README](README.md) documents both answers across the `/api/yes` and
`/api/no` API routes, the `yornaas yes` and `yornaas no` CLI subcommands, the
`yes` and `no` MCP tools, and the `/yes` and `/no` web UI pages.

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
and publishes `@ravidor/yornaas` to npm via
[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC). No
long-lived `NPM_TOKEN` secret is required.

Before the first automated publish, maintainers must:

1. Authenticate to npm and confirm the account owns the `@ravidor` scope:

   ```sh
   npm login
   npm whoami
   ```

2. Publish once from a trusted machine after the release gates pass locally:

   ```sh
   npm run lint
   npm run test:coverage
   npm publish --access public --provenance
   npm view @ravidor/yornaas version
   ```

3. On npm, open `@ravidor/yornaas` → **Settings** → **Trusted Publisher** →
   **GitHub Actions** and link `ravidorr/yes-or-no-as-a-service` with workflow
   file `release.yml`.

To smoke-test the publish tarball locally before a release:

```sh
npm pack
npm install -g ./ravidor-yornaas-*.tgz
yornaas yes
yornaas no
rm ravidor-yornaas-*.tgz
```

Pack tarballs are gitignored (`*.tgz`); do not commit them.

## Git hooks

When `package.json` is part of the commit, the pre-commit hook runs
`scripts/sync-package-lock.mjs` to regenerate and stage `package-lock.json`.

The pre-commit hook also runs `npm run lint` and `npm run test:coverage`.
Commits are blocked if linters fail, tests fail, or coverage drops below 100%
for `src/`.

The pre-push hook runs `npm run verify:release-notes`. Pushes are blocked unless `package.json` is version-bumped and `CHANGELOG.md` includes a matching release entry.

To skip a hook in an emergency only:

```sh
HUSKY=0 git commit ...
HUSKY=0 git push ...
```

Use that sparingly. CI will still enforce the same checks.

## Code style

Match the existing code in the file you are editing. Keep changes minimal and readable.

## Questions

Open a [GitHub issue](https://github.com/ravidorr/yes-or-no-as-a-service/issues) if something is unclear.
