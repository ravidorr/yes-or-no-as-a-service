import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInThisContext } from 'node:vm';
import { test } from 'node:test';
import { bootstrapTheme, bootstrapThemeIfBrowser } from '../public/theme-bootstrap-core.js';

const themeBootstrapPath = resolve('public/theme-bootstrap.js');
const themeBootstrapSource = readFileSync(themeBootstrapPath, 'utf8');

function loadThemeBootstrapScript() {
  runInThisContext(themeBootstrapSource, {
    filename: themeBootstrapPath
  });
}

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

test('theme-bootstrap.js restores a stored theme synchronously in the browser', () => {
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
    },
    previousDocument: globalThis.document,
    previousStorage: globalThis.localStorage
  };

  globalThis.document = localThis.document;
  globalThis.localStorage = localThis.storage;

  try {
    loadThemeBootstrapScript();
    assert.equal(localThis.document.documentElement.attributes['data-theme'], 'dark');
  } finally {
    globalThis.document = localThis.previousDocument;
    globalThis.localStorage = localThis.previousStorage;
  }
});

test('theme-bootstrap.js ignores storage failures synchronously in the browser', () => {
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
    },
    previousDocument: globalThis.document,
    previousStorage: globalThis.localStorage
  };

  globalThis.document = localThis.document;
  globalThis.localStorage = localThis.storage;

  try {
    assert.doesNotThrow(() => loadThemeBootstrapScript());
  } finally {
    globalThis.document = localThis.previousDocument;
    globalThis.localStorage = localThis.previousStorage;
  }
});
