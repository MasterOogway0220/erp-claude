# src/app/api/upload/route.ts

> `/api/upload` — POST

See [README.md](README.md) for this module's shared behaviour, and
[the API pattern](../README.md) for the conventions every route follows.

## What it does

No direct Prisma access — delegates or computes.

- **POST** — Create

## How it works

- Gated by `checkAuth()` — session required, no module check.
- Stores uploads with `storeFile()` — into the database, not the filesystem.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/storage/files.ts`
- [Module overview](README.md)
