import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bootstrapTheme, bootstrapThemeIfBrowser } from '../public/theme-bootstrap.js';

test('bootstrapThemeIfBrowser runs in browser contexts', () => {
  const localThis = {
    document: {
      documentElement: {
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value;
        }
      }
    },
    storage: {
      getItem() {
        return 'light';
      }
    }
  };

  bootstrapThemeIfBrowser({
    isBrowserContextImpl: () => true,
    document: localThis.document,
    storage: localThis.storage
  });

  assert.equal(localThis.document.documentElement.attributes['data-theme'], 'light');
});

test('bootstrapTheme applies a stored theme', () => {
  const localThis = {
    document: {
      documentElement: {
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value;
        }
      }
    },
    storage: {
      getItem(key) {
        return key === 'theme' ? 'dark' : null;
      }
    }
  };

  bootstrapTheme({
    document: localThis.document,
    storage: localThis.storage
  });

  assert.equal(localThis.document.documentElement.attributes['data-theme'], 'dark');
});

test('bootstrapTheme skips missing themes', () => {
  const localThis = {
    document: {
      documentElement: {
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value;
        }
      }
    },
    storage: {
      getItem() {
        return null;
      }
    }
  };

  bootstrapTheme({
    document: localThis.document,
    storage: localThis.storage
  });

  assert.equal(localThis.document.documentElement.attributes['data-theme'], undefined);
});

test('bootstrapTheme ignores storage failures', () => {
  const localThis = {
    document: {
      documentElement: {
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value;
        }
      }
    },
    storage: {
      getItem() {
        throw new Error('blocked');
      }
    }
  };

  assert.doesNotThrow(() =>
    bootstrapTheme({
      document: localThis.document,
      storage: localThis.storage
    })
  );
  assert.equal(localThis.document.documentElement.attributes['data-theme'], undefined);
});
