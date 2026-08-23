# src/app/(dashboard)/quality/qc-release/[id]/page.tsx

> Client page at `/quality/qc-release/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/qc-release/[id]` screen — one QC release (the quality
sign-off that frees inspected stock for use) with its decision, releaser, linked
inspection and the inventory lot it covers (heat number, size, quantity).

## How it works

- `"use client"` — runs in the browser.
- Reads `/api/quality/qc-release/${id}` through `useApiQuery` under the cache key
  `["qc-release", id]`. The id is the only value the URL depends on, so it is the
  only thing in the key. The list screen (`/quality`) caches the collection under
  the separate `["qc-releases"]` key.
- `data?.qcRelease` is read straight off the cache entry; nothing is mirrored
  into local state.

## Gotchas

- A failed or errored read leaves `qcRelease` null and the page falls through to
  the "QC Release Not Found" panel. That matches the old hand-rolled fetcher,
  which swallowed the error and left the state null — there is deliberately no
  toast or redirect here.

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
