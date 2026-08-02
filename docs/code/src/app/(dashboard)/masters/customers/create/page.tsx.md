# src/app/(dashboard)/masters/customers/create/page.tsx

> Client page at `/masters/customers/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/customers/create` screen. 1000 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/gst/search`, `/api/masters/customers`, `/api/masters/customers/${customerId}/terms`, `/api/masters/industry-segments`, `/api/offer-term-templates`, `https://api.postalpincode.in/pincode/${pincode}`, `https://api.zippopotam.us/${countryIsoCode}/${encodeURIComponent(postalCode.trim())}`.

## Gotchas

- Large file (1000 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
