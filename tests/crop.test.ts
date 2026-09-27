import { describe, expect, it } from 'vitest';

import { cropPages } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

const INSETS = { top: 10, right: 20, bottom: 30, left: 40 };

describe('cropPages', () => {
  it('sets the crop box on every page by default', async () => {
    const out = await cropPages(await fixture('two-page.pdf'), { insets: INSETS });
    expect(out.suggestedName).toBe('two-page-cropped.pdf');
    const doc = await inspect(out.bytes);
    for (const page of doc.getPages()) {
      const crop = page.getCropBox();
      expect(crop.x).toBeCloseTo(40, 1);
      expect(crop.y).toBeCloseTo(30, 1);
      expect(crop.width).toBeCloseTo(595.28 - 40 - 20, 1);
      expect(crop.height).toBeCloseTo(841.89 - 10 - 30, 1);
    }
  });

  it('crops only the selected pages', async () => {
    const out = await cropPages(await fixture('two-page.pdf'), {
      insets: INSETS,
      pages: [1],
    });
    const doc = await inspect(out.bytes);
    // Page 1 untouched: crop box falls back to the media box.
    expect(doc.getPage(0).getCropBox().width).toBeCloseTo(595.28, 1);
    expect(doc.getPage(1).getCropBox().width).toBeCloseTo(595.28 - 60, 1);
  });

  it('handles mixed page sizes', async () => {
    const out = await cropPages(await fixture('mixed-sizes.pdf'), {
      insets: { top: 5, right: 5, bottom: 5, left: 5 },
    });
    const doc = await inspect(out.bytes);
    expect(doc.getPage(2).getCropBox().width).toBeCloseTo(190, 1);
  });

  it('rejects a crop that removes a page entirely', async () => {
    await expectPdfError(
      cropPages(await fixture('mixed-sizes.pdf'), {
        insets: { top: 0, right: 150, bottom: 0, left: 150 }, // 200pt page dies
      }),
      'invalid-options',
    );
  });

  it('rejects negative and absurd insets', async () => {
    const input = await fixture('one-page.pdf');
    await expectPdfError(
      cropPages(input, { insets: { top: -1, right: 0, bottom: 0, left: 0 } }),
      'invalid-options',
    );
    await expectPdfError(
      cropPages(input, { insets: { top: 99999, right: 0, bottom: 0, left: 0 } }),
      'invalid-options',
    );
  });

  it('rejects out-of-range page selections', async () => {
    await expectPdfError(
      cropPages(await fixture('one-page.pdf'), { insets: INSETS, pages: [1] }),
      'page-out-of-range',
    );
  });

  it('rejects malformed input', async () => {
    await expectPdfError(
      cropPages(await fixture('malformed.pdf'), { insets: INSETS }),
      'malformed',
    );
  });
});
