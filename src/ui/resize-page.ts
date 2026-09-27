import '../styles.css';
import type { PageSizeTarget } from '../pdf';
import { byId } from './dom';
import { pdfDownload } from './download';
import { initSingleFileTool, type ToolContext } from './single-file-tool';

function collectTarget(ctx: ToolContext): PageSizeTarget | null {
  const preset = byId<HTMLSelectElement>('size-preset').value;
  if (preset === 'a4' || preset === 'letter') return preset;
  const width = Number.parseFloat(byId<HTMLInputElement>('custom-width').value);
  const height = Number.parseFloat(byId<HTMLInputElement>('custom-height').value);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 3 || height < 3) {
    ctx.status.error('Enter a custom width and height of at least 3 points.');
    return null;
  }
  return { width, height };
}

initSingleFileTool({
  workingMessage: 'Changing page size…',
  execute: async (input, ctx) => {
    const target = collectTarget(ctx);
    if (target === null) return null;
    const checked = document.querySelector<HTMLInputElement>('input[name="resize-mode"]:checked');
    const mode = checked?.value === 'canvas' ? ('canvas' as const) : ('scale' as const);
    const { resizePages } = await import('../pdf');
    return [pdfDownload(await resizePages(input, { target, mode }))];
  },
  successMessage: () => 'Done. Your resized PDF is ready below.',
});
