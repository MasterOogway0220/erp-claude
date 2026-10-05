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

Billing and Dispatch Address rows show the typed address when one was entered,
else the saved site; the Dispatch row is new (it was never shown). A
**Terms & Conditions** card lists the order's ticked terms. The "Others" charge
shows what it is for when a description was given.

The items table shows the client's own **Sl. No. (PO)** and **Item Code (PO)**
next to our S.No. They are captured at registration and carried to the sales
order; before 5 Oct 2026 the API returned them but this screen dropped them.

## Gotchas

- Large file (723 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Sandbox preview (temporary, from 5 Oct 2026)

`page.tsx` is currently a gate: the sandbox login gets `page.sandbox.tsx`
— the behaviour this doc describes — and every other user gets
`page.legacy`, the version from before the 03/10/26 meeting fixes. See
`src/lib/sandbox/preview.ts.md`. Going live: replace this file with the
`.sandbox` copy and delete both copies; then delete this section.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
