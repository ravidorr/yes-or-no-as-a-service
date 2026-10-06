import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialize404Page, initialize404PageIfBrowser } from '../public/404.js';

test('initialize404PageIfBrowser runs in browser contexts', () => {
  const localThis = {
    called: false
  };

  initialize404PageIfBrowser({
    isBrowserContextImpl: () => true,
    initializeThemeToggleImpl: () => {
      localThis.called = true;
    }
  });

  assert.equal(localThis.called, true);
});

test('initialize404Page delegates to the theme initializer', () => {
  const localThis = {
    called: false
  };

  initialize404Page({
    initializeThemeToggleImpl: () => {
      localThis.called = true;
    }
  });

  assert.equal(localThis.called, true);
});
