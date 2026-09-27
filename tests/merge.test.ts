import { describe, expect, it } from 'vitest';

import { mergePdfs } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('mergePdfs', () => {
  it('merges two PDFs preserving file and page order', async () => {
    const out = await mergePdfs([await fixture('one-page.pdf'), await fixture('two-page.pdf')]);
    expect(out.pageCount).toBe(3);
    const doc = await inspect(out.bytes);
    expect(doc.getPageCount()).toBe(3);
    expect(out.suggestedName).toBe('one-page-merged.pdf');
  });

  it('merges a single PDF (acts as a rewrite)', async () => {
    const out = await mergePdfs([await fixture('two-page.pdf')]);
    expect(out.pageCount).toBe(2);
  });

  it('handles a large document plus small ones', async () => {
    const out = await mergePdfs([
      await fixture('hundred-page.pdf'),
      await fixture('one-page.pdf'),
      await fixture('mixed-sizes.pdf'),
    ]);
    expect(out.pageCount).toBe(105);
  });

  it('preserves page sizes from mixed-size sources', async () => {
    const out = await mergePdfs([await fixture('mixed-sizes.pdf')]);
    const doc = await inspect(out.bytes);
    const first = doc.getPage(0).getSize();
    const third = doc.getPage(2).getSize();
    expect(Math.round(first.width)).toBe(595);
    expect(third.width).toBe(200);
    expect(third.height).toBe(200);
  });

  it('carries page rotation through a merge', async () => {
    const out = await mergePdfs([await fixture('rotated-pages.pdf')]);
    const doc = await inspect(out.bytes);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
    expect(doc.getPage(3).getRotation().angle).toBe(270);
  });

  it('merges documents containing images', async () => {
    const out = await mergePdfs([await fixture('with-images.pdf'), await fixture('one-page.pdf')]);
    expect(out.pageCount).toBe(3);
  });

  it('rejects an empty input list', async () => {
    await expectPdfError(mergePdfs([]), 'no-input');
  });

  it('rejects when any input is malformed', async () => {
    await expectPdfError(
      mergePdfs([await fixture('one-page.pdf'), await fixture('malformed.pdf')]),
      'malformed',
    );
  });

  it('rejects when any input is encrypted', async () => {
    await expectPdfError(
      mergePdfs([await fixture('one-page.pdf'), await fixture('encrypted.pdf')]),
      'encrypted',
    );
  });

  it('rejects empty files', async () => {
    await expectPdfError(mergePdfs([await fixture('empty.pdf')]), 'empty-file');
  });
});
