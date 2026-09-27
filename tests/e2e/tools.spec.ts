import { expect, test } from '@playwright/test';

import { downloadBytes, fixturePayload, pdfPageCount, pdfPageRotation } from './helpers';

test.describe('merge', () => {
  test('merges two PDFs via the UI into a 3-page download', async ({ page }) => {
    await page.goto('/merge-pdf/');
    await page
      .locator('#file-input')
      .setInputFiles([await fixturePayload('one-page.pdf'), await fixturePayload('two-page.pdf')]);
    await expect(page.locator('#file-list li')).toHaveCount(2);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/ready below/);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: /Download one-page-merged\.pdf/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('one-page-merged.pdf');
    expect(await pdfPageCount(await downloadBytes(download))).toBe(3);
  });
});

test.describe('split', () => {
  test('splits a 4-page PDF every 3 pages into 3+1', async ({ page }) => {
    await page.goto('/split-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('mixed-sizes.pdf')]);
    await page.locator('#every-n').fill('3');
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/2 files are ready/);
    await expect(page.locator('#downloads li')).toHaveCount(2);

    const expectedCounts = [3, 1];
    for (const [index, expected] of expectedCounts.entries()) {
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#downloads a').nth(index).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(`mixed-sizes-part-${String(index + 1)}.pdf`);
      expect(await pdfPageCount(await downloadBytes(download))).toBe(expected);
    }
  });

  test('splits by page ranges typed by the user', async ({ page }) => {
    await page.goto('/split-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('mixed-sizes.pdf')]);
    await page.locator('input[name="mode"][value="ranges"]').check();
    await page.locator('#ranges').fill('1-2, 4');
    await page.locator('#run').click();
    await expect(page.locator('#downloads li')).toHaveCount(2);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').nth(1).click();
    expect(await pdfPageCount(await downloadBytes(await downloadPromise))).toBe(1);
  });
});

test.describe('extract', () => {
  test('extracts a page chosen on the thumbnail grid', async ({ page }) => {
    await page.goto('/extract-pdf-pages/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('two-page.pdf')]);
    // Thumbnails are rendered with PDF.js before the tool becomes runnable.
    await expect(page.locator('#thumbs canvas')).toHaveCount(2);
    await page.getByRole('checkbox', { name: 'Page 2' }).check();
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/ready below/);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('two-page-pages.pdf');
    expect(await pdfPageCount(await downloadBytes(download))).toBe(1);
  });

  test('refuses to run with no pages selected', async ({ page }) => {
    await page.goto('/extract-pdf-pages/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('two-page.pdf')]);
    await expect(page.locator('#thumbs canvas')).toHaveCount(2);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/Select at least one page/);
    await expect(page.locator('#downloads li')).toHaveCount(0);
  });
});

test.describe('rotate', () => {
  test('rotates all pages by 90 degrees', async ({ page }) => {
    await page.goto('/rotate-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('one-page.pdf')]);
    await expect(page.locator('#thumbs canvas')).toHaveCount(1);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/ready below/);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const bytes = await downloadBytes(await downloadPromise);
    expect(await pdfPageRotation(bytes, 0)).toBe(90);
  });

  test('rotates only a selected page by 180 degrees', async ({ page }) => {
    await page.goto('/rotate-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('two-page.pdf')]);
    await expect(page.locator('#thumbs canvas')).toHaveCount(2);
    await page.locator('input[name="angle"][value="180"]').check();
    await page.getByRole('checkbox', { name: 'Page 2' }).check();
    await page.locator('#run').click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const bytes = await downloadBytes(await downloadPromise);
    expect(await pdfPageRotation(bytes, 0)).toBe(0);
    expect(await pdfPageRotation(bytes, 1)).toBe(180);
  });
});

test.describe('PDF to images', () => {
  test('exports each page as a decodable PNG', async ({ page }) => {
    await page.goto('/pdf-to-jpg/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('two-page.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/2 images are ready/);
    await expect(page.locator('#downloads li')).toHaveCount(2);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('two-page-page-1.png');

    const bytes = await downloadBytes(download);
    // PNG magic bytes.
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // Prove the browser can decode it: draw it back into an Image element.
    const dimensions = await page.evaluate(async (base64) => {
      const binary = atob(base64);
      const data = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
      const blob = new Blob([data], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        return { width: image.naturalWidth, height: image.naturalHeight };
      } finally {
        URL.revokeObjectURL(url);
      }
    }, bytes.toString('base64'));
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
    // A4 at scale 2 ≈ 1191×1684.
    expect(dimensions.width).toBeGreaterThan(1000);
  });

  test('exports JPG when selected', async ({ page }) => {
    await page.goto('/pdf-to-jpg/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('one-page.pdf')]);
    await page.locator('input[name="format"][value="jpeg"]').check();
    await page.locator('#run').click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('one-page-page-1.jpg');
    const bytes = await downloadBytes(download);
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });
});

test.describe('images to PDF', () => {
  test('builds a PDF from a PNG', async ({ page }) => {
    await page.goto('/jpg-to-pdf/');
    await page
      .locator('#file-input')
      .setInputFiles([await fixturePayload('red.png', { mimeType: 'image/png' })]);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/ready below/);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('red.pdf');
    expect(await pdfPageCount(await downloadBytes(download))).toBe(1);
  });
});

test.describe('reorder and reverse', () => {
  test('reverse flips page order', async ({ page }) => {
    await page.goto('/reverse-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('two-page.pdf')]);
    await page.locator('#run').click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('two-page-reversed.pdf');
    expect(await pdfPageCount(await downloadBytes(download))).toBe(2);
  });

  test('reorder applies the thumbnail arrangement', async ({ page }) => {
    // mixed-sizes.pdf: page 3 is the only 200x200 page — move it first.
    await page.goto('/reorder-pdf-pages/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('mixed-sizes.pdf')]);
    await expect(page.locator('#thumbs canvas')).toHaveCount(4);
    await page.getByRole('button', { name: 'Move page 3 earlier' }).click();
    await page.getByRole('button', { name: 'Move page 3 earlier' }).click();
    await page.locator('#run').click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const bytes = await downloadBytes(await downloadPromise);
    expect(await pdfPageCount(bytes)).toBe(4);
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    expect(doc.getPage(0).getSize()).toEqual({ width: 200, height: 200 });
  });
});
