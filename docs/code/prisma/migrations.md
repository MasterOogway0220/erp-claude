# prisma/migrations/

> 40 hand-written SQL migrations. **`prisma migrate dev` does not work on this
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
| `20261006110000_processing_testing_and_line_descriptions` | `OrderProcessingItem.labTestingBy` / `labTestingAgencyId` (FK to `InspectionAgencyMaster`, ON DELETE SET NULL): who does a line's lab testing, in-house or a TPI agency. Also `ClientPOItem.itemDescription` and `SalesOrderItem.itemDescription` (TEXT): a non-standard line's own description. All nullable, so additive. Applied 2026-10-06 together with the sandbox twins, then a parity check. |
| `20261006100000_tender_terms` | New `TenderTerm` table — a tender's own terms (started from the Offer Terms list or the customer's defaults, copied into a quotation raised from the tender), cascade on tender delete. Additive. The sandbox copy `sbx_TenderTerm` was created in the same run, so the sandbox login never sees the table missing. |
| `20261005094000_client_po_terms` | New `ClientPOTerm` table — a client PO's own terms (copied from the quotation's offer terms at registration, then edited), cascade on client PO delete. Additive. |
| `20261005093000_cpo_other_charge_and_address_text` | `ClientPurchaseOrder.otherChargesDescription` / `billingAddressText` / `dispatchAddressText` and `POAcceptance.otherChargesDescription`, all nullable. What the "Others" charge is, and typed one-off addresses. Additive. |
| `20261005092000_tender_soft_delete` | `Tender.deletedAt` DATETIME(3) NULL — tenders soft-delete like quotations. Additive. |
| `20261005091000_processing_text_columns` | `OrderProcessingItem.otherLabTests` and `additionalSpec` VARCHAR(191) → TEXT. The live MySQL is non-strict and silently cut longer pasted spec clauses to 191 characters. Widening only; no value changes. |
| `20261005090000_charge_tax_default_true` | The six `*TaxApplicable` flags on `ClientPurchaseOrder` and `POAcceptance` default to true. Column defaults only; existing rows unchanged. Under GST, freight/packing/insurance on a goods supply are part of the taxable value. |
| `20260924120000_user_is_sandbox` | `User.isSandbox` BOOLEAN NOT NULL DEFAULT false — the sandbox login flag (see `src/lib/sandbox/`). Additive; every existing user stays `false`. After deploying any later migration, trigger a sandbox refresh so the `sbx_*` copies pick up the new structure. |
| `20260919130000_client_item_master` | New `ClientItemMaster` table — the customer's own item IDs on non-standard quotations, unique per customer + ID, cascade on customer delete. Additive. |
| `20260919120000_quotation_remarks` | `Quotation.remarks` TEXT NULL — the customer-facing "Remarks:" line the client's QTN-Rev.2 format reserves between the Total row and OFFER TERMS. The PDF had printed the bare heading since July with nothing to put behind it. Additive. |
| `20260822090000_order_processing_gaps` | Nine additive columns closing the order-processing gaps: the client PO's own contact (email/phone), its billing party and signed P.O. copy, a per-line qty remark, the client's line references on `SalesOrderItem`, the order-level inspection regime, `otherLabTests` + `additionalSpec` on `OrderProcessingItem`, and `PRItem.technicalRequirements` — the column that finally carries the client's technical requirements to purchase. |
| `20260819103000_quotation_item_regret_and_nullable_rate` | `QuotationItem.unitRate` made nullable + `isRegret` added. **The one migration here that is not purely additive** — it also rewrites existing `0` rates to `NULL`, because before this change a stored `0` could only ever have meant "unpriced". |
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
