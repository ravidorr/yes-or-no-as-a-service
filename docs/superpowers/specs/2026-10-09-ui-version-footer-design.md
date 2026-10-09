# UI version footer design

## Goal

Show the application version in a footer on every rendered HTML page. The
displayed version must always equal `package.json`'s `version` field, without a
manual synchronisation step.

## Scope

- Add the footer to the shared answer-page template used by `/yes`, `/no`, and
  `/random`.
- Add the same footer to the branded 404-page template.
- Reuse the existing UI design tokens for all footer styling.

## Architecture

`src/server.js` already imports `package.json` as `packageInfo` and uses
`packageInfo.version` for the `/version` and `/health` endpoints. Each HTML
template will contain an `__APP_VERSION__` placeholder in its footer. The server
will replace that placeholder with `packageInfo.version` when it renders either
template.

The browser will receive the version in the initial HTML response. It will not
make a second request to `/version`, and it will not maintain a duplicate
version constant.

## Testing

Server integration tests will verify that each answer page and the 404 page
contains the current package version and contains no unresolved version
placeholder. This makes a package version bump directly observable in rendered
HTML and prevents the footer source from drifting.
