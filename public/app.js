import {
  autoplayRequest,
  copyShareLink,
  readAnswerParam,
  readRequestParam,
  submitAnswerRequest
} from './app-behavior.js';
import { buildShareUrl, buildSocialShareLinks } from './share-utils.js';

const form = document.querySelector('#yornaas-form');
const input = document.querySelector('#request-text');
const submitButton = document.querySelector('#submit-button');
const answerYes = document.querySelector('#answer-yes');
const answerNo = document.querySelector('#answer-no');
const statusRow = document.querySelector('#status-row');
const shareRow = document.querySelector('#share-row');
const shareLink = document.querySelector('#share-link');
const copyUrlButton = document.querySelector('#copy-url-button');
const previewLinkButton = document.querySelector('#preview-link-button');
const shareXLink = document.querySelector('#share-x-link');
const shareFacebookLink = document.querySelector('#share-facebook-link');
const shareLinkedInLink = document.querySelector('#share-linkedin-link');
const shareEmailLink = document.querySelector('#share-email-link');
const shareWhatsAppLink = document.querySelector('#share-whatsapp-link');
const shareStatus = document.querySelector('#share-status');
const loading = document.querySelector('#loading');
const status = document.querySelector('#status');
const responseOutput = document.querySelector('#response');
let currentController = null;
let isLoading = false;
let requestToken = 0;

function getSelectedAnswer() {
  return answerNo.checked ? 'no' : 'yes';
}

function hasText() {
  return input.value.trim().length > 0;
}

function updateStatusVisibility() {
  statusRow.hidden = loading.hidden && status.textContent.length === 0;
}

function updateControls() {
  const hasRequest = hasText();
  const shareEnabled = !isLoading && hasRequest && !shareRow.hidden;

  submitButton.disabled = isLoading || !hasRequest;
  copyUrlButton.disabled = !shareEnabled;
  previewLinkButton.disabled = !shareEnabled;
}

function setLoading(loadingState) {
  loading.hidden = !loadingState;
  form.setAttribute('aria-busy', String(loadingState));
  updateControls();
  updateStatusVisibility();
}

function clearStatus() {
  status.textContent = '';
  status.classList.remove('error');
  updateStatusVisibility();
}

function showError(message) {
  status.textContent = message;
  status.classList.add('error');
  updateStatusVisibility();
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
  element.href = href;
  element.setAttribute('aria-disabled', href ? 'false' : 'true');
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

  const links = buildSocialShareLinks(window.location.href, input.value, getSelectedAnswer());

  setSocialLink(shareXLink, links.x);
  setSocialLink(shareFacebookLink, links.facebook);
  setSocialLink(shareLinkedInLink, links.linkedIn);
  setSocialLink(shareEmailLink, links.email);
  setSocialLink(shareWhatsAppLink, links.whatsApp);
}

function syncShareLink() {
  if (!hasText()) {
    shareLink.value = '';
    syncSocialLinks();
    updateControls();
    return;
  }

  shareLink.value = buildShareUrl(window.location.href, input.value, getSelectedAnswer());
  syncSocialLinks();
  updateControls();
}

function hideResult() {
  responseOutput.textContent = '';
  responseOutput.hidden = true;
  shareRow.hidden = true;
  clearShareStatus();
  syncShareLink();
}

function showResult(text) {
  responseOutput.textContent = text;
  responseOutput.hidden = false;
  shareRow.hidden = false;
  syncShareLink();
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

input.addEventListener('input', () => {
  if (isLoading) {
    requestToken += 1;
    currentController?.abort();
    currentController = null;
    isLoading = false;
  }

  if (!hasText()) {
    clearStatus();
  }

  hideResult();
  setLoading(isLoading);
});

for (const control of [answerYes, answerNo]) {
  control.addEventListener('change', () => {
    hideResult();
    syncShareLink();
  });
}

copyUrlButton.addEventListener('click', async () => {
  if (!hasText()) {
    return;
  }

  await copyShareLink({
    text: shareLink.value,
    writeText: (text) => navigator.clipboard.writeText(text),
    onSuccess: () => showShareStatus('Link copied.'),
    onError: () => {
      shareLink.focus();
      shareLink.select();
      showShareError('Copy failed. Select the link manually.');
    }
  });
});

previewLinkButton.addEventListener('click', () => {
  if (!hasText()) {
    return;
  }

  window.location.href = shareLink.value;
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
  const answer = getSelectedAnswer();
  currentController?.abort();
  const token = requestToken + 1;
  requestToken = token;
  isLoading = true;
  setLoading(true);
  clearStatus();
  hideResult();

  await submitAnswerRequest({
    answer,
    submittedText,
    isCurrentRequest: () => token === requestToken && input.value === submittedText && hasText(),
    fetch: fetch.bind(globalThis),
    onStart: (controller) => {
      currentController = controller;
    },
    onSuccess: showResult,
    onTimeout: () => showError('YorNaaS timed out. Try again.'),
    onUnavailable: () => showError('YorNaaS is unavailable. Try again.')
  });

  if (token === requestToken) {
    currentController = null;
    isLoading = false;
    syncShareLink();
    setLoading(false);
  }
});

const requestParam = readRequestParam(window.location.search);
const answerParam = readAnswerParam(window.location.search);

if (answerParam === 'no') {
  answerNo.checked = true;
} else {
  answerYes.checked = true;
}

if (requestParam) {
  autoplayRequest({
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
      form.requestSubmit();
    },
    wait
  });
}
