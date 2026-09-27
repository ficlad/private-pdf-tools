# Test fixtures

All fixtures in this directory are generated programmatically — no binary
files are checked into the repository.

Regenerate them with:

```sh
npm run fixtures
```

The Vitest global setup also regenerates them automatically before every
test run, so a fresh clone needs no manual step.

See `scripts/generate-fixtures.ts` for what each fixture contains
(1/2/100-page PDFs, rotated pages, mixed page sizes, embedded images,
hostile metadata, a zero-page PDF, an encrypted-flagged PDF, malformed and
truncated files, and small PNG/JPEG images).
