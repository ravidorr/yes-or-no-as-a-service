import { expect, test } from '@playwright/test';
import { REQUEST_TIMEOUT_MS } from '../public/app-behavior.js';

const initialStates = [
  ['/yes', 'YES', 'Ask a yes/no question and get a Yes! response'],
  ['/no', 'NO', 'Ask a yes/no question and get a No! response'],
  [
    '/random',
    'RANDOM',
    'Ask a yes/no question and get a random Yes! or No! response'
  ]
];

for (const [path, mode, heading] of initialStates) {
  test(`${path} starts with the specified accessible form state`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText(mode, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('#submit')).toBeDisabled();
    await expect(page.locator('#empty')).toBeVisible();
    await expect(page.locator('#status')).toBeHidden();
    await expect(page.locator('#error')).toBeHidden();
    await expect(page.locator('#answer')).toBeHidden();
    await expect(page.locator('#share')).toBeHidden();
  });
}

test('404 page links to answer pages and toggles its theme', async ({ page }) => {
  await page.goto('/not-found');

  await expect(page).toHaveTitle('YESorNOaaS - Page not found');
  await expect(page.locator('body')).toHaveAttribute('data-mode', '404');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('link', { name: /Yes! page/ }).click();
  await expect(page).toHaveURL(/\/yes$/);
});

test('yes page submits and renders the answer', async ({ page }) => {
  await page.goto('/yes');

  const input = page.locator('#request');
  const submitButton = page.locator('#submit');

  await expect(submitButton).toBeDisabled();

  await input.fill('Can I?');
  await expect(submitButton).toBeEnabled();

  await submitButton.click();
  await expect(page.locator('#answer-text')).toHaveText('Yes!');
  await expect(page.locator('#share-url')).toHaveValue(/\/yes\?request=Can\+I%3F$/);
});

test('no page submits and renders the answer', async ({ page }) => {
  await page.goto('/no');

  await page.locator('#request').fill('Can I?');
  await page.locator('#submit').click();

  await expect(page.locator('#answer-text')).toHaveText('No!');
  await expect(page.locator('#share-url')).toHaveValue(/\/no\?request=Can\+I%3F$/);
});

test('random result reveals its concrete answer and matching share URL', async ({ page }) => {
  await page.goto('/random');
  await page.locator('#request').fill('Can I?');
  await page.locator('#submit').click();
  await expect(page.locator('#answer')).toBeVisible();
  await expect(page.locator('#answer-text')).toHaveText(/^(Yes!|No!)$/);
  await expect(page.locator('#share')).toBeVisible();
  await expect(page.locator('#share-url')).toHaveValue(/\/random\?request=Can\+I%3F$/);
});

test('editing during a request cancels the in-flight response', async ({ page }) => {
  await page.goto('/yes');

  await page.locator('#request').fill('Can I?');
  await page.locator('#submit').click();
  await page.locator('#request').fill('Changed');

  await expect(page.locator('#answer')).toBeHidden();
});

test('copy failure focuses the share link for manual copy', async ({ page, context }) => {
  await context.grantPermissions([]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('denied');
        }
      }
    });
  });

  await page.goto('/yes');
  await page.locator('#request').fill('Can I?');
  await page.locator('#submit').click();
  await page.locator('#copy').click();

  await expect(page.locator('#share-status')).toHaveText('Copy failed. Select the link manually.');
  await expect(page.locator('#share-url')).toBeFocused();
});

test('social links stay disabled until a share URL exists', async ({ page }) => {
  await page.goto('/yes');

  await expect(page.locator('#share-x-link')).toHaveAttribute('aria-disabled', 'true');

  await page.locator('#request').fill('Can I?');
  await page.locator('#submit').click();

  await expect(page.locator('#share-x-link')).toHaveAttribute('aria-disabled', 'false');
});

test('shared request query autoplay submits the answer', async ({ page }) => {
  await page.goto('/yes?request=Can%20I%3F');

  await expect(page.locator('#answer-text')).toHaveText('Yes!', { timeout: 10_000 });
});

test('theme toggle persists a user-selected dark theme', async ({ page }) => {
  await page.goto('/yes');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the mobile question form stacks its input and Ask control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/yes');
  const input = page.locator('#request');
  const button = page.locator('#submit');
  expect((await button.boundingBox()).y).toBeGreaterThan((await input.boundingBox()).y);
});

test('share URL selects all text on focus', async ({ page }) => {
  await page.goto('/yes');
  await page.locator('#request').fill('Can I?');
  await page.locator('#submit').click();
  await expect(page.locator('#share-url')).not.toHaveValue('');
  await page.locator('#share-url').click();
  const value = await page.locator('#share-url').inputValue();
  await expect(page.locator('#share-url')).toHaveJSProperty('selectionStart', 0);
  await expect(page.locator('#share-url')).toHaveJSProperty('selectionEnd', value.length);
});

test('timeout shows the error slot with specified copy', async ({ page }) => {
  test.setTimeout(REQUEST_TIMEOUT_MS + 10_000);

  const hangRoute = async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, REQUEST_TIMEOUT_MS + 2_000);
    });
    await route.fulfill({ status: 200, body: 'Yes!' });
  };

  await page.route('**/api/yes', hangRoute);

  try {
    await page.goto('/yes');
    await page.locator('#request').fill('Can I?');
    await page.locator('#submit').click();

    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#error')).toBeVisible({ timeout: REQUEST_TIMEOUT_MS + 5_000 });
    await expect(page.getByText('Timed out waiting for an answer.')).toBeVisible();
    await expect(page.getByText('YESorNOaaS did not respond in time. Check your connection and ask again. Your question is kept.')).toBeVisible();
    await expect(page.locator('#request')).toHaveValue('Can I?');
  } finally {
    await page.unroute('**/api/yes', hangRoute);
  }
});

test('keyboard path reaches primary controls', async ({ page }) => {
  await page.goto('/yes');
  await page.keyboard.press('Tab');
  await expect(page.locator('#theme-toggle')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#request')).toBeFocused();
});
