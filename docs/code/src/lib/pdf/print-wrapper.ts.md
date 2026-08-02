# src/lib/pdf/print-wrapper.ts

> Wraps a document's HTML so the browser prints it itself — the no-Chromium
> alternative to server-side rendering.

## Why this exists

Server-side PDF generation needs Chromium, which is heavy, slow to cold-start
and occasionally unavailable. For a user who just wants a paper copy, sending
them the HTML and letting their own browser print it is instant and cannot fail
for infrastructure reasons.

It is a fallback and a convenience, not the primary path — a browser print
cannot be emailed or attached to a dossier.

## What it does

`wrapHtmlForPrint(html, landscape)` → the same HTML with print styles and an
auto-print script injected.

## How it works

Injects a `<style>` and a `<script>` before `</head>`, falling back to
`</html>`, falling back to appending. The templates emit full documents, so the
first branch is the normal case; the fallbacks stop a fragment silently losing
its styling.

**`@media print`** sets `@page { size: A4 <orientation>; margin: 0 }` and moves
the margin onto `body` as padding. Browsers apply their own default page
margins and add headers and footers; zeroing the page margin and padding the
body instead is what removes the browser's URL and timestamp from the printed
sheet.

**`-webkit-print-color-adjust: exact`** (with the unprefixed
`print-color-adjust`) forces backgrounds and colours to print. Browsers strip
them by default to save ink, which would drop the table shading and header
bars that make these documents readable.

**`@media screen`** constrains the body to the paper width so the preview looks
like the output rather than a full-width web page.

The script calls `window.print()` on load after a **300 ms** timeout. The delay
lets images — logos — finish loading; printing immediately can produce a sheet
with them missing. It is a heuristic, and the server-side renderer's
`networkidle0` is the more reliable equivalent.

## Domain notes

Uses true A4 here, unlike `render-pdf.ts` which uses custom taller pages. A
browser print goes to real paper, where A4 is A4; the server renderer is
producing a PDF where the page can be any size.

## Gotchas and constraints

- **300 ms is a guess.** A slow logo can still be missed. There is no
  load-completion check.
- **Output varies by browser** — Chrome, Safari and Firefox differ on page
  breaks and background handling.
- **Not usable for anything that must be stored or sent.** No buffer is
  produced.
- The injected script runs on load with no opt-out, so the page always prints.

## Related

- `src/lib/pdf/render-pdf.ts` — the server-side path.
- `src/lib/pdf/*-template.ts` — produce the HTML.
