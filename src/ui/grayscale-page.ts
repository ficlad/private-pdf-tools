import '../styles.css';
import { formatBytes } from './dom';
import { pdfDownload } from './download';
import { initSingleFileTool } from './single-file-tool';

let summary = '';

initSingleFileTool({
  workingMessage: 'Converting to grayscale…',
  execute: async (input, ctx) => {
    // Browser-only module (canvas); imported directly, not via the barrel.
    const { rasterizePdf } = await import('../pdf/operations/rasterize');
    const result = await rasterizePdf(input, {
      grayscale: true,
      onProgress: (done, total) => {
        ctx.status.info(`Converting page ${String(done)} of ${String(total)}…`);
      },
    });
    summary = `Done. Grayscale PDF ready below (${formatBytes(result.bytesBefore)} → ${formatBytes(
      result.bytesAfter,
    )}). Pages are now images: text is no longer selectable.`;
    return [pdfDownload(result.output)];
  },
  successMessage: () => summary,
});
