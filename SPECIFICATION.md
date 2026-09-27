# Private PDF Tools — Product & Engineering Specification

## 0. Purpose

Build a free, privacy-first web application for common PDF manipulation tasks.

Primary goals:

1. Work without user accounts.
2. Process supported PDF operations locally in the user's browser whenever technically possible.
3. Never upload user PDFs to our servers for the core toolset.
4. Have a very small operational footprint.
5. Minimize long-term maintenance by avoiding external APIs and fast-changing business logic.
6. Be secure by default.
7. Be suitable for long-term hosting as a mostly static website.
8. Be usable on desktop and reasonably usable on mobile.
9. Be genuinely free, with no forced registration, watermark, artificial page limits, or mandatory subscription.
10. Be easy for Claude Code/Claude to develop, test, audit, and maintain.

This document is an implementation specification, not merely a product idea. Claude should use it as the source of truth unless a later explicit instruction supersedes it.

---

# 1. Product concept

Working name:

**Private PDF Tools**

Possible positioning:

> Free PDF tools that run in your browser.  
> No account. No upload. No watermark.

Core promise:

> For supported operations, your PDF stays on your device and is processed locally in your browser.

Do not claim that the entire product is permanently "100% offline" unless that is actually implemented and tested.

Do not claim "military-grade security", "unhackable", or similar absolute statements.

---

# 2. Product principles

## 2.1 Privacy first

The default architecture must be:

```text
User
  |
  v
Static web application
  |
  v
Browser memory / local processing
  |
  v
Generated PDF
  |
  v
User download
```

NOT:

```text
User
  |
  v
Upload server
  |
  v
PDF processing server
  |
  v
Cloud storage
  |
  v
Download
```

For the first release, do not build a backend for PDF processing.

## 2.2 Minimize dependencies

Prefer a small number of mature, permissively licensed libraries.

Candidate components:

- PDF.js — PDF parsing/rendering/preview.
- pdf-lib — PDF creation/manipulation.
- qpdf/WASM — optional later, only where needed.
- TypeScript.
- A minimal UI layer; avoid a large framework unless there is a clear reason.

PDF.js is Apache 2.0. qpdf is Apache 2.0. License compatibility and bundled dependency notices must be audited before release.

Do not add libraries merely for convenience.

## 2.3 No AI in the runtime

Claude is a development tool, not a runtime dependency.

The production PDF application must continue to work if:

- Claude disappears.
- an AI API changes.
- an AI provider changes pricing.
- an API key is revoked.
- an external AI service is unavailable.

---

# 3. V1 feature set

Start with operations that are page-oriented and stable.

## Required V1 tools

1. Merge PDFs
2. Split PDF
3. Extract selected pages
4. Delete pages
5. Reorder pages
6. Rotate pages
7. Duplicate pages
8. Reverse page order
9. PDF to JPG/PNG
10. JPG/PNG to PDF
11. Add page numbers
12. Add watermark
13. Crop pages
14. Change page size
15. Edit PDF metadata
16. Grayscale
17. Flatten supported annotations/forms where safe
18. Basic PDF compression
19. Password protect PDF
20. Basic PDF information viewer

The first public release does not need all 20. Prioritize 1–10, then add the rest after testing.

---

# 4. Explicit V1 non-goals

Do NOT implement these in V1:

- OCR
- Existing-text editing
- Full document word processor functionality
- Digital signatures
- Certificate management
- Advanced PDF/A compliance
- PDF repair/recovery
- Password recovery/cracking
- DRM circumvention
- Removing access controls without the user's authorization
- Cloud storage
- User accounts
- Social login
- File history on the server
- Server-side PDF processing
- AI PDF analysis
- Automatic legal interpretation of documents
- Automatic redaction presented as guaranteed secure redaction

These may be considered later, but each needs a separate technical/security review.

---

# 5. Architecture

## 5.1 Hosting

Preferred:

**Cloudflare Pages / static assets**

The application should be deployable as a static site.

Current Cloudflare documentation states that static asset requests on Pages are free and unlimited on both free and paid plans. Pages also has a 25 MiB limit per individual static asset on the Free plan, so large WASM/assets must be considered during bundling.

