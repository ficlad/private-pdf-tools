/**
 * Thin adapter over pdf-lib (spec §7).
 *
 * Shared pdf-lib plumbing (load/validate/save/copy) lives here so the
 * underlying library can be replaced later. Operation services may use
 * pdf-lib page APIs directly for their specific work (spec §7: "do not
 * over-engineer the abstraction"); the UI never touches pdf-lib or this
 * adapter — it goes through the operation services only.
 *
 * Every load path validates input first (spec §8) and converts library
 * exceptions into typed `PdfOperationError`s.
 */

import { degrees, EncryptedPDFError, PDFDocument } from 'pdf-lib';

/**
 * pdf-lib ships both CJS and ESM builds; depending on how the bundler/test
 * runner resolves them, the thrown EncryptedPDFError can be a different class
 * instance than the one we imported. Match on the message as a fallback.
 */
function isEncryptedPdfError(cause: unknown): boolean {
  if (cause instanceof EncryptedPDFError) return true;
  return cause instanceof Error && cause.message.includes('is encrypted');
}

import { PdfOperationError, toPdfOperationError } from './errors';
import type { PdfInput, PdfOutput } from './types';
import {
  assertPlausiblePdf,
  sanitizeBaseName,
  type ImageKind,
  type ValidateOptions,
} from './validate';

export interface LoadedPdf {
  doc: PDFDocument;
  pageCount: number;
  /** Sanitized basename derived from the (untrusted) input filename. */
  baseName: string;
}

export interface LoadOptions extends ValidateOptions {
  /** Fallback basename when the input has no usable filename. */
  fallbackName?: string;
}

/**
 * Validate and parse an untrusted PDF. Never trusts the filename or MIME
 * type; checks magic bytes and size, then parses with pdf-lib.
 */
export async function loadPdf(input: PdfInput, options: LoadOptions = {}): Promise<LoadedPdf> {
  assertPlausiblePdf(input.bytes, options);

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(input.bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch (cause) {
    if (isEncryptedPdfError(cause)) {
      throw new PdfOperationError('encrypted', undefined, { cause });
    }
    throw toPdfOperationError(cause, 'malformed');
  }

  // pdf-lib's recovery parser can "load" heavily damaged files and only fail
  // when the page tree is first touched — treat that as malformed too.
  let pageCount: number;
  try {
    pageCount = doc.getPageCount();
  } catch (cause) {
    throw toPdfOperationError(cause, 'malformed');
  }
  if (pageCount === 0) throw new PdfOperationError('zero-pages');

  return {
    doc,
    pageCount,
    baseName: sanitizeBaseName(input.name, options.fallbackName ?? 'document'),
  };
}

/** Create a new, empty document. */
export async function createPdf(): Promise<PDFDocument> {
  return PDFDocument.create();
}

/**
 * Copy the given pages (0-based indexes, already validated by the caller)
 * from `source` into `target`, appending them in the given order.
 */
export async function copyPagesInto(
  target: PDFDocument,
  source: PDFDocument,
  indexes: readonly number[],
): Promise<void> {
  try {
    const pages = await target.copyPages(source, [...indexes]);
    for (const page of pages) target.addPage(page);
  } catch (cause) {
    throw toPdfOperationError(cause, 'operation-failed');
  }
}

/**
 * Add `angle` degrees (clockwise) to a page's existing rotation, normalizing
 * the result into [0, 360). A hostile PDF may carry a rotation that is not a
 * multiple of 90; it is snapped to the nearest multiple first.
 */
export function rotatePageBy(doc: PDFDocument, pageIndex: number, angle: number): void {
  try {
    const page = doc.getPage(pageIndex);
    const current = Math.round(page.getRotation().angle / 90) * 90;
    const next = (((current + angle) % 360) + 360) % 360;
    page.setRotation(degrees(next));
  } catch (cause) {
    throw toPdfOperationError(cause, 'operation-failed');
  }
}

/**
 * Insert a copy of the page at `pageIndex` immediately after the original,
 * within the same document.
 */
export async function duplicatePageAfter(doc: PDFDocument, pageIndex: number): Promise<void> {
  try {
    const [copy] = await doc.copyPages(doc, [pageIndex]);
    if (!copy) throw new PdfOperationError('operation-failed');
    doc.insertPage(pageIndex + 1, copy);
  } catch (cause) {
    throw toPdfOperationError(cause, 'operation-failed');
  }
}

export type PageSizePreset = 'fit' | 'a4' | 'letter';

const PAGE_SIZES: Record<Exclude<PageSizePreset, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

const IMAGE_PAGE_MARGIN = 36; // half an inch, in PDF points

/**
 * Append one page containing the given image. With `fit` the page matches
 * the image's pixel dimensions (1 px = 1 pt); with a preset size the image
 * is scaled to fit inside a margin and centered.
 */
export async function addImagePage(
  doc: PDFDocument,
  imageBytes: Uint8Array,
  kind: ImageKind,
  pageSize: PageSizePreset,
): Promise<void> {
  try {
    const image = kind === 'png' ? await doc.embedPng(imageBytes) : await doc.embedJpg(imageBytes);

    if (pageSize === 'fit') {
      const page = doc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      return;
    }

    const [pageWidth, pageHeight] = PAGE_SIZES[pageSize];
    const maxWidth = pageWidth - 2 * IMAGE_PAGE_MARGIN;
    const maxHeight = pageHeight - 2 * IMAGE_PAGE_MARGIN;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;

    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
  } catch (cause) {
    throw new PdfOperationError(
      'not-an-image',
      'This image could not be read. It may be damaged or use an unsupported variant.',
      { cause },
    );
  }
}

/** Serialize a document into a downloadable result. */
export async function savePdf(doc: PDFDocument, suggestedName: string): Promise<PdfOutput> {
  const pageCount = doc.getPageCount();
  if (pageCount === 0) throw new PdfOperationError('zero-pages');

  let bytes: Uint8Array;
  try {
    bytes = await doc.save({ useObjectStreams: true });
  } catch (cause) {
    throw toPdfOperationError(cause, 'operation-failed');
  }

  return {
    bytes,
    pageCount,
    suggestedName: suggestedName.endsWith('.pdf') ? suggestedName : `${suggestedName}.pdf`,
  };
}
