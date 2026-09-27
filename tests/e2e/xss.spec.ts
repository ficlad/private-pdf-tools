import { expect, test } from '@playwright/test';

import { downloadBytes, fixturePayload, pdfPageCount, trackViolations } from './helpers';

const HOSTILE_NAME = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>.pdf';

async function assertNotPwned(page: import('@playwright/test').Page): Promise<void> {
  const pwned = await page.evaluate(
    () => (window as unknown as Record<string, unknown>)['__pwned'],
  );
  expect(pwned).toBeUndefined();
  // No element was injected from the hostile string.
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
}

test.describe('XSS resistance', () => {
  test('hostile filenames render as inert text', async ({ page }) => {
    page.on('dialog', () => {
      throw new Error('unexpected dialog opened');
    });

    await page.goto('/merge-pdf/');
    await page
      .locator('#file-input')
      .setInputFiles([
        await fixturePayload('one-page.pdf', { name: HOSTILE_NAME }),
        await fixturePayload('two-page.pdf'),
      ]);

    // The filename must appear as literal text, tags included.
    await expect(page.locator('.file-name').first()).toHaveText(HOSTILE_NAME);
    await assertNotPwned(page);

    // The operation still works, and the offered filename is sanitized.
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/ready below/);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).not.toMatch(/[<>"]/);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    expect(await pdfPageCount(await downloadBytes(download))).toBe(3);
    await assertNotPwned(page);
  });

  test('hostile PDF metadata is processed without script execution', async ({ page }) => {
    // with-metadata.pdf carries <script>/onerror payloads in title, author,
    // subject and keywords (see scripts/generate-fixtures.ts).
    page.on('dialog', () => {
      throw new Error('unexpected dialog opened');
    });
    const violations = await trackViolations(page);

    await page.goto('/extract-pdf-pages/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('with-metadata.pdf')]);
    await expect(page.locator('#thumbs canvas')).toHaveCount(1);
    await page.getByRole('checkbox', { name: 'Page 1' }).check();
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/ready below/);

    await assertNotPwned(page);
    expect(await violations()).toEqual([]);
  });

  test('embedded PDF JavaScript never executes as page JavaScript', async ({ page }) => {
    // Rendering with PDF.js must not evaluate document-level JS (spec §14).
    page.on('dialog', () => {
      throw new Error('unexpected dialog opened');
    });
    await page.goto('/pdf-to-jpg/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('with-metadata.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#downloads li')).toHaveCount(1);
    await assertNotPwned(page);
  });
});
