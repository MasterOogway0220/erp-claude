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

The standard layout prints the per-item **remark** and material code together
in its last column ("Remark/Material Code"). The non-standard layout has no
such column: everything about a line lives in the description cell, which
`buildItemDescriptionLines` assembles — a `MATERIAL CODE:` line when a code is
saved and the description does not already contain it, then the description,
then a `REMARK:` line. That last line was missing until 2026-09-18; the remark
was saved and shown nowhere, and salespeople had started typing the customer's
material code into Remarks to force it onto paper. The structured (no
`itemDescription`) branch of the same function falls back to the remark as the
material code, so it prints the `REMARK:` line only when the two differ.

Both the standard and non-standard layouts here get their rate and amount cells
from **`priceCellWord`** (`src/lib/quotations/display.ts`), shared with the two
HTML templates: it returns `"REGRET"`, `"QUOTED"`, or `null` meaning "print the
figure". Called as `priceCellWord(item, isUnquoted) ?? fmt(...)` — `??` and not
`||`, or a legitimate rate of `0` would be swallowed.

This matters more here than anywhere else: **this renderer's output cannot be
asserted in a test.** react-pdf subsets its fonts, so the words are not
recoverable from the PDF buffer without a parser. Sharing the decision is what
gives the downloaded PDF coverage of the part that can actually be wrong —
`src/lib/pdf/quotation-rate-column.test.ts` pins the rule to exactly those
three outcomes.

**Item ID:** the non-standard description builder prefixes
`ITEM ID: <materialCodeLabel>` (was `MATERIAL CODE:`); the standard table's
"Remark/Material Code" column is unchanged.

**Remarks:** both layouts print `quotation.remarks`. The standard layout
always prints the `Remarks:` heading (format sheet) with the text after it;
the non-standard layout prints a bordered Remarks row between Amount in Words
and OFFER TERMS only when there is text. Keep in step with the two HTML
templates (email attachment), which carry the same rule.

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
