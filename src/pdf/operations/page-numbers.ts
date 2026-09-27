import { rgb, StandardFonts } from 'pdf-lib';

import { loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';

export type PageNumberPosition =
  'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right';

export type PageNumberFormat = 'n' | 'page-n' | 'n-of-total' | 'page-n-of-total';

export interface PageNumberOptions {
  position?: PageNumberPosition;
  format?: PageNumberFormat;
  /** The number printed on the first page (default 1). */
  startAt?: number;
  /** Distance from the page edges, in PDF points (default 24). */
  margin?: number;
  fontSize?: number;
}

const POSITIONS = new Set<PageNumberPosition>([
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'top-left',
  'top-center',
  'top-right',
]);

function formatLabel(format: PageNumberFormat, n: number, total: number): string {
  switch (format) {
    case 'n':
      return String(n);
    case 'page-n':
      return `Page ${String(n)}`;
    case 'n-of-total':
      return `${String(n)} / ${String(total)}`;
    case 'page-n-of-total':
      return `Page ${String(n)} of ${String(total)}`;
  }
}

/**
 * Stamp a page number onto every page.
 *
 * Known limitation (documented, spec §23): numbers are placed in the page's
 * unrotated coordinate space, so on pages with a /Rotate entry the label
 * follows the stored orientation, not the displayed one.
 */
export async function addPageNumbers(
  input: PdfInput,
  options: PageNumberOptions = {},
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  const position = options.position ?? 'bottom-center';
  const format = options.format ?? 'n';
  const startAt = options.startAt ?? 1;
  const margin = options.margin ?? 24;
  const fontSize = options.fontSize ?? 11;

  if (!POSITIONS.has(position)) {
    throw new PdfOperationError('invalid-options', 'Unknown page-number position.');
  }
  if (!Number.isInteger(startAt) || startAt < 0 || startAt > 999_999) {
    throw new PdfOperationError(
      'invalid-options',
      'The starting number must be a whole number between 0 and 999999.',
    );
  }
  if (!Number.isFinite(margin) || margin < 0 || margin > 200) {
    throw new PdfOperationError('invalid-options', 'The margin must be between 0 and 200 points.');
  }
  if (!Number.isFinite(fontSize) || fontSize < 4 || fontSize > 72) {
    throw new PdfOperationError('invalid-options', 'Font size must be between 4 and 72 points.');
  }

  const loaded = await loadPdf(input, loadOptions);
  const font = await loaded.doc.embedFont(StandardFonts.Helvetica);
  const lastNumber = startAt + loaded.pageCount - 1;

  for (const [index, page] of loaded.doc.getPages().entries()) {
    const label = formatLabel(format, startAt + index, lastNumber);
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const { width, height } = page.getSize();

    let x: number;
    if (position.endsWith('left')) x = margin;
    else if (position.endsWith('right')) x = width - margin - textWidth;
    else x = (width - textWidth) / 2;

    const y = position.startsWith('bottom') ? margin : height - margin - fontSize;

    page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
  }

  return savePdf(loaded.doc, `${loaded.baseName}-numbered.pdf`);
}
