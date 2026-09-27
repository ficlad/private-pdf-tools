import { describe, expect, it } from 'vitest';

import { extractPages } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('extractPages', () => {
  it('extracts pages in the requested order', async () => {
    const out = await extractPages(await fixture('hundred-page.pdf'), [99, 0, 49]);
    expect(out.pageCount).toBe(3);
    expect(out.suggestedName).toBe('hundred-page-pages.pdf');
  });

  it('extracts a single page from a one-page PDF', async () => {
    const out = await extractPages(await fixture('one-page.pdf'), [0]);
    expect(out.pageCount).toBe(1);
  });

  it('allows repeating a page', async () => {
    const out = await extractPages(await fixture('two-page.pdf'), [0, 0, 1]);
    expect(out.pageCount).toBe(3);
  });

  it('keeps size of extracted mixed-size pages', async () => {
    const out = await extractPages(await fixture('mixed-sizes.pdf'), [2]);
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getSize()).toEqual({ width: 200, height: 200 });
  });

  it('keeps rotation of extracted rotated pages', async () => {
    const out = await extractPages(await fixture('rotated-pages.pdf'), [3]);
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getRotation().angle).toBe(270);
  });

  it('rejects an empty selection', async () => {
    await expectPdfError(extractPages(await fixture('two-page.pdf'), []), 'invalid-options');
  });

  it('rejects out-of-range indexes', async () => {
    await expectPdfError(extractPages(await fixture('two-page.pdf'), [2]), 'page-out-of-range');
    await expectPdfError(extractPages(await fixture('two-page.pdf'), [-1]), 'page-out-of-range');
    await expectPdfError(extractPages(await fixture('two-page.pdf'), [0.5]), 'page-out-of-range');
  });

  it('rejects malformed input', async () => {
    await expectPdfError(extractPages(await fixture('malformed.pdf'), [0]), 'malformed');
  });

  it('rejects empty file input', async () => {
    await expectPdfError(extractPages(await fixture('empty.pdf'), [0]), 'empty-file');
  });
});
