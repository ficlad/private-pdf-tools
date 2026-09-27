/**
 * Split tool page. The PDF operation code is imported lazily on first use so
 * the page shell stays lightweight (spec §15).
 */

import '../styles.css';
import type { SplitOptions } from '../pdf/types';
import { byId, clearChildren, el, formatBytes } from './dom';
import { createDownloadItem, revokeAllDownloads } from './download';
import { setupDropzone } from './dropzone';
import { parsePageRanges } from './parse-ranges';
import { createStatusArea } from './status';

const dropzone = byId<HTMLDivElement>('dropzone');
const fileInput = byId<HTMLInputElement>('file-input');
const pickButton = byId<HTMLButtonElement>('pick-files');
const fileList = byId<HTMLUListElement>('file-list');
const everyInput = byId<HTMLInputElement>('every-n');
const rangesInput = byId<HTMLInputElement>('ranges');
const splitButton = byId<HTMLButtonElement>('split');
const resetButton = byId<HTMLButtonElement>('reset');
const downloads = byId<HTMLUListElement>('downloads');
const status = createStatusArea(byId<HTMLParagraphElement>('status'));

let file: File | null = null;
let busy = false;

function selectedMode(): 'every' | 'ranges' {
  const checked = document.querySelector<HTMLInputElement>('input[name="mode"]:checked');
  return checked?.value === 'ranges' ? 'ranges' : 'every';
}

function updateControls(): void {
  splitButton.disabled = busy || file === null;
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

function buildOptions(): SplitOptions | null {
  if (selectedMode() === 'every') {
    const pagesPerChunk = Number.parseInt(everyInput.value, 10);
    if (!Number.isInteger(pagesPerChunk) || pagesPerChunk < 1) {
      status.error('Pages per file must be a whole number of at least 1.');
      return null;
    }
    return { mode: 'every', pagesPerChunk };
  }
  const parsed = parsePageRanges(rangesInput.value);
  if (!parsed.ok) {
    status.error(parsed.message);
    return null;
  }
  return { mode: 'ranges', ranges: parsed.ranges };
}

setupDropzone({
  zone: dropzone,
  input: fileInput,
  pickButton,
  onFiles: (added) => {
    if (busy) return;
    file = added[0] ?? null;
    if (added.length > 1) {
      status.info('Only one file can be split at a time; using the first one.');
    } else {
      status.clear();
    }
    renderFile();
    updateControls();
  },
});

splitButton.addEventListener('click', () => {
  void runSplit();
});

async function runSplit(): Promise<void> {
  if (busy || file === null) return;
  const options = buildOptions();
  if (options === null) return;

  busy = true;
  updateControls();
  status.info('Splitting…');
  clearChildren(downloads);
  revokeAllDownloads();

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { splitPdf } = await import('../pdf');
    const outputs = await splitPdf({ bytes, name: file.name }, options);
    for (const output of outputs) downloads.append(createDownloadItem(output));
    status.success(
      `Done. ${String(outputs.length)} file${outputs.length === 1 ? ' is' : 's are'} ready below.`,
    );
  } catch (cause) {
    status.errorFrom(cause);
  } finally {
    busy = false;
    updateControls();
  }
}

resetButton.addEventListener('click', () => {
  if (busy) return;
  file = null;
  renderFile();
  clearChildren(downloads);
  revokeAllDownloads();
  status.clear();
  updateControls();
});

updateControls();
