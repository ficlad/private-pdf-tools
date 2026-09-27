import { degrees, rgb, StandardFonts } from 'pdf-lib';

import { loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';

export interface WatermarkOptions {
  /** The watermark text (required, 1–100 characters). */
  text: string;
  /** 0 (invisible) to 1 (opaque); default 0.25. */
  opacity?: number;
  /** Counter-clockwise rotation in degrees; default 45. */
  rotationDegrees?: number;
  /** Font size in points; omit to auto-fit the page width. */
  fontSize?: number;
}

/**
 * Draw a semi-transparent text watermark across the middle of every page.
 */
export async function addWatermark(
  input: PdfInput,
  options: WatermarkOptions,
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  const text = options.text;
  if (typeof text !== 'string' || text.trim().length === 0 || text.length > 100) {
    throw new PdfOperationError(
      'invalid-options',
      'Watermark text must be between 1 and 100 characters.',
    );
  }
  const opacity = options.opacity ?? 0.25;
  if (!Number.isFinite(opacity) || opacity <= 0 || opacity > 1) {
    throw new PdfOperationError('invalid-options', 'Opacity must be between 0 and 1.');
  }
  const rotation = options.rotationDegrees ?? 45;
  if (!Number.isFinite(rotation) || rotation < -360 || rotation > 360) {
    throw new PdfOperationError('invalid-options', 'Rotation must be between -360 and 360.');
  }
  if (
    options.fontSize !== undefined &&
    (!Number.isFinite(options.fontSize) || options.fontSize < 4 || options.fontSize > 300)
  ) {
    throw new PdfOperationError('invalid-options', 'Font size must be between 4 and 300 points.');
  }

  const loaded = await loadPdf(input, loadOptions);
  const font = await loaded.doc.embedFont(StandardFonts.HelveticaBold);

  let helveticaSafe: string;
  try {
    // Standard fonts only cover WinAnsi; verify the text is encodable.
    font.widthOfTextAtSize(text, 12);
    helveticaSafe = text;
  } catch {
    throw new PdfOperationError(
      'invalid-options',
      'The watermark text contains characters this tool cannot draw. Use basic Latin text.',
    );
  }

  for (const page of loaded.doc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize =
      options.fontSize ??
      Math.max(
        12,
        Math.min(120, (0.7 * width) / (font.widthOfTextAtSize(helveticaSafe, 100) / 100)),
      );
    const textWidth = font.widthOfTextAtSize(helveticaSafe, fontSize);
    const radians = (rotation * Math.PI) / 180;

    // Shift the baseline origin so the text's midpoint lands on the page
    // center after rotation about the origin.
    const x = width / 2 - (textWidth / 2) * Math.cos(radians);
    const y = height / 2 - (textWidth / 2) * Math.sin(radians);

    page.drawText(helveticaSafe, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(rotation),
    });
  }

  return savePdf(loaded.doc, `${loaded.baseName}-watermarked.pdf`);
}
