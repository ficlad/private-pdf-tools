/**
 * Thin adapter over PDF.js (pdfjs-dist), used for rendering: page thumbnails
 * and PDF-to-image export (spec §7). Browser-only — it renders to canvas.
 *
 * This module is imported ONLY via dynamic import from the pages that need
 * it, so PDF.js never loads on other pages (spec §15).
 *
 * Security posture (spec §10): `isEvalSupported: false` keeps PDF.js away
 * from `new Function` font paths so the strict CSP holds, the worker is a
 * bundled same-origin asset (never a CDN), and embedded PDF JavaScript is
 * never executed — we only rasterize pages.
 */

import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import { PdfOperationError, toPdfOperationError } from './errors';
import { assertPlausiblePdf, type ValidateOptions } from './validate';

let workerConfigured = false;

function ensureWorker(): void {
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    workerConfigured = true;
  }
}

function mapPdfjsError(cause: unknown): PdfOperationError {
  const name =
    typeof cause === 'object' && cause !== null && 'name' in cause ? String(cause.name) : '';
  if (name === 'PasswordException') {
    return new PdfOperationError('encrypted', undefined, { cause });
  }
  if (name === 'InvalidPDFException') {
    return new PdfOperationError('malformed', undefined, { cause });
  }
  return toPdfOperationError(cause, 'malformed');
}

/**
 * Validate and open an untrusted PDF with PDF.js for rendering.
 * Callers must `destroy()` the returned document when done (spec §9).
 */
export async function openForRendering(
  bytes: Uint8Array,
  options: ValidateOptions = {},
): Promise<PDFDocumentProxy> {
  assertPlausiblePdf(bytes, options);
  ensureWorker();
  try {
    const doc = await pdfjs.getDocument({
      // PDF.js transfers the buffer to its worker; hand it a copy so the
      // caller's bytes stay usable.
      data: bytes.slice(),
      isEvalSupported: false,
      disableAutoFetch: true,
    }).promise;
    if (doc.numPages === 0) {
      await doc.destroy();
      throw new PdfOperationError('zero-pages');
    }
    return doc;
  } catch (cause) {
    if (cause instanceof PdfOperationError) throw cause;
    throw mapPdfjsError(cause);
  }
}

export interface RenderOptions {
  /** Render scale relative to the page's natural size (1 = 72 dpi). */
  scale?: number;
  /** Instead of a scale, fit the page's width to this many pixels. */
  targetWidth?: number;
}

/**
 * Rasterize one page (0-based index) onto a fresh canvas.
 */
export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageIndex: number,
  options: RenderOptions = {},
): Promise<HTMLCanvasElement> {
  try {
    const page = await doc.getPage(pageIndex + 1); // PDF.js is 1-based
    const natural = page.getViewport({ scale: 1 });
    const scale =
      options.targetWidth !== undefined
        ? options.targetWidth / natural.width
        : (options.scale ?? 1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new PdfOperationError('operation-failed');

    // White background so transparent PDFs export legibly.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;
    page.cleanup();
    return canvas;
  } catch (cause) {
    if (cause instanceof PdfOperationError) throw cause;
    throw toPdfOperationError(cause, 'operation-failed');
  }
}
