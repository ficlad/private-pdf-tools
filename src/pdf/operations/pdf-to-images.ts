/**
 * PDF → JPG/PNG export, rendered in the browser with PDF.js (spec §3 tool 9).
 *
 * Browser-only (needs canvas), so it is NOT exported from the package barrel:
 * pages import it directly via dynamic import, and it is covered by the
 * Playwright browser tests rather than node unit tests.
 */

import { PdfOperationError, toPdfOperationError } from '../errors';
import { openForRendering, renderPageToCanvas } from '../pdfjs-adapter';
import type { PdfInput } from '../types';
import { assertPageIndexes, sanitizeBaseName, type ValidateOptions } from '../validate';

export type ImageFormat = 'png' | 'jpeg';

export interface PdfToImagesOptions extends ValidateOptions {
  format?: ImageFormat;
  /** Render scale; 1 = 72 dpi, 2 (default) = 144 dpi. */
  scale?: number;
  /** JPEG quality, 0–1. Ignored for PNG. */
  quality?: number;
  /** 0-based pages to export; omit for all pages. */
  pages?: number[];
  /** Progress callback: pages finished out of total. */
  onProgress?: (done: number, total: number) => void;
}

export interface PageImage {
  blob: Blob;
  suggestedName: string;
  /** 0-based source page index. */
  pageIndex: number;
  width: number;
  height: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new PdfOperationError('operation-failed'));
      },
      type,
      quality,
    );
  });
}

/**
 * Render each requested page to an image, one file per page.
 */
export async function pdfToImages(
  input: PdfInput,
  options: PdfToImagesOptions = {},
): Promise<PageImage[]> {
  const format = options.format ?? 'png';
  const scale = options.scale ?? 2;
  if (!Number.isFinite(scale) || scale <= 0 || scale > 8) {
    throw new PdfOperationError('invalid-options', 'Image scale must be between 0 and 8.');
  }

  const doc = await openForRendering(input.bytes, options);
  try {
    const pageIndexes = options.pages ?? Array.from({ length: doc.numPages }, (_, i) => i);
    if (pageIndexes.length === 0) {
      throw new PdfOperationError('invalid-options', 'Select at least one page to export.');
    }
    assertPageIndexes(pageIndexes, doc.numPages);

    const baseName = sanitizeBaseName(input.name, 'document');
    const extension = format === 'png' ? 'png' : 'jpg';
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

    const results: PageImage[] = [];
    for (const pageIndex of pageIndexes) {
      const canvas = await renderPageToCanvas(doc, pageIndex, { scale });
      const blob = await canvasToBlob(canvas, mimeType, options.quality);
      results.push({
        blob,
        suggestedName: `${baseName}-page-${String(pageIndex + 1)}.${extension}`,
        pageIndex,
        width: canvas.width,
        height: canvas.height,
      });
      // Release the canvas backing store promptly (spec §9).
      canvas.width = 0;
      canvas.height = 0;
      options.onProgress?.(results.length, pageIndexes.length);
    }
    return results;
  } catch (cause) {
    throw toPdfOperationError(cause, 'operation-failed');
  } finally {
    await doc.destroy();
  }
}
