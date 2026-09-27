import '../styles.css';
import { pdfDownload } from './download';
import { initSingleFileTool } from './single-file-tool';

initSingleFileTool({
  workingMessage: 'Reversing page order…',
  execute: async (input) => {
    const { reversePages } = await import('../pdf');
    return [pdfDownload(await reversePages(input))];
  },
  successMessage: () => 'Done. Your reversed PDF is ready below.',
});
