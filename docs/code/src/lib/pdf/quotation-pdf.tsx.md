# src/lib/pdf/quotation-pdf.tsx

> A react-pdf renderer for the quotation — a second implementation alongside
> the HTML templates.

See [README.md](./README.md) for the shared pattern.

## Why this exists

Historical. This predates or parallels the HTML-plus-Chromium approach, using
`@react-pdf/renderer` to build the document from React components instead.

The advantage is no browser: no cold start, no Chromium binary, no
`@sparticuz` package. The disadvantage is that matching the client's QTN-Rev.2
layout precisely is much harder without CSS, which is why the HTML path became
primary.

## What it does

Exports React components rendering the quotation as a PDF via react-pdf's own
layout engine.

## How it works

react-pdf primitives (`Document`, `Page`, `View`, `Text`) with a StyleSheet,
rather than HTML and CSS. Layout is flexbox-like but not CSS — no tables, no
`position: sticky`, a reduced property set.

Shares `displaySizeLabel` with the HTML templates, so sizes render identically
whichever renderer runs. The inquiry no. prints exactly as entered (above the
inquiry date); `displayInquiryNo`'s digit filter applies only to the PDF
filename, not to headers.

The non-standard page's **"Prepared by"** block shows the **Inquiry Owner**
(`dealOwner`), falling back to `preparedBy` (the user who keyed the quotation
in) only when no owner is assigned — so the client contacts the salesperson
who owns the deal, not a data-entry user. The route must include `dealOwner`
in its Prisma query.

`.tsx` because it contains JSX. Note the project convention: **an API route
containing JSX must be `.tsx`, not `.ts`** — several PDF and email routes are
named that way for this reason.

Both the standard and non-standard layouts here print the rate and amount
columns through the same three-way choice as the HTML templates:
`item.isRegret ? "REGRET" : isUnquoted/isTechnical ? "QUOTED" : <number>`. See
the standard template's doc for what the two words mean and why the order of
the checks matters.

## Domain notes

Same document as `quotation-standard-template.ts`; see that doc for the column
order and the domain terms.

## Gotchas and constraints

- **Two renderers for one document.** Before changing quotation layout, check
  which one the route you are touching calls — a fix applied to only one is a
  live source of divergence between the downloaded PDF and the emailed copy.
  Consolidating on the HTML path would be a genuine simplification.
- react-pdf's layout engine differs from a browser's; the two will not produce
  pixel-identical output and are not expected to.
- No Chromium, so this path does not suffer the cold-start failures — which is
  the one argument for keeping it.

## Related

- `src/lib/pdf/quotation-standard-template.ts` — the HTML implementation.
- `src/lib/quotations/display.ts` — shared helpers.
- `src/app/api/quotations/[id]/pdf/route.tsx`
