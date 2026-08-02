# Code documentation index

Companion explainers for every code file, mirroring the source tree. See
[CONVENTIONS.md](./CONVENTIONS.md) for the required structure and depth, and
the repo root `CLAUDE.md` for the standing rule that keeps them true.

## Coverage

473 source files, plus 16 test files documented alongside what they test rather
than separately.

| Area | Files | Documented | Notes |
|---|---:|---:|---|
| `src/lib` | 53 | **53** ✅ | Complete |
| `src/app/api` | 208 | 0 | Route handlers — next |
| `src/app/(dashboard)` | 157 | 0 | Pages and forms |
| `src/components` | 41 | 0 | Shared UI |
| `src/app/(auth)` | 3 | 0 | Login portals |
| `prisma` | 6 | 0 | Schema and migrations |
| `scripts` | 4 | 0 | Seeders and generators |
| `src/hooks` | 1 | 0 | |
| **Total** | **473** | **53** | |

## Order of work

By how much a newcomer suffers without the doc, not alphabetical.

1. ~~**`src/lib`**~~ — done.
2. **`prisma/schema.prisma`** — 112 models. The single most useful document in
   the set once written; also the largest.
3. **`src/app/api`** — the contracts, grouped by module.
4. **`src/components/shared`** — reused widgets whose quirks bite everywhere.
5. **`src/app/(dashboard)`** — largest count, lowest density. Short docs.
6. **`scripts`**, **`src/hooks`**, **`src/app/(auth)`**.

---

## src/lib — complete

### Storage
- [`storage/policy.ts`](./src/lib/storage/policy.ts.md) — size cap, image
  downscaling, and the measured case for compressing only when it wins.
- [`storage/files.ts`](./src/lib/storage/files.ts.md) — files as database rows;
  why disk storage silently lost every upload on Vercel.

### Auth and access
- [`auth.ts`](./src/lib/auth.ts.md) — NextAuth config, 2FA hook, the JWT
  callbacks and the absolute session cap.
- [`rbac.ts`](./src/lib/rbac.ts.md) — API gate and company scoping. **Role
  enforcement is disabled by owner decision.**
- [`access/module-access.ts`](./src/lib/access/module-access.ts.md) — grant
  parsing and sidebar visibility; same disablement.
- [`auth/otp-policy.ts`](./src/lib/auth/otp-policy.ts.md) — the 2FA rules and
  why admins are exempt.
- [`auth/otp.ts`](./src/lib/auth/otp.ts.md) — issue and verify.
- [`auth/otp-client.ts`](./src/lib/auth/otp-client.ts.md) — browser step 1;
  why its failure path is a security boundary.
- [`validators/auth.ts`](./src/lib/validators/auth.ts.md) — password policy.

### Quotations
- [`quotations/deal-owner.ts`](./src/lib/quotations/deal-owner.ts.md) — why an
  omitted field must not mean "erase this".
- [`quotations/display.ts`](./src/lib/quotations/display.ts.md) — size and
  inquiry-number formatting.
- [`quotations/listing.ts`](./src/lib/quotations/listing.ts.md) — revision
  collapsing and tender inclusion.
- [`quotations/pricing.ts`](./src/lib/quotations/pricing.ts.md) — the price
  gate.

### Masters and calculation
- [`masters/spec-import.ts`](./src/lib/masters/spec-import.ts.md) — the
  sectioned column-pool Excel layout. **Read before touching any master
  import.**
- [`fitting-flange-sizes.ts`](./src/lib/fitting-flange-sizes.ts.md) —
  **generated**; the size pools and product routing.
- [`weight-calculation.ts`](./src/lib/weight-calculation.ts.md)
- [`calc/po-totals.ts`](./src/lib/calc/po-totals.ts.md) — GST split and landed
  totals.
- [`amount-in-words.ts`](./src/lib/amount-in-words.ts.md) — Indian vs Western
  grouping.
- [`document-numbering.ts`](./src/lib/document-numbering.ts.md) — the counter
  and its race condition.
- [`fx/get-rate.ts`](./src/lib/fx/get-rate.ts.md)

