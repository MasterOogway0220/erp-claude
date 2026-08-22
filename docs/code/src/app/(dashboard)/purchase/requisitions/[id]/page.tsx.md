# src/app/(dashboard)/purchase/requisitions/[id]/page.tsx

> Client page at `/purchase/requisitions/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/purchase/requisitions/[id]` screen. 420 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/purchase/requisitions/${id}`.

## Notes

The line-items table has a **Technical Requirements** column: the
order-processing configuration (TPI, lab tests, NDT, PMI, coating, galvanising,
screwed ends, colour coding, stencil spec) carried across from the sales order
when the PR was raised. It is what the buyer has to buy against; before it
existed an enquiry could go out for material that could not meet the client's
inspection requirements, and it was only caught at GRN.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
