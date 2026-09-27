/**
 * Shared setup for tools where the user picks pages on a thumbnail grid
 * (extract, delete, duplicate, rotate). Builds on initSingleFileTool.
 */

import type { PdfInput } from '../pdf/types';
import { byId } from './dom';
import type { DownloadableFile } from './download';
import { initSingleFileTool, type ToolContext } from './single-file-tool';
import { renderThumbnailGrid, type ThumbnailGrid } from './thumbnails';

export interface SelectPagesToolConfig {
  workingMessage: string;
  /** Shown once the thumbnails are ready. */
  selectPrompt: string;
  /** Shown when the user runs with nothing selected. */
  emptySelectionMessage: string;
  /** When true, an empty selection means "all pages" instead of an error. */
  allowEmptySelection?: boolean;
  execute: (
    input: PdfInput,
    selectedPages: number[],
    ctx: ToolContext,
  ) => Promise<DownloadableFile[] | null>;
  successMessage: (outputCount: number) => string;
}

export function initSelectPagesTool(config: SelectPagesToolConfig): void {
  const thumbs = byId<HTMLDivElement>('thumbs');
  let grid: ThumbnailGrid | null = null;

  initSingleFileTool({
    workingMessage: config.workingMessage,
    onFile: async (bytes, _file, ctx) => {
      ctx.status.info('Rendering page previews…');
      grid = await renderThumbnailGrid(thumbs, bytes, {
        mode: 'select',
        onProgress: (done, total) => {
          ctx.status.info(`Rendering page previews… (${String(done)}/${String(total)})`);
        },
      });
      ctx.status.info(config.selectPrompt);
    },
    execute: async (input, ctx) => {
      const selected = grid?.getSelected() ?? [];
      if (selected.length === 0 && !config.allowEmptySelection) {
        ctx.status.error(config.emptySelectionMessage);
        return null;
      }
      return config.execute(input, selected, ctx);
    },
    successMessage: config.successMessage,
    onReset: () => {
      thumbs.textContent = '';
      grid = null;
    },
  });
}
