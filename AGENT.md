# YESorNOaaS - Agent Guide

Canonical instructions for AI coding agents. `CLAUDE.md` and `GEMINI.md` point
here; edit this file only.

## Project

Yes or No as a Service provides deterministic and random HTTP, CLI, MCP, and
web UI interfaces.

## Commands

- Install: `npm ci`
- Runtime: Node.js `24.21.0` with npm `11.19.0`
- Lint: `npm run lint`
- Syntax check: `npm run typecheck`
- Test: `npm test`
- Coverage: `npm run test:coverage` (100% lines, functions, and branches;
  mandatory on push and in CI)

## Rules

- Never bypass hooks with `--no-verify`, `HUSKY=0`, or any equivalent
  mechanism. Fix the cause when a hook fails.
- This repository uses GitHub issues for ticketing.
- Linters are strict (ESLint, Stylelint, html-validate, markdownlint). Do not
  weaken rules to pass.
- UI work uses the CSS token catalog in `/design-system`. No hard-coded colors
  or spacing.
- Pin Node via `.nvmrc`; the package manager is npm. Keep `package-lock.json`
  committed.
- Every pull request that changes files outside `.github/workflows/` updates
  `CHANGELOG.md` and bumps the version.
- Track open work in `TODO.md`.

## Layout

- `design-system/` - UI token catalog and usage guidance
- `.husky/` - git hooks (pre-commit fast, pre-push broad)
- `.github/` - CI, release, Dependabot, and templates
