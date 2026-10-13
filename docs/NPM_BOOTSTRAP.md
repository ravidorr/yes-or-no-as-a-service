# npm bootstrap for `@ravidor/yesornoaas`

Automated releases use GitHub Actions **Trusted Publishing** (OIDC) in
`.github/workflows/release.yml`. npm only accepts OIDC publishes for a package
that **already exists** on the registry and has a trusted publisher configured.

Today `@ravidor/yesornoaas` is **not** on npm. Release skips automated publish
with a warning, then **Verify npm release** fails and blocks the GitHub Release
until bootstrap completes.

## One-time maintainer checklist

### 1. Confirm npm access

```sh
npm login
npm whoami
npm access list packages
```

You need permission to publish under the `@ravidor` scope.

### 2. Run release gates locally

From a clean checkout of `main` at the version you are publishing (check
`package.json`):

```sh
npm ci
npm run lint
npm run test:coverage
```

### 3. Bootstrap publish (creates the package on npm)

```sh
npm publish --access public
npm view @ravidor/yesornoaas version
```

This must be the **first** publish for `@ravidor/yesornoaas`. It uses your user
session, not GitHub OIDC. Do **not** pass `--provenance` here; provenance requires
a supported cloud CI runner. GitHub Actions adds provenance on later releases.

### 4. Configure Trusted Publisher on npm

1. Open [npm](https://www.npmjs.com/package/@ravidor/yesornoaas) → **Settings** →
   **Trusted Publisher**.
2. Add **GitHub Actions**:
   - Organization or user: `ravidorr`
   - Repository: `yes-or-no-as-a-service`
   - Workflow filename: `release.yml`
   - Environment: (leave empty unless you use a GitHub Environment)

Save the trusted publisher **after** the package exists from step 3.

### 5. Verify automation

**Option A:** After steps 3–4 succeed (`npm view @ravidor/yesornoaas version` matches
`package.json` and Trusted Publisher is saved), re-run the latest [Release
workflow](https://github.com/ravidorr/yes-or-no-as-a-service/actions/workflows/release.yml)
on `main` for the release commit. Publish skips the existing bootstrap version,
verify passes, and the GitHub Release is created.

**Option B:** Merge a patch version bump (`package.json` + `CHANGELOG.md`). CI
must pass; Release should publish via OIDC, push GHCR, and create the GitHub
Release.

Confirm:

```sh
npm view @ravidor/yesornoaas version
```

## How the Release workflow behaves

| Registry state | Action |
| --- | --- |
| Version already published | Skip `npm publish`; verify passes; create GitHub Release and GHCR image |
| Package missing on npm | Skip `npm publish` with a warning; verify fails; no GitHub Release |
| Package exists, version new | `npm publish --access public --provenance` via OIDC, then verify |

## Troubleshooting

### `404 Not Found` on `PUT .../@ravidor%2fyesornoaas`

- Package was never bootstrapped (step 3), or
- Trusted Publisher is missing or points at the wrong repo/workflow, or
- The npm user that bootstrapped is not the scope owner and OIDC is not set up

### `403` or provenance errors

- Confirm `id-token: write` on the Release job (already set in `release.yml`).
- Confirm Trusted Publisher matches `release.yml` exactly.

### Bootstrap version already merged but never published

Publish that version manually once (step 3), configure Trusted Publisher (step
4), then either re-run Release or ship the next patch version through the normal
release process.
