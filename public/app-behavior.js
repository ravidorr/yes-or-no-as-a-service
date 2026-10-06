export const REQUEST_TIMEOUT_MS = 8000;
export const TYPE_DELAY_MS = 45;
export const MAX_AUTOPLAY_ANIMATION_LENGTH = 100;

export function readRequestParam(search) {
  return new URLSearchParams(search).get('request');
}

// Classifies how a shared link was opened without exposing the referrer URL,
// which can carry question text.
export function resolveEntryPoint(referrer, origin) {
  try {
    return new URL(referrer).origin === origin ? 'in_app' : 'external';
  } catch {
    return 'external';
  }
}

// Sends a Pendo Track Event when the Pendo agent is on the page. YESorNOaaS does
// not load the agent, so this is a no-op unless a deployment installs it.
export function trackEvent(pendo, eventName, properties) {
  if (typeof pendo?.track !== 'function') {
    return;
  }

  try {
    pendo.track(eventName, properties);
  } catch {
    // Analytics failures must never affect the answer or share flows.
  }
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
  let httpStatus = null;

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
      httpStatus = result.status;
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
      // null means no HTTP response, for example a network failure.
      onUnavailable(httpStatus);
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
  } catch (error) {
    onError(error);
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
