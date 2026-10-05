import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  autoplayRequest,
  copyShareLink,
  readAnswerParam,
  readRequestParam,
  REQUEST_TIMEOUT_MS,
  submitAnswerRequest,
  TYPE_DELAY_MS
} from '../public/app-behavior.js';

class MockAbortController {
  constructor() {
    this.signal = { aborted: false };
    this.aborted = false;
  }

  abort() {
    this.aborted = true;
    this.signal.aborted = true;
  }
}

test('readRequestParam returns the request query value', () => {
  assert.equal(readRequestParam('?request=Can+I%3F'), 'Can I?');
  assert.equal(readRequestParam(''), null);
});

test('readAnswerParam returns yes or no from the query string', () => {
  assert.equal(readAnswerParam('?answer=yes'), 'yes');
  assert.equal(readAnswerParam('?answer=no'), 'no');
  assert.equal(readAnswerParam('?answer=maybe'), 'yes');
  assert.equal(readAnswerParam(''), 'yes');
});

test('submitAnswerRequest shows the yes response on success', async () => {
  const localThis = {
    submittedText: 'Can I?',
    current: true,
    successText: null,
    fetchCalls: []
  };

  await submitAnswerRequest({
    answer: 'yes',
    submittedText: localThis.submittedText,
    isCurrentRequest: () => localThis.current,
    fetch: async (url, options) => {
      localThis.fetchCalls.push({ url, options });

      return {
        ok: true,
        async text() {
          return 'Yes!';
        }
      };
    },
    AbortController: MockAbortController,
    setTimeout: () => 1,
    clearTimeout: () => {},
    onSuccess: (text) => {
      localThis.successText = text;
    },
    onTimeout: () => {
      localThis.timedOut = true;
    },
    onUnavailable: () => {
      localThis.unavailable = true;
    }
  });

  assert.equal(localThis.successText, 'Yes!');
  assert.equal(localThis.fetchCalls.length, 1);
  assert.equal(localThis.fetchCalls[0].url, '/api/yes');
  assert.deepEqual(JSON.parse(localThis.fetchCalls[0].options.body), { text: 'Can I?' });
});

test('submitAnswerRequest shows the no response on success', async () => {
  const localThis = {
    submittedText: 'Can I?',
    current: true,
    successText: null,
    fetchCalls: []
  };

  await submitAnswerRequest({
    answer: 'no',
    submittedText: localThis.submittedText,
    isCurrentRequest: () => localThis.current,
    fetch: async (url, options) => {
      localThis.fetchCalls.push({ url, options });

      return {
        ok: true,
        async text() {
          return 'No!';
        }
      };
    },
    AbortController: MockAbortController,
    setTimeout: () => 1,
    clearTimeout: () => {},
    onSuccess: (text) => {
      localThis.successText = text;
    },
    onTimeout: () => {},
    onUnavailable: () => {}
  });

  assert.equal(localThis.successText, 'No!');
  assert.equal(localThis.fetchCalls[0].url, '/api/no');
});

test('submitAnswerRequest shows unavailable when fetch fails', async () => {
  const localThis = {
    current: true,
    unavailable: false
  };

  await submitAnswerRequest({
    answer: 'yes',
    submittedText: 'Can I?',
    isCurrentRequest: () => localThis.current,
    fetch: async () => {
      throw new Error('network down');
    },
    AbortController: MockAbortController,
    setTimeout: () => 1,
    clearTimeout: () => {},
    onSuccess: () => {},
    onTimeout: () => {},
    onUnavailable: () => {
      localThis.unavailable = true;
    }
  });

  assert.equal(localThis.unavailable, true);
});

