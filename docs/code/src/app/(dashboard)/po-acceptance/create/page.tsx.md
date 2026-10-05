# src/app/(dashboard)/po-acceptance/create/page.tsx

> Client page at `/po-acceptance/create`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/po-acceptance/create` screen. 1551 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/client-purchase-orders`, `/api/client-purchase-orders/${cpoId}`, `/api/masters/customer-contacts`, `/api/po-acceptance`, `/api/po-acceptance/${createdId}/email`, `/api/po-acceptance/${newId}/finalize`.
- Once the chosen client PO loads, one effect seeds the form from it: the six
  additional charges and their tax flags, GST rate and inter-state flag, and
  the **committed delivery date** (CDD — the date we promise delivery by).
  The CDD comes from `committedDeliveryDate`, falling back to the older
  `deliveryDate` twin, which CPO edit does not update. A date the user has
  already typed is kept; picking a different client PO clears the CDD and the
  "Others" description so the new PO's values load. Before 5 Oct 2026 the CDD
  was not seeded and had to be retyped on every acceptance.
- The Other Charges box has a description input ("What is this charge for?"),
  seeded from the client PO's `otherChargesDescription`.

## Gotchas

- Large file (1551 lines). Read the section you are changing rather than pattern-matching from a sibling.
- The CPO dropdown deliberately reuses the CPO register screen's React Query key
  and URL, `?status=REGISTERED&view=list`, so the two share one cache entry.
  `view=list` returns the summary shape (line items as bare ids); this picker
  reads only header fields, and the priced lines come from the per-CPO fetch. If
  you change either the key or the flag, change the register screen to match —
  otherwise whichever query lands first fills the cache with a shape the other
  cannot read, and the dropdown or the table silently empties.
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
