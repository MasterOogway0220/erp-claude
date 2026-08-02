# src/app/api/quotations/ — quotation endpoints

13 files. The front of the whole document chain.

See [the API pattern](../README.md) for conventions every route follows.

## The domain

A **quotation** is the priced offer sent to a client. It is the origin of
everything downstream: a client PO references it, the sales order inherits from
it, and the balance mechanism tracks what is still open against it.

Two categories, chosen at creation and fixed thereafter:

- **STANDARD** — catalogue items with structured product/material/size.
- **NON_STANDARD** — free-text descriptions for fabricated or bought-in items.

They have separate create pages, separate PDF templates, and the category
decides which the edit route opens.

## Revisions

Quotations are **revised, not edited**, once issued — the client may already
hold the previous version. A revision is a new row sharing `quotationNo` with
an incremented `version`, linked by `parentQuotationId` and carrying a
`revisionTrigger`. Rev.0 is the original.

The list collapses a chain to its highest matching revision
(`collapseRevisions`); the detail page shows the full history.

## Status flow

```
DRAFT → PENDING_APPROVAL → APPROVED → SENT → WON / LOST / EXPIRED
                        ↘ REJECTED → DRAFT
```

Enforced by `VALID_QUOTATION_TRANSITIONS` in `[id]/route.ts`.

## Things that bit, and are now guarded

- **The deal owner used to be erased by ordinary edits.** The PUT wrote
  `dealOwnerId || null` unconditionally while the form sent `undefined`, which
  `JSON.stringify` drops. Now guarded by `dealOwnerPatch`; the same class of
  bug had already blanked `preparedById` on six quotations.
- **`preparedById` is write-once.** Editing does not transfer authorship;
  reassigning the salesperson is what `dealOwnerId` is for.
- **The PUT deletes and recreates items**, so it spreads the original row first
  to preserve fields the form does not edit (costing, BOM, tag fields).
- **Prices are optional at DRAFT** and mandatory at approval — the price gate
  in `src/lib/quotations/pricing.ts`.
- **Tenders share the quotation number series**, so they appear in this
  listing.

## The files

| Route | Purpose |
|---|---|
| `route.ts` | List and create |
| `[id]/route.ts` | Detail, full update (PUT), status change (PATCH), delete |
| `[id]/revise/route.ts` | Create the next revision |
| `[id]/balance/route.ts` | Quantity still open — drives partial client POs |
| `[id]/compare/route.ts` | Diff two revisions |
| `[id]/pdf/route.tsx` | The PDF |
| `[id]/email/route.tsx` | Send to client |
| `[id]/emails/route.ts` | Send log |
| `[id]/activity/route.ts` | Audit trail |
| `[id]/terms/route.ts` | Terms |
| `past-prices/route.ts`, `material-history/route.ts` | Prior pricing for the same material |
| `preview-number/route.ts` | Peeks the next number **without** incrementing |

## Related

- `src/lib/quotations/` — pricing, listing, display, deal-owner.
- `src/lib/pdf/quotation-*` — the two templates.
- `src/app/(dashboard)/quotations/`
