# src/app/(dashboard)/po-acceptance/create/page.tsx

> Client page at `/po-acceptance/create`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/po-acceptance/create` screen. 1606 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/client-purchase-orders`, `/api/client-purchase-orders/${cpoId}`, `/api/masters/customer-contacts`, `/api/po-acceptance`, `/api/po-acceptance/${createdId}/email`, `/api/po-acceptance/${newId}/finalize`.
- Once the chosen client PO loads, one effect seeds the form from it: the six
  additional charges and their tax flags, GST rate and inter-state flag, and
  the **committed delivery date** (CDD — the date we promise delivery by).
  Every charge field comes from that PO: a NULL there seeds 0 / unticked, and
  a NULL GST rate seeds 18%. Before 6 Oct 2026 a NULL kept whatever the form
  already held, so switching to another PO carried the previous PO's charges,
  ticks and GST rate over.
  The CDD comes from `committedDeliveryDate`, falling back to the older
  `deliveryDate` twin, which CPO edit does not update. A date the user has
  already typed is kept; picking a different client PO clears the CDD and the
  "Others" description so the new PO's values load. Before 5 Oct 2026 the CDD
  was not seeded and had to be retyped on every acceptance.
- The Other Charges box has a description input ("What is this charge for?"),
  seeded from the client PO's `otherChargesDescription`.
- **Totals** (Step 2's summary, Step 3's review, and what is saved) come from
  `cpoTotals` (`src/lib/calc/cpo-totals.ts`), the client PO's own arithmetic:
  GST on the material value plus only the charges whose **Taxable** box is
  ticked, every charge in the total, and the grand total rounded to the rupee
  with the round-off as the difference. GST applies to an INR order, or a
  foreign-currency one delivered in India; otherwise the rate passed is 0. One
  effect copies the eight figures into the form, so the POST sends exactly
  what Step 3 shows. Before 6 Oct 2026 the page used `computePOTotals`, which
  taxed every charge whatever its tick, and saved an unrounded grand total
  next to a round-off it never applied.
- **Line items table** (Step 2): the Description column is product + size,
  with a non-standard line's own `itemDescription` underneath (its product
  reads only "Non-Standard Item"). It used to read `description`, a field
  `ClientPOItem` does not have, so it always showed "—".
- **Order Value** (Step 1 summary): the register list sends `grandTotal` as a
  Decimal string, which `toLocaleString` prints raw ("₹ 15945"); it is
  converted to a number and shown with Indian grouping and 2 decimals.

## Gotchas

- Large file (1606 lines). Read the section you are changing rather than pattern-matching from a sibling.
- A client PO saved at 0% GST stores its rate as NULL (the POST writes
  `gstRate || null`), so it seeds 18% here. Check the rate on such an order.
- The CPO dropdown deliberately reuses the CPO register screen's React Query key
  and URL, `?status=REGISTERED&view=list`, so the two share one cache entry.
  `view=list` returns the summary shape (line items as bare ids); this picker
  reads only header fields, and the priced lines come from the per-CPO fetch. If
  you change either the key or the flag, change the register screen to match —
  otherwise whichever query lands first fills the cache with a shape the other
  cannot read, and the dropdown or the table silently empties.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
