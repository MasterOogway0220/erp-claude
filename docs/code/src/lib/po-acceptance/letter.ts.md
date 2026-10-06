# src/lib/po-acceptance/letter.ts

> Loads and shapes everything the PO acceptance letter prints, for both the PDF and the email.

## Why this exists

The PDF route and the email route each had their own copy of the Prisma include
and of the ~40-line object the letter template takes. Adding the client's PO
line refs, our follow-up person and an absolute logo URL to both by hand is
exactly how one copy ends up missing a field. One include and one mapper keep
the two letters identical.

## What it does

- `DEFAULT_COMPANY` — letterhead used when the acceptance has no company row.
- `LETTER_INCLUDE` — the `POAcceptance` include: client PO with customer
  (address, GSTIN, contact), its billing site (`billingAddress`) and items in
  S.No order, the company, and `createdBy { name, email, phone }`, and the
  client PO's ticked `terms` in order.
- `AcceptanceForLetter` — the row type that include returns.
- `letterData(acceptance, origin)` → `{ data: POAcceptanceData, company: CompanyInfo }`.
- `letterSummary(cpo, othersDescription)` → the rows printed between the item
  lines and the Total: Material Value, each non-zero charge ("Others —
  <description>" when described), CGST/SGST at half the rate or IGST at the
  full rate, Round Off. All from the client PO, the record the Total
  (`grandTotal`) comes from, so the page adds up. The description is the
  acceptance's own when set, else the client PO's.
- `letterAddressee(customer, billingSite, typedBillingText)` → the "To:"
  block's name and address, in the customer's shape (see below).

## How it works

Straight field mapping, with these decisions:

- Decimal columns become numbers (`Number(...)`); null totals stay null.
- A line's `product` is its `itemDescription` (trimmed) when it has one, else
  its `product`. A non-standard line — one quoted as free text rather than
  picked from the product catalogue — has the product "Non-Standard Item", and
  the description the user typed is the item. Before 6 Oct 2026 the letter
  printed just "Non-Standard Item" for such lines. Both letters take it from
  here, so the PDF and the email agree.
- `terms` are the client PO's own terms (copied from the quotation and edited
  at registration), only the ticked ones, each value through `cleanTermValue`:
  some saved terms begin with ": ", which the letter printed as ": Ex-Godown"
  (6 Oct 2026). The stored terms are not changed.
- **Who it is addressed to** (`letterAddressee`): the billing address on the
  client PO. A typed one ("Enter manually", typed as "Billing name, address,
  GSTIN") is printed as written: its first line as the addressee's name — the
  billing entity can be another company than the customer master — and the
  rest as the address, which already carries any GSTIN line, so no separate
  GSTIN is printed. A picked saved site
  prints its company name (else the customer's), address lines, city with PIN,
  state, and its GSTIN; a site without its own GSTIN gets the customer's only
  when it is in the customer's state, because a GSTIN is per state. A PO with
  neither goes to the customer master address. The "Attn:" / "Dear" line still
  uses the customer master contact. Before 6 Oct 2026 every letter went to the
  customer master address, whatever billing address the PO named.
- `ourContact` is `createdBy`: the person who issued the letter follows the
  order up. There is no separate "follow-up owner" field on the acceptance.
- `companyLogoUrl` starting with `/` is prefixed with `origin`. react-pdf
  fetches images over HTTP, and an email client cannot resolve a relative
  `src`, so both callers need it absolute.

## Domain notes

The acceptance letter confirms to the client that we accept their purchase
order (registered as a CPO, "client purchase order") and commits to a
delivery date. See `src/lib/pdf/po-acceptance-template.ts.md`.

## Gotchas and constraints

`createdById` is required on `POAcceptance`, so `ourContact` is always
present for a real row; the templates still handle it missing.

A multi-line description keeps its line breaks in the PDF (react-pdf honours
`\n`). The HTML email copy does not convert `\n` to `<br>`, so there the lines
run together on one line.

## Related

- `src/app/api/po-acceptance/[id]/pdf/route.tsx`, `email/route.tsx` — callers.
- `src/lib/pdf/po-acceptance-template.ts` (types, HTML), `po-acceptance-pdf.tsx` (PDF).
- Test: `src/lib/po-acceptance/letter.test.ts`.
- Logo limit: a logo uploaded through the company master is stored as `/api/files/<id>`, which needs a login; react-pdf fetches without cookies and would render no logo. The live logo (2026-10-05) is a public static path, so it renders. The quotation PDF has the same limit.
