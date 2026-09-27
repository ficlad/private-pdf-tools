import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { PDFDocument } from 'pdf-lib';
import { expect } from 'vitest';

import { isPdfOperationError, type PdfErrorCode, type PdfInput } from '../src/pdf';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

/** Load a fixture as a PdfInput, carrying its filename. */
export async function fixture(name: string): Promise<PdfInput> {
  const bytes = new Uint8Array(await readFile(join(FIXTURES_DIR, name)));
  return { bytes, name };
}

/** Parse operation output with pdf-lib for white-box assertions. */
export async function inspect(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { updateMetadata: false });
}

/** Assert that the promise rejects with a PdfOperationError carrying `code`. */
export async function expectPdfError(promise: Promise<unknown>, code: PdfErrorCode): Promise<void> {
  let thrown: unknown;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }
  if (thrown === undefined) {
    expect.fail(`expected PdfOperationError with code "${code}", but nothing was thrown`);
  }
  if (!isPdfOperationError(thrown)) {
    const detail = thrown instanceof Error ? thrown.message : JSON.stringify(thrown);
    expect.fail(`expected PdfOperationError, got raw error: ${detail}`);
  }
  expect(thrown.code).toBe(code);
  // Typed errors must always carry a safe, human-readable message.
  expect(thrown.userMessage.length).toBeGreaterThan(0);
  expect(thrown.userMessage).not.toMatch(/\bat\s+\S+:\d+/); // no stack-trace fragments
}
