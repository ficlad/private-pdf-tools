import { describe, expect, it } from 'vitest';

import { reversePages } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('reversePages', () => {
  it('reverses page order', async () => {
    const out = await reversePages(await fixture('mixed-sizes.pdf'));
    expect(out.pageCount).toBe(4);
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getSize().width).toBeCloseTo(841.89, 1); // was last
    expect(doc.getPage(3).getSize().width).toBeCloseTo(595.28, 1); // was first
    expect(out.suggestedName).toBe('mixed-sizes-reversed.pdf');
  });

  it('is a no-op in size for a one-page PDF', async () => {
    const out = await reversePages(await fixture('one-page.pdf'));
    expect(out.pageCount).toBe(1);
  });

  it('reverses a 100-page document', async () => {
    const out = await reversePages(await fixture('hundred-page.pdf'));
    expect(out.pageCount).toBe(100);
  });

  it('keeps rotations attached to their pages', async () => {
    const out = await reversePages(await fixture('rotated-pages.pdf'));
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getRotation().angle).toBe(270);
    expect(doc.getPage(3).getRotation().angle).toBe(0);
  });

  it('rejects malformed input', async () => {
    await expectPdfError(reversePages(await fixture('malformed.pdf')), 'malformed');
  });

  it('rejects a zero-page document', async () => {
    await expectPdfError(reversePages(await fixture('zero-pages.pdf')), 'zero-pages');
  });

  it('rejects an empty file', async () => {
    await expectPdfError(reversePages(await fixture('empty.pdf')), 'empty-file');
  });
});
