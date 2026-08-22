# src/lib/purchase/pr-item-fields.ts

> One reader for a purchase-requisition line, shared by the screens that render
> other people's items.

## Why this exists

An RFQ has no items of its own — it renders the requisition's, and so does the
vendor-quotation screen. A `PRItem` carries
`product / material / additionalSpec / sizeLabel / uom`, but both screens were
reading `itemName / name / specification / description / unit`, none of which
exist on that model.

The result was not subtle: every row on the RFQ showed `—` for item name and
specification, and the vendor-quotation dialog listed unnamed rows. Worse, the
dialog then *sent* those empty fields, so a saved `VendorQuotationItem` recorded
no product at all — a vendor quote in the database that could not say what it
was for. Found by walking the flow in a test environment; the wrong field names
had presumably been copied from an earlier shape of the model.

## What it does

```ts
prItemFields(prItem)  // { name, spec, unit }
prItemLabel(prItem)   // "C.S. SEAMLESS PIPE — ASTM A106/... / 6\"NB X SCH 120"
```

- `name` — the product.
- `spec` — material / additional spec / size, joined with ` / `; this is what a
  vendor actually quotes against.
- `unit` — the unit of measure, e.g. `MTR`.

`prItemLabel` is the single-line form, for tables with one column for the item.

## How it works

Each field falls back through the older names (`itemName`, `name`,
`specification`, `description`, `unit`) before giving up on `""`. The fallbacks
cost nothing and mean a caller passing some other item shape — a sales-order
line, a vendor-quotation line — still renders instead of going blank.

Optional chaining throughout, because callers pass rows straight out of a fetch
that may not have loaded yet.

## Domain notes

A pipe is identified by product (what it is), material (the standard it is made
to, e.g. `ASTM A106/ASTM A53/API 5L GR. B`) and size (`6"NB X SCH 120` — nominal
bore and schedule). All three are needed to buy the right thing; the product
alone is not enough.

## Gotchas and constraints

- Display only. Do not parse `spec` back apart — read the `PRItem` fields.
- It does **not** carry `technicalRequirements`; that is a separate column, read
  directly by the screens that show it.

## Related

- `src/app/(dashboard)/purchase/rfq/[id]/page.tsx` — the PR items table.
- `src/app/(dashboard)/purchase/rfq/[id]/quote/[rfqVendorId]/page.tsx` — the
  vendor quotation form.
- `prisma/schema.prisma` → `PRItem`.
