/**
 * Screen-reader-friendly status/error reporting (spec §17, §18).
 * Messages are set with textContent only.
 */

import { isPdfOperationError } from '../pdf/errors';

export interface StatusArea {
  info: (message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  errorFrom: (cause: unknown) => void;
  clear: () => void;
}

const GENERIC_ERROR =
  'Something went wrong while processing this PDF. It may be damaged, encrypted, or use a feature this tool does not support.';

export function createStatusArea(node: HTMLElement): StatusArea {
  const set = (message: string, kind: '' | 'error' | 'success'): void => {
    node.textContent = message;
    node.classList.toggle('error', kind === 'error');
    node.classList.toggle('success', kind === 'success');
  };
  return {
    info: (message) => {
      set(message, '');
    },
    success: (message) => {
      set(message, 'success');
    },
    error: (message) => {
      set(message, 'error');
    },
    errorFrom: (cause) => {
      // Only typed errors carry user-safe messages; anything else gets a
      // generic message and is never shown raw (spec §17).
      set(isPdfOperationError(cause) ? cause.userMessage : GENERIC_ERROR, 'error');
    },
    clear: () => {
      set('', '');
    },
  };
}
