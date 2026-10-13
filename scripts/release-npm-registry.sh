#!/usr/bin/env bash
set -euo pipefail

npm_view_spec() {
  local spec="$1"
  local err
  err="$(mktemp)"

  if npm view "$spec" version 2>"$err"; then
    rm -f "$err"
    return 0
  fi

  if grep -qiE '404| E404 |not found|npm404|code E404' "$err"; then
    rm -f "$err"
    return 1
  fi

  cat "$err" >&2
  rm -f "$err"
  echo "npm view failed for ${spec} (registry error, not a missing package)." >&2
  exit 2
}

publish_release_package() {
  local package="$1"
  local version="$2"

  if npm_view_spec "${package}@${version}"; then
    echo "Version ${version} is already on npm; skipping publish."
    return 0
  fi

  if ! npm_view_spec "${package}@latest"; then
    echo "::warning::${package} is not on npm yet. Skipping publish until bootstrap completes."
    echo "See docs/NPM_BOOTSTRAP.md"
    return 0
  fi

  npm publish --access public --provenance
}

verify_release_on_npm() {
  local package="$1"
  local version="$2"

  if ! npm_view_spec "${package}@latest"; then
    echo "::error::${package} is not on npm. Complete bootstrap before creating a GitHub Release."
    echo "See docs/NPM_BOOTSTRAP.md"
    return 1
  fi

  if ! npm_view_spec "${package}@${version}"; then
    echo "::error::${package}@${version} is not on npm after the publish step."
    return 1
  fi

  echo "Verified ${package}@${version} on npm."
  return 0
}

command="${1:-}"
case "$command" in
  publish)
    publish_release_package "$2" "$3"
    ;;
  verify)
    verify_release_on_npm "$2" "$3"
    ;;
  *)
    echo "Usage: $0 publish|verify <package> <version>" >&2
    exit 1
    ;;
esac
