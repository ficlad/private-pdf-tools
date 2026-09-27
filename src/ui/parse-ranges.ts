/**
 * Parse a user-typed page-range expression like "1-3, 5, 8-10" into 0-based
 * inclusive ranges. Pure and unit-tested; page-count validation happens in
 * the operation layer.
 */

import type { PageRange } from '../pdf/types';

export type ParseRangesResult = { ok: true; ranges: PageRange[] } | { ok: false; message: string };

const PART_PATTERN = /^(\d+)(?:\s*-\s*(\d+))?$/;

export function parsePageRanges(text: string): ParseRangesResult {
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return { ok: false, message: 'Enter at least one page or range, e.g. "1-3, 5".' };
  }

  const ranges: PageRange[] = [];
  for (const part of parts) {
    const match = PART_PATTERN.exec(part);
    if (!match || match[1] === undefined) {
      return { ok: false, message: `"${part}" is not a page number or range like "2-5".` };
    }
    const first = Number.parseInt(match[1], 10);
    const second = match[2] !== undefined ? Number.parseInt(match[2], 10) : first;
    if (first < 1 || second < 1) {
      return { ok: false, message: 'Page numbers start at 1.' };
    }
    if (second < first) {
      return {
        ok: false,
        message: `"${part}" is backwards: the first page must not be after the last.`,
      };
    }
    ranges.push({ from: first - 1, to: second - 1 });
  }
  return { ok: true, ranges };
}
