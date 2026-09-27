import { loadPdf, rotatePageBy, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput, RotateOptions } from '../types';
import { assertPageIndexes } from '../validate';

const VALID_ANGLES = new Set([90, 180, 270]);

/**
 * Rotate all pages, or the given pages (0-based), clockwise by 90/180/270
 * degrees on top of each page's existing rotation.
 */
export async function rotatePages(
  input: PdfInput,
  options: RotateOptions,
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  if (!VALID_ANGLES.has(options.angle)) {
    throw new PdfOperationError('invalid-options', 'Rotation must be 90, 180, or 270 degrees.');
  }

  const loaded = await loadPdf(input, loadOptions);
  const pages = options.pages ?? loaded.doc.getPageIndices();
  if (pages.length === 0) {
    throw new PdfOperationError('invalid-options', 'Select at least one page to rotate.');
  }
  assertPageIndexes(pages, loaded.pageCount);

  for (const pageIndex of new Set(pages)) {
    rotatePageBy(loaded.doc, pageIndex, options.angle);
  }
  return savePdf(loaded.doc, `${loaded.baseName}-rotated.pdf`);
}
