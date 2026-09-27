# Third-Party Notices

Dependency license record for Private PDF Tools (spec §13). Every license
below was verified against the LICENSE file shipped inside the installed
package under `node_modules/`, not assumed from documentation.

Last audited: 2026-09-27 (against `package-lock.json` at that date).

## Runtime dependencies (shipped to users)

These packages (or parts of them) are bundled and minified into the
production JavaScript served to browsers.

| Package                 | Version | License      | Repository                                | Bundled                                                                                                          | Modified |
| ----------------------- | ------- | ------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| pdf-lib                 | 1.17.1  | MIT          | https://github.com/Hopding/pdf-lib        | yes (minified)                                                                                                   | no       |
| @pdf-lib/standard-fonts | 1.0.0   | MIT          | https://github.com/Hopding/standard-fonts | yes, via pdf-lib                                                                                                 | no       |
| @pdf-lib/upng           | 1.0.1   | MIT          | https://github.com/Hopding/upng           | yes, via pdf-lib                                                                                                 | no       |
| pako                    | 1.0.11  | MIT AND Zlib | https://github.com/nodeca/pako            | yes, via pdf-lib                                                                                                 | no       |
| tslib                   | 1.14.1  | 0BSD         | https://github.com/Microsoft/tslib        | yes, via pdf-lib                                                                                                 | no       |
| pdfjs-dist (PDF.js)     | 4.10.38 | Apache-2.0   | https://github.com/mozilla/pdf.js         | not yet (installed for the upcoming preview/PDF-to-image features; currently not imported, so not in the bundle) | no       |

### Obligations

- **MIT** (pdf-lib, @pdf-lib/standard-fonts, @pdf-lib/upng, pako in part):
  retain the copyright notice and permission notice. Satisfied by this file
  and by the full license texts in the packages' repositories/npm tarballs.
  - pdf-lib: Copyright (c) 2019 Andrew Dillon
- **Zlib** (pako's zlib portions): altered versions must be marked; we ship
  it unmodified. Attribution retained here.
- **0BSD** (tslib): no attribution required; recorded for completeness.
- **Apache-2.0** (pdfjs-dist): when PDF.js starts shipping in the bundle,
  include its LICENSE and any NOTICE content with the distribution, and state
  changes if modified. Re-audit at that point — this is tracked as an open
  item, and PDF.js also vendors third-party components with their own
  notices that must be checked individually before bundling.

## Development-only dependencies (not shipped to users)

Build, lint, and test tooling. Nothing from these packages is included in
the production output; recorded here for completeness of the audit trail.

| Package                | Version | License    |
| ---------------------- | ------- | ---------- |
| @eslint/js             | 9.39.5  | MIT        |
| @types/node            | 22.20.4 | MIT        |
| eslint                 | 9.39.5  | MIT        |
| eslint-config-prettier | 9.1.2   | MIT        |
| prettier               | 3.9.9   | MIT        |
| tsx                    | 4.23.15 | MIT        |
| typescript             | 5.9.3   | Apache-2.0 |
| typescript-eslint      | 8.70.1  | MIT        |
| vite                   | 6.4.3   | MIT        |
| vitest                 | 5.0.2   | MIT        |

## Audit procedure

1. `npm ls --depth=0` for the direct dependency set; pdf-lib's runtime
   dependencies (`node_modules/pdf-lib/package.json`) added because they are
   bundled transitively.
2. License read from each installed package's `package.json` `license` field
   and cross-checked against its shipped `LICENSE`/`LICENSE.md`/`LICENSE.txt`
   file.
3. Production bundle checked for remote references after `npm run build`
   (none; the only URL string in `dist/` is a pdf-lib error-message link to
   its own repository).

Repeat this audit whenever `package-lock.json` changes.
