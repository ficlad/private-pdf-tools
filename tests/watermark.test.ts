import { describe, expect, it } from 'vitest';

import { addWatermark } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('addWatermark', () => {
  it('stamps a watermark on every page', async () => {
    const input = await fixture('hundred-page.pdf');
    const out = await addWatermark(input, { text: 'CONFIDENTIAL' });
    expect(out.pageCount).toBe(100);
    expect(out.suggestedName).toBe('hundred-page-watermarked.pdf');
    expect(out.bytes.length).toBeGreaterThan(input.bytes.length);
    const doc = await inspect(out.bytes);
    expect(doc.getPageCount()).toBe(100);
  });

  it('accepts custom opacity, rotation, and font size', async () => {
    const out = await addWatermark(await fixture('mixed-sizes.pdf'), {
      text: 'DRAFT',
      opacity: 0.5,
      rotationDegrees: -30,
      fontSize: 40,
    });
    expect(out.pageCount).toBe(4);
  });

  it('rejects empty and oversized text', async () => {
    const input = await fixture('one-page.pdf');
    await expectPdfError(addWatermark(input, { text: '' }), 'invalid-options');
    await expectPdfError(addWatermark(input, { text: '   ' }), 'invalid-options');
    await expectPdfError(addWatermark(input, { text: 'x'.repeat(101) }), 'invalid-options');
  });

  it('rejects text the standard font cannot encode', async () => {
    await expectPdfError(
      addWatermark(await fixture('one-page.pdf'), { text: '机密' }),
      'invalid-options',
    );
  });

  it('rejects invalid opacity and rotation', async () => {
    const input = await fixture('one-page.pdf');
    await expectPdfError(addWatermark(input, { text: 'X', opacity: 0 }), 'invalid-options');
    await expectPdfError(addWatermark(input, { text: 'X', opacity: 1.5 }), 'invalid-options');
    await expectPdfError(
      addWatermark(input, { text: 'X', rotationDegrees: 720 }),
      'invalid-options',
    );
  });

  it('rejects malformed and zero-page input', async () => {
    await expectPdfError(addWatermark(await fixture('malformed.pdf'), { text: 'X' }), 'malformed');
    await expectPdfError(
      addWatermark(await fixture('zero-pages.pdf'), { text: 'X' }),
      'zero-pages',
    );
  });
});
