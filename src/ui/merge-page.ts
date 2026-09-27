/**
 * Merge tool page. PDF code loads lazily on first use (spec §15).
 */

import '../styles.css';
import { pdfDownload } from './download';
import { initMultiFileTool } from './multi-file-tool';

initMultiFileTool({
  minFiles: 2,
  workingMessage: (count) => `Merging ${String(count)} files…`,
  execute: async (inputs) => {
    const { mergePdfs } = await import('../pdf');
    return [pdfDownload(await mergePdfs(inputs))];
  },
  successMessage: () => 'Done. Your merged PDF is ready below.',
});
