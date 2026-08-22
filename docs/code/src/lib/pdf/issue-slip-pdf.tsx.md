# src/lib/pdf/issue-slip-pdf.tsx

> The stores issue slip as a react-pdf document — the first paper migrated off
> the Chromium/HTML pipeline.

See [README.md](./README.md) for the shared PDF pattern.

## ⚠ Not wired up yet

`src/app/api/inventory/stock-issue/[id]/pdf/route.tsx` still calls
`renderHtmlToPdf` with `issue-slip-template.ts`. This component renders and is
tested, but **nothing points at it**. Switching the route over — and comparing
the two outputs before deleting the HTML template — is the remaining work.

## Why this exists

react-pdf needs no Chromium: no browser binary in the Docker image, no 300 MB–1
GB per render, no cold start spawning a process. The issue slip was chosen to go
first because it is the simplest of the thirteen HTML documents, so it proves
the pattern end to end at the lowest risk to client-facing paperwork.

## What it does

Exports `IssueSlipDocument` — a react-pdf `<Document>` for one stock issue:
header, the sales order and customer it is issued against, and a line per item
with length, pieces, make, heat number and MTC reference.

## How it works

Built from `primitives.tsx` — `CELL` / `CELL_END` / `CELL_TOP` for the item
grid, `fmt` and `fmtDate` for values — so it matches the quotation PDF's borders
and formatting without redefining them.

Multi-page is react-pdf's own flow rather than CSS page-break rules: the item
table wraps, and the test covers a slip long enough to spill onto a second page,
which is where an HTML-to-PDF conversion usually breaks first.

## Domain notes

- **Issue slip** — what a storekeeper signs when material physically leaves the
  warehouse against a sales order. It is the paper trail between reserved stock
  and a dispatch.
- **Heat number** — identifies the batch of steel a pipe was cast from. It ties
  a delivered pipe back to its mill test certificate (**MTC**), so it appears on
  every document that moves material and must never be dropped or reformatted.
- **MTC** — Mill Test Certificate, the mill's proof of a heat's chemistry and
  mechanical properties.

## Gotchas and constraints

- Two implementations of this document now exist. Until the route is switched,
  `issue-slip-template.ts` is the one that actually prints — change both or
  neither.
- react-pdf is not CSS; see the constraints in `primitives.tsx.md`.

## Related

- `src/lib/pdf/primitives.tsx` — the shared building blocks.
- `src/lib/pdf/issue-slip-template.ts` — the HTML version still in use.
- `src/app/api/inventory/stock-issue/[id]/pdf/route.tsx` — the route to switch.
- `src/lib/pdf/issue-slip-pdf.test.ts` — renders a single-page and a multi-page
  slip.
