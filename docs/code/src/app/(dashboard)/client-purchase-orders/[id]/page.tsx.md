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
else the saved site; the Dispatch row is new (it was never shown). A typed
address keeps the line breaks it was entered with. A saved site prints as one
line: name (or label), address line 1, city, state, `PIN:`, `GST:` — before
6 Oct 2026 it left out the street and the PIN code, so a site read as little
more than a city. A **Terms & Conditions** card lists the order's ticked terms.
The "Others" charge shows what it is for when a description was given.

A line's `itemDescription` — a non-standard line's own text, whose product is
often just "Non-Standard Item" — shows under the product, line breaks kept,
both in the items table and in the Start Order Processing dialog.

**Start Order Processing** (which creates the sales order) shows only once the
P.O. acceptance — our formal acknowledgement of the client's order, raised
from `/po-acceptance` — is ISSUED, the order is not cancelled and no live sales
order exists. `/api/sales-orders/from-cpo` refuses any earlier attempt with
"PO Acceptance must be issued before creating a Sales Order"; the button used
to show on every non-cancelled order and fail with that error when clicked.

The items table shows the client's own **Sl. No. (PO)** and **Item Code (PO)**
next to our S.No. They are captured at registration and carried to the sales
order; before 5 Oct 2026 the API returned them but this screen dropped them.

## Gotchas

- Large file (723 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
