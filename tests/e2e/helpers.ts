import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import type { Download, Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures');

export interface FilePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** Load a fixture as a Playwright setInputFiles payload. */
export async function fixturePayload(
  name: string,
  overrides: Partial<Pick<FilePayload, 'name' | 'mimeType'>> = {},
): Promise<FilePayload> {
  return {
    name: overrides.name ?? name,
    mimeType: overrides.mimeType ?? 'application/pdf',
    buffer: await readFile(join(FIXTURES_DIR, name)),
  };
}

export async function downloadBytes(download: Download): Promise<Buffer> {
  const filePath = await download.path();
  return readFile(filePath);
}

export async function pdfPageCount(bytes: Buffer): Promise<number> {
  const doc = await PDFDocument.load(new Uint8Array(bytes), { updateMetadata: false });
  return doc.getPageCount();
}

export async function pdfPageRotation(bytes: Buffer, pageIndex: number): Promise<number> {
  const doc = await PDFDocument.load(new Uint8Array(bytes), { updateMetadata: false });
  return doc.getPage(pageIndex).getRotation().angle;
}

/**
 * Instrument a page BEFORE navigation to record CSP violations and
 * console/page errors. Returns a getter for everything collected.
 */
export async function trackViolations(page: Page): Promise<() => Promise<string[]>> {
  const consoleIssues: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || /Content Security Policy|Refused to/i.test(message.text())) {
      consoleIssues.push(`console(${message.type()}): ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    consoleIssues.push(`pageerror: ${error.message}`);
  });
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as Record<string, unknown>)['__cspViolations'] = violations;
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective} blocked ${event.blockedURI}`);
    });
  });
  return async () => {
    const cspViolations = await page.evaluate(
      () => (window as unknown as Record<string, string[]>)['__cspViolations'] ?? [],
    );
    return [...cspViolations.map((v) => `csp: ${v}`), ...consoleIssues];
  };
}
