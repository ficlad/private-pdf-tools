import '../styles.css';
import { byId } from './dom';
import { pdfDownload } from './download';
import { initMultiFileTool } from './multi-file-tool';

function selectedPageSize(): 'fit' | 'a4' | 'letter' {
  const value = byId<HTMLSelectElement>('page-size').value;
  return value === 'a4' || value === 'letter' ? value : 'fit';
}

initMultiFileTool({
  minFiles: 1,
  workingMessage: (count) => `Building a PDF from ${String(count)} image${count === 1 ? '' : 's'}…`,
  execute: async (inputs) => {
    const { imagesToPdf } = await import('../pdf');
    return [pdfDownload(await imagesToPdf(inputs, { pageSize: selectedPageSize() }))];
  },
  successMessage: () => 'Done. Your PDF is ready below.',
});
