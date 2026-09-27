import { copyPagesInto, createPdf, loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';
import { assertPageIndexes } from '../validate';

/**
 * Extract the given pages (0-based, in the given order) into a new PDF.
 * Repeating an index is allowed and yields the page multiple times.
 */
export async function extractPages(
  input: PdfInput,
  pageIndexes: readonly number[],
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  if (pageIndexes.length === 0) {
    throw new PdfOperationError('invalid-options', 'Select at least one page to extract.');
  }

  const loaded = await loadPdf(input, loadOptions);
  assertPageIndexes(pageIndexes, loaded.pageCount);

  const target = await createPdf();
  await copyPagesInto(target, loaded.doc, pageIndexes);
  return savePdf(target, `${loaded.baseName}-pages.pdf`);
}