Do not add Cloudflare Functions unless a concrete requirement appears.

If Functions are introduced later, document why.

## 5.2 Source control

GitHub repository.

Recommended structure:

```text
private-pdf-tools/
  src/
  public/
  tests/
  fixtures/
  scripts/
  docs/
  licenses/
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  eslint.config.*
  .github/
```

Use a lockfile.

## 5.3 Deployment

Preferred:

```text
GitHub
   |
   v
Cloudflare Pages
   |
   v
Static site
```

Production deployment must happen only from the protected main branch.

Preview deployments may be used for testing.

---

# 6. Proposed technical stack

Recommended baseline:

- TypeScript
- Vite
- PDF.js
- pdf-lib
- Vitest for unit tests
- Playwright for browser/integration tests
- ESLint
- Prettier
- web-vitals only if needed
- GitHub Actions
- Cloudflare Pages

Do not add React/Next/Vue/Svelte unless the UI genuinely benefits from it.

A plain TypeScript application is preferable if it keeps the dependency graph smaller.

---

# 7. PDF processing architecture

Use separate layers.

```text
UI
 |
 v
Application service layer
 |
 +--> Merge service
 +--> Split service
 +--> Extract service
 +--> Rotate service
 +--> Image export service
 +--> Watermark service
 +--> Metadata service
 |
 v
PDF library adapter
 |
 +--> pdf-lib
 +--> PDF.js
 +--> optional qpdf/WASM
```

The UI must not directly manipulate PDF internals.

Create an abstraction layer so the underlying PDF library can be replaced later.

Example conceptual interface:

```ts
interface PdfOperation {
  execute(input: PdfInput, options: OperationOptions): Promise<PdfOutput>;
}
```

Do not over-engineer the abstraction.

---

# 8. File handling

Never trust the filename.

Validate:

- file size
- MIME type as a hint, not as proof
- PDF magic bytes
- parseability
- page count
- memory requirements

The application should fail gracefully on:

- corrupt PDF
- encrypted PDF
- unsupported encryption
- malformed PDF
- extremely large PDF
- zero-page/invalid document
- unusual object structures
- unsupported features.

Never display raw file metadata using unsafe HTML injection.

---

# 9. Browser memory safety

Large PDFs can consume substantial memory.

Implement:

- file size warning
- page count warning
- graceful failure
- progress indicators for expensive operations
- cancellation where technically possible
- cleanup of ArrayBuffers/Object URLs
- no unnecessary copies of large buffers
- avoid keeping original + intermediate + final versions in memory simultaneously where possible.

Do not promise a maximum supported file size unless tested across representative browsers/devices.

---

# 10. Security model

The security model should assume that a PDF is untrusted input.

Threats to consider:

- malicious/malformed PDF
- parser vulnerabilities
- decompression/resource exhaustion
- XSS through PDF metadata
- DOM injection
- malicious filenames
- malicious SVG/image content
- compromised npm dependency
- compromised deployment account
- malicious third-party script
- clickjacking
- content injection
- supply-chain attack.

## 10.1 No server-side file storage

This is a major security boundary.

If the PDF never leaves the browser, there is no server-side PDF database to compromise.

## 10.2 Content Security Policy

Use a restrictive CSP appropriate to the final build.

Do not use:

- `unsafe-inline` unless strictly unavoidable.
- remote script execution.
- arbitrary `eval`.
- dynamic code fetched from a server.

If WebAssembly requires an explicit CSP directive, configure it deliberately and document why.

## 10.3 Security headers

At minimum evaluate:

- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- frame-ancestors via CSP

Do not blindly copy a security-header template. Test every header against actual browser behavior.

## 10.4 Third-party scripts

V1 should have no third-party runtime scripts.

Do not load JavaScript from:

- random CDNs
- analytics providers
- advertising providers
- tag managers

unless there is a specific reason.

If advertising is later introduced, isolate and audit it separately.

---

# 11. Privacy architecture

Core PDF processing:

