import { describe, expect, it } from 'vitest';

import { deletePages } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('deletePages', () => {
  it('deletes selected pages and keeps the rest in order', async () => {
    const out = await deletePages(await fixture('mixed-sizes.pdf'), [0, 2]);
    expect(out.pageCount).toBe(2);
    const doc = await inspect(out.bytes);
    // Remaining pages: original #1 (letter) and #3 (landscape A4).
    expect(doc.getPage(0).getSize().width).toBe(612);
    expect(doc.getPage(1).getSize().width).toBeCloseTo(841.89, 1);
    expect(out.suggestedName).toBe('mixed-sizes-edited.pdf');
  });

  it('handles duplicate indexes in the selection', async () => {
    const out = await deletePages(await fixture('two-page.pdf'), [1, 1]);
    expect(out.pageCount).toBe(1);
  });

  it('deletes many pages from a large document', async () => {
    const indexes = Array.from({ length: 99 }, (_, i) => i + 1);
    const out = await deletePages(await fixture('hundred-page.pdf'), indexes);
    expect(out.pageCount).toBe(1);
  });

  it('refuses to delete every page', async () => {
    await expectPdfError(deletePages(await fixture('two-page.pdf'), [0, 1]), 'invalid-options');
    await expectPdfError(deletePages(await fixture('one-page.pdf'), [0]), 'invalid-options');
  });

  it('rejects an empty selection', async () => {
    await expectPdfError(deletePages(await fixture('two-page.pdf'), []), 'invalid-options');
  });

  it('rejects out-of-range indexes', async () => {
    await expectPdfError(deletePages(await fixture('two-page.pdf'), [5]), 'page-out-of-range');
  });

  it('rejects malformed input', async () => {
    await expectPdfError(deletePages(await fixture('malformed.pdf'), [0]), 'malformed');
  });
});
