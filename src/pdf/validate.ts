/**
 * Input validation (spec §8): never trust filenames or MIME types.
 * Verify magic bytes, size limits, and page indexes before touching a parser.
 */

import { PdfOperationError } from './errors';

/**
 * Default upper bound for a single input file. Large PDFs can exhaust
 * browser memory (spec §9); this is a guardrail, not a promise.
 */
export const DEFAULT_MAX_FILE_BYTES = 256 * 1024 * 1024; // 256 MiB

/** The PDF header may be preceded by up to 1024 bytes of junk (PDF spec, Adobe impl. note). */
const PDF_HEADER_SEARCH_WINDOW = 1024;

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function hasBytesAt(bytes: Uint8Array, offset: number, magic: readonly number[]): boolean {
  if (offset + magic.length > bytes.length) return false;
  return magic.every((b, i) => bytes[offset + i] === b);
}

/** True if the buffer starts with (or contains within the first 1 KiB) a PDF header. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const lastOffset = Math.min(bytes.length - PDF_MAGIC.length, PDF_HEADER_SEARCH_WINDOW);
  for (let offset = 0; offset <= lastOffset; offset += 1) {
    if (hasBytesAt(bytes, offset, PDF_MAGIC)) return true;
  }
  return false;
}

export type ImageKind = 'png' | 'jpeg';

/** Detect a supported image format from magic bytes, or null. */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (hasBytesAt(bytes, 0, PNG_MAGIC)) return 'png';
  if (hasBytesAt(bytes, 0, JPEG_MAGIC)) return 'jpeg';
  return null;
}

export interface ValidateOptions {
  maxBytes?: number;
}

/** Throws a typed error unless the buffer plausibly holds a PDF within size limits. */
export function assertPlausiblePdf(bytes: Uint8Array, options: ValidateOptions = {}): void {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_FILE_BYTES;
  if (bytes.length === 0) throw new PdfOperationError('empty-file');
  if (bytes.length > maxBytes) throw new PdfOperationError('file-too-large');
  if (!looksLikePdf(bytes)) throw new PdfOperationError('not-a-pdf');
}

/** Throws a typed error unless the buffer plausibly holds a supported image. */
export function assertPlausibleImage(bytes: Uint8Array, options: ValidateOptions = {}): ImageKind {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_FILE_BYTES;
  if (bytes.length === 0) throw new PdfOperationError('empty-file');
  if (bytes.length > maxBytes) throw new PdfOperationError('file-too-large');
  const kind = detectImageKind(bytes);
  if (kind === null) throw new PdfOperationError('not-an-image');
  return kind;
}

/** Throws unless every index is an integer within [0, pageCount). */
export function assertPageIndexes(indexes: readonly number[], pageCount: number): void {
  for (const index of indexes) {
    if (!Number.isInteger(index) || index < 0 || index >= pageCount) {
      throw new PdfOperationError(
        'page-out-of-range',
        `Page ${String(index + 1)} does not exist: this PDF has ${String(pageCount)} page(s).`,
      );
    }
  }
}

/**
 * Reduce an untrusted filename to a safe basename (spec §10: malicious
 * filenames are a threat). Strips directories, control characters, and
 * characters that are problematic on common filesystems.
 */
export function sanitizeBaseName(name: string | undefined, fallback: string): string {
  if (!name) return fallback;
  const lastSegment = name.split(/[/\\]/).pop() ?? '';
  const withoutExtension = lastSegment.replace(/\.[a-zA-Z0-9]{1,8}$/, '');
  const cleaned = withoutExtension
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : fallback;
}
