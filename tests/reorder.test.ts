import { describe, expect, it } from 'vitest';

import { reorderPages } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('reorderPages', () => {
  it('applies a permutation', async () => {
    const out = await reorderPages(await fixture('mixed-sizes.pdf'), [3, 2, 1, 0]);
    expect(out.pageCount).toBe(4);
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getSize().width).toBeCloseTo(841.89, 1); // was last
    expect(doc.getPage(1).getSize()).toEqual({ width: 200, height: 200 });
    expect(out.suggestedName).toBe('mixed-sizes-reordered.pdf');
  });

  it('accepts the identity permutation on one page', async () => {
    const out = await reorderPages(await fixture('one-page.pdf'), [0]);
    expect(out.pageCount).toBe(1);
  });

  it('reorders a 100-page document', async () => {
    const order = Array.from({ length: 100 }, (_, i) => 99 - i);
    const out = await reorderPages(await fixture('hundred-page.pdf'), order);
    expect(out.pageCount).toBe(100);
  });

  it('rejects an order that is too short or too long', async () => {
    await expectPdfError(reorderPages(await fixture('two-page.pdf'), [0]), 'invalid-options');
    await expectPdfError(reorderPages(await fixture('two-page.pdf'), [0, 1, 1]), 'invalid-options');
  });

  it('rejects an order with duplicates', async () => {
    await expectPdfError(reorderPages(await fixture('two-page.pdf'), [0, 0]), 'invalid-options');
  });

  it('rejects out-of-range entries', async () => {
    await expectPdfError(reorderPages(await fixture('two-page.pdf'), [0, 2]), 'page-out-of-range');
  });

  it('rejects malformed input', async () => {
    await expectPdfError(reorderPages(await fixture('malformed.pdf'), [0]), 'malformed');
  });
});
