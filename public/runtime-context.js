export function isBrowserContext({
  windowObj = globalThis.window,
  documentObj = globalThis.document
} = {}) {
  return typeof windowObj !== 'undefined' && typeof documentObj !== 'undefined';
}
