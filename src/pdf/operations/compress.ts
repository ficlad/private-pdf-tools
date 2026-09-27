import { loadPdf, savePdf, type LoadOptions } from '../adapter';
import type { PdfInput } from '../types';
import type { PdfOutput } from '../types';

export interface CompressResult {
  output: PdfOutput;
  bytesBefore: number;
  bytesAfter: number;
}

/**
 * Lossless "structural" compression: parse and re-save the document with
 * object streams and pdf-lib's serializer, which drops unused objects,
 * dead xref entries and incremental-update baggage. Content and images are
 * untouched, so the result is visually identical.
 *
 * Files that are already tightly packed may not shrink — the UI reports the
 * honest before/after sizes either way. Image downsampling (lossy, raster)
 * is a separate mode implemented in rasterize.ts.
 */
export async function compressPdf(
  input: PdfInput,
  loadOptions: LoadOptions = {},
): Promise<CompressResult> {
  const loaded = await loadPdf(input, loadOptions);
  const output = await savePdf(loaded.doc, `${loaded.baseName}-compressed.pdf`);
  return {
    output,
    bytesBefore: input.bytes.length,
    bytesAfter: output.bytes.length,
  };
}
