import { describe, expect, it } from 'vitest';

import { duplicatePages } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('duplicatePages', () => {
  it('duplicates a page right after the original', async () => {
    const out = await duplicatePages(await fixture('mixed-sizes.pdf'), [2]);
    expect(out.pageCount).toBe(5);
    const doc = await inspect(out.bytes);
    expect(doc.getPage(2).getSize()).toEqual({ width: 200, height: 200 });
    expect(doc.getPage(3).getSize()).toEqual({ width: 200, height: 200 });
    expect(out.suggestedName).toBe('mixed-sizes-duplicated.pdf');
  });

  it('duplicates multiple pages without index drift', async () => {
    const out = await duplicatePages(await fixture('mixed-sizes.pdf'), [0, 3]);
    expect(out.pageCount).toBe(6);
    const doc = await inspect(out.bytes);
    // Page 0 (A4 portrait) duplicated into slots 0 and 1.
    expect(doc.getPage(1).getSize().width).toBeCloseTo(595.28, 1);
    // Last page (landscape) duplicated into the final two slots.
    expect(doc.getPage(4).getSize().width).toBeCloseTo(841.89, 1);
    expect(doc.getPage(5).getSize().width).toBeCloseTo(841.89, 1);
  });

  it('ignores repeated indexes in the selection', async () => {
    const out = await duplicatePages(await fixture('one-page.pdf'), [0, 0, 0]);
    expect(out.pageCount).toBe(2);
  });

  it('duplicates within a 100-page document', async () => {
    const out = await duplicatePages(await fixture('hundred-page.pdf'), [0, 50, 99]);
    expect(out.pageCount).toBe(103);
  });

  it('preserves rotation on the duplicated page', async () => {
    const out = await duplicatePages(await fixture('rotated-pages.pdf'), [1]);
    const doc = await inspect(out.bytes);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
    expect(doc.getPage(2).getRotation().angle).toBe(90);
  });

  it('rejects an empty selection', async () => {
    await expectPdfError(duplicatePages(await fixture('one-page.pdf'), []), 'invalid-options');
  });

  it('rejects out-of-range indexes', async () => {
    await expectPdfError(duplicatePages(await fixture('two-page.pdf'), [2]), 'page-out-of-range');
  });

  it('rejects malformed input', async () => {
    await expectPdfError(duplicatePages(await fixture('malformed.pdf'), [0]), 'malformed');
  });
});
