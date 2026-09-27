import '../styles.css';
import { byId } from './dom';
import { pdfDownload } from './download';
import { initSingleFileTool } from './single-file-tool';
import { renderThumbnailGrid, type ThumbnailGrid } from './thumbnails';

const thumbs = byId<HTMLDivElement>('thumbs');
let grid: ThumbnailGrid | null = null;

initSingleFileTool({
  workingMessage: 'Reordering…',
  onFile: async (bytes, _file, ctx) => {
    ctx.status.info('Rendering page previews…');
    grid = await renderThumbnailGrid(thumbs, bytes, {
      mode: 'order',
      onProgress: (done, total) => {
        ctx.status.info(`Rendering page previews… (${String(done)}/${String(total)})`);
      },
    });
    ctx.status.info('Use the arrows to arrange the pages, then press "Apply new order".');
  },
  execute: async (input) => {
    const order = grid?.getOrder();
    const { reorderPages } = await import('../pdf');
    if (!order) {
      // No thumbnails (should not happen) — treat as identity order failure.
      return [pdfDownload(await reorderPages(input, []))];
    }
    return [pdfDownload(await reorderPages(input, order))];
  },
  successMessage: () => 'Done. Your reordered PDF is ready below.',
  onReset: () => {
    thumbs.textContent = '';
    grid = null;
  },
});
