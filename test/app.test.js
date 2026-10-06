import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeApp, initializeAppIfBrowser } from '../public/app.js';

function createElement(tag, { id, className = '', hidden = false, dataset = {}, attributes = {} } = {}) {
  const listeners = {};
  const children = [];
  const classList = {
    values: new Set(className.split(' ').filter(Boolean)),
    add(value) {
      this.values.add(value);
    },
    remove(value) {
      this.values.delete(value);
    }
  };

  const element = {
    tag,
    id,
    hidden,
    dataset,
    attributes,
    value: '',
    textContent: '',
    innerHTML: '',
    href: '',
    disabled: attributes.disabled === 'true',
    listeners,
    children,
    classList,
    get className() {
      return [...classList.values].join(' ');
    },
    set className(value) {
      classList.values = new Set(value.split(' ').filter(Boolean));
    },
    append(...nodes) {
      children.push(...nodes);
    },
    replaceChildren(...nodes) {
      children.length = 0;
      children.push(...nodes);
    },
    createElement(childTag) {
      return createElement(childTag);
    },
    setAttribute(name, value) {
      attributes[name] = value;

      if (name === 'disabled') {
        element.disabled = value === 'true' || value === true;
      }
    },
    getAttribute(name) {
      return attributes[name];
    },
    addEventListener(event, listener) {
      listeners[event] = listener;
    },
    dispatchEvent() {},
    focus() {},
    select() {},
    requestSubmit() {
      listeners.submit?.({ preventDefault() {} });
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };

  return element;
}

function createAppFixture({ mode = 'yes', search = '', locationHref = 'https://example.test/yes' } = {}) {
  const replayLinks = [
    createElement('a', { dataset: { replayMode: 'no' } }),
    createElement('a', { dataset: { replayMode: 'random' } })
  ];

  const elements = {
    form: createElement('form', { id: 'ask-form', attributes: { 'aria-busy': 'false' } }),
    body: createElement('div', { className: 'body', dataset: { state: 'initial' } }),
    input: createElement('input', { id: 'request' }),
    submitButton: createElement('button', { id: 'submit', attributes: { disabled: 'true' } }),
    empty: createElement('div', { id: 'empty' }),
    status: createElement('div', { id: 'status', hidden: true }),
    errorSlot: createElement('div', { id: 'error', hidden: true }),
    errorTitle: createElement('span', { className: 'error-title' }),
    errorText: createElement('span', { className: 'error-text' }),
    answerElement: createElement('div', { id: 'answer', hidden: true, dataset: { answer: 'yes' } }),
    answerText: createElement('div', { id: 'answer-text' }),
    share: createElement('section', { id: 'share', hidden: true }),
    shareUrl: createElement('input', { id: 'share-url' }),
    copyButton: createElement('button', { id: 'copy' }),
    previewButton: createElement('button', { id: 'preview' }),
    shareXLink: createElement('a', { id: 'share-x-link', attributes: { 'aria-disabled': 'true' } }),
    shareFacebookLink: createElement('a', {
      id: 'share-facebook-link',
      attributes: { 'aria-disabled': 'true' }
    }),
    shareLinkedInLink: createElement('a', {
      id: 'share-linkedin-link',
      attributes: { 'aria-disabled': 'true' }
    }),
    shareEmailLink: createElement('a', { id: 'share-email-link', attributes: { 'aria-disabled': 'true' } }),
    shareWhatsAppLink: createElement('a', {
      id: 'share-whatsapp-link',
      attributes: { 'aria-disabled': 'true' }
    }),
    shareStatus: createElement('p', { id: 'share-status', className: 'share-status' }),
    modeLabel: createElement('span', { className: 'mode' }),
    pageHeading: createElement('h1', { id: 'page-heading' }),
    emptyHint: createElement('span', { id: 'empty-hint' }),
    linkLabel: createElement('label', { id: 'link-label' }),
    shareHelp: createElement('p', { id: 'share-help' }),
    replaysNav: createElement('nav', { id: 'replays' })
  };

  elements.replaysNav.children.push(...replayLinks);

  const documentBody = {
    dataset: { mode },
    querySelector(selector) {
      const map = {
        '#ask-form': elements.form,
        '.body': elements.body,
        '#request': elements.input,
        '#submit': elements.submitButton,
        '#empty': elements.empty,
        '#status': elements.status,
        '#error': elements.errorSlot,
        '.error-title': elements.errorTitle,
        '.error-text': elements.errorText,
        '#answer': elements.answerElement,
        '#answer-text': elements.answerText,
        '#share': elements.share,
        '#share-url': elements.shareUrl,
        '#copy': elements.copyButton,
        '#preview': elements.previewButton,
        '#share-x-link': elements.shareXLink,
        '#share-facebook-link': elements.shareFacebookLink,
        '#share-linkedin-link': elements.shareLinkedInLink,
        '#share-email-link': elements.shareEmailLink,
        '#share-whatsapp-link': elements.shareWhatsAppLink,
        '#share-status': elements.shareStatus,
        '.mode': elements.modeLabel,
        '#page-heading': elements.pageHeading,
        '#empty-hint': elements.emptyHint,
        '#link-label': elements.linkLabel,
        '#share-help': elements.shareHelp,
        '#replays': elements.replaysNav,
        '#theme-toggle': createElement('button', { id: 'theme-toggle' })
      };

      return map[selector] ?? null;
    },
    querySelectorAll(selector) {
      if (selector === '.replays a') {
        return replayLinks;
      }

      return [];
    }
  };

  const localThis = {
    elements,
    replayLinks,
    previewHref: null,
    copiedText: null,
    fetchCalls: [],
    document: {
      body: documentBody,
      title: '',
      documentElement: { dataset: {} },
      querySelector(selector) {
        return documentBody.querySelector(selector);
      },
      querySelectorAll(selector) {
        return documentBody.querySelectorAll(selector);
      },
      createElement(tag) {
        return createElement(tag);
      }
    },
    window: {
      location: {
        href: locationHref,
        origin: 'https://example.test',
        search
      },
      setTimeout(callback) {
        callback();
        return 1;
      }
    },
    navigator: {
      clipboard: {
        writeText: async (text) => {
          localThis.copiedText = text;
        }
      }
    }
  };

  localThis.window.location = {
    origin: 'https://example.test',
    search,
    get href() {
      return locationHref;
    },
    set href(value) {
      localThis.previewHref = value;
    }
  };

  return localThis;
}

function initializeFixture(localThis, overrides = {}) {
  return initializeApp({
    document: localThis.document,
    window: localThis.window,
    navigator: localThis.navigator,
    initializeThemeToggleImpl: () => {},
    applyPageCopyImpl: (mode, root) => {
      root.body.dataset.mode = mode;
      root.querySelector('#replays').replaceChildren(...localThis.replayLinks);
    },
    fetch: async (...args) => {
      localThis.fetchCalls.push(args);
      return overrides.fetchResponse ?? {
        ok: true,
        async text() {
          return 'Yes!';
        }
      };
    },
    ...overrides
  });
}

test('initializeApp starts in the empty state with disabled submit', () => {
  const localThis = createAppFixture();
  const app = initializeFixture(localThis);

  assert.equal(app.hasText(), false);
  assert.equal(localThis.elements.submitButton.disabled, true);
  assert.equal(localThis.elements.empty.hidden, false);
  assert.equal(localThis.elements.status.hidden, true);
});

test('initializeApp enables submit when the request has text', () => {
  const localThis = createAppFixture();
  initializeFixture(localThis);

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();

  assert.equal(localThis.elements.submitButton.disabled, false);
});

test('initializeApp uses random share URLs and social copy', async () => {
  const localThis = createAppFixture({
    mode: 'random',
    locationHref: 'https://example.test/random'
  });
  initializeFixture(localThis);

  localThis.elements.input.value = 'Maybe?';
  localThis.elements.input.listeners.input();
  await localThis.elements.form.listeners.submit({ preventDefault() {} });

  assert.match(localThis.elements.shareUrl.value, /\/random\?request=Maybe/);
  assert.match(localThis.elements.shareXLink.href, /twitter\.com/);
  assert.match(decodeURIComponent(localThis.elements.shareXLink.href), /randomly answer/);
  assert.match(localThis.replayLinks[1].href, /\/random\?request=Maybe/);
});

test('initializeApp shows a successful answer and share links', async () => {
  const localThis = createAppFixture();
  initializeFixture(localThis);

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  await localThis.elements.form.listeners.submit({ preventDefault() {} });

  assert.equal(localThis.elements.answerText.textContent, 'Yes!');
  assert.equal(localThis.elements.share.hidden, false);
  assert.match(localThis.elements.shareUrl.value, /request=Can/);
  assert.match(localThis.elements.shareXLink.href, /twitter\.com/);
  assert.equal(localThis.elements.shareXLink.attributes['aria-disabled'], 'false');
  assert.match(localThis.replayLinks[0].href, /request=Can/);
});

test('initializeApp marks No answers correctly', async () => {
  const localThis = createAppFixture();
  initializeFixture(localThis, {
    fetchResponse: {
      ok: true,
      async text() {
        return 'No!';
      }
    }
  });

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  await localThis.elements.form.listeners.submit({ preventDefault() {} });

  assert.equal(localThis.elements.answerElement.dataset.answer, 'no');
  assert.equal(localThis.elements.answerText.textContent, 'No!');
});

test('initializeApp shows timeout errors', async () => {
  const localThis = createAppFixture();
  initializeFixture(localThis, {
    submitAnswerRequestImpl: async ({ onTimeout }) => {
      onTimeout();
    }
  });

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  await localThis.elements.form.listeners.submit({ preventDefault() {} });

  assert.match(localThis.elements.errorTitle.textContent, /Timed out/);
});

test('initializeApp shows unavailable errors', async () => {
  const localThis = createAppFixture();
  initializeFixture(localThis, {
    submitAnswerRequestImpl: async ({ onUnavailable }) => {
      onUnavailable();
    }
  });

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  await localThis.elements.form.listeners.submit({ preventDefault() {} });

  assert.match(localThis.elements.errorTitle.textContent, /unavailable/i);
});

test('initializeApp ignores stale submit completions', async () => {
  const localThis = createAppFixture();
  let resolveFetch;

  initializeFixture(localThis, {
    fetch: async () =>
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
  });

  localThis.elements.input.value = 'First?';
  localThis.elements.input.listeners.input();
  localThis.elements.form.listeners.submit({ preventDefault() {} });
  localThis.elements.input.value = 'Second?';
  resolveFetch?.({ ok: true, text: async () => 'Yes!' });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(localThis.elements.answerText.textContent, '');
});

test('initializeApp aborts an existing controller before submitting again', async () => {
  const localThis = createAppFixture();
  const controllers = [];

  initializeFixture(localThis, {
    fetch: async (_url, options) =>
      new Promise(() => {
        controllers.push(options.signal);
      })
  });

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  localThis.elements.form.listeners.submit({ preventDefault() {} });
  localThis.elements.form.listeners.submit({ preventDefault() {} });

  assert.equal(controllers.length, 2);
  assert.equal(controllers[0].aborted, true);
});

test('initializeApp cancels an in-flight request when input changes', async () => {
  const localThis = createAppFixture();
  let resolveFetch;

  initializeFixture(localThis, {
    fetch: async () =>
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
  });

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  const submitPromise = localThis.elements.form.listeners.submit({ preventDefault() {} });
  localThis.elements.input.value = 'Changed';
  localThis.elements.input.listeners.input();
  resolveFetch?.({ ok: true, text: async () => 'Yes!' });
  await submitPromise;

  assert.equal(localThis.elements.answerText.textContent, '');
});

test('initializeApp copies share links and reports failures', async () => {
  const localThis = createAppFixture();
  initializeFixture(localThis);

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  await localThis.elements.form.listeners.submit({ preventDefault() {} });

  await localThis.elements.copyButton.listeners.click();
  assert.equal(localThis.copiedText, localThis.elements.shareUrl.value);
  assert.equal(localThis.elements.shareStatus.textContent, 'Link copied.');

  localThis.navigator.clipboard.writeText = async () => {
    throw new Error('denied');
  };
  await localThis.elements.copyButton.listeners.click();
  assert.match(localThis.elements.shareStatus.textContent, /Copy failed/);
  assert.equal(localThis.elements.shareStatus.classList.values.has('error'), true);
});

test('initializeApp allows enabled social links to navigate', async () => {
  const localThis = createAppFixture();
  initializeFixture(localThis);

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  await localThis.elements.form.listeners.submit({ preventDefault() {} });

  const prevented = { value: false };
  localThis.elements.shareXLink.listeners.click({
    preventDefault() {
      prevented.value = true;
    }
  });
  assert.equal(prevented.value, false);
});

test('initializeApp previews the share link and blocks disabled social links', async () => {
  const localThis = createAppFixture();
  initializeFixture(localThis);

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  await localThis.elements.form.listeners.submit({ preventDefault() {} });

  localThis.elements.previewButton.listeners.click();
  assert.equal(localThis.previewHref, localThis.elements.shareUrl.value);

  const prevented = { value: false };
  localThis.elements.shareXLink.attributes['aria-disabled'] = 'true';
  localThis.elements.shareXLink.listeners.click({
    preventDefault() {
      prevented.value = true;
    }
  });
  assert.equal(prevented.value, true);
});

test('initializeApp clears social and replay links without request text', () => {
  const localThis = createAppFixture();
  initializeFixture(localThis);

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  localThis.elements.input.value = '';
  localThis.elements.input.listeners.input();

  assert.equal(localThis.elements.shareUrl.value, '');
  assert.equal(localThis.replayLinks[0].href, '/no');
  assert.equal(localThis.elements.shareXLink.attributes['aria-disabled'], 'true');
});

test('initializeApp selects the share URL on focus and click', () => {
  const localThis = createAppFixture();
  initializeFixture(localThis);

  let selected = false;
  localThis.elements.shareUrl.select = () => {
    selected = true;
  };

  localThis.elements.shareUrl.listeners.focus();
  localThis.elements.shareUrl.listeners.click();
  assert.equal(selected, true);
});

test('initializeApp autoplays shared request parameters', async () => {
  const localThis = createAppFixture({ search: '?request=Hi' });
  let focused = false;
  localThis.elements.input.focus = () => {
    focused = true;
  };
  initializeFixture(localThis, {
    autoplayRequestImpl: async ({ text, clearInput, appendChar, notifyInput, submitForm, wait }) => {
      clearInput();
      for (const char of text) {
        appendChar(char);
        notifyInput();
        await wait(0);
      }
      submitForm();
    },
    fetchResponse: {
      ok: true,
      async text() {
        return 'Yes!';
      }
    }
  });

  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  assert.equal(focused, true);
  assert.equal(localThis.elements.input.value, 'Hi');
  assert.equal(localThis.elements.answerText.textContent, 'Yes!');
});

test('initializeAppIfBrowser runs in browser contexts', () => {
  const localThis = createAppFixture();
  const app = initializeAppIfBrowser({
    isBrowserContextImpl: () => true,
    document: localThis.document,
    window: localThis.window,
    navigator: localThis.navigator,
    initializeThemeToggleImpl: () => {},
    applyPageCopyImpl: (mode, root) => {
      root.body.dataset.mode = mode;
      root.querySelector('#replays').replaceChildren(...localThis.replayLinks);
    },
    fetch: async () => ({
      ok: true,
      async text() {
        return 'Yes!';
      }
    })
  });

  assert.equal(app.hasText(), false);
});

test('initializeApp exposes request state getters', async () => {
  const localThis = createAppFixture();
  const app = initializeFixture(localThis, {
    submitAnswerRequestImpl: async ({ onStart }) => {
      onStart({ abort() {} });
      await new Promise(() => {});
    }
  });

  localThis.elements.input.value = 'Can I?';
  localThis.elements.input.listeners.input();
  localThis.elements.form.listeners.submit({ preventDefault() {} });

  assert.equal(app.isLoading, true);
  assert.equal(app.requestToken, 1);
});

test('initializeApp ignores empty submits and copy actions', async () => {
  const localThis = createAppFixture();
  initializeFixture(localThis);

  await localThis.elements.form.listeners.submit({ preventDefault() {} });
  await localThis.elements.copyButton.listeners.click();
  await localThis.elements.previewButton.listeners.click();

  assert.equal(localThis.fetchCalls.length, 0);
  assert.equal(localThis.copiedText, null);
  assert.equal(localThis.previewHref, null);
});
