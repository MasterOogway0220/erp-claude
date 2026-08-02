# Code documentation index

Companion explainers for every code file, mirroring the source tree. See
[CONVENTIONS.md](./CONVENTIONS.md) for the required structure and depth, and
the repo root `CLAUDE.md` for the standing rule that keeps them true.

## Coverage

473 source files, plus 16 test files that are documented alongside what they
test rather than separately.

| Area | Files | Documented | Notes |
|---|---:|---:|---|
| `src/lib` | 53 | 4 | Pure logic and shared services — highest value, doing first |
| `src/app/api` | 208 | 0 | Route handlers |
| `src/app/(dashboard)` | 157 | 0 | Pages and forms |
| `src/components` | 41 | 0 | Shared UI |
| `src/app/(auth)` | 3 | 0 | Login portals |
| `prisma` | 6 | 0 | Schema and migrations |
| `scripts` | 4 | 0 | Seeders and generators |
| `src/hooks` | 1 | 0 | |
| **Total** | **473** | **4** | |

## Order of work

Deliberately not alphabetical. The sequence is by how much a newcomer suffers
without the doc:

1. **`src/lib`** — the business rules. Small files, dense decisions, most of
   them written to fix a specific defect whose history is invisible in the
   code. Best value per page.
2. **`prisma/schema.prisma`** — 112 models. The single most useful document in
   the set once written; also the largest.
3. **`src/app/api`** — the contracts. Grouped by module (quotations, purchase,
   inventory, quality, dispatch) so each group can be read as a unit.
4. **`src/components/shared`** — reused widgets whose quirks bite everywhere
   (`SmartCombobox`, `ProductMaterialSelect`, `DataTable`).
5. **`src/app/(dashboard)`** — the pages. Largest count, lowest density; many
   are thin shells over an API call and need a short doc, not a long one.
6. **`scripts`**, **`src/hooks`**, **`src/app/(auth)`**.

## Written so far

### src/lib

- [`storage/policy.ts`](./src/lib/storage/policy.ts.md) — upload size cap,
  image downscaling, and the measured case for compressing only when it wins.
- [`storage/files.ts`](./src/lib/storage/files.ts.md) — files as database
  rows; why disk storage silently lost every upload on Vercel.
- [`mailer.ts`](./src/lib/mailer.ts.md) — the one SMTP transport; the
  port/TLS trap and the unsendable From address.
- [`quotations/deal-owner.ts`](./src/lib/quotations/deal-owner.ts.md) — why an
  omitted field must not mean "erase this".
- [`masters/spec-import.ts`](./src/lib/masters/spec-import.ts.md) — the
  sectioned column-pool Excel layout, and why reading it row-wise corrupts the
  product master.

## Conventions in brief

- Path mirrors source: `src/lib/mailer.ts` → `docs/code/src/lib/mailer.ts.md`.
- Sections: Why this exists / What it does / How it works / Domain notes /
  Gotchas and constraints / Related.
- Written for a developer who knows TypeScript but not the piping trade.
- Record the defect that caused the code to exist — that history is usually
  the most valuable thing in the doc.
