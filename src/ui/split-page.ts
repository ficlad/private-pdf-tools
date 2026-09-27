/**
 * Split tool page. PDF code loads lazily on first use (spec §15).
 */

import '../styles.css';
import type { SplitOptions } from '../pdf/types';
import { byId } from './dom';
import { pdfDownload } from './download';
import { parsePageRanges } from './parse-ranges';
import { initSingleFileTool, type ToolContext } from './single-file-tool';

function buildOptions(ctx: ToolContext): SplitOptions | null {
  const checked = document.querySelector<HTMLInputElement>('input[name="mode"]:checked');
  if (checked?.value !== 'ranges') {
    const pagesPerChunk = Number.parseInt(byId<HTMLInputElement>('every-n').value, 10);
    if (!Number.isInteger(pagesPerChunk) || pagesPerChunk < 1) {
      ctx.status.error('Pages per file must be a whole number of at least 1.');
      return null;
    }
    return { mode: 'every', pagesPerChunk };
  }
  const parsed = parsePageRanges(byId<HTMLInputElement>('ranges').value);
  if (!parsed.ok) {
    ctx.status.error(parsed.message);
    return null;
  }
  return { mode: 'ranges', ranges: parsed.ranges };
}

initSingleFileTool({
  workingMessage: 'Splitting…',
  execute: async (input, ctx) => {
    const options = buildOptions(ctx);
    if (options === null) return null;
    const { splitPdf } = await import('../pdf');
    return (await splitPdf(input, options)).map(pdfDownload);
  },
  successMessage: (count) =>
    `Done. ${String(count)} file${count === 1 ? ' is' : 's are'} ready below.`,
});
