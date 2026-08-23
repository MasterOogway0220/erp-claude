# src/app/(dashboard)/dispatch/bank-reconciliation/page.tsx

> Client page at `/dispatch/bank-reconciliation`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/dispatch/bank-reconciliation` screen. 903 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/dispatch/payments?view=list`.
- Its `PaymentReceipt` interface needs nothing of the customer but `id` and
  `name`, so it takes the summary shape under the key
  `["payment-receipts", "list"]` — shared with the `/dispatch` payments tab,
  which requests the same URL. Reconciliation state is local, in
  `localStorage`, and is not part of this payload.

## Gotchas

- Large file (903 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
