import { copyPagesInto, createPdf, loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';
import { assertPageIndexes } from '../validate';

/**
 * Rearrange pages. `order` must be a permutation of every page index
 * (0-based): each existing page appears exactly once.
 */
export async function reorderPages(
  input: PdfInput,
  order: readonly number[],
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  const loaded = await loadPdf(input, loadOptions);

  if (order.length !== loaded.pageCount) {
    throw new PdfOperationError(
      'invalid-options',
      `The new order must list all ${String(loaded.pageCount)} page(s) exactly once.`,
    );
  }
  assertPageIndexes(order, loaded.pageCount);
  if (new Set(order).size !== order.length) {
    throw new PdfOperationError('invalid-options', 'The new order lists the same page twice.');
  }

  const target = await createPdf();
  await copyPagesInto(target, loaded.doc, order);
  return savePdf(target, `${loaded.baseName}-reordered.pdf`);
}
