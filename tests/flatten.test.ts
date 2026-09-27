import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { flattenPdf } from '../src/pdf';
import { expectPdfError, fixture } from './helpers';

describe('flattenPdf', () => {
  it('flattens form fields into static content', async () => {
    const result = await flattenPdf(await fixture('with-form.pdf'));
    expect(result.flattenedFields).toBe(2);
    expect(result.output.suggestedName).toBe('with-form-flattened.pdf');

    const doc = await PDFDocument.load(result.output.bytes);
    expect(doc.getForm().getFields()).toHaveLength(0);
    expect(doc.getPageCount()).toBe(1);
  });

  it('is a safe no-op on documents without forms', async () => {
    const result = await flattenPdf(await fixture('two-page.pdf'));
    expect(result.flattenedFields).toBe(0);
    expect(result.output.pageCount).toBe(2);
  });

  it('rejects malformed and encrypted input', async () => {
    await expectPdfError(flattenPdf(await fixture('malformed.pdf')), 'malformed');
    await expectPdfError(flattenPdf(await fixture('encrypted.pdf')), 'encrypted');
  });
});
