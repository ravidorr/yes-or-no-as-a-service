import { expect, test } from '@playwright/test';

test('yes page submits and renders the answer', async ({ page }) => {
  await page.goto('/yes');

  const input = page.locator('#request-text');
  const submitButton = page.locator('#submit-button');

  await expect(submitButton).toBeDisabled();

  await input.fill('Can I?');
  await expect(submitButton).toBeEnabled();

  await submitButton.click();
  await expect(page.locator('#response')).toHaveText('Yes!');
  await expect(page.locator('#share-link')).toHaveValue(/\/yes\?request=Can\+I%3F$/);
});

test('no page submits and renders the answer', async ({ page }) => {
  await page.goto('/no');

  await page.locator('#request-text').fill('Can I?');
  await page.locator('#submit-button').click();

  await expect(page.locator('#response')).toHaveText('No!');
  await expect(page.locator('#share-link')).toHaveValue(/\/no\?request=Can\+I%3F$/);
});

test('editing during a request cancels the in-flight response', async ({ page }) => {
  await page.goto('/yes');

  await page.locator('#request-text').fill('Can I?');
  await page.locator('#submit-button').click();
  await page.locator('#request-text').fill('Changed');

  await expect(page.locator('#response')).toBeHidden();
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
  await page.locator('#request-text').fill('Can I?');
  await page.locator('#submit-button').click();
  await page.locator('#copy-url-button').click();

  await expect(page.locator('#share-status')).toHaveText('Copy failed. Select the link manually.');
  await expect(page.locator('#share-link')).toBeFocused();
});

test('social links stay disabled until a share URL exists', async ({ page }) => {
  await page.goto('/yes');

  await expect(page.locator('#share-x-link')).toHaveAttribute('aria-disabled', 'true');

  await page.locator('#request-text').fill('Can I?');
  await page.locator('#submit-button').click();

  await expect(page.locator('#share-x-link')).toHaveAttribute('aria-disabled', 'false');
});

test('shared request query autoplay submits the answer', async ({ page }) => {
  await page.goto('/yes?request=Can%20I%3F');

  await expect(page.locator('#response')).toHaveText('Yes!', { timeout: 10_000 });
});
