import { describe, expect, it } from 'vitest';

import { readPdfMetadata, setPdfMetadata } from '../src/pdf';
import { expectPdfError, fixture, inspect } from './helpers';

describe('readPdfMetadata', () => {
  it('reads the hostile metadata fixture verbatim (values are data)', async () => {
    const meta = await readPdfMetadata(await fixture('with-metadata.pdf'));
    expect(meta.title).toBe('Fixture <script>alert("title")</script>');
    expect(meta.author).toBe('"><img src=x onerror=alert(1)>');
    expect(meta.subject).toBe('javascript:alert(2)');
    expect(meta.keywords).toContain('<svg/onload=alert(3)>');
    expect(meta.producer).toBe('Private PDF Tools fixtures');
    expect(meta.pageCount).toBe(1);
  });

  it('returns empty strings for absent fields', async () => {
    const meta = await readPdfMetadata(await fixture('one-page.pdf'));
    expect(meta.title).toBe('');
    expect(meta.author).toBe('');
  });

  it('rejects malformed and encrypted input', async () => {
    await expectPdfError(readPdfMetadata(await fixture('malformed.pdf')), 'malformed');
    await expectPdfError(readPdfMetadata(await fixture('encrypted.pdf')), 'encrypted');
  });
});

describe('setPdfMetadata', () => {
  it('writes fields and refreshes the modification date', async () => {
    const out = await setPdfMetadata(await fixture('one-page.pdf'), {
      title: 'New Title',
      author: 'Daniel',
      subject: 'Testing',
      keywords: 'alpha, beta , ,gamma',
    });
    expect(out.suggestedName).toBe('one-page-metadata.pdf');
    const meta = await readPdfMetadata({ bytes: out.bytes, name: out.suggestedName });
    expect(meta.title).toBe('New Title');
    expect(meta.author).toBe('Daniel');
    expect(meta.subject).toBe('Testing');
    expect(meta.keywords).toContain('alpha');
    expect(meta.keywords).toContain('gamma');
    expect(meta.modificationDate).not.toBeNull();
  });

  it('leaves unspecified fields untouched', async () => {
    const out = await setPdfMetadata(await fixture('with-metadata.pdf'), { title: 'Cleaned' });
    const meta = await readPdfMetadata({ bytes: out.bytes });
    expect(meta.title).toBe('Cleaned');
    expect(meta.author).toBe('"><img src=x onerror=alert(1)>'); // untouched
  });

  it('stores hostile input verbatim as data without breaking the file', async () => {
    const hostile = '<script>alert(1)</script>"\'&';
    const out = await setPdfMetadata(await fixture('one-page.pdf'), { title: hostile });
    const doc = await inspect(out.bytes);
    expect(doc.getPageCount()).toBe(1);
    const meta = await readPdfMetadata({ bytes: out.bytes });
    expect(meta.title).toBe(hostile);
  });

  it('rejects oversized values', async () => {
    await expectPdfError(
      setPdfMetadata(await fixture('one-page.pdf'), { title: 'x'.repeat(2001) }),
      'invalid-options',
    );
  });

  it('rejects malformed input', async () => {
    await expectPdfError(
      setPdfMetadata(await fixture('malformed.pdf'), { title: 'X' }),
      'malformed',
    );
  });
});
