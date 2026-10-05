export const REQUEST_TIMEOUT_MS = 8000;
export const TYPE_DELAY_MS = 45;
export const MAX_AUTOPLAY_ANIMATION_LENGTH = 100;

export function readRequestParam(search) {
  return new URLSearchParams(search).get('request');
}

export async function submitAnswerRequest({
  answer,
  submittedText,
  isCurrentRequest,
  fetch: fetchFn,
  AbortController: AbortControllerImpl = globalThis.AbortController,
  setTimeout: setTimeoutFn = globalThis.setTimeout,
  clearTimeout: clearTimeoutFn = globalThis.clearTimeout,
  timeoutMs = REQUEST_TIMEOUT_MS,
  onStart,
  onSuccess,
  onTimeout,
  onUnavailable
}) {
  const controller = new AbortControllerImpl();
  let timedOut = false;

  onStart?.(controller);

  const timeoutId = setTimeoutFn(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const result = await fetchFn(`/api/${answer}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        text: submittedText
      }),
      signal: controller.signal
    });

    if (!result.ok) {
      throw new Error(`Request failed: ${result.status}`);
    }

    const responseText = await result.text();

    if (isCurrentRequest()) {
      onSuccess(responseText);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      if (timedOut && isCurrentRequest()) {
        onTimeout();
      }

      return;
    }

    if (isCurrentRequest()) {
      onUnavailable();
    }
  } finally {
    clearTimeoutFn(timeoutId);
  }
}

export async function copyShareLink({
  text,
  writeText,
  onSuccess,
  onError
}) {
  try {
    await writeText(text);
    onSuccess();
  } catch {
    onError();
  }
}

export async function autoplayRequest({
  text,
  clearInput,
  appendChar,
  notifyInput,
  submitForm,
  wait,
  delayMs = TYPE_DELAY_MS,
  maxAnimationLength = MAX_AUTOPLAY_ANIMATION_LENGTH
}) {
  clearInput();

  if (text.length > maxAnimationLength) {
    appendChar(text);
    notifyInput();
    submitForm();
    return;
  }

  for (const char of text) {
    appendChar(char);
    notifyInput();
    await wait(delayMs);
  }

  submitForm();
}