- no upload
- no server storage
- no account
- no PDF telemetry
- no document contents in analytics
- no filenames sent to analytics
- no PDF metadata sent to analytics

If analytics is eventually added, it must not record document content.

Prefer privacy-preserving aggregate analytics.

The privacy policy must accurately describe what is actually transmitted.

Do not claim "we collect nothing" if the website uses analytics, advertising, error reporting, fonts, or other external resources.

---

# 12. GDPR considerations

The application should be designed to minimize personal-data processing.

Potentially relevant data may still include:

- IP address at infrastructure level
- server/security logs
- analytics data
- contact messages
- cookie identifiers if used

Therefore:

- document actual processing
- use only necessary cookies
- provide required notices
- avoid unnecessary analytics
- avoid third-party trackers in V1
- provide a contact/privacy page if operating publicly

The product is not a legal advice service.

---

# 13. Licensing / open-source compliance

Before release, perform a dependency license audit.

Create:

```text
licenses/
  THIRD_PARTY_NOTICES.md
```

Record for every shipped dependency:

- package name
- version
- license
- repository
- license obligations
- attribution requirements
- whether modified
- whether bundled/minified
- whether additional NOTICE files are required.

Important candidates:

### PDF.js

Apache 2.0.

### qpdf

Apache 2.0, with bundled/associated components that must be checked individually.

### pdf-lib

Verify the exact version and license from the repository/package actually used before shipping.

Do not assume a package's license from a blog post.

---

# 14. Testing

## Unit tests

Test every operation against:

- 1-page PDF
- 2-page PDF
- 100-page PDF
- rotated pages
- mixed page sizes
- pages with images
- pages with fonts
- metadata
- annotations
- forms where relevant
- encrypted PDF
- malformed PDF
- unusual PDF structures.

## Browser tests

Use Playwright.

Test at least:

- current Firefox
- current Chromium
- current Safari where practical

Primary target:

**Firefox + Chromium desktop**

Mobile browser support can be incremental.

## Security tests

Test:

- XSS payloads in filenames
- XSS payloads in PDF metadata
- malicious strings in titles/author/subject
- SVG/image handling
- CSP violations
- clickjacking
- unsafe URL handling
- oversized input
- malformed PDF fixtures.

Never execute embedded PDF JavaScript as page JavaScript.

---

# 15. Performance requirements

Target:

- first meaningful UI quickly on broadband
- lazy-load heavy PDF libraries where possible
- do not load every tool's code on initial page load
- lazy-load advanced functionality
- show progress for large files
- avoid blocking the main UI thread when feasible
- consider Web Workers for expensive operations.

The initial landing page should remain lightweight.

---

# 16. UX

Homepage:

```text
Free PDF Tools

Merge PDFs
Split PDF
Compress PDF
Rotate PDF
Extract Pages
PDF to Images
Images to PDF
...
```

Each tool should have:

- short description
- drag-and-drop area
- file picker
- clear file list
- page preview when useful
- operation settings
- progress indicator
- output download
- reset button.

Avoid dark patterns.

Do not force:

- account creation
- newsletter signup
- app installation
- feedback
- social sharing.

---

# 17. Error handling

Errors must be understandable.

Bad:

> Error 0x23A4

Better:

> This PDF could not be processed. It may be encrypted, damaged, or use a PDF feature that this tool does not support.

Provide a technical details disclosure only when useful.

Never expose stack traces to ordinary users.

---

# 18. Accessibility

Target WCAG 2.2 AA where practical.

Include:

- keyboard navigation
- visible focus
- semantic buttons
- labels
- ARIA only where needed
- sufficient contrast
- screen-reader-friendly errors
- no color-only status indicators
- accessible progress status.

---

# 19. SEO

Each tool should have its own stable page:

```text
/merge-pdf
/split-pdf
/compress-pdf
/rotate-pdf
/extract-pdf-pages
/pdf-to-jpg
/jpg-to-pdf
```

Each page should have:

- unique title
- useful description
- explanatory content
- FAQ
- structured metadata where appropriate
- canonical URL
- no keyword stuffing.

