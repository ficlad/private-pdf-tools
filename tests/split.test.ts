import { describe, expect, it } from 'vitest';

import { splitPdf } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('splitPdf', () => {
  it('splits every N pages, last chunk short', async () => {
    const outs = await splitPdf(await fixture('hundred-page.pdf'), {
      mode: 'every',
      pagesPerChunk: 30,
    });
    expect(outs.map((o) => o.pageCount)).toEqual([30, 30, 30, 10]);
    expect(outs[0]?.suggestedName).toBe('hundred-page-part-1.pdf');
    expect(outs[3]?.suggestedName).toBe('hundred-page-part-4.pdf');
  });

  it('splits a one-page PDF into a single chunk', async () => {
    const outs = await splitPdf(await fixture('one-page.pdf'), {
      mode: 'every',
      pagesPerChunk: 5,
    });
    expect(outs).toHaveLength(1);
    expect(outs[0]?.pageCount).toBe(1);
  });

  it('splits by explicit ranges, allowing overlap', async () => {
    const outs = await splitPdf(await fixture('mixed-sizes.pdf'), {
      mode: 'ranges',
      ranges: [
        { from: 0, to: 1 },
        { from: 1, to: 3 },
      ],
    });
    expect(outs.map((o) => o.pageCount)).toEqual([2, 3]);
    const second = await inspect(outs[1]?.bytes ?? new Uint8Array());
    expect(second.getPage(2).getSize().width).toBeCloseTo(841.89, 1);
  });

  it('rejects an out-of-range range', async () => {
    await expectPdfError(
      splitPdf(await fixture('two-page.pdf'), { mode: 'ranges', ranges: [{ from: 0, to: 2 }] }),
      'page-out-of-range',
    );
  });

  it('rejects a backwards range', async () => {
    await expectPdfError(
      splitPdf(await fixture('two-page.pdf'), { mode: 'ranges', ranges: [{ from: 1, to: 0 }] }),
      'invalid-options',
    );
  });

  it('rejects an empty range list', async () => {
    await expectPdfError(
      splitPdf(await fixture('two-page.pdf'), { mode: 'ranges', ranges: [] }),
      'invalid-options',
    );
  });

  it('rejects a non-positive chunk size', async () => {
    await expectPdfError(
      splitPdf(await fixture('two-page.pdf'), { mode: 'every', pagesPerChunk: 0 }),
      'invalid-options',
    );
  });

  it('rejects malformed input', async () => {
    await expectPdfError(
      splitPdf(await fixture('malformed.pdf'), { mode: 'every', pagesPerChunk: 1 }),
      'malformed',
    );
  });

  it('rejects a truncated file', async () => {
    await expectPdfError(
      splitPdf(await fixture('truncated.pdf'), { mode: 'every', pagesPerChunk: 1 }),
      'malformed',
    );
  });
});
