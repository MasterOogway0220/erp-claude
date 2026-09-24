# src/lib/sandbox/tables.ts

> `MODEL_TABLES`: every real table the Prisma schema maps to.

## Why this exists

Two things must agree exactly on what "a real table" is: what gets copied
(`refresh.ts`) and what gets renamed (`rewrite.ts` via `adapter.ts`). Deriving
both from the schema's runtime metadata means a new model is covered by both
automatically. See the [module README](./README.md).

## What it does

Exports `MODEL_TABLES: readonly string[]` — `dbName ?? name` for every model in
`Prisma.dmmf.datamodel.models`.

## How it works

Reads the DMMF bundled with the generated client at module load. No DB access.

## Gotchas and constraints

- Tables that exist in the database but not in the schema (the `sbx_` copies
  themselves, `_prisma_migrations`) are deliberately not in the list.
- After adding a model, run `prisma generate` (the build does) — the list comes
  from the generated client, not from `schema.prisma` directly.

## Related

- `rewrite.ts`, `refresh.ts`, `src/lib/prisma.ts`.