Do not create thousands of thin pages.

---

# 20. Offline/PWA

Consider making the application installable as a PWA after V1 is stable.

Offline capability is desirable because it reinforces the privacy proposition.

Do not claim offline support until:

1. the full required JS/WASM assets are cached;
2. the app can load without network;
3. the selected PDF operations work without network;
4. updates are handled safely.

---

# 21. Future monetization — optional

The core product should remain usable without payment.

Possible future options:

- advertising
- affiliate links
- optional desktop application
- optional API
- donations

Do not add monetization to V1 unless necessary.

If ads are introduced, third-party ad code becomes part of the security/privacy review.

---

# 22. Development workflow for Claude

Claude should work incrementally.

Order:

1. Create repository structure.
2. Set up TypeScript/Vite.
3. Add PDF.js.
4. Add pdf-lib.
5. Implement file abstraction.
6. Implement Merge.
7. Implement Split.
8. Implement Extract.
9. Implement Delete/Reorder/Rotate.
10. Implement preview.
11. Add tests.
12. Add security headers/CSP.
13. Add CI.
14. Add license audit.
15. Add remaining tools.
16. Run security/performance audit.
17. Prepare Cloudflare deployment.
18. Test production build.

After each major step:

- run tests
- run lint
- build production
- inspect bundle
- check dependency changes
- check browser console for CSP/security errors.

Do not implement 20 features in one giant change.

---

# 23. Claude coding rules

Claude must:

- explain architecture-changing decisions briefly before implementing them;
- keep dependencies minimal;
- never introduce a remote runtime script without explicit approval;
- never add telemetry silently;
- never add an API key to client-side code;
- never send PDF content to a third party;
- never add a backend without explicit approval;
- use TypeScript strict mode;
- avoid `any` unless justified;
- add tests with each non-trivial feature;
- preserve existing functionality;
- avoid unnecessary rewrites;
- inspect dependency licenses before adding dependencies;
- never use `eval`;
- never use unsafe HTML insertion when text nodes are sufficient;
- never trust filenames or metadata;
- treat all PDF input as hostile/untrusted;
- document any security trade-off.

If Claude discovers that a requested feature conflicts with the browser-only/privacy architecture, it should stop and explain the trade-off rather than silently changing the architecture.

---

# 24. Definition of done for V1

V1 is done only when:

- [ ] Merge works
- [ ] Split works
- [ ] Extract works
- [ ] Delete works
- [ ] Reorder works
- [ ] Rotate works
- [ ] Duplicate works
- [ ] PDF → image works
- [ ] Image → PDF works
- [ ] At least one compression mode works
- [ ] Firefox tested
- [ ] Chromium tested
- [ ] Unit tests pass
- [ ] Browser tests pass
- [ ] Production build succeeds
- [ ] No unexpected network request contains PDF content
- [ ] CSP is active
- [ ] No runtime remote JavaScript
- [ ] Dependency audit completed
- [ ] License audit completed
- [ ] Third-party notices included
- [ ] Privacy policy accurately reflects actual data flows
- [ ] Error handling works
- [ ] Large-file behavior is graceful
- [ ] No console errors in normal operation
- [ ] Cloudflare deployment tested
- [ ] GitHub repository protected
- [ ] Recovery procedure documented

---

# 25. Sources to consult

Use official documentation as the primary source:

- PDF.js: https://mozilla.github.io/pdf.js/
- PDF.js GitHub: https://github.com/mozilla/pdf.js
- qpdf: https://github.com/qpdf/qpdf
- qpdf license: https://github.com/qpdf/qpdf/blob/main/LICENSE.txt
- Cloudflare Pages pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/

Before implementation, re-check these sources because dependencies and hosting limits can change.

---

# 26. Final architectural rule

The most important rule:

> **Keep the core PDF product static and client-side.**

If a proposed feature requires a server, first ask:

1. Can it be done locally?
2. Can it be done in a Web Worker?
3. Can it be implemented with an existing mature library?
4. Does it justify permanently increasing the security/privacy/maintenance surface?

If the answer is no, defer the feature.
