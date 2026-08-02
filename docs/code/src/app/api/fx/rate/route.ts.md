# src/app/api/fx/rate/route.ts

> `/api/fx/rate` — GET

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

No direct Prisma access — delegates or computes.

- **GET** — Read

## How it works

Thin handler; see the source.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
