import { loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';

export interface FlattenResult {
  output: PdfOutput;
  /** How many form fields were flattened into page content. */
  flattenedFields: number;
}

/**
 * Flatten interactive form fields into static page content where safe
 * (spec §3 tool 17). Unsupported field or appearance structures are
 * reported as a clear error instead of producing a broken file.
 */
export async function flattenPdf(
  input: PdfInput,
  loadOptions: LoadOptions = {},
): Promise<FlattenResult> {
  const loaded = await loadPdf(input, loadOptions);

  let flattenedFields = 0;
  try {
    const form = loaded.doc.getForm();
    flattenedFields = form.getFields().length;
    if (flattenedFields > 0) {
      form.flatten();
    }
  } catch (cause) {
    throw new PdfOperationError(
      'operation-failed',
      'This form could not be flattened. It may use field or appearance features this tool does not support.',
      { cause },
    );
  }

  const output = await savePdf(loaded.doc, `${loaded.baseName}-flattened.pdf`);
  return { output, flattenedFields };
}
