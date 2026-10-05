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
  (address, GSTIN, contact) and items in S.No order, the company, and
  `createdBy { name, email, phone }`, and the client PO's ticked `terms` in order.
- `AcceptanceForLetter` — the row type that include returns.
- `letterData(acceptance, origin)` → `{ data: POAcceptanceData, company: CompanyInfo }`.
- `letterSummary(cpo, othersDescription)` → the rows printed between the item
  lines and the Total: Material Value, each non-zero charge ("Others —
  <description>" when described), CGST/SGST at half the rate or IGST at the
  full rate, Round Off. All from the client PO, the record the Total
  (`grandTotal`) comes from, so the page adds up. The description is the
  acceptance's own when set, else the client PO's.

## How it works

Straight field mapping, with three decisions:

- Decimal columns become numbers (`Number(...)`); null totals stay null.
- `terms` are the client PO's own terms (copied from the quotation and edited
  at registration), only the ticked ones.
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

## Related

- `src/app/api/po-acceptance/[id]/pdf/route.tsx`, `email/route.tsx` — callers.
- `src/lib/pdf/po-acceptance-template.ts` (types, HTML), `po-acceptance-pdf.tsx` (PDF).
- Test: `src/lib/po-acceptance/letter.test.ts`.
- Logo limit: a logo uploaded through the company master is stored as `/api/files/<id>`, which needs a login; react-pdf fetches without cookies and would render no logo. The live logo (2026-10-05) is a public static path, so it renders. The quotation PDF has the same limit.
