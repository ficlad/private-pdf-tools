import { describe, expect, it } from 'vitest';

import { parsePageRanges } from '../src/ui/parse-ranges';

describe('parsePageRanges', () => {
  it('parses single pages and ranges (1-based in, 0-based out)', () => {
    expect(parsePageRanges('1-3, 5, 8-10')).toEqual({
      ok: true,
      ranges: [
        { from: 0, to: 2 },
        { from: 4, to: 4 },
        { from: 7, to: 9 },
      ],
    });
  });

  it('tolerates whitespace and trailing commas', () => {
    expect(parsePageRanges(' 2 - 4 ,, 7 , ')).toEqual({
      ok: true,
      ranges: [
        { from: 1, to: 3 },
        { from: 6, to: 6 },
      ],
    });
  });

  it('rejects empty input', () => {
    expect(parsePageRanges('').ok).toBe(false);
    expect(parsePageRanges('  ,  ').ok).toBe(false);
  });

  it('rejects junk', () => {
    expect(parsePageRanges('abc').ok).toBe(false);
    expect(parsePageRanges('1-2-3').ok).toBe(false);
    expect(parsePageRanges('1;3').ok).toBe(false);
    expect(parsePageRanges('-2').ok).toBe(false);
  });

  it('rejects zero and backwards ranges', () => {
    expect(parsePageRanges('0-3').ok).toBe(false);
    expect(parsePageRanges('5-2').ok).toBe(false);
  });
});
