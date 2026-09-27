/**
 * Shared types for the PDF operation layer (spec §7).
 *
 * All page indexes in this layer are 0-based. The UI is responsible for
 * converting from the 1-based page numbers users type.
 */

/** A file handed to the operation layer. The name is untrusted (spec §8). */
export interface PdfInput {
  bytes: Uint8Array;
  /** Untrusted original filename; used only to derive a sanitized output name. */
  name?: string;
}

/** Result of an operation, ready to be offered as a download. */
export interface PdfOutput {
  bytes: Uint8Array;
  pageCount: number;
  /** Sanitized filename suggestion, always ending in .pdf. */
  suggestedName: string;
}

/** Inclusive 0-based page range. */
export interface PageRange {
  from: number;
  to: number;
}

export type SplitOptions =
  { mode: 'ranges'; ranges: PageRange[] } | { mode: 'every'; pagesPerChunk: number };

export type RotationAngle = 90 | 180 | 270;

export interface RotateOptions {
  angle: RotationAngle;
  /** Pages to rotate; omit to rotate all pages. */
  pages?: number[];
}

export interface ImageInput {
  bytes: Uint8Array;
  /** Untrusted original filename. */
  name?: string;
}
