# src/app/(dashboard)/masters/company/[id]/edit/page.tsx

> Client page at `/masters/company/[id]/edit`.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/company/[id]/edit` screen. 488 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/gst/search`, `/api/masters/company`, `/api/masters/company/${id}`, `/api/upload`, `https://api.postalpincode.in/pincode/${value}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
