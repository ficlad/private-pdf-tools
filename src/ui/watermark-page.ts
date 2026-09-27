import '../styles.css';
import { byId } from './dom';
import { pdfDownload } from './download';
import { initSingleFileTool } from './single-file-tool';

initSingleFileTool({
  workingMessage: 'Adding watermark…',
  execute: async (input, ctx) => {
    const text = byId<HTMLInputElement>('wm-text').value.trim();
    if (text.length === 0) {
      ctx.status.error('Enter the watermark text first.');
      return null;
    }
    const opacity = Number.parseFloat(byId<HTMLInputElement>('wm-opacity').value);
    const rotationDegrees = Number.parseFloat(byId<HTMLInputElement>('wm-rotation').value);
    if (!Number.isFinite(opacity) || opacity <= 0 || opacity > 1) {
      ctx.status.error('Opacity must be between 0.05 and 1.');
      return null;
    }
    if (!Number.isFinite(rotationDegrees) || rotationDegrees < -360 || rotationDegrees > 360) {
      ctx.status.error('Rotation must be between -360 and 360 degrees.');
      return null;
    }
    const { addWatermark } = await import('../pdf');
    return [pdfDownload(await addWatermark(input, { text, opacity, rotationDegrees }))];
  },
  successMessage: () => 'Done. Your watermarked PDF is ready below.',
});
