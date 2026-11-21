# src/lib/quotations/past-quote-match.ts

> Decides when an earlier quotation counts as the "past quote" for a line on
> a new standard quotation.

## Why this exists

Each line on a standard quotation shows **Past Quote#** and **Past Quote
Price**, the rate we last quoted this client for this item. A salesperson
uses that number to stay consistent with what the client has already seen,
so a wrong one is harmful: quote a different spec's price and you either
undercut yourself or contradict a figure the client has on file.

The lookup used to key on the material code alone, and the dropdown listed
every past quotation for the client. Two lines can share a code but differ
in spec or size, and drafts that were never sent counted too. The business
rule, as the user stated it:

1. The past quote must be one we actually **gave to this client**.
2. Only then, check that it is the same item: **product, material,
   additional spec and size**.

## What it does

- `NOT_GIVEN_QUOTATION_STATUSES` lists `DRAFT`, `PENDING_APPROVAL`,
  `REJECTED` and `CANCELLED`. These are statuses whose quotation never
  reached the client. The API filters with `notIn` on it.
- `wasGivenToClient(status)` is the same check for a status already in hand
  (the form's dropdown).
- `isMatchable(line)` is true once product, material and size are all
  filled. Until then a line has nothing to match against.
- `matchKey(line)` returns the four fields normalised and joined, or `""` if
  the line is not matchable. The form remembers it per row to notice when a
  line's identity changed.
- `isSameItem(line, past)` returns true when both have the same non-empty key.

## How it works

Normalisation trims the value, collapses runs of whitespace and lower-cases
it, so `" SMLS  Pipe"` equals `"smls pipe"`. Additional spec (for example a
NACE or IBR requirement) may legitimately be blank. A blank spec is a value,
not a wildcard: it matches only another blank. A line *with* a spec never
borrows the price of a plain one, or the reverse.

In practice almost every live quotation is `APPROVED` (Nov 2026: 71 standard
APPROVED, 6 DRAFT, nothing in `SENT`). That is why "given" is defined as
"not one of the never-sent statuses" rather than "status is `SENT`". The
narrower rule would hide every real past quote.

## Gotchas

- The server match (`/api/quotations/material-history`) uses Prisma
  `equals`, so case-insensitivity there comes from MariaDB's collation, and
  internal double spaces are **not** collapsed in the DB. The client-side
  `isSameItem` is slightly more forgiving. Mismatches would only show up on
  data with doubled internal spaces.
- If a new `QuotationStatus` is added that means "never sent", add it here or
  its quotations will start counting as past quotes.

## Related

- [`src/app/api/quotations/material-history/route.ts`](../../app/api/quotations/material-history/route.ts.md)
- [`src/app/(dashboard)/quotations/create/standard/page.tsx`](../../app/(dashboard)/quotations/create/standard/page.tsx.md)
- `past-quote-match.test.ts` covers the rule.
