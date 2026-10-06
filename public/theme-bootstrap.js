import { isBrowserContext } from './runtime-context.js';

export function bootstrapTheme({
  document = globalThis.document,
  storage = globalThis.localStorage
} = {}) {
  try {
    const theme = storage.getItem('theme');

    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch {
    // Ignore storage failures.
  }
}

export function bootstrapThemeIfBrowser({ isBrowserContextImpl = isBrowserContext, ...options } = {}) {
  if (isBrowserContextImpl()) {
    bootstrapTheme(options);
  }
}

bootstrapThemeIfBrowser();
