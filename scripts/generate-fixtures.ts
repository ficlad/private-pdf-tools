/**
 * Generate the test fixtures in fixtures/ programmatically (spec §14).
 *
 * Run with: npm run fixtures
 * Also invoked automatically by the Vitest global setup.
 *
 * Everything here is built from code — no binary blobs are checked in.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ---------------------------------------------------------------------------
// PNG builder (valid RGB PNG of a solid color, any size)
// ---------------------------------------------------------------------------

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function makePng(
  width: number,
  height: number,
  color: [number, number, number],
): Uint8Array {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  // compression, filter, interlace = 0

  const raw = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      raw.set(color, rowStart + 1 + x * 3);
    }
  }
  const idat = new Uint8Array(deflateSync(raw));

  return concatBytes([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Minimal structurally-valid JPEG (SOI + SOF0 + EOI).
// pdf-lib's embedJpg reads dimensions/channels from the SOF marker and embeds
// the stream as DCTDecode without decoding pixels, so this is sufficient for
// unit-testing the embed path.
// ---------------------------------------------------------------------------

export function makeTinyJpeg(width: number, height: number): Uint8Array {
  const sof = [
    0xff,
    0xc0, // SOF0
    0x00,
    0x11, // length: 17
    0x08, // precision
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03, // 3 components
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01,
  ];
  return new Uint8Array([0xff, 0xd8, ...sof, 0xff, 0xd9]);
}

// ---------------------------------------------------------------------------
// PDF fixtures
// ---------------------------------------------------------------------------

const A4: [number, number] = [595.28, 841.89];
const LETTER: [number, number] = [612, 792];

async function makeNumberedPdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pageCount; i += 1) {
    const page = doc.addPage(A4);
    page.drawText(`Page ${String(i + 1)} of ${String(pageCount)}`, {
      x: 50,
      y: 780,
      size: 24,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }
  return doc.save();
}

async function makeRotatedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const rotations = [0, 90, 180, 270];
  for (const rotation of rotations) {
    const page = doc.addPage(A4);
    page.setRotation(degrees(rotation));
    page.drawText(`Rotation ${String(rotation)}`, { x: 50, y: 780, size: 24, font });
  }
  return doc.save();
}

async function makeMixedSizesPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const sizes: [number, number][] = [A4, LETTER, [200, 200], [841.89, 595.28]];
  for (const [width, height] of sizes) {
    const page = doc.addPage([width, height]);
    page.drawText(`${String(width)} x ${String(height)}`, {
      x: 20,
      y: height - 40,
      size: 12,
      font,
    });
  }
  return doc.save();
}

async function makeWithImagesPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const png = await doc.embedPng(makePng(8, 8, [200, 30, 30]));
  const jpg = await doc.embedJpg(makeTinyJpeg(4, 4));
  const pageA = doc.addPage(A4);
  pageA.drawImage(png, { x: 100, y: 500, width: 160, height: 160 });
  const pageB = doc.addPage(A4);
  pageB.drawImage(jpg, { x: 100, y: 500, width: 80, height: 80 });
  return doc.save();
}

async function makeWithMetadataPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Hostile metadata on purpose (spec §14 security tests): the UI must only
  // ever render these with text nodes, never HTML.
  doc.setTitle('Fixture <script>alert("title")</script>');
  doc.setAuthor('"><img src=x onerror=alert(1)>');
  doc.setSubject('javascript:alert(2)');
  doc.setKeywords(['fixtures', '<svg/onload=alert(3)>']);
  doc.setProducer('Private PDF Tools fixtures');
  doc.setCreator('generate-fixtures.ts');
  const font = await doc.embedFont(StandardFonts.Courier);
  const page = doc.addPage(A4);
  page.drawText('Metadata fixture', { x: 50, y: 780, size: 18, font });
  return doc.save();
}

async function makeWithFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage(A4);
  page.drawText('Form fixture', { x: 50, y: 780, size: 18, font });
  const form = doc.getForm();
  const nameField = form.createTextField('applicant.name');
  nameField.setText('Ada Lovelace');
  nameField.addToPage(page, { x: 50, y: 700, width: 220, height: 24 });
  const agree = form.createCheckBox('applicant.agrees');
  agree.check();
  agree.addToPage(page, { x: 50, y: 660, width: 18, height: 18 });
  return doc.save();
}

async function makeUncompressedPdf(): Promise<Uint8Array> {
  // Bloated on purpose: classic xref, no object streams — the lossless
  // compression test asserts a re-save shrinks it.
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 10; i += 1) {
    const page = doc.addPage(A4);
    for (let line = 0; line < 20; line += 1) {
      page.drawText(`Fixture line ${String(line + 1)} on page ${String(i + 1)}`, {
        x: 50,
        y: 780 - line * 30,
        size: 12,
        font,
      });
    }
  }
  return doc.save({ useObjectStreams: false });
}

function makeZeroPagePdf(): Uint8Array {
  // Hand-written minimal PDF whose page tree is empty.
  const text = [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [] /Count 0 >>',
    'endobj',
    'xref',
    '0 3',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    'trailer',
    '<< /Size 3 /Root 1 0 R >>',
    'startxref',
    '110',
    '%%EOF',
    '',
  ].join('\n');
  return new TextEncoder().encode(text);
}

async function makeEncryptedLookingPdf(): Promise<Uint8Array | null> {
  // pdf-lib cannot create encrypted PDFs, so build one that *declares*
  // encryption: save with a classic trailer and inject /Encrypt into it.
  // pdf-lib (and spec-compliant parsers) treat the document as encrypted.
  const doc = await PDFDocument.create();
  doc.addPage(A4);
  const bytes = await doc.save({ useObjectStreams: false });
  const text = new TextDecoder('latin1').decode(bytes);
  // Point /Encrypt at the existing /Info object so the reference resolves;
  // the insertion sits after the xref table, so byte offsets stay valid.
  const at = text.lastIndexOf('/Info ');
  if (at === -1) return null;
  const patched = `${text.slice(0, at)}/Encrypt 3 0 R\n${text.slice(at)}`;
  const out = Uint8Array.from(patched, (ch) => ch.charCodeAt(0) & 0xff);

  // Verify the fixture actually trips the encrypted-PDF path.
  try {
    await PDFDocument.load(out, { ignoreEncryption: false });
    return null; // did not register as encrypted; caller will skip it
  } catch (error) {
    const isEncryptedError = error instanceof Error && error.message.includes('is encrypted');
    return isEncryptedError ? out : null;
  }
}

function makeMalformedPdf(): Uint8Array {
  const header = new TextEncoder().encode('%PDF-1.7\n');
  const garbage = new Uint8Array(2048);
  let state = 0x12345678;
  for (let i = 0; i < garbage.length; i += 1) {
    // Deterministic pseudo-random junk (xorshift32).
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    garbage[i] = state & 0xff;
  }
  return concatBytes([header, garbage]);
}

function makeNotAPdf(): Uint8Array {
  const out = new Uint8Array(256);
  for (let i = 0; i < out.length; i += 1) out[i] = i;
  return out;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function generateFixtures(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });

  const tenPage = await makeNumberedPdf(10);

  const files: Record<string, Uint8Array> = {
    'one-page.pdf': await makeNumberedPdf(1),
    'two-page.pdf': await makeNumberedPdf(2),
    'hundred-page.pdf': await makeNumberedPdf(100),
    'rotated-pages.pdf': await makeRotatedPdf(),
    'mixed-sizes.pdf': await makeMixedSizesPdf(),
    'with-images.pdf': await makeWithImagesPdf(),
    'with-metadata.pdf': await makeWithMetadataPdf(),
    'with-form.pdf': await makeWithFormPdf(),
    'uncompressed.pdf': await makeUncompressedPdf(),
    'zero-pages.pdf': makeZeroPagePdf(),
    'malformed.pdf': makeMalformedPdf(),
    'truncated.pdf': tenPage.slice(0, Math.floor(tenPage.length * 0.3)),
    'empty.pdf': new Uint8Array(0),
    'not-a-pdf.bin': makeNotAPdf(),
    'red.png': makePng(4, 4, [220, 20, 20]),
    'blue.png': makePng(2, 3, [20, 20, 220]),
    'tiny.jpg': makeTinyJpeg(4, 4),
  };

  const encrypted = await makeEncryptedLookingPdf();
  if (encrypted) {
    files['encrypted.pdf'] = encrypted;
  } else {
    console.warn('WARNING: could not build encrypted.pdf fixture; skipping.');
  }

  await Promise.all(
    Object.entries(files).map(([name, bytes]) => writeFile(join(dir, name), bytes)),
  );
  console.log(`Generated ${String(Object.keys(files).length)} fixtures in ${dir}`);
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  generateFixtures(join(repoRoot, 'fixtures')).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
