import { expect, test } from '@playwright/test';

import { fixturePayload, trackViolations } from './helpers';

const ALL_PAGES = [
  '/',
  '/merge-pdf/',
  '/split-pdf/',
  '/extract-pdf-pages/',
  '/delete-pdf-pages/',
  '/reorder-pdf-pages/',
  '/rotate-pdf/',
  '/duplicate-pdf-pages/',
  '/reverse-pdf/',
  '/jpg-to-pdf/',
  '/pdf-to-jpg/',
];

test.describe('strict CSP holds on every page', () => {
  test('the CSP header is actually served', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain("'unsafe-eval'");
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['referrer-policy']).toBe('no-referrer');
    expect(response.headers()['strict-transport-security']).toContain('max-age=');
  });

  for (const path of ALL_PAGES) {
    test(`zero CSP violations and console errors on ${path}`, async ({ page }) => {
      const violations = await trackViolations(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await violations()).toEqual([]);
    });
  }

  test('zero CSP violations during a full pdf-lib operation', async ({ page }) => {
    const violations = await trackViolations(page);
    await page.goto('/merge-pdf/');
    await page
      .locator('#file-input')
      .setInputFiles([await fixturePayload('one-page.pdf'), await fixturePayload('two-page.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/ready below/);
    expect(await violations()).toEqual([]);
  });

  test('zero CSP violations during PDF.js rendering (worker + canvas)', async ({ page }) => {
    const violations = await trackViolations(page);
    await page.goto('/pdf-to-jpg/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('with-images.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#downloads li')).toHaveCount(2);
    expect(await violations()).toEqual([]);
  });

  test('no unexpected network requests leave the origin', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:4173')) external.push(request.url());
    });
    await page.goto('/pdf-to-jpg/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('one-page.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#downloads li')).toHaveCount(1);
    expect(external).toEqual([]);
  });
});
