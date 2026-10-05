# src/lib/pdf/po-acceptance-pdf.tsx

> The PO acceptance letter as a react-pdf document — the downloadable copy.

See [README.md](./README.md) for the shared pattern.

## Why this exists

The acceptance letter only existed as HTML (`po-acceptance-template.ts`), and
the download route served that HTML under a `.pdf` name, which no PDF reader
opens. This is the real PDF. The HTML template stays: the email embeds it
inline, where a PDF cannot go.

## What it does

`POAcceptanceDocument({ data, company })` — one A4 portrait page (more for a
long order), taking the same `POAcceptanceData` / `CompanyInfo` types as the
HTML template.

## How it works

Same sections, same order as the HTML: company header (logo above the name
when `companyLogoUrl` is set), title, client block and our references, the
acknowledgement paragraph with the committed delivery date, the items table,
the client PO's terms list (or, when it has none, its payment/delivery terms), the client's contact persons, remarks, signature.

- **Items table** — S.No, **PO Sl. No.** and **PO Item Code** (the client's
  own line number and item code from their PO, so they can match this letter
  to their order), description (material and additional spec on a second
  line), size, qty, UOM, rate, amount. Widths total 100%; the totals row spans
  the first eight columns with one 87% cell because react-pdf has no colspan.
  The header row is `fixed`, so it repeats on every page.
- **Currency** — Helvetica has no ₹ glyph, so the currency code goes in the
  Rate / Amount headers and figures use Indian grouping (`fmtIN`).
- **Signature** — "For <company>" then `ourContact` (name, "Follow-up
  contact", email, phone) when present, else "Authorized Signatory".

## Domain notes

- **CDD** — committed delivery date: what we promise, not the date on the
  client's PO.
- **Contact persons** (Follow-up / Quality / Accounts) are the *client's*
  people, typed in on the acceptance. `ourContact` is *ours*: the user who
  issued the letter.

## Gotchas and constraints

- Between the item lines and "Total" the `summary` rows (`letterSummary`)
  show material value, charges and GST, so the client PO's `grandTotal` adds up
  on the page. Before, the Total sat directly under the item amounts.
- Dates are dd/mm/yyyy (`fmtDate`); the HTML copy prints dd-Mon-yyyy.

## Related

- `src/lib/pdf/po-acceptance-template.ts` — the HTML twin; keep the two in step.
- `src/lib/po-acceptance/letter.ts` — builds `data` / `company`.
- `src/app/api/po-acceptance/[id]/pdf/route.tsx` — the only caller.
- Test: `src/lib/pdf/po-acceptance-pdf.test.ts` (also covers the HTML additions).
