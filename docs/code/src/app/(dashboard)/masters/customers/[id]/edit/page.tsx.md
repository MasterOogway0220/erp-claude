# src/app/(dashboard)/masters/customers/[id]/edit/page.tsx

> Client page at `/masters/customers/[id]/edit`.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/customers/[id]/edit` screen. 1104 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/gst/search`, `/api/masters/customers/${id}`, `/api/masters/customers/${id}/terms`, `/api/masters/industry-segments`, `/api/offer-term-templates`, `https://api.postalpincode.in/pincode/${pincode}`, `https://api.zippopotam.us/${countryIsoCode}/${encodeURIComponent(postalCode.trim())}`.

## Gotchas

- Large file (1104 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
