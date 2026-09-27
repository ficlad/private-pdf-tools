/**
 * Offer results as downloads via object URLs, and clean them up on reset
 * (spec §9: cleanup of ArrayBuffers/Object URLs).
 */

import type { PdfOutput } from '../pdf/types';
import { el, formatBytes } from './dom';

const activeUrls = new Set<string>();

export function createDownloadItem(output: PdfOutput): HTMLLIElement {
  const blob = new Blob([output.bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  activeUrls.add(url);

  const link = el('a', {
    text: `Download ${output.suggestedName} (${String(output.pageCount)} page${
      output.pageCount === 1 ? '' : 's'
    }, ${formatBytes(output.bytes.length)})`,
  });
  link.href = url;
  link.download = output.suggestedName;
  return el('li', {}, [link]);
}

export function revokeAllDownloads(): void {
  for (const url of activeUrls) URL.revokeObjectURL(url);
  activeUrls.clear();
}
