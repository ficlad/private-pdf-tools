/**
 * Shared wiring for tool pages that operate on ONE PDF: dropzone + picker,
 * status area, run/reset buttons, and download list. Pages plug in their own
 * option collection and operation call. All tool pages share the same
 * element ids (dropzone, file-input, pick-files, file-list, run, reset,
 * status, downloads).
 *
 * Heavy PDF code is imported lazily inside each page's callbacks (spec §15).
 */

import type { PdfInput } from '../pdf/types';
import { byId, clearChildren, el, formatBytes } from './dom';
import { createDownloadItem, revokeAllDownloads, type DownloadableFile } from './download';
import { setupDropzone } from './dropzone';
import { createStatusArea, type StatusArea } from './status';

export interface ToolContext {
  status: StatusArea;
}

export interface SingleFileToolConfig {
  /** Status text shown while the operation runs. */
  workingMessage: string;
  /**
   * Called when a file is selected (e.g. render thumbnails). Errors thrown
   * here are shown via the status area and clear the selection.
   */
  onFile?: (bytes: Uint8Array, file: File, ctx: ToolContext) => Promise<void> | void;
  /**
   * Run the operation. Return the downloads, or null to abort after having
   * shown a message via ctx.status (e.g. an option validation error).
   */
  execute: (input: PdfInput, ctx: ToolContext) => Promise<DownloadableFile[] | null>;
  successMessage: (outputCount: number) => string;
  /** Extra cleanup on reset (e.g. clear thumbnails). */
  onReset?: () => void;
}

export function initSingleFileTool(config: SingleFileToolConfig): void {
  const dropzone = byId<HTMLDivElement>('dropzone');
  const fileInput = byId<HTMLInputElement>('file-input');
  const pickButton = byId<HTMLButtonElement>('pick-files');
  const fileList = byId<HTMLUListElement>('file-list');
  const runButton = byId<HTMLButtonElement>('run');
  const resetButton = byId<HTMLButtonElement>('reset');
  const downloads = byId<HTMLUListElement>('downloads');
  const status = createStatusArea(byId<HTMLParagraphElement>('status'));
  const ctx: ToolContext = { status };

  let file: File | null = null;
  let fileBytes: Uint8Array | null = null;
  let busy = false;

  function updateControls(): void {
    runButton.disabled = busy || file === null;
    resetButton.disabled = busy || (file === null && downloads.childElementCount === 0);
    pickButton.disabled = busy;
  }

  function renderFile(): void {
    clearChildren(fileList);
    if (!file) return;
    fileList.append(
      el('li', {}, [
        el('span', { className: 'file-name', text: file.name }),
        el('span', { className: 'file-size', text: formatBytes(file.size) }),
      ]),
    );
  }

  function clearSelection(): void {
    file = null;
    fileBytes = null;
    renderFile();
    config.onReset?.();
  }

  setupDropzone({
    zone: dropzone,
    input: fileInput,
    pickButton,
    onFiles: (added) => {
      if (busy) return;
      void acceptFile(added);
    },
  });

  async function acceptFile(added: File[]): Promise<void> {
    const first = added[0];
    if (first === undefined) return;
    if (added.length > 1) {
      status.info('This tool works on one file at a time; using the first one.');
    } else {
      status.clear();
    }
    clearChildren(downloads);
    revokeAllDownloads();
    file = first;
    renderFile();
    updateControls();
    try {
      fileBytes = new Uint8Array(await first.arrayBuffer());
      if (config.onFile) {
        busy = true;
        updateControls();
        await config.onFile(fileBytes, first, ctx);
      }
    } catch (cause) {
      status.errorFrom(cause);
      clearSelection();
    } finally {
      busy = false;
      updateControls();
    }
  }

  runButton.addEventListener('click', () => {
    void run();
  });

  async function run(): Promise<void> {
    if (busy || file === null || fileBytes === null) return;
    busy = true;
    updateControls();
    clearChildren(downloads);
    revokeAllDownloads();
    status.info(config.workingMessage);

    try {
      const outputs = await config.execute({ bytes: fileBytes, name: file.name }, ctx);
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
    clearSelection();
    clearChildren(downloads);
    revokeAllDownloads();
    status.clear();
    updateControls();
  });

  updateControls();
}
