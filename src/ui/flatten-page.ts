import '../styles.css';
import { pdfDownload } from './download';
import { initSingleFileTool } from './single-file-tool';

let summary = '';

initSingleFileTool({
  workingMessage: 'Flattening…',
  execute: async (input) => {
    const { flattenPdf } = await import('../pdf');
    const result = await flattenPdf(input);
    summary =
      result.flattenedFields > 0
        ? `Done. ${String(result.flattenedFields)} form field${
            result.flattenedFields === 1 ? ' was' : 's were'
          } flattened into the page content.`
        : 'Done. This PDF had no form fields to flatten; the file was re-saved unchanged.';
    return [pdfDownload(result.output)];
  },
  successMessage: () => summary,
});
