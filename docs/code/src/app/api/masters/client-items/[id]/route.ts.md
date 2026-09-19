# src/app/api/masters/client-items/[id]/route.ts

> `/api/masters/client-items/[id]` — PATCH, DELETE

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

- **PATCH** `{ itemNo?, description?, unit? }` — partial update; a field left
  out is untouched, a field sent blank is cleared. The customer cannot be
  changed (an ID belongs to one customer; re-create it under the other).
  `400` on a duplicate `(customerId, itemNo)`, `404` when missing.
- **DELETE** — hard delete. Quotation lines hold the ID as text, not by FK, so
  deleting a row changes no document — it only stops the ID being suggested.

## How it works

- Gated by `checkAccess("masters", "write" | "delete")`. Authentication only.
- Audit row on each write.

## Related

- `src/app/api/masters/client-items/route.ts` — GET / POST.
- `src/app/(dashboard)/masters/material-codes/client-items-tab.tsx`.
