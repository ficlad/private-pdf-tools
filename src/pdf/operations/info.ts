import { PDFDocument } from 'pdf-lib';

import { loadPdf, type LoadOptions } from '../adapter';
import { isPdfOperationError } from '../errors';
import type { PdfInput } from '../types';
import { assertPlausiblePdf } from '../validate';
import { readPdfMetadata, type PdfMetadata } from './metadata';

export interface PageSizeSummary {
  width: number;
  height: number;
  count: number;
}

/**
 * All string values are UNTRUSTED document data (spec §8): render with text
 * nodes only.
 */
export interface PdfInfo {
  fileBytes: number;
  /** From the %PDF-x.y header; null when unreadable. */
  pdfVersion: string | null;
  encrypted: boolean;
  /** Null when the document cannot be parsed far enough to count pages. */
  pageCount: number | null;
  /** Distinct page sizes in points (0.1pt precision), with page counts. */
  pageSizes: PageSizeSummary[];
  /** Null for encrypted documents (metadata may be encrypted too). */
  metadata: PdfMetadata | null;
}

function headerVersion(bytes: Uint8Array): string | null {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  const match = /%PDF-(\d\.\d)/.exec(head);
  return match?.[1] ?? null;
}

function summarizePageSizes(doc: PDFDocument): PageSizeSummary[] {
  const sizes = new Map<string, PageSizeSummary>();
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const w = Math.round(width * 10) / 10;
    const h = Math.round(height * 10) / 10;
    const key = `${String(w)}x${String(h)}`;
    const existing = sizes.get(key);
    if (existing) existing.count += 1;
    else sizes.set(key, { width: w, height: h, count: 1 });
  }
  return [...sizes.values()];
}

/**
 * Inspect a PDF without modifying it: version, encryption flag, page count,
 * page sizes, metadata. For encrypted files, only structural facts that are
 * readable without a password are reported — this tool never bypasses or
 * removes access controls (spec §4).
 */
export async function readPdfInfo(
  input: PdfInput,
  loadOptions: LoadOptions = {},
): Promise<PdfInfo> {
  assertPlausiblePdf(input.bytes, loadOptions);
  const base = {
    fileBytes: input.bytes.length,
    pdfVersion: headerVersion(input.bytes),
  };

  try {
    const loaded = await loadPdf(input, loadOptions);
    return {
      ...base,
      encrypted: false,
      pageCount: loaded.pageCount,
      pageSizes: summarizePageSizes(loaded.doc),
      metadata: await readPdfMetadata(input, loadOptions),
    };
  } catch (cause) {
    if (isPdfOperationError(cause) && cause.code === 'encrypted') {
      // Structure-only peek at the declared page count; no content, no
      // metadata, and nothing is decrypted or unlocked.
      let pageCount: number | null = null;
      try {
        const doc = await PDFDocument.load(input.bytes, { ignoreEncryption: true });
        pageCount = doc.getPageCount();
      } catch {
        pageCount = null;
      }
      return { ...base, encrypted: true, pageCount, pageSizes: [], metadata: null };
    }
    throw cause;
  }
}
