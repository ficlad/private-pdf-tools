import '../styles.css';
import { byId } from './dom';
import { pdfDownload } from './download';
import { initSingleFileTool } from './single-file-tool';

const FIELDS = ['title', 'author', 'subject', 'keywords'] as const;

initSingleFileTool({
  workingMessage: 'Saving metadata…',
  onFile: async (bytes, file, ctx) => {
    const { readPdfMetadata } = await import('../pdf');
    const meta = await readPdfMetadata({ bytes, name: file.name });
    // Untrusted values go into input .value (inert) and textContent only.
    for (const field of FIELDS) {
      byId<HTMLInputElement>(`meta-${field}`).value = meta[field];
    }
    byId<HTMLElement>('meta-producer').textContent = meta.producer || '—';
    byId<HTMLElement>('meta-creator').textContent = meta.creator || '—';
    byId<HTMLElement>('meta-created').textContent = meta.creationDate ?? '—';
    byId<HTMLElement>('meta-modified').textContent = meta.modificationDate ?? '—';
    ctx.status.info('Edit the fields, then press "Save metadata".');
  },
  execute: async (input) => {
    const { setPdfMetadata } = await import('../pdf');
    const output = await setPdfMetadata(input, {
      title: byId<HTMLInputElement>('meta-title').value,
      author: byId<HTMLInputElement>('meta-author').value,
      subject: byId<HTMLInputElement>('meta-subject').value,
      keywords: byId<HTMLInputElement>('meta-keywords').value,
    });
    return [pdfDownload(output)];
  },
  successMessage: () => 'Done. Your PDF with updated metadata is ready below.',
  onReset: () => {
    for (const field of FIELDS) byId<HTMLInputElement>(`meta-${field}`).value = '';
    for (const id of ['meta-producer', 'meta-creator', 'meta-created', 'meta-modified']) {
      byId<HTMLElement>(id).textContent = '';
    }
  },
});
