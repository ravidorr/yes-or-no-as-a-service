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

test('initializes the theme toggle from stored light and dark themes', () => {
  const darkFixture = createThemeFixture({ storedTheme: 'dark', prefersDark: false });
  initializeThemeToggle(darkFixture.dependencies);
  assert.equal(darkFixture.button.attributes['aria-label'], 'Switch to light theme');

  const lightFixture = createThemeFixture({ storedTheme: 'light', prefersDark: true });
  initializeThemeToggle(lightFixture.dependencies);
  assert.equal(lightFixture.button.attributes['aria-label'], 'Switch to dark theme');
});

test('falls back to the system theme when stored theme values are invalid', () => {
  const localThis = createThemeFixture({ prefersDark: false });
  localThis.document.documentElement.dataset.theme = 'system';

  initializeThemeToggle(localThis.dependencies);

  assert.equal(localThis.button.attributes['aria-label'], 'Switch to dark theme');
});

test('ignores storage failures when persisting the selected theme', () => {
  const localThis = createThemeFixture({ storedTheme: 'light', prefersDark: false });
  localThis.storage.setItem = () => {
    throw new Error('blocked');
  };

  initializeThemeToggle(localThis.dependencies);
  assert.doesNotThrow(() => localThis.button.listeners.click());
  assert.equal(localThis.document.documentElement.dataset.theme, 'dark');
});

test('toggles and persists the selected theme', () => {
  const localThis = createThemeFixture({ storedTheme: 'light', prefersDark: false });

  initializeThemeToggle(localThis.dependencies);
  localThis.button.listeners.click();

  assert.equal(localThis.document.documentElement.dataset.theme, 'dark');
  assert.equal(localThis.storage.values.theme, 'dark');
  assert.equal(localThis.button.attributes['aria-label'], 'Switch to light theme');
});

test('toggles from dark back to light', () => {
  const localThis = createThemeFixture({ storedTheme: 'dark', prefersDark: false });

  initializeThemeToggle(localThis.dependencies);
  localThis.button.listeners.click();

  assert.equal(localThis.document.documentElement.dataset.theme, 'light');
  assert.equal(localThis.storage.values.theme, 'light');
  assert.equal(localThis.button.attributes['aria-label'], 'Switch to dark theme');
});
