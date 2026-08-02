# prisma/seed.ts

> The original full-database seed — masters, users, sample documents. **Largely
> superseded; read the warning.**

## Why this exists

Built to populate an empty development database from the client's Excel files
so the app had something to work against.

## What it does

Creates a company, users, masters (products, sizes, customers, vendors),
document sequences, and sample transactional data. Wired to
`npx prisma db seed`.

## How it works

Reads several spreadsheets with `xlsx`, then inserts. Builds its own Prisma
client with the MariaDB adapter rather than importing `src/lib/prisma.ts`,
because it runs outside Next.js.

## Gotchas and constraints

- **This script read the pool-layout Excel files row-wise**, which produced
  mis-paired product/material rows — a `C.S. CONC. REDUCER` matched to a
  specification that happened to sit on the same spreadsheet row. That is the
  defect `src/lib/masters/spec-import.ts` was written to prevent, and the
  reason `scripts/seed-new-masters.ts` wipes and reloads `ProductSpecMaster`
  entirely rather than trusting what this produced.
  **Do not use it to load product masters.** Use `seed-new-masters.ts`.
- **Not idempotent.** Re-running duplicates.
- **Destructive against real data.** There is production data now.
- Registered as the Prisma seed command with `ts-node`, while everything else
  uses `tsx`.

## Related

- `scripts/seed-new-masters.ts` — the correct master loader.
- `src/lib/masters/spec-import.ts` — why the row-wise read was wrong.
- `prisma/seed-production.ts` — the safe, idempotent one.
