import { copyPagesInto, createPdf, loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';

/**
 * Merge the given PDFs into one document, keeping file order and page order.
 */
export async function mergePdfs(
  inputs: readonly PdfInput[],
  options: LoadOptions = {},
): Promise<PdfOutput> {
  if (inputs.length === 0) throw new PdfOperationError('no-input');

  const target = await createPdf();
  let firstBaseName: string | undefined;

  for (const input of inputs) {
    const loaded = await loadPdf(input, options);
    firstBaseName ??= loaded.baseName;
    const allPages = loaded.doc.getPageIndices();
    await copyPagesInto(target, loaded.doc, allPages);
  }

  return savePdf(target, `${firstBaseName ?? 'document'}-merged.pdf`);
}
