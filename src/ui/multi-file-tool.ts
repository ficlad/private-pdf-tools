/**
 * Shared wiring for tool pages that combine SEVERAL files (merge PDFs,
 * images to PDF): ordered file list with move/remove controls, status area,
 * run/reset buttons, download list. Same element ids as single-file tools.
 */

import { byId, clearChildren, el, formatBytes } from './dom';
import { createDownloadItem, revokeAllDownloads, type DownloadableFile } from './download';
import { setupDropzone } from './dropzone';
import { createStatusArea, type StatusArea } from './status';

export interface MultiToolContext {
  status: StatusArea;
}

export interface MultiFileToolConfig {
  /** Minimum number of files before the run button enables. */
  minFiles: number;
  workingMessage: (fileCount: number) => string;
  execute: (
    inputs: { bytes: Uint8Array; name: string }[],
    ctx: MultiToolContext,
  ) => Promise<DownloadableFile[] | null>;
  successMessage: (outputCount: number) => string;
}

export function initMultiFileTool(config: MultiFileToolConfig): void {
  const dropzone = byId<HTMLDivElement>('dropzone');
  const fileInput = byId<HTMLInputElement>('file-input');
  const pickButton = byId<HTMLButtonElement>('pick-files');
  const fileList = byId<HTMLUListElement>('file-list');
  const runButton = byId<HTMLButtonElement>('run');
  const resetButton = byId<HTMLButtonElement>('reset');
  const downloads = byId<HTMLUListElement>('downloads');
  const status = createStatusArea(byId<HTMLParagraphElement>('status'));
  const ctx: MultiToolContext = { status };

  let files: File[] = [];
  let busy = false;

  function updateControls(): void {
    runButton.disabled = busy || files.length < config.minFiles;
    resetButton.disabled = busy || (files.length === 0 && downloads.childElementCount === 0);
    pickButton.disabled = busy;
  }

  function moveFile(from: number, to: number): void {
    const [moved] = files.splice(from, 1);
    if (moved === undefined) return;
    files.splice(to, 0, moved);
    renderFileList();
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

  runButton.addEventListener('click', () => {
    void run();
  });

  async function run(): Promise<void> {
    if (busy || files.length < config.minFiles) return;
    busy = true;
    updateControls();
    status.info(config.workingMessage(files.length));
    clearChildren(downloads);
    revokeAllDownloads();

    try {
      const inputs = await Promise.all(
        files.map(async (file) => ({
          bytes: new Uint8Array(await file.arrayBuffer()),
          name: file.name,
        })),
      );
      const outputs = await config.execute(inputs, ctx);
      if (outputs !== null) {
        for (const output of outputs) downloads.append(createDownloadItem(output));
        status.success(config.successMessage(outputs.length));
      }
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
}