### Purchase and orders
- [`purchase/po-milestones.ts`](./src/lib/purchase/po-milestones.ts.md)
- [`purchase/rfq-reminders.ts`](./src/lib/purchase/rfq-reminders.ts.md)
- [`po-acceptance/advance-cpo.ts`](./src/lib/po-acceptance/advance-cpo.ts.md)
- [`business-logic/auto-pr-generation.ts`](./src/lib/business-logic/auto-pr-generation.ts.md)
- [`business-logic/po-variance-detection.ts`](./src/lib/business-logic/po-variance-detection.ts.md)
- [`business-logic/e-invoice-generator.ts`](./src/lib/business-logic/e-invoice-generator.ts.md)
- [`validators/business-rules.ts`](./src/lib/validators/business-rules.ts.md)
- [`constants/order-processing.ts`](./src/lib/constants/order-processing.ts.md)
- [`constants/supplier-quotations.ts`](./src/lib/constants/supplier-quotations.ts.md)

### Quality and warehouse
- [`quality/qap.ts`](./src/lib/quality/qap.ts.md) — QAP rules and the test
  glossary.
- [`location-tag.ts`](./src/lib/location-tag.ts.md)

### PDF — [shared notes](./src/lib/pdf/README.md)
- [`pdf/render-pdf.ts`](./src/lib/pdf/render-pdf.ts.md) — Chromium resolution
  and the non-A4 page geometry.
- [`pdf/print-wrapper.ts`](./src/lib/pdf/print-wrapper.ts.md)
- [`pdf/quotation-standard-template.ts`](./src/lib/pdf/quotation-standard-template.ts.md)
- [`pdf/quotation-nonstandard-template.ts`](./src/lib/pdf/quotation-nonstandard-template.ts.md)
- [`pdf/quotation-pdf.tsx`](./src/lib/pdf/quotation-pdf.tsx.md) — the parallel
  react-pdf implementation.
- [`pdf/purchase-order-template.ts`](./src/lib/pdf/purchase-order-template.ts.md)
- [`pdf/po-acceptance-template.ts`](./src/lib/pdf/po-acceptance-template.ts.md)
- [`pdf/invoice-template.ts`](./src/lib/pdf/invoice-template.ts.md)
- [`pdf/packing-list-template.ts`](./src/lib/pdf/packing-list-template.ts.md)
- [`pdf/issue-slip-template.ts`](./src/lib/pdf/issue-slip-template.ts.md)
- [`pdf/inspection-offer-template.ts`](./src/lib/pdf/inspection-offer-template.ts.md)
- [`pdf/client-status-report-template.ts`](./src/lib/pdf/client-status-report-template.ts.md)

### Infrastructure
- [`prisma.ts`](./src/lib/prisma.ts.md) — the client, pool limits, and why
  `migrate dev` does not work here.
- [`mailer.ts`](./src/lib/mailer.ts.md) — the one SMTP transport.
- [`audit.ts`](./src/lib/audit.ts.md) — the simple writer.
- [`audit/audit-logger.ts`](./src/lib/audit/audit-logger.ts.md) — the typed
  one. **Two writers exist; coverage is not complete.**
- [`alerts.ts`](./src/lib/alerts.ts.md)
- [`soft-delete.ts`](./src/lib/soft-delete.ts.md)
- [`download-file.ts`](./src/lib/download-file.ts.md) and
  [`download.ts`](./src/lib/download.ts.md) — **two functions with the same
  name.**
- [`export-utils.ts`](./src/lib/export-utils.ts.md) — CSV, and the BOM that
  makes Excel read it.
- [`utils.ts`](./src/lib/utils.ts.md) — `cn()`.

---

## Things these docs flag as worth fixing

Recorded here so they are not lost in prose:

- **Role enforcement is globally disabled** (`rbac.ts`,
  `access/module-access.ts`). Routes that read as gated are not.
- **Approval thresholds are unimplemented** — the config type exists, nothing
  calls it, and there is no Director or Purchase Manager role.
- **Two `downloadFile` functions** with different signatures and behaviour.
- **Two audit writers**, so the audit log is not complete coverage — zero
  `EMAIL_SENT` rows did not mean email had never run.
- **Two quotation PDF renderers** — HTML and react-pdf — which can diverge.
- **Min stock level does not exist**, so `STOCK_REPLENISHMENT` PRs are manual
  only.
- **The e-invoice payload is generated but never submitted**; no IRN is stored.
