import { describe, expect, it } from 'vitest';

import { rotatePages, type RotationAngle } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('rotatePages', () => {
  it('rotates all pages by default', async () => {
    const out = await rotatePages(await fixture('two-page.pdf'), { angle: 90 });
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
    expect(out.suggestedName).toBe('two-page-rotated.pdf');
  });

  it('rotates only the selected pages', async () => {
    const out = await rotatePages(await fixture('two-page.pdf'), { angle: 180, pages: [1] });
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getRotation().angle).toBe(0);
    expect(doc.getPage(1).getRotation().angle).toBe(180);
  });

  it('adds to existing rotation and wraps past 360', async () => {
    // rotated-pages.pdf pages carry 0/90/180/270.
    const out = await rotatePages(await fixture('rotated-pages.pdf'), { angle: 180 });
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getRotation().angle).toBe(180);
    expect(doc.getPage(1).getRotation().angle).toBe(270);
    expect(doc.getPage(2).getRotation().angle).toBe(0);
    expect(doc.getPage(3).getRotation().angle).toBe(90);
  });

  it('rotates a 100-page document', async () => {
    const out = await rotatePages(await fixture('hundred-page.pdf'), { angle: 270 });
    expect(out.pageCount).toBe(100);
    const doc = await inspect(out.bytes);
    expect(doc.getPage(99).getRotation().angle).toBe(270);
  });

  it('rejects an unsupported angle', async () => {
    await expectPdfError(
      rotatePages(await fixture('one-page.pdf'), { angle: 45 as RotationAngle }),
      'invalid-options',
    );
  });

  it('rejects an empty page selection', async () => {
    await expectPdfError(
      rotatePages(await fixture('one-page.pdf'), { angle: 90, pages: [] }),
      'invalid-options',
    );
  });

  it('rejects out-of-range pages', async () => {
    await expectPdfError(
      rotatePages(await fixture('one-page.pdf'), { angle: 90, pages: [1] }),
      'page-out-of-range',
    );
  });

  it('rejects encrypted input', async () => {
    await expectPdfError(rotatePages(await fixture('encrypted.pdf'), { angle: 90 }), 'encrypted');
  });
});
