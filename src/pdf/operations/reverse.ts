import { copyPagesInto, createPdf, loadPdf, savePdf, type LoadOptions } from '../adapter';
import type { PdfInput, PdfOutput } from '../types';

/**
 * Reverse the page order of a PDF.
 */
export async function reversePages(
  input: PdfInput,
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  const loaded = await loadPdf(input, loadOptions);
  const reversed = loaded.doc.getPageIndices().reverse();

  const target = await createPdf();
  await copyPagesInto(target, loaded.doc, reversed);
  return savePdf(target, `${loaded.baseName}-reversed.pdf`);
}
