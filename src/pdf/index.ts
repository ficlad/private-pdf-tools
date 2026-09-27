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
