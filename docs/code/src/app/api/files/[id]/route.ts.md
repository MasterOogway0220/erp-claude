# src/app/api/files/[id]/route.ts

> `/api/files/[id]` — GET

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

No direct Prisma access — delegates or computes.

- **GET** — Read

## How it works

- Gated by `checkAuth()` — session required, no module check.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
