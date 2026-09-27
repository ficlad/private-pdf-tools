import { duplicatePageAfter, loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';
import { assertPageIndexes } from '../validate';

/**
 * Duplicate the given pages (0-based): each listed page gets one copy
 * inserted immediately after the original. Duplicate indexes are ignored.
 */
export async function duplicatePages(
  input: PdfInput,
  pageIndexes: readonly number[],
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  if (pageIndexes.length === 0) {
    throw new PdfOperationError('invalid-options', 'Select at least one page to duplicate.');
  }

  const loaded = await loadPdf(input, loadOptions);
  assertPageIndexes(pageIndexes, loaded.pageCount);

  // Insert from the highest index down so earlier insertions do not shift
  // the positions of pages still to be duplicated.
  const unique = [...new Set(pageIndexes)].sort((a, b) => b - a);
  for (const pageIndex of unique) {
    await duplicatePageAfter(loaded.doc, pageIndex);
  }
  return savePdf(loaded.doc, `${loaded.baseName}-duplicated.pdf`);
}
