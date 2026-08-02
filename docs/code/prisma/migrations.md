# prisma/migrations/

> 25 hand-written SQL migrations. **`prisma migrate dev` does not work on this
> host** — read this before adding one.

## Why they are hand-written

`prisma migrate dev` needs a *shadow database* to detect drift, and creating it
requires `CREATE DATABASE`. The database is MariaDB on **Hostinger shared
hosting**, which denies that privilege. There is no second database available
to use instead.

So every migration here was authored by hand and applied with
`prisma migrate deploy`, which skips drift detection.

## The procedure

1. Edit `prisma/schema.prisma`.
2. Either run
   `npx prisma migrate dev --name <name> --create-only` to generate the SQL
   without applying it, or write `migration.sql` by hand in a new
   `prisma/migrations/<timestamp>_<name>/` directory.
3. **Read the SQL.** This is the step that replaces drift detection.
4. `npx prisma migrate deploy`
5. `npx prisma generate`
6. **Verify against the live database** — `SHOW COLUMNS FROM <table>` — before
   assuming it worked. The manual path can silently diverge from what
   `migrate dev` would have produced.

Naming: `YYYYMMDDHHMMSS_snake_case_description`.

## Conventions in this repo

- **Additive only, in practice.** New nullable columns, new tables, widened
  enums. There is real data in production now.
- **Widening an enum** is `ALTER TABLE … MODIFY … ENUM(...)` listing *every*
  value, existing ones keeping their position so stored rows are untouched.
  See `20260802160000_add_po_vendor_milestones`.
- **Foreign keys** are added as a separate `ADD CONSTRAINT` after the column and
  its index, matching what Prisma generates.
- **Every migration carries a comment** explaining why it exists and noting the
  hand-written reason, so the next person does not reach for `migrate dev`.

## Recent migrations worth knowing

| Migration | What and why |
|---|---|
| `20260802140000_add_stored_file` | `StoredFile` (LONGBLOB). Uploads were being written to a filesystem Vercel wipes. |
| `20260802160000_add_po_vendor_milestones` | Three vendor stages on `POStatus`. |
| `20260802120000_add_cpo_dispatch_address` | Ship-to site chosen at PO registration. |
| `20260802180000_add_poa_signed_copy` | The client's countersigned acceptance. |
| `20260802190000_add_pr_department_dispatch_remarks` | The PR fields the purchase document specifies. |
| `20260802000000_add_email_otp` | `EmailOtp` for two-factor login. |
| `20260728000000_add_plates_product_category` | `PLATES` added to `ProductCategory`. |

## Gotchas

- **`migration_lock.toml` says `mysql`.** MariaDB is wire-compatible; do not
  change it.
- **A failed `migrate deploy` leaves the row in `_prisma_migrations` marked
  failed** and blocks later ones until resolved.
- Pre-launch policy was drop-and-reseed; that no longer applies — treat
  destructive changes as destructive.

## Related

- `docs/code/prisma/schema.prisma.md`
- `src/lib/prisma.ts`
