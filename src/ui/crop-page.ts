import '../styles.css';
import { byId } from './dom';
import { pdfDownload } from './download';
import { initSelectPagesTool } from './select-pages-tool';

function inset(id: string): number {
  return Number.parseFloat(byId<HTMLInputElement>(id).value);
}

initSelectPagesTool({
  workingMessage: 'Cropping…',
  selectPrompt:
    'Enter how much to cut from each edge; tick pages to crop only those, or tick none to crop every page.',
  emptySelectionMessage: '',
  allowEmptySelection: true,
  execute: async (input, selected, ctx) => {
    const insets = {
      top: inset('crop-top'),
      right: inset('crop-right'),
      bottom: inset('crop-bottom'),
      left: inset('crop-left'),
    };
    for (const value of Object.values(insets)) {
      if (!Number.isFinite(value) || value < 0) {
        ctx.status.error('Crop amounts must be 0 or larger, in points.');
        return null;
      }
    }
    const { cropPages } = await import('../pdf');
    const options = selected.length > 0 ? { insets, pages: selected } : { insets };
    return [pdfDownload(await cropPages(input, options))];
  },
  successMessage: () => 'Done. Your cropped PDF is ready below.',
});
