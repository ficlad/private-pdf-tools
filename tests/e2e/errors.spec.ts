import { expect, test } from '@playwright/test';

import { fixturePayload } from './helpers';

test.describe('hostile input handling', () => {
  test('a malformed PDF shows a friendly error, not a crash', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/split-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('malformed.pdf')]);
    await page.locator('#run').click();

    const status = page.locator('#status');
    await expect(status).toHaveText(/could not be processed/);
    await expect(status).toHaveClass(/error/);
    // No stack traces or raw exception text reaches the user (spec §17).
    await expect(status).not.toHaveText(/at .*:\d+|TypeError|undefined/);
    expect(pageErrors).toEqual([]);

    // The page stays usable: a valid file afterwards succeeds.
    await page.locator('#file-input').setInputFiles([await fixturePayload('two-page.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#downloads li')).toHaveCount(2);
  });

  test('an encrypted PDF is reported as password-protected', async ({ page }) => {
    await page.goto('/split-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('encrypted.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/password-protected or encrypted/);
  });

  test('a non-PDF file is rejected with a clear message', async ({ page }) => {
    await page.goto('/split-pdf/');
    await page
      .locator('#file-input')
      .setInputFiles([await fixturePayload('not-a-pdf.bin', { name: 'evil.pdf' })]);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/does not look like a PDF/);
  });
});
