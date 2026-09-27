import '../styles.css';
import type { RotationAngle } from '../pdf/types';
import { pdfDownload } from './download';
import { initSelectPagesTool } from './select-pages-tool';

function selectedAngle(): RotationAngle {
  const checked = document.querySelector<HTMLInputElement>('input[name="angle"]:checked');
  const value = Number.parseInt(checked?.value ?? '90', 10);
  return value === 180 || value === 270 ? value : 90;
}

initSelectPagesTool({
  workingMessage: 'Rotating…',
  selectPrompt: 'Tick the pages to rotate — or tick none to rotate every page.',
  emptySelectionMessage: '',
  allowEmptySelection: true,
  execute: async (input, selected) => {
    const { rotatePages } = await import('../pdf');
    const options =
      selected.length > 0
        ? { angle: selectedAngle(), pages: selected }
        : { angle: selectedAngle() };
    return [pdfDownload(await rotatePages(input, options))];
  },
  successMessage: () => 'Done. Your rotated PDF is ready below.',
});
