import { initializeThemeToggle } from './theme.js';
import { isBrowserContext } from './runtime-context.js';

export function initialize404Page({
  initializeThemeToggleImpl = initializeThemeToggle
} = {}) {
  initializeThemeToggleImpl();
}

export function initialize404PageIfBrowser({ isBrowserContextImpl = isBrowserContext, ...options } = {}) {
  if (isBrowserContextImpl()) {
    initialize404Page(options);
  }
}

initialize404PageIfBrowser();
