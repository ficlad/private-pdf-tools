import { loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';
import { assertPageIndexes } from '../validate';

/** How much to cut from each edge, in PDF points. */
export interface CropInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CropOptions {
  insets: CropInsets;
  /** 0-based pages to crop; omit for all pages. */
  pages?: number[];
}

/**
 * Crop pages by setting the /CropBox (the visible area). Non-destructive:
 * the content outside the crop box stays in the file and can be restored by
 * enlarging the crop box again — this is how PDF cropping works, and it is
 * NOT a redaction tool.
 */
export async function cropPages(
  input: PdfInput,
  options: CropOptions,
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  const { insets } = options;
  for (const [edge, value] of Object.entries(insets)) {
    if (!Number.isFinite(value) || value < 0 || value > 10_000) {
      throw new PdfOperationError(
        'invalid-options',
        `The ${edge} crop amount must be between 0 and 10000 points.`,
      );
    }
  }

  const loaded = await loadPdf(input, loadOptions);
  const pageIndexes = options.pages ?? loaded.doc.getPageIndices();
  if (pageIndexes.length === 0) {
    throw new PdfOperationError('invalid-options', 'Select at least one page to crop.');
  }
  assertPageIndexes(pageIndexes, loaded.pageCount);

  for (const pageIndex of new Set(pageIndexes)) {
    const page = loaded.doc.getPage(pageIndex);
    const mediaBox = page.getMediaBox();
    const newWidth = mediaBox.width - insets.left - insets.right;
    const newHeight = mediaBox.height - insets.top - insets.bottom;
    if (newWidth < 1 || newHeight < 1) {
      throw new PdfOperationError(
        'invalid-options',
        `Page ${String(pageIndex + 1)} would be cropped away entirely.`,
      );
    }
    page.setCropBox(mediaBox.x + insets.left, mediaBox.y + insets.bottom, newWidth, newHeight);
  }

  return savePdf(loaded.doc, `${loaded.baseName}-cropped.pdf`);
}
