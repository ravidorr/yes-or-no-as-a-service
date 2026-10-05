# Contributing to NaaS

Thanks for helping improve No as a Service.

## Prerequisites

- Node.js 22 or newer
- npm

## Setup

```sh
git clone https://github.com/ravidorr/no-as-a-service.git
cd no-as-a-service
npm install
```

`npm install` also installs the Husky pre-commit hook.

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

- passing `test` and `release-notes` checks
- at least one approving review
- resolved review conversations

## Releases

When a version bump merges to `main`, GitHub Actions creates a GitHub Release and publishes `@ravidor/naas` to npm via [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC). No long-lived `NPM_TOKEN` secret is required.

Before the first automated publish, maintainers must:

1. Publish once from a trusted machine with `npm login` and `npm publish --access public` (see README).
2. On npm, open `@ravidor/naas` → **Settings** → **Trusted Publisher** → **GitHub Actions** and link `ravidorr/no-as-a-service` with workflow file `release.yml`.

To smoke-test the publish tarball locally before a release:

```sh
npm pack
npm install -g ./ravidor-naas-*.tgz
naas
rm ravidor-naas-*.tgz
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

Open a [GitHub issue](https://github.com/ravidorr/no-as-a-service/issues) if something is unclear.
