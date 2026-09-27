# Known limitations (documented per spec §23)

Honest trade-offs of the V1 tools, stated here and, where user-relevant, in
the tool UI itself.

- **Grayscale** and **Compress → "Shrink images"** re-render each page with
  PDF.js and rebuild the PDF from those images. Output pages are pictures:
  text stops being selectable/searchable, vectors lose sharpness when
  zoomed, and links/form fields are dropped. Vector-preserving grayscale or
  image-only recompression would require rewriting existing content streams,
  which pdf-lib cannot do — out of scope for V1. Both tool pages state this.
- **Crop** sets the /CropBox: content outside it is hidden, not removed.
  The page says so explicitly — it is not a redaction tool.
- **Add page numbers** places labels in the page's unrotated coordinate
  space; on pages with a /Rotate entry the label follows the stored, not the
  displayed, orientation.
- **Change page size** in scale mode transforms page content; annotation
  positions (links, form fields) are not rescaled with it.
- **Watermark / page numbers** use the built-in Helvetica fonts, which only
  cover WinAnsi (Latin) text; other scripts are rejected with a clear error
  rather than drawn wrong.
- **New-document operations** (merge, split, extract, reverse, reorder,
  delete, images→PDF) rebuild the file from copied pages and do not carry
  over document-level metadata, outlines, or attachments.
- **Password protect** is deferred entirely — see password-protect.md.
- **Encrypted PDFs** are rejected by every editing tool; the info viewer
  reports only structural facts readable without a password and never
  bypasses access controls.