test('submitAnswerRequest shows timeout when the request aborts after the deadline', async () => {
  const localThis = {
    current: true,
    timedOut: false,
    controller: null,
    timeoutCallback: null
  };

  const submitPromise = submitAnswerRequest({
    answer: 'yes',
    submittedText: 'Can I?',
    isCurrentRequest: () => localThis.current,
    fetch: (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
    setTimeout: (callback, delay) => {
      assert.equal(delay, REQUEST_TIMEOUT_MS);
      localThis.timeoutCallback = callback;
      return 99;
    },
    clearTimeout: () => {},
    onStart: (controller) => {
      localThis.controller = controller;
    },
    onSuccess: () => {},
    onTimeout: () => {
      localThis.timedOut = true;
    },
    onUnavailable: () => {}
  });

  localThis.timeoutCallback();
  await submitPromise;

  assert.equal(localThis.controller.signal.aborted, true);
  assert.equal(localThis.timedOut, true);
});

test('submitAnswerRequest ignores aborts that are not caused by timeout', async () => {
  const localThis = {
    current: true,
    timedOut: false,
    unavailable: false,
    controller: null
  };

  await submitAnswerRequest({
    answer: 'yes',
    submittedText: 'Can I?',
    isCurrentRequest: () => localThis.current,
    fetch: async (_url, options) => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      options.signal.aborted = true;
      throw error;
    },
    AbortController: MockAbortController,
    setTimeout: () => 1,
    clearTimeout: () => {},
    onStart: (controller) => {
      localThis.controller = controller;
    },
    onSuccess: () => {},
    onTimeout: () => {
      localThis.timedOut = true;
    },
    onUnavailable: () => {
      localThis.unavailable = true;
    }
  });

  assert.equal(localThis.timedOut, false);
  assert.equal(localThis.unavailable, false);
});

test('submitAnswerRequest skips stale responses when the request is no longer current', async () => {
  const localThis = {
    current: false,
    successText: null,
    unavailable: false
  };

  await submitAnswerRequest({
    answer: 'yes',
    submittedText: 'Can I?',
    isCurrentRequest: () => localThis.current,
    fetch: async () => ({
      ok: true,
      async text() {
        return 'Yes!';
      }
    }),
    AbortController: MockAbortController,
    setTimeout: () => 1,
    clearTimeout: () => {},
    onSuccess: (text) => {
      localThis.successText = text;
    },
    onTimeout: () => {},
    onUnavailable: () => {
      localThis.unavailable = true;
    }
  });

  assert.equal(localThis.successText, null);
  assert.equal(localThis.unavailable, false);
});

test('readRequestParam supports autoplay entry from shared links', () => {
  const requestParam = readRequestParam('?request=Can+I+have+a+pony%3F&answer=no');

  assert.equal(requestParam, 'Can I have a pony?');
  assert.equal(readAnswerParam('?request=Can+I+have+a+pony%3F&answer=no'), 'no');
});

test('copyShareLink reports success when clipboard write succeeds', async () => {
  const localThis = {
    copiedText: null,
    success: false,
    failed: false
  };

  await copyShareLink({
    text: 'https://example.test/?answer=yes&request=hi',
    writeText: async (text) => {
      localThis.copiedText = text;
    },
    onSuccess: () => {
      localThis.success = true;
    },
    onError: () => {
      localThis.failed = true;
    }
  });

  assert.equal(localThis.copiedText, 'https://example.test/?answer=yes&request=hi');
  assert.equal(localThis.success, true);
  assert.equal(localThis.failed, false);
});

test('copyShareLink reports failure when clipboard write throws', async () => {
  const localThis = {
    success: false,
    failed: false
  };

  await copyShareLink({
    text: 'https://example.test/?answer=yes&request=hi',
    writeText: async () => {
      throw new Error('denied');
    },
    onSuccess: () => {
      localThis.success = true;
    },
    onError: () => {
      localThis.failed = true;
    }
  });

  assert.equal(localThis.success, false);
  assert.equal(localThis.failed, true);
});

test('autoplayRequest types each character, notifies input, and submits', async () => {
  const localThis = {
    value: '',
    inputEvents: 0,
    submitted: false,
    waits: []
  };

  await autoplayRequest({
    text: 'No?',
    clearInput: () => {
      localThis.value = '';
    },
    appendChar: (char) => {
      localThis.value += char;
    },
    notifyInput: () => {
      localThis.inputEvents += 1;
    },
    submitForm: () => {
      localThis.submitted = true;
    },
    wait: async (delayMs) => {
      localThis.waits.push(delayMs);
    },
    delayMs: TYPE_DELAY_MS
  });

  assert.equal(localThis.value, 'No?');
  assert.equal(localThis.inputEvents, 3);
  assert.deepEqual(localThis.waits, [TYPE_DELAY_MS, TYPE_DELAY_MS, TYPE_DELAY_MS]);
  assert.equal(localThis.submitted, true);
});
