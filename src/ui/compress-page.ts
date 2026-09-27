import '../styles.css';
import { byId, formatBytes } from './dom';
import { pdfDownload } from './download';
import { initSingleFileTool } from './single-file-tool';

let summary = '';

function sizeSummary(before: number, after: number): string {
  const saved = before - after;
  if (saved <= 0) {
    return `This PDF was already tightly packed: ${formatBytes(before)} → ${formatBytes(after)}.`;
  }
  const percent = Math.round((saved / before) * 100);
  return `${formatBytes(before)} → ${formatBytes(after)} (${String(percent)}% smaller).`;
}

initSingleFileTool({
  workingMessage: 'Compressing…',
  execute: async (input, ctx) => {
    const checked = document.querySelector<HTMLInputElement>('input[name="compress-mode"]:checked');
    if (checked?.value === 'raster') {
      const quality = Number.parseFloat(byId<HTMLSelectElement>('quality').value);
      const { rasterizePdf } = await import('../pdf/operations/rasterize');
      const result = await rasterizePdf(input, {
        quality: Number.isFinite(quality) ? quality : 0.7,
        scale: 1.5,
        onProgress: (done, total) => {
          ctx.status.info(`Re-rendering page ${String(done)} of ${String(total)}…`);
        },
      });
      summary = `Done. ${sizeSummary(result.bytesBefore, result.bytesAfter)} Pages are now images: text is no longer selectable.`;
      return [pdfDownload(result.output)];
    }

    const { compressPdf } = await import('../pdf');
    const result = await compressPdf(input);
    summary = `Done. ${sizeSummary(result.bytesBefore, result.bytesAfter)}`;
    return [pdfDownload(result.output)];
  },
  successMessage: () => summary,
});
