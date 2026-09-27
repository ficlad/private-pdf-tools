# Testing

## Unit tests (Vitest)

```sh
npm run test
```

Node-based tests for the whole operation layer against programmatic
fixtures (see `fixtures/README.md`). Every operation is tested for success
and failure cases (malformed, truncated, encrypted, zero-page, empty,
out-of-range indexes).

## Browser tests (Playwright)

```sh
npm run test:e2e
```

Runs against the **production build** served with the **real security
headers**: the web server (`scripts/serve-dist.mjs`) applies
`public/_headers`, so the strict CSP is enforced during every test. The
suite covers the tool UIs end-to-end (upload → operate → download →
verify the downloaded bytes), hostile input (malformed/encrypted/non-PDF),
XSS payloads in filenames and PDF metadata, zero CSP violations on every
page, and that no request leaves the origin.

In the sandboxed development environment the preinstalled Chromium at
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` is used (do not run
`playwright install` there; browser downloads are blocked). CI installs
Chromium itself.

## Browser coverage status (spec §14)

- Chromium: covered by the Playwright suite (locally and in CI).
- **Firefox: PENDING** — to be run on the owner's machine
  (`npx playwright install firefox`, add a firefox project to
  `playwright.config.ts` or run with `--project=firefox` once added).
  The sandbox used for development cannot download the Firefox build.
- Safari: optional per spec ("where practical").

## PDF→image note

The PDF→image operation needs a browser canvas, so it is covered by the
Playwright suite only, not by node unit tests.
