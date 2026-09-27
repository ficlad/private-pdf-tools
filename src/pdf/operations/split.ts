import { copyPagesInto, createPdf, loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PageRange, PdfInput, PdfOutput, SplitOptions } from '../types';
import { assertPageIndexes } from '../validate';

function rangesFromOptions(options: SplitOptions, pageCount: number): PageRange[] {
  if (options.mode === 'every') {
    const { pagesPerChunk } = options;
    if (!Number.isInteger(pagesPerChunk) || pagesPerChunk < 1) {
      throw new PdfOperationError(
        'invalid-options',
        'Pages per file must be a whole number of at least 1.',
      );
    }
    const ranges: PageRange[] = [];
    for (let from = 0; from < pageCount; from += pagesPerChunk) {
      ranges.push({ from, to: Math.min(from + pagesPerChunk, pageCount) - 1 });
    }
    return ranges;
  }

  if (options.ranges.length === 0) {
    throw new PdfOperationError('invalid-options', 'At least one page range is required.');
  }
  for (const range of options.ranges) {
    assertPageIndexes([range.from, range.to], pageCount);
    if (range.from > range.to) {
      throw new PdfOperationError(
        'invalid-options',
        `Invalid range: page ${String(range.from + 1)} comes after page ${String(range.to + 1)}.`,
      );
    }
  }
  return options.ranges;
}

/**
 * Split a PDF into multiple documents, either every N pages or by explicit
 * 0-based inclusive ranges. Returns one output per chunk, in order.
 */
export async function splitPdf(
  input: PdfInput,
  options: SplitOptions,
  loadOptions: LoadOptions = {},
): Promise<PdfOutput[]> {
  const loaded = await loadPdf(input, loadOptions);
  const ranges = rangesFromOptions(options, loaded.pageCount);

  const outputs: PdfOutput[] = [];
  for (const [chunkIndex, range] of ranges.entries()) {
    const target = await createPdf();
    const indexes: number[] = [];
    for (let i = range.from; i <= range.to; i += 1) indexes.push(i);
    await copyPagesInto(target, loaded.doc, indexes);
    outputs.push(await savePdf(target, `${loaded.baseName}-part-${String(chunkIndex + 1)}.pdf`));
  }
  return outputs;
}
