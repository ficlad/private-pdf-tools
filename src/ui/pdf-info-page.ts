/**
 * PDF information viewer: no output file, just facts about the document.
 * Every displayed value is untrusted document data and is rendered with
 * text nodes only (spec §8, §10).
 */

import '../styles.css';
import { byId, clearChildren, el, formatBytes } from './dom';
import { setupDropzone } from './dropzone';
import { createStatusArea } from './status';

const dropzone = byId<HTMLDivElement>('dropzone');
const fileInput = byId<HTMLInputElement>('file-input');
const pickButton = byId<HTMLButtonElement>('pick-files');
const fileList = byId<HTMLUListElement>('file-list');
const resetButton = byId<HTMLButtonElement>('reset');
const infoContainer = byId<HTMLDivElement>('info');
const status = createStatusArea(byId<HTMLParagraphElement>('status'));

function row(term: string, value: string): HTMLElement[] {
  return [el('dt', { text: term }), el('dd', { text: value })];
}

async function showInfo(file: File): Promise<void> {
  clearChildren(fileList);
  clearChildren(infoContainer);
  fileList.append(
    el('li', {}, [
      el('span', { className: 'file-name', text: file.name }),
      el('span', { className: 'file-size', text: formatBytes(file.size) }),
    ]),
  );
  status.info('Reading…');

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { readPdfInfo } = await import('../pdf');
    const info = await readPdfInfo({ bytes, name: file.name });

    const list = el('dl', { className: 'info-list' });
    list.append(...row('File size', formatBytes(info.fileBytes)));
    list.append(...row('PDF version', info.pdfVersion ?? 'unknown'));
    list.append(...row('Encrypted', info.encrypted ? 'Yes (password-protected)' : 'No'));
    list.append(
      ...row('Pages', info.pageCount !== null ? String(info.pageCount) : 'could not be counted'),
    );
    for (const size of info.pageSizes) {
      list.append(
        ...row(
          'Page size',
          `${String(size.width)} × ${String(size.height)} pt (${String(size.count)} page${
            size.count === 1 ? '' : 's'
          })`,
        ),
      );
    }
    if (info.metadata) {
      const meta = info.metadata;
      list.append(...row('Title', meta.title || '—'));
      list.append(...row('Author', meta.author || '—'));
      list.append(...row('Subject', meta.subject || '—'));
      list.append(...row('Keywords', meta.keywords || '—'));
      list.append(...row('Creator', meta.creator || '—'));
      list.append(...row('Producer', meta.producer || '—'));
      list.append(...row('Created', meta.creationDate ?? '—'));
      list.append(...row('Modified', meta.modificationDate ?? '—'));
    } else if (info.encrypted) {
      list.append(...row('Metadata', 'not shown: the document is encrypted'));
    }
    infoContainer.append(list);
    status.success('Here is what this file says about itself.');
  } catch (cause) {
    status.errorFrom(cause);
  } finally {
    resetButton.disabled = false;
  }
}

setupDropzone({
  zone: dropzone,
  input: fileInput,
  pickButton,
  onFiles: (files) => {
    const first = files[0];
    if (first) void showInfo(first);
  },
});

resetButton.addEventListener('click', () => {
  clearChildren(fileList);
  clearChildren(infoContainer);
  status.clear();
  resetButton.disabled = true;
});

resetButton.disabled = true;
