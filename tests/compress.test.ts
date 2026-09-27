import { describe, expect, it } from 'vitest';

import { compressPdf } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('compressPdf (lossless re-save)', () => {
  it('shrinks a classically-serialized PDF and preserves pages', async () => {
    const input = await fixture('uncompressed.pdf');
    const result = await compressPdf(input);
    expect(result.bytesBefore).toBe(input.bytes.length);
    expect(result.bytesAfter).toBe(result.output.bytes.length);
    expect(result.bytesAfter).toBeLessThan(result.bytesBefore);
    expect(result.output.suggestedName).toBe('uncompressed-compressed.pdf');

    const doc = await inspect(result.output.bytes);
    expect(doc.getPageCount()).toBe(10);
  });

  it('reports honest sizes even when nothing shrinks', async () => {
    // Already object-stream packed; result may be equal or slightly larger.
    const input = await fixture('one-page.pdf');
    const result = await compressPdf(input);
    expect(result.bytesBefore).toBe(input.bytes.length);
    expect(result.bytesAfter).toBeGreaterThan(0);
    expect(result.output.pageCount).toBe(1);
  });

  it('rejects malformed, encrypted, and empty input', async () => {
    await expectPdfError(compressPdf(await fixture('malformed.pdf')), 'malformed');
    await expectPdfError(compressPdf(await fixture('encrypted.pdf')), 'encrypted');
    await expectPdfError(compressPdf(await fixture('empty.pdf')), 'empty-file');
  });
});
