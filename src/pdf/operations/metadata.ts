import { loadPdf, savePdf, type LoadOptions } from '../adapter';
import { PdfOperationError } from '../errors';
import type { PdfInput, PdfOutput } from '../types';

/**
 * Metadata values are UNTRUSTED strings straight from the document (spec §8):
 * the UI must render them with text nodes only, never as HTML.
 */
export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  /** Comma/semicolon separated, as stored in the document. */
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string | null; // ISO 8601
  modificationDate: string | null; // ISO 8601
  pageCount: number;
}

export interface MetadataEdits {
  title?: string;
  author?: string;
  subject?: string;
  /** Comma-separated keyword list. */
  keywords?: string;
}

function safeString(read: () => string | undefined): string {
  // pdf-lib can throw on structurally hostile metadata entries.
  try {
    return read() ?? '';
  } catch {
    return '';
  }
}

function safeDate(read: () => Date | undefined): string | null {
  try {
    const date = read();
    return date ? date.toISOString() : null;
  } catch {
    return null;
  }
}

/** Read document metadata without modifying the file. */
export async function readPdfMetadata(
  input: PdfInput,
  loadOptions: LoadOptions = {},
): Promise<PdfMetadata> {
  const loaded = await loadPdf(input, loadOptions);
  const { doc } = loaded;
  return {
    title: safeString(() => doc.getTitle()),
    author: safeString(() => doc.getAuthor()),
    subject: safeString(() => doc.getSubject()),
    keywords: safeString(() => doc.getKeywords()),
    creator: safeString(() => doc.getCreator()),
    producer: safeString(() => doc.getProducer()),
    creationDate: safeDate(() => doc.getCreationDate()),
    modificationDate: safeDate(() => doc.getModificationDate()),
    pageCount: loaded.pageCount,
  };
}

/**
 * Write the given metadata fields (others are left untouched) and refresh
 * the modification date.
 */
export async function setPdfMetadata(
  input: PdfInput,
  edits: MetadataEdits,
  loadOptions: LoadOptions = {},
): Promise<PdfOutput> {
  for (const field of ['title', 'author', 'subject', 'keywords'] as const) {
    const value = edits[field];
    if (value !== undefined && value.length > 2000) {
      throw new PdfOperationError(
        'invalid-options',
        `The ${field} value is too long (2000 characters maximum).`,
      );
    }
  }

  const loaded = await loadPdf(input, loadOptions);
  const { doc } = loaded;
  if (edits.title !== undefined) doc.setTitle(edits.title);
  if (edits.author !== undefined) doc.setAuthor(edits.author);
  if (edits.subject !== undefined) doc.setSubject(edits.subject);
  if (edits.keywords !== undefined) {
    const list = edits.keywords
      .split(',')
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);
    doc.setKeywords(list);
  }
  doc.setModificationDate(new Date());

  return savePdf(doc, `${loaded.baseName}-metadata.pdf`);
}
