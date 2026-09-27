import { describe, expect, it } from 'vitest';

import { resizePages } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('resizePages', () => {
  it('scales mixed-size pages to A4', async () => {
    const out = await resizePages(await fixture('mixed-sizes.pdf'), {
      target: 'a4',
      mode: 'scale',
    });
    expect(out.suggestedName).toBe('mixed-sizes-resized.pdf');
    const doc = await inspect(out.bytes);
    for (const page of doc.getPages()) {
      expect(page.getSize().width).toBeCloseTo(595.28, 1);
      expect(page.getSize().height).toBeCloseTo(841.89, 1);
    }
  });

  it('resizes the canvas without scaling in canvas mode', async () => {
    const out = await resizePages(await fixture('one-page.pdf'), {
      target: 'letter',
      mode: 'canvas',
    });
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });

  it('accepts custom dimensions', async () => {
    const out = await resizePages(await fixture('two-page.pdf'), {
      target: { width: 300, height: 300 },
      mode: 'scale',
    });
    const doc = await inspect(out.bytes);
    expect(doc.getPage(1).getSize()).toEqual({ width: 300, height: 300 });
  });

  it('handles a 100-page document', async () => {
    const out = await resizePages(await fixture('hundred-page.pdf'), {
      target: 'letter',
      mode: 'scale',
    });
    expect(out.pageCount).toBe(100);
  });

  it('rejects invalid custom dimensions', async () => {
    const input = await fixture('one-page.pdf');
    await expectPdfError(
      resizePages(input, { target: { width: 0, height: 100 }, mode: 'scale' }),
      'invalid-options',
    );
    await expectPdfError(
      resizePages(input, { target: { width: 100, height: 20_000 }, mode: 'scale' }),
      'invalid-options',
    );
    await expectPdfError(
      resizePages(input, { target: { width: Number.NaN, height: 100 }, mode: 'canvas' }),
      'invalid-options',
    );
  });

  it('rejects an unknown mode', async () => {
    await expectPdfError(
      resizePages(await fixture('one-page.pdf'), {
        target: 'a4',
        mode: 'stretch' as 'scale',
      }),
      'invalid-options',
    );
  });

  it('rejects malformed and encrypted input', async () => {
    await expectPdfError(
      resizePages(await fixture('malformed.pdf'), { target: 'a4', mode: 'scale' }),
      'malformed',
    );
    await expectPdfError(
      resizePages(await fixture('encrypted.pdf'), { target: 'a4', mode: 'canvas' }),
      'encrypted',
    );
  });
});
