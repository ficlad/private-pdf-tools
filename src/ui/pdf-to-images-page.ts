import '../styles.css';
import type { DownloadableFile } from './download';
import { initSingleFileTool } from './single-file-tool';

function selectedFormat(): 'png' | 'jpeg' {
  const checked = document.querySelector<HTMLInputElement>('input[name="format"]:checked');
  return checked?.value === 'jpeg' ? 'jpeg' : 'png';
}

initSingleFileTool({
  workingMessage: 'Rendering pages…',
  execute: async (input, ctx) => {
    // Imported directly (not via the barrel): this module pulls in PDF.js.
    const { pdfToImages } = await import('../pdf/operations/pdf-to-images');
    const format = selectedFormat();
    const images = await pdfToImages(input, {
      format,
      quality: format === 'jpeg' ? 0.9 : undefined,
      onProgress: (done, total) => {
        ctx.status.info(`Rendering page ${String(done)} of ${String(total)}…`);
      },
    });
    return images.map<DownloadableFile>((image) => ({
      data: image.blob,
      name: image.suggestedName,
      mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
      detail: `${String(image.width)}×${String(image.height)}`,
    }));
  },
  successMessage: (count) =>
    `Done. ${String(count)} image${count === 1 ? ' is' : 's are'} ready below.`,
});
