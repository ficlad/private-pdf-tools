import { describe, expect, it } from 'vitest';

import { addPageNumbers, type PageNumberPosition } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('addPageNumbers', () => {
  it('stamps numbers on every page and keeps the document intact', async () => {
    const out = await addPageNumbers(await fixture('hundred-page.pdf'));
    expect(out.pageCount).toBe(100);
    expect(out.suggestedName).toBe('hundred-page-numbered.pdf');
    const doc = await inspect(out.bytes);
    expect(doc.getPageCount()).toBe(100);
  });

  it('supports every position preset on mixed page sizes', async () => {
    for (const position of [
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'top-left',
      'top-center',
      'top-right',
    ] as const) {
      const out = await addPageNumbers(await fixture('mixed-sizes.pdf'), { position });
      expect(out.pageCount).toBe(4);
    }
  });

  it('supports formats and custom start', async () => {
    const out = await addPageNumbers(await fixture('two-page.pdf'), {
      format: 'page-n-of-total',
      startAt: 5,
    });
    expect(out.pageCount).toBe(2);
  });

  it('grows the file (something was actually drawn)', async () => {
    const input = await fixture('one-page.pdf');
    const out = await addPageNumbers(input, { format: 'page-n-of-total' });
    expect(out.bytes.length).toBeGreaterThan(input.bytes.length);
  });

  it('works on rotated pages (documented placement limitation)', async () => {
    const out = await addPageNumbers(await fixture('rotated-pages.pdf'));
    expect(out.pageCount).toBe(4);
  });

  it('rejects invalid options', async () => {
    const input = await fixture('one-page.pdf');
    await expectPdfError(
      addPageNumbers(input, { position: 'middle' as PageNumberPosition }),
      'invalid-options',
    );
    await expectPdfError(addPageNumbers(input, { startAt: -1 }), 'invalid-options');
    await expectPdfError(addPageNumbers(input, { startAt: 1.5 }), 'invalid-options');
    await expectPdfError(addPageNumbers(input, { margin: -5 }), 'invalid-options');
    await expectPdfError(addPageNumbers(input, { fontSize: 500 }), 'invalid-options');
  });

  it('rejects malformed and encrypted input', async () => {
    await expectPdfError(addPageNumbers(await fixture('malformed.pdf')), 'malformed');
    await expectPdfError(addPageNumbers(await fixture('encrypted.pdf')), 'encrypted');
  });
});
