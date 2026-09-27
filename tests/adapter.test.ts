import { describe, expect, it } from 'vitest';

import { loadPdf } from '../src/pdf/adapter';
import { expectPdfError, fixture } from './helpers';

describe('loadPdf (untrusted input handling)', () => {
  it('loads valid PDFs of various shapes', async () => {
    for (const [name, pages] of [
      ['one-page.pdf', 1],
      ['two-page.pdf', 2],
      ['hundred-page.pdf', 100],
      ['rotated-pages.pdf', 4],
      ['mixed-sizes.pdf', 4],
      ['with-images.pdf', 2],
      ['with-metadata.pdf', 1],
    ] as const) {
      const loaded = await loadPdf(await fixture(name));
      expect(loaded.pageCount).toBe(pages);
    }
  });

  it('rejects an empty file with a typed error', async () => {
    await expectPdfError(loadPdf(await fixture('empty.pdf')), 'empty-file');
  });

  it('rejects non-PDF content with a typed error', async () => {
    await expectPdfError(loadPdf(await fixture('not-a-pdf.bin')), 'not-a-pdf');
  });

  it('rejects a malformed PDF with a typed error', async () => {
    await expectPdfError(loadPdf(await fixture('malformed.pdf')), 'malformed');
  });

  it('rejects a truncated PDF with a typed error', async () => {
    await expectPdfError(loadPdf(await fixture('truncated.pdf')), 'malformed');
  });

  it('rejects an encrypted PDF with a typed error', async () => {
    await expectPdfError(loadPdf(await fixture('encrypted.pdf')), 'encrypted');
  });

  it('rejects a zero-page PDF with a typed error', async () => {
    await expectPdfError(loadPdf(await fixture('zero-pages.pdf')), 'zero-pages');
  });

  it('enforces the configured size limit', async () => {
    await expectPdfError(
      loadPdf(await fixture('hundred-page.pdf'), { maxBytes: 1024 }),
      'file-too-large',
    );
  });

  it('sanitizes hostile filenames into the base name', async () => {
    const input = await fixture('one-page.pdf');
    const loaded = await loadPdf({ ...input, name: '../../etc/<script>passwd</script>.pdf' });
    expect(loaded.baseName).not.toContain('/');
    expect(loaded.baseName).not.toContain('<');
    // "</script>" contains a path separator, so the basename is "script>.pdf".
    expect(loaded.baseName).toBe('script');
  });
});
