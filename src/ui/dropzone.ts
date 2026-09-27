/**
 * Wire a drop area + hidden file input + "choose" button.
 * The accept attribute and MIME types are conveniences only — real
 * validation happens on magic bytes in the operation layer (spec §8).
 */

export interface DropzoneOptions {
  zone: HTMLElement;
  input: HTMLInputElement;
  pickButton: HTMLButtonElement;
  onFiles: (files: File[]) => void;
}

export function setupDropzone({ zone, input, pickButton, onFiles }: DropzoneOptions): void {
  const emit = (list: FileList | null): void => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  pickButton.addEventListener('click', () => {
    input.click();
  });

  input.addEventListener('change', () => {
    emit(input.files);
    input.value = ''; // allow re-selecting the same file
  });

  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('dragover');
    emit(event.dataTransfer?.files ?? null);
  });
}
