import { describe, expect, it } from 'vitest';

import { readPdfInfo } from '../src/pdf';
import { expectPdfError, fixture } from './helpers';

describe('readPdfInfo', () => {
  it('reports version, size, page count, and page sizes', async () => {
    const input = await fixture('mixed-sizes.pdf');
    const info = await readPdfInfo(input);
    expect(info.encrypted).toBe(false);
    expect(info.pageCount).toBe(4);
    expect(info.fileBytes).toBe(input.bytes.length);
    expect(info.pdfVersion).toMatch(/^1\.\d$/);
    expect(info.pageSizes).toHaveLength(4); // four distinct sizes
    const square = info.pageSizes.find((size) => size.width === 200);
    expect(square).toEqual({ width: 200, height: 200, count: 1 });
  });

  it('groups identical page sizes', async () => {
    const info = await readPdfInfo(await fixture('hundred-page.pdf'));
    expect(info.pageSizes).toHaveLength(1);
    expect(info.pageSizes[0]?.count).toBe(100);
  });

  it('returns hostile metadata verbatim as data', async () => {
    const info = await readPdfInfo(await fixture('with-metadata.pdf'));
    expect(info.metadata?.title).toBe('Fixture <script>alert("title")</script>');
  });

  it('flags encrypted PDFs without exposing metadata', async () => {
    const info = await readPdfInfo(await fixture('encrypted.pdf'));
    expect(info.encrypted).toBe(true);
    expect(info.metadata).toBeNull();
    expect(info.pageCount).toBe(1); // structural count only
  });

  it('rejects malformed and non-PDF input', async () => {
    await expectPdfError(readPdfInfo(await fixture('malformed.pdf')), 'malformed');
    await expectPdfError(readPdfInfo(await fixture('not-a-pdf.bin')), 'not-a-pdf');
    await expectPdfError(readPdfInfo(await fixture('empty.pdf')), 'empty-file');
  });
});
