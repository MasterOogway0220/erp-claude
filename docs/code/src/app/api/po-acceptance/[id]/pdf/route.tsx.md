# src/app/api/po-acceptance/[id]/pdf/route.tsx

> `/api/po-acceptance/[id]/pdf` — GET: the PO acceptance letter as a real PDF.

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## Why this exists

The acceptance letter is the document we send a client to confirm we accept
their purchase order and commit to a delivery date. Until 5 Oct 2026 this route
returned the HTML template as `text/html`; the detail page saved that under a
`.pdf` name, so "Download PDF" produced a file no PDF reader would open (the
"PDF not open in PO acceptance" complaint). It now renders a real PDF with
react-pdf. It was `route.ts`; it is `.tsx` because it renders JSX.

## What it does

- **GET** → `application/pdf`, `Content-Disposition: inline;
  filename="PO-Acceptance-<acceptanceNo with / as ->.pdf"`, `no-store`.
- 404 when the acceptance does not exist; 400 JSON when it is not `ISSUED`.
- `maxDuration = 60` (react-pdf render plus a logo fetch).

## How it works

Loads the acceptance with `LETTER_INCLUDE` and shapes it with `letterData`
(`src/lib/po-acceptance/letter.ts`), the same pair the email route uses, then
renders `POAcceptanceDocument` (`src/lib/pdf/po-acceptance-pdf.tsx`).

`inline` rather than `attachment`: the create wizard previews this URL in an
iframe after finalising, and an attachment would download instead of
previewing. The detail page's button fetches it into a blob and saves it with
its own filename, so the disposition does not affect downloading.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- The company logo is stored as a site-relative path; `letterData` prefixes
  `request.nextUrl.origin` because react-pdf fetches images over HTTP.
- Gated by `checkAccess("poAcceptance", "read")` — authentication only; role
  enforcement is disabled app-wide. Not company-scoped beyond the record id.

## Related

- `src/lib/pdf/po-acceptance-pdf.tsx` — the document.
- `src/lib/po-acceptance/letter.ts` — include + data shaping, shared with
  `email/route.tsx`.
- `src/app/(dashboard)/po-acceptance/[id]/page.tsx` — Download button.
- `src/app/(dashboard)/po-acceptance/create/page.tsx` — preview iframe (URL
  from `finalize/route.ts`).
- [Module overview](../../README.md)
