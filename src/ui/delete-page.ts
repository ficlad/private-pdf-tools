import '../styles.css';
import { pdfDownload } from './download';
import { initSelectPagesTool } from './select-pages-tool';

initSelectPagesTool({
  workingMessage: 'Deleting pages…',
  selectPrompt: 'Tick the pages to delete, then press "Delete pages".',
  emptySelectionMessage: 'Select at least one page to delete.',
  execute: async (input, selected) => {
    const { deletePages } = await import('../pdf');
    return [pdfDownload(await deletePages(input, selected))];
  },
  successMessage: () => 'Done. Your PDF without the deleted pages is ready below.',
});
