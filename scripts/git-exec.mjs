import { execFileSync } from 'node:child_process';

export const GIT_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const STAGED_PATH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

export function assertValidGitRef(ref) {
  if (typeof ref !== 'string' || !GIT_REF_PATTERN.test(ref)) {
    throw new Error(`Invalid git ref: ${ref}`);
  }
}

export function assertValidStagedPath(path) {
  if (typeof path !== 'string' || !STAGED_PATH_PATTERN.test(path)) {
    throw new Error(`Invalid staged path: ${path}`);
  }
}

export function execGit(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...options });
}
