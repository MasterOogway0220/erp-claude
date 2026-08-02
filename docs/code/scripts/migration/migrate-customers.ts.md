# scripts/migration/migrate-customers.ts

> One-off import of the customer master from Excel.

## Why this exists

Initial data load. The company's customer list lived in a spreadsheet before
the ERP.

## What it does

```bash
npx ts-node scripts/migration/migrate-customers.ts <excel-file-path>
```

Reads customer rows and inserts `CustomerMaster` records.

## Gotchas and constraints

- **The header comment says PostgreSQL.** The database is MariaDB. The comment
  is wrong and predates the move.
- **Constructs a bare `new PrismaClient()`** with no adapter, unlike every other
  script here. That will not connect against the MariaDB adapter setup —
  treat this script as historical and verify before running it.
- Invoked with `ts-node`; everything else uses `tsx`.
- One-off, already run, not idempotent.

## Related

- `prisma/schema.prisma` → `CustomerMaster`.
- `src/lib/prisma.ts` — the adapter this script does not use.
