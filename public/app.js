import {
  autoplayRequest,
  copyShareLink,
  MAX_AUTOPLAY_ANIMATION_LENGTH,
  readRequestParam,
  resolveEntryPoint,
  submitAnswerRequest,
  trackEvent
} from './app-behavior.js';
import { applyPageCopy } from './page-config.js';
import { buildShareUrl, buildSocialShareLinks } from './share-utils.js';
import { initializeThemeToggle } from './theme.js';
import { isBrowserContext } from './runtime-context.js';

const ERROR_COPY = {
  timeout: {
    title: 'Timed out waiting for an answer.',
    body: 'YESorNOaaS did not respond in time. Check your connection and ask again. Your question is kept.'
  },
  unavailable: {
    title: 'YESorNOaaS is unavailable.',
    body: 'Check your connection and ask again. Your question is kept.'
  }
};

export function initializeApp({
  document = globalThis.document,
  window = globalThis.window,
  fetch: fetchImpl = globalThis.fetch.bind(globalThis),
  navigator = globalThis.navigator,
  performance = globalThis.performance,
  applyPageCopyImpl = applyPageCopy,
  initializeThemeToggleImpl = initializeThemeToggle,
  readRequestParamImpl = readRequestParam,
  submitAnswerRequestImpl = submitAnswerRequest,
  autoplayRequestImpl = autoplayRequest,
  copyShareLinkImpl = copyShareLink,
  buildShareUrlImpl = buildShareUrl,
  buildSocialShareLinksImpl = buildSocialShareLinks,
  resolveEntryPointImpl = resolveEntryPoint,
  trackEventImpl = trackEvent
} = {}) {
  applyPageCopyImpl(document.body.dataset.mode, document);

  const form = document.querySelector('#ask-form');
  const body = document.querySelector('.body');
  const input = document.querySelector('#request');
  const submitButton = document.querySelector('#submit');
  const empty = document.querySelector('#empty');
  const status = document.querySelector('#status');
  const errorSlot = document.querySelector('#error');
  const errorTitle = document.querySelector('.error-title');
  const errorText = document.querySelector('.error-text');
  const answerElement = document.querySelector('#answer');
  const answerText = document.querySelector('#answer-text');
  const share = document.querySelector('#share');
  const shareUrl = document.querySelector('#share-url');
  const copyButton = document.querySelector('#copy');
  const previewButton = document.querySelector('#preview');
  const shareXLink = document.querySelector('#share-x-link');
  const shareFacebookLink = document.querySelector('#share-facebook-link');
  const shareLinkedInLink = document.querySelector('#share-linkedin-link');
  const shareEmailLink = document.querySelector('#share-email-link');
  const shareWhatsAppLink = document.querySelector('#share-whatsapp-link');
  const shareStatus = document.querySelector('#share-status');
  const replayLinks = document.querySelectorAll('.replays a');
  const answer = document.body.dataset.mode;
  let currentController = null;
  let isLoading = false;
  let requestToken = 0;
  let nextSubmissionSource = 'manual';
  let answerSource = null;

  function hasText() {
    return input.value.trim().length > 0;
  }

  function setSlot(state) {
    empty.hidden = state !== 'empty';
    status.hidden = state !== 'loading';
    errorSlot.hidden = state !== 'error';
    answerElement.hidden = state !== 'answer';
    body.dataset.state = state === 'answer' ? 'answered' : 'initial';
  }

  function updateControls() {
    const hasRequest = hasText();
    const shareEnabled = !isLoading && hasRequest && !share.hidden;

    submitButton.disabled = isLoading || !hasRequest;
    copyButton.disabled = !shareEnabled;
    previewButton.disabled = !shareEnabled;
  }

  function setLoading(loadingState) {
    isLoading = loadingState;
    form.setAttribute('aria-busy', String(loadingState));

    if (loadingState) {
      setSlot('loading');
    } else if (answerElement.hidden && errorSlot.hidden) {
      setSlot('empty');
    }

    updateControls();
  }

  function clearShareStatus() {
    shareStatus.textContent = '';
    shareStatus.classList.remove('error');
  }

  function showShareStatus(message) {
    shareStatus.textContent = message;
    shareStatus.classList.remove('error');
  }

  function showShareError(message) {
    shareStatus.textContent = message;
    shareStatus.classList.add('error');
  }

  function setSocialLink(element, href) {
    element.href = href || '#';
    element.setAttribute('aria-disabled', href ? 'false' : 'true');
  }

  function syncReplayLinks() {
    for (const link of replayLinks) {
      const replayMode = link.dataset.replayMode;

      if (!hasText()) {
        link.href = `/${replayMode}`;
        continue;
      }

      link.href = buildShareUrlImpl(
        `${window.location.origin}/${replayMode}`,
        input.value,
        replayMode
      );
    }
  }

  function syncSocialLinks() {
    if (!hasText()) {
      for (const link of [
        shareXLink,
        shareFacebookLink,
        shareLinkedInLink,
        shareEmailLink,
        shareWhatsAppLink
      ]) {
        setSocialLink(link, '');
      }

      return;
    }

    const links = buildSocialShareLinksImpl(window.location.href, input.value, answer);

    setSocialLink(shareXLink, links.x);
    setSocialLink(shareFacebookLink, links.facebook);
    setSocialLink(shareLinkedInLink, links.linkedIn);
    setSocialLink(shareEmailLink, links.email);
    setSocialLink(shareWhatsAppLink, links.whatsApp);
  }

  function syncShareLink() {
    if (!hasText()) {
      shareUrl.value = '';
      syncSocialLinks();
      syncReplayLinks();
      updateControls();
      return;
    }

    shareUrl.value = buildShareUrlImpl(window.location.href, input.value, answer);
    syncSocialLinks();
    syncReplayLinks();
    updateControls();
  }

  function hideResult() {
    answerText.textContent = '';
    share.hidden = true;
    clearShareStatus();
    setSlot('empty');
    syncShareLink();
  }

  function showError(kind) {
    const copy = ERROR_COPY[kind];
    errorTitle.textContent = copy.title;
    errorText.textContent = copy.body;
    share.hidden = true;
    setSlot('error');
    updateControls();
  }

  function showResult(text) {
    answerElement.dataset.answer = text === 'No!' ? 'no' : 'yes';
    answerText.textContent = text;
    share.hidden = false;
    setSlot('answer');
    syncShareLink();
  }

  // Event properties must never include question text, share URLs, or referrers.
  function track(eventName, properties) {
    trackEventImpl(window.pendo, eventName, properties);
  }

  function trackRequestFailed(errorKind, httpStatus, source) {
    track('answer_request_failed', {
      error_kind: errorKind,
      http_status: httpStatus,
      mode: answer,
      source
    });
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  initializeThemeToggleImpl();

  function selectShareUrl() {
    shareUrl.select();
  }

  shareUrl.addEventListener('focus', selectShareUrl);
  shareUrl.addEventListener('click', selectShareUrl);

  input.addEventListener('input', () => {
    if (isLoading) {
      requestToken += 1;
      currentController?.abort();
      currentController = null;
      isLoading = false;
    }

    hideResult();
    setLoading(isLoading);
  });

  copyButton.addEventListener('click', async () => {
    if (!hasText()) {
      return;
    }

    await copyShareLinkImpl({
      text: shareUrl.value,
      writeText: (text) => navigator.clipboard.writeText(text),
      onSuccess: () => {
        showShareStatus('Link copied.');
        track('share_link_copied', {
          mode: answer,
          answer_result: answerElement.dataset.answer,
          source: answerSource
        });
      },
      onError: (error) => {
        shareUrl.focus();
        shareUrl.select();
        showShareError('Copy failed. Select the link manually.');
        track('share_link_copy_failed', {
          mode: answer,
          clipboard_api_available: Boolean(navigator.clipboard),
          error_name: error instanceof Error ? error.name : 'unknown'
        });
      }
    });
  });

  previewButton.addEventListener('click', () => {
    if (!hasText()) {
      return;
    }

    window.location.href = shareUrl.value;
  });

  for (const link of [
    shareXLink,
    shareFacebookLink,
    shareLinkedInLink,
    shareEmailLink,
    shareWhatsAppLink
  ]) {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
      }
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!hasText()) {
      return;
    }

    const submittedText = input.value;
    const source = nextSubmissionSource;
    currentController?.abort();
    const token = requestToken + 1;
    requestToken = token;
    hideResult();
    isLoading = true;
    setLoading(true);
    const startedAt = performance.now();

    await submitAnswerRequestImpl({
      answer,
      submittedText,
      isCurrentRequest: () =>
        token === requestToken && input.value === submittedText && hasText(),
      fetch: fetchImpl,
      onStart: (controller) => {
        currentController = controller;
      },
      onSuccess: (text) => {
        const responseTimeMs = Math.round(performance.now() - startedAt);

        showResult(text);
        answerSource = source;

        // Typed questions and shared-link replays are separate events, so they
        // never double count.
        if (source === 'shared_link') {
          track('shared_link_replay_completed', {
            mode: answer,
            answer_result: answerElement.dataset.answer,
            request_length: requestParam.length,
            animated: requestParam.length <= MAX_AUTOPLAY_ANIMATION_LENGTH,
            entry_point: resolveEntryPointImpl(document.referrer, window.location.origin)
          });
        } else {
          track('question_answered', {
            mode: answer,
            answer_result: answerElement.dataset.answer,
            request_length: submittedText.length,
            response_time_ms: responseTimeMs
          });
        }
      },
      onTimeout: () => {
        showError('timeout');
        trackRequestFailed('timeout', null, source);
      },
      onUnavailable: (httpStatus) => {
        showError('unavailable');
        trackRequestFailed('unavailable', httpStatus, source);
      }
    });

    if (token === requestToken) {
      currentController = null;
      isLoading = false;
      syncShareLink();
      setLoading(false);
    }
  });

  setSlot('empty');
  updateControls();

  const requestParam = readRequestParamImpl(window.location.search);

  if (requestParam) {
    autoplayRequestImpl({
      text: requestParam,
      clearInput: () => {
        input.value = '';
        input.focus();
      },
      appendChar: (char) => {
        input.value += char;
      },
      notifyInput: () => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
      submitForm: () => {
        // requestSubmit() fires the submit event synchronously, so the handler
        // reads this source before it is reset.
        nextSubmissionSource = 'shared_link';

        try {
          form.requestSubmit();
        } finally {
          nextSubmissionSource = 'manual';
        }
      },
      wait
    });
  }

  return {
    hasText,
    setSlot,
    updateControls,
    setLoading,
    syncShareLink,
    hideResult,
    showError,
    showResult,
    showShareStatus,
    showShareError,
    get requestToken() {
      return requestToken;
    },
    get isLoading() {
      return isLoading;
    }
  };
}

export function initializeAppIfBrowser({ isBrowserContextImpl = isBrowserContext, ...options } = {}) {
  if (isBrowserContextImpl()) {
    return initializeApp(options);
  }

  return null;
}

initializeAppIfBrowser();
