import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

import { downloadBytes, fixturePayload, pdfPageCount } from './helpers';

test.describe('add page numbers', () => {
  test('stamps numbers with chosen options', async ({ page }) => {
    await page.goto('/add-page-numbers/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('two-page.pdf')]);
    await page.locator('#position').selectOption('top-right');
    await page.locator('#format').selectOption('page-n-of-total');
    await page.locator('#start-at').fill('5');
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/ready below/);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('two-page-numbered.pdf');
    expect(await pdfPageCount(await downloadBytes(download))).toBe(2);
  });
});

test.describe('watermark', () => {
  test('adds a watermark and validates empty text', async ({ page }) => {
    await page.goto('/watermark-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('one-page.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/Enter the watermark text/);

    await page.locator('#wm-text').fill('DRAFT');
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/ready below/);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('one-page-watermarked.pdf');
    expect(await pdfPageCount(await downloadBytes(download))).toBe(1);
  });
});

test.describe('crop', () => {
  test('sets the crop box from typed insets', async ({ page }) => {
    await page.goto('/crop-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('one-page.pdf')]);
    await expect(page.locator('#thumbs canvas')).toHaveCount(1);
    await page.locator('#crop-top').fill('50');
    await page.locator('#crop-left').fill('30');
    await page.locator('#run').click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const bytes = await downloadBytes(await downloadPromise);
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    const crop = doc.getPage(0).getCropBox();
    expect(crop.x).toBeCloseTo(30, 1);
    expect(crop.height).toBeCloseTo(841.89 - 50, 1);
  });
});

test.describe('change page size', () => {
  test('scales pages to Letter', async ({ page }) => {
    await page.goto('/resize-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('mixed-sizes.pdf')]);
    await page.locator('#size-preset').selectOption('letter');
    await page.locator('#run').click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const bytes = await downloadBytes(await downloadPromise);
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    for (const pdfPage of doc.getPages()) {
      expect(pdfPage.getSize()).toEqual({ width: 612, height: 792 });
    }
  });
});

test.describe('edit metadata', () => {
  test('shows hostile metadata inert and saves edits', async ({ page }) => {
    page.on('dialog', () => {
      throw new Error('unexpected dialog opened');
    });
    await page.goto('/edit-pdf-metadata/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('with-metadata.pdf')]);

    // Hostile values appear as inert input values / text, unexecuted.
    await expect(page.locator('#meta-title')).toHaveValue(
      'Fixture <script>alert("title")</script>',
    );
    await expect(page.locator('#meta-author')).toHaveValue('"><img src=x onerror=alert(1)>');
    await expect(page.locator('img[src="x"]')).toHaveCount(0);

    await page.locator('#meta-title').fill('Cleaned title');
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/ready below/);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const bytes = await downloadBytes(await downloadPromise);
    const doc = await PDFDocument.load(new Uint8Array(bytes), { updateMetadata: false });
    expect(doc.getTitle()).toBe('Cleaned title');
  });
});

test.describe('grayscale', () => {
  test('produces a rasterized grayscale PDF with the same page count', async ({ page }) => {
    await page.goto('/grayscale-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('two-page.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/no longer selectable/);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('two-page-grayscale.pdf');
    const bytes = await downloadBytes(download);
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    expect(doc.getPageCount()).toBe(2);
    // Page size preserved in points (A4).
    expect(doc.getPage(0).getSize().width).toBeCloseTo(595.28, 0);
  });
});

test.describe('flatten', () => {
  test('flattens a form via the UI', async ({ page }) => {
    await page.goto('/flatten-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('with-form.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/2 form fields were flattened/);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const bytes = await downloadBytes(await downloadPromise);
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    expect(doc.getForm().getFields()).toHaveLength(0);
  });
});

test.describe('compress', () => {
  test('lossless mode shrinks a bloated PDF and reports sizes', async ({ page }) => {
    await page.goto('/compress-pdf/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('uncompressed.pdf')]);
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/smaller/);
    await expect(page.locator('#status')).toHaveText(/→/); // before → after shown

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloads a').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('uncompressed-compressed.pdf');
    expect(await pdfPageCount(await downloadBytes(download))).toBe(10);
  });

  test('raster mode is labeled with its trade-off and works', async ({ page }) => {
    await page.goto('/compress-pdf/');
    await expect(page.locator('main')).toContainText(/text stops being selectable/i);
    await page.locator('#file-input').setInputFiles([await fixturePayload('one-page.pdf')]);
    await page.locator('input[name="compress-mode"][value="raster"]').check();
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText(/no longer selectable/);
    await expect(page.locator('#downloads li')).toHaveCount(1);
  });
});

test.describe('PDF information', () => {
  test('shows document facts with hostile metadata rendered inert', async ({ page }) => {
    page.on('dialog', () => {
      throw new Error('unexpected dialog opened');
    });
    await page.goto('/pdf-info/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('with-metadata.pdf')]);

    const info = page.locator('#info');
    await expect(info).toContainText('PDF version');
    await expect(info).toContainText('Fixture <script>alert("title")</script>'); // literal text
    await expect(info).toContainText('Encrypted');
    await expect(info.locator('script')).toHaveCount(0);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });

  test('flags an encrypted PDF', async ({ page }) => {
    await page.goto('/pdf-info/');
    await page.locator('#file-input').setInputFiles([await fixturePayload('encrypted.pdf')]);
    await expect(page.locator('#info')).toContainText('Yes (password-protected)');
    await expect(page.locator('#info')).toContainText('not shown: the document is encrypted');
  });
});
