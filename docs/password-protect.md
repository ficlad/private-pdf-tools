# Password protect — deferred (with reasons)

Spec §3 tool 19 ("Password protect PDF") is **not shipped in V1** and is not
listed on the landing page.

## Why

pdf-lib (our manipulation library) cannot create encrypted PDFs. The spec
(§2.2) names qpdf/WASM as the candidate path, "optional later, only where
needed", and §10 puts compromised npm dependencies and supply-chain attacks
in the threat model. A password tool that encrypts weakly or incorrectly is
worse than no tool, so the bar is a well-maintained, auditable package.

npm survey (2026-09-27):

| Package                 | Version | License       | Last publish | Notes                      |
| ----------------------- | ------- | ------------- | ------------ | -------------------------- |
| qpdf-wasm               | 0.1.0   | Apache-2.0    | 2025-07      | single maintainer, pre-1.0 |
| @jspawn/qpdf-wasm       | 0.0.2   | Apache-2.0    | 2022-07      | abandoned                  |
| @neslinesli93/qpdf-wasm | 0.3.0   | ISC (wrapper) | 2025-06      | single maintainer, pre-1.0 |

None passes review:

1. **Maintenance**: every candidate is a pre-1.0, single-maintainer wrapper;
   none tracks upstream qpdf releases reliably (upstream fixes security
   issues in its crypto paths from time to time).
2. **Auditability**: each ships a multi-megabyte opaque `.wasm` binary. We
   cannot verify it was built from pristine qpdf sources, and shipping
   unverifiable crypto to users contradicts §10 and §23
   ("treat all PDF input as hostile", "document any security trade-off").
3. Size is not the blocker (1.4–2.3 MB unpacked fits the 25 MiB/asset
   Cloudflare Pages limit); trust is.

The Web Crypto API is no alternative: PDF encryption is a specific file
format scheme (RC4/AES with PDF-specific key derivation), not generic AES,
and hand-rolling it fails the "mature library" rule.

## Path to shipping later

- Build qpdf/WASM ourselves from pinned upstream sources in CI
  (reproducible build), audit the toolchain, and record it in
  licenses/THIRD_PARTY_NOTICES.md (qpdf is Apache-2.0 with bundled
  components to check individually, spec §13), or
- adopt a wrapper if one reaches stable, multi-maintainer status.

Until then the tool stays off the site rather than shipping something weak.
