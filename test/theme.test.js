import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeThemeToggle } from '../public/theme.js';

function createThemeFixture({ storedTheme, prefersDark }) {
  const localThis = {
    button: {
      attributes: {},
      innerHTML: '',
      listeners: {},
      addEventListener(event, listener) {
        this.listeners[event] = listener;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    },
    document: {
      documentElement: { dataset: {} },
      querySelector(selector) {
        assert.equal(selector, '#theme-toggle');
        return localThis.button;
      }
    },
    storage: {
      values: storedTheme ? { theme: storedTheme } : {},
      setItem(key, value) {
        this.values[key] = value;
      }
    }
  };

  if (storedTheme) {
    localThis.document.documentElement.dataset.theme = storedTheme;
  }

  return {
    ...localThis,
    dependencies: {
      document: localThis.document,
      matchMedia: () => ({ matches: prefersDark }),
      storage: localThis.storage
    }
  };
}

test('initializes the theme toggle from the effective color scheme', () => {
  const localThis = createThemeFixture({ prefersDark: true });

  initializeThemeToggle(localThis.dependencies);

  assert.match(localThis.button.innerHTML, /circle/);
  assert.equal(localThis.button.attributes['aria-label'], 'Switch to light theme');
});

test('toggles and persists the selected theme', () => {
  const localThis = createThemeFixture({ storedTheme: 'light', prefersDark: false });

  initializeThemeToggle(localThis.dependencies);
  localThis.button.listeners.click();

  assert.equal(localThis.document.documentElement.dataset.theme, 'dark');
  assert.equal(localThis.storage.values.theme, 'dark');
  assert.equal(localThis.button.attributes['aria-label'], 'Switch to light theme');
});
