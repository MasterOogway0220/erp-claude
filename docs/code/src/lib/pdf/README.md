# src/lib/pdf/ — shared notes for the document templates

The nine `*-template.ts` files and `quotation-pdf.tsx` all work the same way,
so the shared mechanics live here and each file's own doc covers only what is
specific to that document.

## The pattern

Each template exports a function taking typed document data plus a
`CompanyInfo` block and returning a **complete HTML string** with inline
`<style>`. That HTML goes to one of two places:

- `renderHtmlToPdf()` — headless Chromium → a PDF buffer, for download and
  email attachment.
- `wrapHtmlForPrint()` — sent to the browser, which prints it itself.

## Why HTML rather than a PDF library

Three reasons, in order of weight:

1. **The layouts are tables.** Every document here is a header block, a line
   table and a totals/terms block. HTML and CSS do that natively; a drawing API
   means computing column positions by hand.
2. **The client supplied formats to match.** The standard quotation follows
   their QTN-Rev.2 layout exactly. Matching an existing paper document is
   iterative, and editing markup is far faster than adjusting coordinates.
3. **The same HTML serves the email body.** A PDF library would need a second
   renderer for that.

The cost is a Chromium dependency, with the cold-start problem documented in
`render-pdf.ts.md`.

## Conventions across all templates

- **Inline everything.** Styles are in a `<style>` block; there is no external
  stylesheet and no CDN — Chromium renders these with no network beyond the
  logo images, and a strict-CSP or offline context must still work.
- **`CompanyInfo` is passed in, never imported.** Three companies share this
  database, so letterhead comes from the caller. Several routes carry a
  `DEFAULT_COMPANY` fallback for when the record is incomplete.
- **Nullable everything.** Document data arrives from Prisma with most fields
  optional. Templates fall back to `"-"` or an empty cell rather than printing
  `undefined` — a visible dash reads as "not applicable", `undefined` reads as
  a bug.
- **Amounts are pre-computed.** Templates format, they do not calculate.
  Totals come from `calc/po-totals.ts` and the amount in words is stored on the
  document at save time, so a historical document does not change if the
  formatting code does.
- **Shared display helpers** — `displayInquiryNo` and `displaySizeLabel` from
  `src/lib/quotations/display.ts` — so a size or inquiry reference renders
  identically in every document.

## The files

| File | Document |
|---|---|
| `quotation-standard-template.ts` | Standard quotation, landscape, client's QTN-Rev.2 format |
| `quotation-nonstandard-template.ts` | Non-standard quotation, portrait |
| `quotation-pdf.tsx` | react-pdf renderer for the quotation (parallel implementation) |
| `purchase-order-template.ts` | PO to a vendor |
| `po-acceptance-template.ts` | Client PO acceptance |
| `invoice-template.ts` | Tax invoice |
| `packing-list-template.ts` | Packing list |
| `issue-slip-template.ts` | Stock issue slip |
| `inspection-offer-template.ts` | Inspection offer to the TPI agency |
| `client-status-report-template.ts` | Order status report for a client |
| `render-pdf.ts` | HTML → PDF via Chromium |
| `print-wrapper.ts` | HTML → browser print |

## Gotchas that apply to all of them

- **Page geometry is not A4.** `render-pdf.ts` uses custom taller pages so
  content fits on one sheet. Adding a column or a terms line can push a
  document onto a second page, and nothing warns you — check a real render.
- **Logos load over the network.** `waitUntil: "networkidle0"` covers it
  server-side; the browser-print path uses a 300 ms timeout and can miss them.
- **`quotation-pdf.tsx` is a second implementation** of the quotation using
  react-pdf rather than HTML. Two renderers for one document; changes to the
  quotation layout may need to be made twice. Check which one the route you are
  touching actually calls.
- **Inch marks in product data.** Sizes contain `"` — `6"NB X SCH 40`. Anything
  interpolated into an HTML attribute needs escaping; inside text content it is
  fine.
