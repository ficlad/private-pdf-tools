import { describe, expect, it } from 'vitest';

import { detectImageKind, looksLikePdf, sanitizeBaseName } from '../src/pdf';
import { assertPlausiblePdf } from '../src/pdf/validate';
import { expectPdfError, fixture } from './helpers';

describe('looksLikePdf', () => {
  it('accepts a real PDF', async () => {
    const { bytes } = await fixture('one-page.pdf');
    expect(looksLikePdf(bytes)).toBe(true);
  });

  it('accepts a PDF header preceded by junk within 1 KiB', () => {
    const junk = new TextEncoder().encode(`${'x'.repeat(500)}%PDF-1.4 rest`);
    expect(looksLikePdf(junk)).toBe(true);
  });

  it('rejects non-PDF bytes', async () => {
    const { bytes } = await fixture('not-a-pdf.bin');
    expect(looksLikePdf(bytes)).toBe(false);
  });

  it('rejects an empty buffer', () => {
    expect(looksLikePdf(new Uint8Array(0))).toBe(false);
  });
});

describe('assertPlausiblePdf', () => {
  it('throws empty-file for zero bytes', async () => {
    await expectPdfError(
      Promise.resolve().then(() => assertPlausiblePdf(new Uint8Array(0))),
      'empty-file',
    );
  });

  it('throws file-too-large above the limit', async () => {
    const { bytes } = await fixture('one-page.pdf');
    await expectPdfError(
      Promise.resolve().then(() => assertPlausiblePdf(bytes, { maxBytes: 10 })),
      'file-too-large',
    );
  });

  it('throws not-a-pdf for other content', async () => {
    const { bytes } = await fixture('not-a-pdf.bin');
    await expectPdfError(
      Promise.resolve().then(() => assertPlausiblePdf(bytes)),
      'not-a-pdf',
    );
  });
});

describe('detectImageKind', () => {
  it('detects PNG by magic bytes', async () => {
    const { bytes } = await fixture('red.png');
    expect(detectImageKind(bytes)).toBe('png');
  });

  it('detects JPEG by magic bytes', async () => {
    const { bytes } = await fixture('tiny.jpg');
    expect(detectImageKind(bytes)).toBe('jpeg');
  });

  it('returns null for a PDF', async () => {
    const { bytes } = await fixture('one-page.pdf');
    expect(detectImageKind(bytes)).toBe(null);
  });
});

describe('sanitizeBaseName', () => {
  it('strips directories and extension', () => {
    expect(sanitizeBaseName('/tmp/reports/annual.pdf', 'doc')).toBe('annual');
    expect(sanitizeBaseName('C:\\Users\\me\\file.PDF', 'doc')).toBe('file');
  });

  it('removes control and filesystem-hostile characters', () => {
    expect(sanitizeBaseName('a<b>c:"d"|e?f*g\u0000h.pdf', 'doc')).toBe('abcdefgh');
  });

  it('falls back when nothing safe remains', () => {
    expect(sanitizeBaseName('<>::**', 'doc')).toBe('doc');
    expect(sanitizeBaseName(undefined, 'doc')).toBe('doc');
  });

  it('caps very long names', () => {
    expect(sanitizeBaseName(`${'a'.repeat(500)}.pdf`, 'doc').length).toBeLessThanOrEqual(80);
  });
});
