# src/lib/quotations/listing.ts

> Two rules for the quotation list: when tender records belong in it, and how a
> revision chain collapses to a single row.

## Why this exists

The quotation list had two complaints against it, with the same root: it was
showing rows the user did not think of as separate quotations.

**Revisions stacked up.** Creating a revision inserts a new row sharing the
same `quotationNo`. The original attempt at "show only the latest" was a status
filter excluding `SUPERSEDED`/`REVISED` — but nothing marks a predecessor
superseded except winning the deal or emailing the revision. So a plain
Rev.1 → Rev.2 left `NPS/26/15205` sitting in the list three times.

**Tenders share the number series.** A tender and a quotation both draw from
the `NPS/26/…` sequence, so users expect to see them together. But a tender has
no status, revision or conversion state, so it cannot satisfy those filters.

## What it does

| Export | Behaviour |
|---|---|
| `shouldIncludeTenders(filters)` | True only when no quotation-specific filter is active. |
| `collapseRevisions(rows)` | Keeps the first row per `quotationNo`. |
| `quotationSearchWhere(search)` | The `OR` array matching our quotation number, the customer name, the client's enquiry number (`inquiryNo`), their reference (`customerReference`), and the source tender's `tenderRef` / `tenderNo`. |
| `tenderSearchWhere(search)` | The `OR` array for the tender rows in the quotation list: `tenderNo`, `tenderRef` (the client's own tender number), organisation, project, customer name. |

## How it works

### `shouldIncludeTenders`

True when the category is empty or `TENDER`, **and** status, revision and
conversion filters are all empty.

The logic is "a tender cannot answer this question". Filtering by status
`APPROVED` is a question about quotations; a tender has no status, so including
it would be claiming something untrue. Same for the `STANDARD`/`NON_STANDARD`
category filters, which are quotation classifications.

### `collapseRevisions`

Keeps the **first** row seen per `quotationNo` and drops the rest.

The critical contract: **the caller must order by version descending.** This
function has no idea what a version is — it deduplicates by insertion order. If
the query orders ascending, you keep Rev.0 and hide the current revision, which
is both wrong and hard to spot in testing because the list still looks
plausible. The API orders `[{ quotationNo: "desc" }, { version: "desc" }]`.

Equally important: **collapse after filtering, not before.** If Rev.2 is an
unfinished draft and Rev.1 is approved, a filter for approved quotations should
still find Rev.1. Filtering first and collapsing second gives "the highest
revision that matches what you asked for". Collapsing first would discard Rev.1
and then show nothing.

The Original and Revisions tabs, and `showAll`, deliberately bypass this and
show every row.

### `quotationSearchWhere` / `tenderSearchWhere`

Sales staff are usually asked about an order by the client's number, not ours:
the enquiry reference on the client's RFQ, or the tender number their
procurement portal issued. Until 5 Oct 2026 the list searched only our
quotation number and the customer name, and the tender rows here did not match
`tenderRef` (the standalone tender list did). Both builders are plain `where`
fragments so they can be tested without a database.

Note that `shouldIncludeTenders` still drops tender rows under any status,
revision or conversion filter, search or not.

## Domain notes

**Revision chain.** Quotations are revised rather than edited once issued — the
client may have the previous version. Each revision is a new row with the same
`quotationNo` and an incremented `version`, linked by `parentQuotationId`, and
carrying a `revisionTrigger` (`MARKET_ADJUSTMENT`, `INTERNAL_CORRECTION`, …).
Rev.0 is the original. Earlier revisions remain reachable from the detail
page's Revision History; they are hidden only from the main list.

## Gotchas and constraints

- Ordering is a precondition, not an implementation detail. It cannot be
  enforced from inside the function, which is why it is stated in the source
  comment and here.
- Generic over `T extends { quotationNo: string }`, so it works on any shaped
  row — including tender records once they are merged in, which is safe
  because tender numbers do not collide with quotation numbers.

## Related

- `src/lib/quotations/listing.test.ts`
- `src/app/api/quotations/route.ts` — applies both; note the ordering.
- `src/app/(dashboard)/quotations/page.tsx` — the list.
- Commit `3ed7b0d` — introduced `collapseRevisions`.
