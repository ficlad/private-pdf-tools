import { loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';

export type PageSizeTarget = 'a4' | 'letter' | { width: number; height: number };

export interface ResizeOptions {
  target: PageSizeTarget;
  /**
   * 'scale': scale the page content uniformly to fit the new size, centered.
   * 'canvas': change the page box only; content keeps its size and position.
   */
  mode: 'scale' | 'canvas';
}

const PRESETS: Record<'a4' | 'letter', [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

function resolveTarget(target: PageSizeTarget): [number, number] {
  if (target === 'a4' || target === 'letter') return PRESETS[target];
  const { width, height } = target;
  // 14400pt is the PDF format's maximum page dimension.
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 3 ||
    height < 3 ||
    width > 14_400 ||
    height > 14_400
  ) {
    throw new PdfOperationError(
      'invalid-options',
      'Page width and height must be between 3 and 14400 points.',
    );
  }
  return [width, height];
}

/**
 * Change every page to the target size.
 *
 * Known limitation (documented, spec §23): 'scale' transforms the page
 * content stream; annotation positions (form fields, links) are not
 * rescaled with it.
 */
export async function resizePages(
  input: PdfInput,
  options: ResizeOptions,
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  if (options.mode !== 'scale' && options.mode !== 'canvas') {
    throw new PdfOperationError('invalid-options', 'Unknown resize mode.');
  }
  const [targetWidth, targetHeight] = resolveTarget(options.target);

  const loaded = await loadPdf(input, loadOptions);
  for (const page of loaded.doc.getPages()) {
    const { width, height } = page.getSize();
    if (options.mode === 'scale') {
      const scale = Math.min(targetWidth / width, targetHeight / height);
      page.scaleContent(scale, scale);
      page.setSize(targetWidth, targetHeight);
      page.translateContent((targetWidth - width * scale) / 2, (targetHeight - height * scale) / 2);
    } else {
      page.setSize(targetWidth, targetHeight);
    }
  }

  return savePdf(loaded.doc, `${loaded.baseName}-resized.pdf`);
}
