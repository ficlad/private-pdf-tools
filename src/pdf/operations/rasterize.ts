/**
 * Rasterizing rebuild: render every page with PDF.js and rebuild the PDF
 * from the rendered images with pdf-lib. This is the mechanism behind
 * grayscale conversion and the lossy "shrink images" compression mode.
 *
 * HONEST TRADE-OFF (stated in the UI, spec §23): the output pages are
 * pictures of the original pages. Selectable text, vector sharpness, links
 * and form fields are lost. Vector-preserving grayscale/recompression is
 * out of scope for V1 — pdf-lib cannot rewrite existing content streams.
 *
 * Browser-only (needs canvas); covered by Playwright tests, not node tests,
 * and deliberately NOT exported from the package barrel.
 */

import { createPdf, savePdf } from '../adapter';
import { PdfOperationError, toPdfOperationError } from '../errors';
import { openForRendering, renderPageToCanvas } from '../pdfjs-adapter';
import type { PdfInput, PdfOutput } from '../types';
import { sanitizeBaseName, type ValidateOptions } from '../validate';

export interface RasterizeOptions extends ValidateOptions {
  /** Convert pixels to grayscale. */
  grayscale?: boolean;
  /** JPEG quality 0–1 (default 0.8). */
  quality?: number;
  /** Render scale; 1 = 72 dpi (default 2). */
  scale?: number;
  onProgress?: (done: number, total: number) => void;
}

export interface RasterizeResult {
  output: PdfOutput;
  bytesBefore: number;
  bytesAfter: number;
}

function toGrayscale(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (!context) throw new PdfOperationError('operation-failed');
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    // Rec. 601 luma.
    const gray = 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  context.putImageData(image, 0, 0);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new PdfOperationError('operation-failed'));
          return;
        }
        blob
          .arrayBuffer()
          .then((buffer) => {
            resolve(new Uint8Array(buffer));
          })
          .catch((cause: unknown) => {
            reject(toPdfOperationError(cause, 'operation-failed'));
          });
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function rasterizePdf(
  input: PdfInput,
  options: RasterizeOptions = {},
): Promise<RasterizeResult> {
  const quality = options.quality ?? 0.8;
  const scale = options.scale ?? 2;
  if (!Number.isFinite(quality) || quality <= 0 || quality > 1) {
    throw new PdfOperationError('invalid-options', 'Image quality must be between 0 and 1.');
  }
  if (!Number.isFinite(scale) || scale <= 0 || scale > 8) {
    throw new PdfOperationError('invalid-options', 'Render scale must be between 0 and 8.');
  }

  const source = await openForRendering(input.bytes, options);
  try {
    const target = await createPdf();
    for (let pageIndex = 0; pageIndex < source.numPages; pageIndex += 1) {
      const canvas = await renderPageToCanvas(source, pageIndex, { scale });
      if (options.grayscale) toGrayscale(canvas);
      const jpegBytes = await canvasToJpeg(canvas, quality);

      // Page size in points, in DISPLAY orientation (viewport applies /Rotate).
      const page = await source.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1 });

      const image = await target.embedJpg(jpegBytes);
      const outPage = target.addPage([viewport.width, viewport.height]);
      outPage.drawImage(image, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });

      canvas.width = 0;
      canvas.height = 0;
      options.onProgress?.(pageIndex + 1, source.numPages);
    }

    const suffix = options.grayscale ? 'grayscale' : 'compressed';
    const baseName = sanitizeBaseName(input.name, 'document');
    const output = await savePdf(target, `${baseName}-${suffix}.pdf`);
    return { output, bytesBefore: input.bytes.length, bytesAfter: output.bytes.length };
  } finally {
    await source.destroy();
  }
}
