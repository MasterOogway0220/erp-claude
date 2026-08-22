# src/app/(dashboard)/client-purchase-orders/[id]/page.tsx

> Client page at `/client-purchase-orders/[id]`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/client-purchase-orders/[id]` screen. 723 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/client-purchase-orders/${id}`, `/api/sales-orders`, `/api/sales-orders/from-cpo`.

## Notes

Shows the order's own contact email and phone, the bill-to party when one was
chosen, and a link to the client's signed P.O. copy. The "Delivery Schedule"
row is the client's written period; the CDD is the date derived from it at
registration. Each item shows its qty remark under the ordered quantity, which
is the record of why a line was part-ordered.

## Gotchas

- Large file (723 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
