import { copyPagesInto, createPdf, loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';
import { assertPageIndexes } from '../validate';

/**
 * Remove the given pages (0-based) and return the remaining document.
 */
export async function deletePages(
  input: PdfInput,
  pageIndexes: readonly number[],
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  if (pageIndexes.length === 0) {
    throw new PdfOperationError('invalid-options', 'Select at least one page to delete.');
  }

  const loaded = await loadPdf(input, loadOptions);
  assertPageIndexes(pageIndexes, loaded.pageCount);

  const toDelete = new Set(pageIndexes);
  const keep = loaded.doc.getPageIndices().filter((i) => !toDelete.has(i));
  if (keep.length === 0) {
    throw new PdfOperationError(
      'invalid-options',
      'Cannot delete every page: the resulting PDF would be empty.',
    );
  }

  const target = await createPdf();
  await copyPagesInto(target, loaded.doc, keep);
  return savePdf(target, `${loaded.baseName}-edited.pdf`);
}
