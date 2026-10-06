import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyPageCopy,
  getPageConfig,
  PAGE_MODES,
  resolvePageMode
} from '../public/page-config.js';

test('resolvePageMode maps answer routes to mode keys', () => {
  assert.equal(resolvePageMode('/yes'), 'yes');
  assert.equal(resolvePageMode('/no'), 'no');
  assert.equal(resolvePageMode('/random'), 'random');
  assert.equal(resolvePageMode('/unknown'), 'yes');
});

test('getPageConfig returns the yes page copy', () => {
  const localThis = getPageConfig('yes');

  assert.equal(localThis.modeLabel, 'YES');
  assert.match(localThis.heading, /Yes! response/);
  assert.equal(localThis.replays.length, 2);
});

test('applyPageCopy fills mode-specific labels and replay links', () => {
  const localThis = {
    root: {
      title: '',
      body: { dataset: {} },
      createElement(tagName) {
        return {
          tagName,
          dataset: {},
          textContent: '',
          href: '',
          attributes: {},
          children: [],
          append(child) {
            this.children.push(child);
          },
          setAttribute(name, value) {
            this.attributes[name] = value;
          }
        };
      },
      querySelector(selector) {
        return localThis.elements[selector];
      }
    },
    elements: {
      '.mode': { textContent: '' },
      '#page-heading': { textContent: '' },
      '#submit': { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } },
      '#empty-hint': { textContent: '' },
      '#link-label': { textContent: '' },
      '#share-help': { textContent: '' },
      '#answer': { dataset: {} },
      '#answer-text': { textContent: '' },
      '#replays': {
        children: [],
        replaceChildren(...nodes) {
          this.children = nodes;
        }
      }
    }
  };

  applyPageCopy('no', localThis.root);

  assert.equal(localThis.root.body.dataset.mode, 'no');
  assert.equal(localThis.root.title, PAGE_MODES.no.documentTitle);
  assert.equal(localThis.elements['.mode'].textContent, 'NO');
  assert.match(localThis.elements['#page-heading'].textContent, /No! response/);
  assert.equal(localThis.elements['#submit'].attributes['aria-label'], 'Ask for No!');
  assert.equal(localThis.elements['#replays'].children.length, 2);
  assert.equal(localThis.elements['#replays'].children[0].dataset.replayMode, 'yes');
  assert.equal(localThis.elements['#replays'].children[0].children[0].textContent, 'Get a "Yes!" replay');
});

test('getPageConfig rejects unknown modes', () => {
  assert.throws(() => getPageConfig('unknown'), /Unknown page mode: unknown/);
});
