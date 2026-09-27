/**
 * Offer results as downloads via object URLs, and clean them up on reset
 * (spec §9: cleanup of ArrayBuffers/Object URLs).
 */

import type { PdfOutput } from '../pdf/types';
import { el, formatBytes } from './dom';

const activeUrls = new Set<string>();

export interface DownloadableFile {
  data: Uint8Array | Blob;
  name: string;
  mimeType: string;
  /** Extra human-readable detail, e.g. "3 pages". */
  detail?: string;
}

/** Adapt a PdfOutput from the operation layer into a downloadable file. */
export function pdfDownload(output: PdfOutput): DownloadableFile {
  return {
    data: output.bytes,
    name: output.suggestedName,
    mimeType: 'application/pdf',
    detail: `${String(output.pageCount)} page${output.pageCount === 1 ? '' : 's'}`,
  };
}

export function createDownloadItem(file: DownloadableFile): HTMLLIElement {
  const blob =
    file.data instanceof Blob
      ? file.data
      : new Blob([file.data as BlobPart], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  activeUrls.add(url);

  const detail = file.detail !== undefined ? `${file.detail}, ` : '';
  const link = el('a', {
    text: `Download ${file.name} (${detail}${formatBytes(blob.size)})`,
  });
  link.href = url;
  link.download = file.name;
  return el('li', {}, [link]);
}

export function revokeAllDownloads(): void {
  for (const url of activeUrls) URL.revokeObjectURL(url);
  activeUrls.clear();
}
