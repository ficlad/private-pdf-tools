/**
 * Merge tool page. The PDF operation code is imported lazily on first use so
 * the page shell stays lightweight (spec §15).
 */

import '../styles.css';
import { byId, clearChildren, el, formatBytes } from './dom';
import { createDownloadItem, revokeAllDownloads } from './download';
import { setupDropzone } from './dropzone';
import { createStatusArea } from './status';

const dropzone = byId<HTMLDivElement>('dropzone');
const fileInput = byId<HTMLInputElement>('file-input');
const pickButton = byId<HTMLButtonElement>('pick-files');
const fileList = byId<HTMLUListElement>('file-list');
const mergeButton = byId<HTMLButtonElement>('merge');
const resetButton = byId<HTMLButtonElement>('reset');
const downloads = byId<HTMLUListElement>('downloads');
const status = createStatusArea(byId<HTMLParagraphElement>('status'));

let files: File[] = [];
let busy = false;

function updateControls(): void {
  mergeButton.disabled = busy || files.length < 2;
  resetButton.disabled = busy || (files.length === 0 && downloads.childElementCount === 0);
  pickButton.disabled = busy;
}

function renderFileList(): void {
  clearChildren(fileList);
  files.forEach((file, index) => {
    const up = el('button', { className: 'icon', text: '↑' });
    up.type = 'button';
    up.disabled = index === 0;
    up.setAttribute('aria-label', `Move ${file.name} up`);
    up.addEventListener('click', () => {
      moveFile(index, index - 1);
    });

    const down = el('button', { className: 'icon', text: '↓' });
    down.type = 'button';
    down.disabled = index === files.length - 1;
    down.setAttribute('aria-label', `Move ${file.name} down`);
    down.addEventListener('click', () => {
      moveFile(index, index + 1);
    });

    const remove = el('button', { className: 'icon', text: 'Remove' });
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${file.name}`);
    remove.addEventListener('click', () => {
      files.splice(index, 1);
      renderFileList();
      updateControls();
    });

    fileList.append(
      el('li', {}, [
        el('span', { className: 'file-name', text: file.name }),
        el('span', { className: 'file-size', text: formatBytes(file.size) }),
        up,
        down,
        remove,
      ]),
    );
  });
}

function moveFile(from: number, to: number): void {
  const [moved] = files.splice(from, 1);
  if (moved === undefined) return;
  files.splice(to, 0, moved);
  renderFileList();
}

setupDropzone({
  zone: dropzone,
  input: fileInput,
  pickButton,
  onFiles: (added) => {
    if (busy) return;
    files = files.concat(added);
    status.clear();
    renderFileList();
    updateControls();
  },
});

mergeButton.addEventListener('click', () => {
  void runMerge();
});

async function runMerge(): Promise<void> {
  if (busy || files.length < 2) return;
  busy = true;
  updateControls();
  status.info(`Merging ${String(files.length)} files…`);
  clearChildren(downloads);
  revokeAllDownloads();

  try {
    const inputs = await Promise.all(
      files.map(async (file) => ({
        bytes: new Uint8Array(await file.arrayBuffer()),
        name: file.name,
      })),
    );
    const { mergePdfs } = await import('../pdf');
    const output = await mergePdfs(inputs);
    downloads.append(createDownloadItem(output));
    status.success('Done. Your merged PDF is ready below.');
  } catch (cause) {
    status.errorFrom(cause);
  } finally {
    busy = false;
    updateControls();
  }
}

resetButton.addEventListener('click', () => {
  if (busy) return;
  files = [];
  renderFileList();
  clearChildren(downloads);
  revokeAllDownloads();
  status.clear();
  updateControls();
});

updateControls();
