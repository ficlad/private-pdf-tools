import '../styles.css';
import type { PageNumberFormat, PageNumberPosition } from '../pdf';
import { byId } from './dom';
import { pdfDownload } from './download';
import { initSingleFileTool, type ToolContext } from './single-file-tool';

const POSITIONS = new Set([
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'top-left',
  'top-center',
  'top-right',
]);
const FORMATS = new Set(['n', 'page-n', 'n-of-total', 'page-n-of-total']);

function collectOptions(ctx: ToolContext): {
  position: PageNumberPosition;
  format: PageNumberFormat;
  startAt: number;
  margin: number;
} | null {
  const position = byId<HTMLSelectElement>('position').value;
  const format = byId<HTMLSelectElement>('format').value;
  const startAt = Number.parseInt(byId<HTMLInputElement>('start-at').value, 10);
  const margin = Number.parseInt(byId<HTMLInputElement>('margin').value, 10);
  if (!Number.isInteger(startAt) || startAt < 0) {
    ctx.status.error('The starting number must be 0 or higher.');
    return null;
  }
  if (!Number.isInteger(margin) || margin < 0 || margin > 200) {
    ctx.status.error('The margin must be between 0 and 200 points.');
    return null;
  }
  return {
    position: (POSITIONS.has(position) ? position : 'bottom-center') as PageNumberPosition,
    format: (FORMATS.has(format) ? format : 'n') as PageNumberFormat,
    startAt,
    margin,
  };
}

initSingleFileTool({
  workingMessage: 'Adding page numbers…',
  execute: async (input, ctx) => {
    const options = collectOptions(ctx);
    if (options === null) return null;
    const { addPageNumbers } = await import('../pdf');
    return [pdfDownload(await addPageNumbers(input, options))];
  },
  successMessage: () => 'Done. Your numbered PDF is ready below.',
});
