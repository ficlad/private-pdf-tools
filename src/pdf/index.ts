/**
 * Public API of the PDF operation layer (spec §7).
 *
 * The UI imports from this module only — never from pdf-lib or the adapter.
 * All page indexes are 0-based; all failures are `PdfOperationError`s.
 */

export { PdfOperationError, isPdfOperationError, type PdfErrorCode } from './errors';
export type {
  ImageInput,
  PageRange,
  PdfInput,
  PdfOutput,
  RotateOptions,
  RotationAngle,
  SplitOptions,
} from './types';
export {
  DEFAULT_MAX_FILE_BYTES,
  detectImageKind,
  looksLikePdf,
  sanitizeBaseName,
} from './validate';

export { mergePdfs } from './operations/merge';
export { splitPdf } from './operations/split';
export { extractPages } from './operations/extract';
export { deletePages } from './operations/delete-pages';
export { reorderPages } from './operations/reorder';
export { rotatePages } from './operations/rotate';
export { duplicatePages } from './operations/duplicate';
export { reversePages } from './operations/reverse';
export { imagesToPdf, type ImagesToPdfOptions } from './operations/images-to-pdf';
export {
  addPageNumbers,
  type PageNumberFormat,
  type PageNumberOptions,
  type PageNumberPosition,
} from './operations/page-numbers';
export { addWatermark, type WatermarkOptions } from './operations/watermark';
export { cropPages, type CropInsets, type CropOptions } from './operations/crop';
export { resizePages, type PageSizeTarget, type ResizeOptions } from './operations/resize';
export {
  readPdfMetadata,
  setPdfMetadata,
  type MetadataEdits,
  type PdfMetadata,
} from './operations/metadata';
export { flattenPdf, type FlattenResult } from './operations/flatten';
export { compressPdf, type CompressResult } from './operations/compress';
export { readPdfInfo, type PageSizeSummary, type PdfInfo } from './operations/info';
// NOTE: pdf-to-images.ts and rasterize.ts are browser-only (canvas) and are
// intentionally NOT exported here; pages import them directly so this barrel
// stays node-safe and PDF.js is never pulled in by pdf-lib-only tools.
