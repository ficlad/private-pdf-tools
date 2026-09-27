import { describe, expect, it } from 'vitest';

import { imagesToPdf } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('imagesToPdf', () => {
  it('builds one page per image, sized to the image by default', async () => {
    const out = await imagesToPdf([await fixture('red.png'), await fixture('blue.png')]);
    expect(out.pageCount).toBe(2);
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getSize()).toEqual({ width: 4, height: 4 });
    expect(doc.getPage(1).getSize()).toEqual({ width: 2, height: 3 });
    expect(out.suggestedName).toBe('red.pdf');
  });

  it('embeds JPEG images', async () => {
    const out = await imagesToPdf([await fixture('tiny.jpg')]);
    expect(out.pageCount).toBe(1);
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getSize()).toEqual({ width: 4, height: 4 });
  });

  it('mixes PNG and JPEG in one document', async () => {
    const out = await imagesToPdf([
      await fixture('red.png'),
      await fixture('tiny.jpg'),
      await fixture('blue.png'),
    ]);
    expect(out.pageCount).toBe(3);
  });

  it('places images on an A4 page when requested', async () => {
    const out = await imagesToPdf([await fixture('red.png')], { pageSize: 'a4' });
    const doc = await inspect(out.bytes);
    const size = doc.getPage(0).getSize();
    expect(size.width).toBeCloseTo(595.28, 1);
    expect(size.height).toBeCloseTo(841.89, 1);
  });

  it('places images on a letter page when requested', async () => {
    const out = await imagesToPdf([await fixture('blue.png')], { pageSize: 'letter' });
    const doc = await inspect(out.bytes);
    expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });

  it('rejects an empty input list', async () => {
    await expectPdfError(imagesToPdf([]), 'no-input');
  });

  it('rejects a PDF passed as an image', async () => {
    await expectPdfError(imagesToPdf([await fixture('one-page.pdf')]), 'not-an-image');
  });

  it('rejects arbitrary binary data', async () => {
    await expectPdfError(imagesToPdf([await fixture('not-a-pdf.bin')]), 'not-an-image');
  });

  it('rejects an empty file', async () => {
    await expectPdfError(imagesToPdf([await fixture('empty.pdf')]), 'empty-file');
  });

  it('rejects a corrupt image that passes the magic-byte check', async () => {
    const { bytes } = await fixture('red.png');
    const corrupt = bytes.slice(0, 20); // magic intact, structure destroyed
    await expectPdfError(imagesToPdf([{ bytes: corrupt, name: 'x.png' }]), 'not-an-image');
  });

  it('enforces the size limit', async () => {
    await expectPdfError(
      imagesToPdf([await fixture('red.png')], { maxBytes: 8 }),
      'file-too-large',
    );
  });
});
