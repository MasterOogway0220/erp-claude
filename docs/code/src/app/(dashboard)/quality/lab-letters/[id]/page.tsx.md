# src/app/(dashboard)/quality/lab-letters/[id]/page.tsx

> Client page at `/quality/lab-letters/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/lab-letters/[id]` screen. 282 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/quality/lab-letters/${id}`, `/api/quality/lab-letters/${id}/pdf`.

## testNames is a JSON string, not an array

`LabLetter.testNames` is `String?` (`@db.LongText`) holding JSON. An
`Array.isArray` check on it is always false, which showed as a letter with no
tests at all; it is read through `parseStringArray`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
