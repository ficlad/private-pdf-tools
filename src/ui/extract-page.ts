import '../styles.css';
import { pdfDownload } from './download';
import { initSelectPagesTool } from './select-pages-tool';

initSelectPagesTool({
  workingMessage: 'Extracting pages…',
  selectPrompt: 'Tick the pages to extract, then press "Extract pages".',
  emptySelectionMessage: 'Select at least one page to extract.',
  execute: async (input, selected) => {
    const { extractPages } = await import('../pdf');
    return [pdfDownload(await extractPages(input, selected))];
  },
  successMessage: () => 'Done. Your extracted pages are ready below.',
});
