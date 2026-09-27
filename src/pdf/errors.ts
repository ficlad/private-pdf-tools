/**
 * Typed, user-presentable errors for the PDF layer (spec §8, §17).
 *
 * Every failure that can be triggered by user input must surface as a
 * `PdfOperationError` with a stable `code` and a human-readable message that
 * is safe to display. Raw exceptions from the underlying PDF library must
 * never leak out of this layer.
 */

export type PdfErrorCode =
  | 'empty-file'
  | 'file-too-large'
  | 'not-a-pdf'
  | 'not-an-image'
  | 'encrypted'
  | 'malformed'
  | 'zero-pages'
  | 'page-out-of-range'
  | 'invalid-options'
  | 'no-input'
  | 'operation-failed';

const DEFAULT_MESSAGES: Record<PdfErrorCode, string> = {
  'empty-file': 'This file is empty.',
  'file-too-large': 'This file is too large to process safely in the browser.',
  'not-a-pdf': 'This file does not look like a PDF.',
  'not-an-image': 'This file does not look like a supported image (JPG or PNG).',
  encrypted:
    'This PDF is password-protected or encrypted. Please remove the password first, then try again.',
  malformed:
    'This PDF could not be processed. It may be damaged or use a PDF feature that this tool does not support.',
  'zero-pages': 'This PDF has no pages.',
  'page-out-of-range': 'One or more selected pages do not exist in this PDF.',
  'invalid-options': 'The requested settings are not valid for this document.',
  'no-input': 'No file was provided.',
  'operation-failed':
    'This operation could not be completed. The PDF may be damaged or unsupported.',
};

export class PdfOperationError extends Error {
  readonly code: PdfErrorCode;

  /** Safe to show to the user verbatim. Never contains file contents or stack traces. */
  readonly userMessage: string;

  constructor(code: PdfErrorCode, userMessage?: string, options?: { cause?: unknown }) {
    const message = userMessage ?? DEFAULT_MESSAGES[code];
    super(message, options);
    this.name = 'PdfOperationError';
    this.code = code;
    this.userMessage = message;
  }
}

export function isPdfOperationError(value: unknown): value is PdfOperationError {
  return value instanceof PdfOperationError;
}

/**
 * Wrap an unknown thrown value into a typed error, preserving the original
 * as `cause` for debugging without exposing it to the UI.
 */
export function toPdfOperationError(cause: unknown, fallback: PdfErrorCode): PdfOperationError {
  if (isPdfOperationError(cause)) return cause;
  return new PdfOperationError(fallback, undefined, { cause });
}
