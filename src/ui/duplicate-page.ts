import '../styles.css';
import { pdfDownload } from './download';
import { initSelectPagesTool } from './select-pages-tool';

initSelectPagesTool({
  workingMessage: 'Duplicating pages…',
  selectPrompt: 'Tick the pages to duplicate, then press "Duplicate pages".',
  emptySelectionMessage: 'Select at least one page to duplicate.',
  execute: async (input, selected) => {
    const { duplicatePages } = await import('../pdf');
    return [pdfDownload(await duplicatePages(input, selected))];
  },
  successMessage: () => 'Done. Each selected page now has a copy right after it.',
});
