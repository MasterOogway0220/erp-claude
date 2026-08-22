# src/app/(dashboard)/po-acceptance/[id]/page.tsx

> Client page at `/po-acceptance/[id]`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/po-acceptance/[id]` screen. 733 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/po-acceptance/${id}`, `/api/po-acceptance/${id}/email`, `/api/po-acceptance/${id}/emails`, `/api/upload`.

## Notes

The email dialog defaults its recipient to the contact registered on **this
order** (`ClientPurchaseOrder.contactEmail`), falling back to the customer
master email and then the acceptance's follow-up email. The master address is
often a generic inbox, and the person who placed the order is the one who has to
see the acceptance.

## Gotchas

- Large file (733 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
