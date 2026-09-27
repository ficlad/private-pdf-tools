/**
 * Page thumbnail grid rendered with PDF.js, loaded lazily so the viewer code
 * is only fetched when a file is actually dropped (spec §15).
 *
 * Modes:
 *  - 'select': each page gets a checkbox; getSelected() returns 0-based
 *    indexes in ascending order.
 *  - 'order': each page gets move-left/right buttons; getOrder() returns the
 *    current 0-based ordering.
 */

import { el } from './dom';

export type ThumbnailMode = 'select' | 'order';

export interface ThumbnailGrid {
  pageCount: number;
  getSelected: () => number[];
  getOrder: () => number[];
}

export interface ThumbnailOptions {
  mode: ThumbnailMode;
  /** Called as pages finish rendering, for progress reporting. */
  onProgress?: (done: number, total: number) => void;
}

const THUMB_WIDTH = 140;

export async function renderThumbnailGrid(
  container: HTMLElement,
  bytes: Uint8Array,
  options: ThumbnailOptions,
): Promise<ThumbnailGrid> {
  const { openForRendering, renderPageToCanvas } = await import('../pdf/pdfjs-adapter');

  const doc = await openForRendering(bytes);
  try {
    const pageCount = doc.numPages;
    container.textContent = '';

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const canvas = await renderPageToCanvas(doc, pageIndex, { targetWidth: THUMB_WIDTH });
      canvas.className = 'thumb-canvas';

      const caption = `Page ${String(pageIndex + 1)}`;
      const item = el('div', { className: 'thumb' });
      item.dataset['pageIndex'] = String(pageIndex);

      if (options.mode === 'select') {
        const checkbox = el('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('aria-label', caption);
        const label = el('label', { className: 'thumb-label' }, [
          canvas,
          el('span', { className: 'thumb-caption' }, [checkbox, ` ${caption}`]),
        ]);
        item.append(label);
      } else {
        const left = el('button', { className: 'icon', text: '←' });
        left.type = 'button';
        left.setAttribute('aria-label', `Move ${caption.toLowerCase()} earlier`);
        left.addEventListener('click', () => {
          const previous = item.previousElementSibling;
          if (previous) container.insertBefore(item, previous);
        });
        const right = el('button', { className: 'icon', text: '→' });
        right.type = 'button';
        right.setAttribute('aria-label', `Move ${caption.toLowerCase()} later`);
        right.addEventListener('click', () => {
          const next = item.nextElementSibling;
          if (next) container.insertBefore(next, item);
        });
        item.append(
          canvas,
          el('span', { className: 'thumb-caption', text: caption }),
          el('span', { className: 'thumb-controls' }, [left, right]),
        );
      }

      container.append(item);
      options.onProgress?.(pageIndex + 1, pageCount);
    }

    return {
      pageCount,
      getSelected: () =>
        Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
          .map((box, index) => (box.checked ? index : -1))
          .filter((index) => index >= 0),
      getOrder: () =>
        Array.from(container.querySelectorAll<HTMLElement>('.thumb')).map((thumb) =>
          Number.parseInt(thumb.dataset['pageIndex'] ?? '0', 10),
        ),
    };
  } finally {
    await doc.destroy();
  }
}
