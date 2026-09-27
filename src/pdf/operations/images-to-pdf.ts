import { addImagePage, createPdf, savePdf, type PageSizePreset } from '../adapter';
import { PdfOperationError } from '../errors';
import type { ImageInput, PdfOutput } from '../types';
import { assertPlausibleImage, sanitizeBaseName, type ValidateOptions } from '../validate';

export interface ImagesToPdfOptions extends ValidateOptions {
  /** 'fit' (default): page matches image size. 'a4'/'letter': image scaled and centered. */
  pageSize?: PageSizePreset;
}

/**
 * Build a PDF from JPG/PNG images, one image per page, in the given order.
 * Image format is detected from magic bytes, never from filename or MIME type.
 */
export async function imagesToPdf(
  images: readonly ImageInput[],
  options: ImagesToPdfOptions = {},
): Promise<PdfOutput> {
  if (images.length === 0) throw new PdfOperationError('no-input');
  const pageSize = options.pageSize ?? 'fit';

  const doc = await createPdf();
  let firstBaseName: string | undefined;

  for (const image of images) {
    const kind = assertPlausibleImage(image.bytes, options);
    firstBaseName ??= sanitizeBaseName(image.name, 'images');
    await addImagePage(doc, image.bytes, kind, pageSize);
  }

  return savePdf(doc, `${firstBaseName ?? 'images'}.pdf`);
}
