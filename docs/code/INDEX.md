# Code documentation index

Companion explainers for every code file, mirroring the source tree. See
[CONVENTIONS.md](./CONVENTIONS.md) for structure and depth, and the repo root
`CLAUDE.md` for the standing rule that keeps them true.

## Coverage: 497 / 497 ✅

Every `.ts`, `.tsx` and `.prisma` file under `src/`, `prisma/` and `scripts/`
has a doc at the mirrored path. Test files are covered by the doc for what they
test.

| Area | Files | Depth |
|---|---:|---|
| `src/lib` | 57 | Hand-written throughout |
| `prisma` + `scripts` | 10 | Hand-written |
| `src/components` | 41 | Hand-written for shared/layout/wizard; grouped for `ui/` |
| Root, hooks, auth, layouts | 13 | Hand-written |
| `src/app/api` | 208 | Hand-written module READMEs + per-route facts |
| `src/app/(dashboard)` | 158 | Hand-written module READMEs + per-page facts |

### Two levels of depth, deliberately

**Hand-written** — every file carrying a real decision: the whole of
`src/lib`, the schema, the scripts, the shared components, and a README for
every API and page module. These record *why* the code exists, the defect that
caused it where there was one, and the domain a newcomer will not know.

**Module README + per-file facts** — the long tail of CRUD routes and list
pages. The module README carries the domain and the shared pattern; each file's
doc states what is true of that file specifically: which models it touches,
which methods it exposes, whether it is company-scoped, whether it transacts,
sends mail, renders a PDF or stores an upload — plus the project-wide caveats
that apply to it.

That split is intentional. Two hundred near-identical CRUD routes do not each
need a page of prose, and padding them would produce documents that look
authoritative, need maintaining, and teach nothing.

## Start here

1. [`prisma/schema.prisma`](./prisma/schema.prisma.md) — the document chain
   and all 112 models. **Read this first.**
2. [`src/app/api/README.md`](./src/app/api/README.md) — the pattern every route
   follows.
3. [`src/lib/masters/spec-import.ts`](./src/lib/masters/spec-import.ts.md) —
   the Excel layout trap, and the domain glossary.
4. [`src/components/layout/sidebar.tsx`](./src/components/layout/sidebar.tsx.md)
   — `navSections` is the definitive list of what the system does.

## Module overviews

**API** — [quotations](./src/app/api/quotations/README.md) ·
[masters](./src/app/api/masters/README.md) ·
[quality](./src/app/api/quality/README.md) ·
[purchase](./src/app/api/purchase/README.md) ·
[dispatch](./src/app/api/dispatch/README.md) ·
[inventory](./src/app/api/inventory/README.md) ·
[reports](./src/app/api/reports/README.md) ·
[sales-orders](./src/app/api/sales-orders/README.md) ·
[client POs](./src/app/api/client-purchase-orders/README.md) ·
[PO acceptance](./src/app/api/po-acceptance/README.md) ·
[warehouse](./src/app/api/warehouse/README.md) ·
[MTC](./src/app/api/mtc/README.md) ·
[tenders](./src/app/api/tenders/README.md) ·
[auth](./src/app/api/auth/README.md) ·
[alerts](./src/app/api/alerts/README.md) ·
[search](./src/app/api/search/README.md) ·
[tracking](./src/app/api/po-tracking/README.md) ·
[admin](./src/app/api/admin/README.md)

**Pages** — [quotations](./src/app/(dashboard)/quotations/README.md) ·
[masters](./src/app/(dashboard)/masters/README.md) ·
[purchase](./src/app/(dashboard)/purchase/README.md) ·
[quality](./src/app/(dashboard)/quality/README.md) ·
[inventory](./src/app/(dashboard)/inventory/README.md) ·
[dispatch](./src/app/(dashboard)/dispatch/README.md) ·
[sales](./src/app/(dashboard)/sales/README.md) ·
[reports](./src/app/(dashboard)/reports/README.md)

**Other** — [UI primitives](./src/components/ui/README.md) ·
[PDF templates](./src/lib/pdf/README.md) ·
[order wizard](./src/components/order-wizard/README.md) ·
[migrations](./prisma/migrations.md)

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
- [`auth/db-down.ts`](./src/lib/auth/db-down.ts.md) — why a database outage
  used to read as "invalid password", and how the login screen now tells them
  apart.
- [`validators/auth.ts`](./src/lib/validators/auth.ts.md) — password policy.

### Quotations
- [`quotations/currency.ts`](./src/lib/quotations/currency.ts.md) — update
  currency resolution and the blank Currency-term fill; both born from live
  incidents.
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
- [`dates.ts`](./src/lib/dates.ts.md) — local-calendar date formatting for
  date inputs; why `toISOString()` shifted dates a day.
- [`calc/po-totals.ts`](./src/lib/calc/po-totals.ts.md) — GST split and landed
  totals.
- [`amount-in-words.ts`](./src/lib/amount-in-words.ts.md) — Indian vs Western
  grouping.
- [`document-numbering.ts`](./src/lib/document-numbering.ts.md) — the counter
  and its race condition.
- [`fx/get-rate.ts`](./src/lib/fx/get-rate.ts.md)

### Purchase and orders
- [`purchase/po-milestones.ts`](./src/lib/purchase/po-milestones.ts.md)
- [`purchase/pr-item-fields.ts`](./src/lib/purchase/pr-item-fields.ts.md) — the
  one reader for a requisition line, after the RFQ screens spent a while reading
  field names `PRItem` does not have.
- [`purchase/rfq-reminders.ts`](./src/lib/purchase/rfq-reminders.ts.md)
- [`po-acceptance/advance-cpo.ts`](./src/lib/po-acceptance/advance-cpo.ts.md)
- [`business-logic/auto-pr-generation.ts`](./src/lib/business-logic/auto-pr-generation.ts.md)
- [`business-logic/technical-requirements.ts`](./src/lib/business-logic/technical-requirements.ts.md)
  — carries the client's inspection/testing requirements from Order Processing
  to the PR, the RFQ and the vendor PO.
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
Every PDF is rendered in-process by `@react-pdf/renderer`. Chromium and
Puppeteer were removed once the last route was migrated, so there is no browser
binary in the deployment any more.

**Shared layers**
- [`pdf/primitives.tsx`](./src/lib/pdf/primitives.tsx.md) — shared react-pdf
  building blocks: Indian digit grouping, and the cell borders that stop a
  react-pdf table doubling its rules.
- [`pdf/bordered-doc.tsx`](./src/lib/pdf/bordered-doc.tsx.md) — chrome for the "bordered form" family (inspection
  offers, packing lists): outer box, title bar, reference grid, generic typed
  table with a repeating header, totals row, signature blocks.

**Documents**
- [`pdf/quotation-pdf.tsx`](./src/lib/pdf/quotation-pdf.tsx.md)
- [`pdf/issue-slip-pdf.tsx`](./src/lib/pdf/issue-slip-pdf.tsx.md)
- [`pdf/lab-letter-pdf.tsx`](./src/lib/pdf/lab-letter-pdf.tsx.md) — the covering letter sent to an
  external testing lab with a batch of material.
- [`pdf/client-status-report-pdf.tsx`](./src/lib/pdf/client-status-report-pdf.tsx.md) — order progress per line,
  on the 297x230mm sheet customers already receive.
- [`pdf/inspection-offer-pdf.tsx`](./src/lib/pdf/inspection-offer-pdf.tsx.md) — offer, length tally, colour code and
  criteria checklist.
- [`pdf/packing-list-pdf.tsx`](./src/lib/pdf/packing-list-pdf.tsx.md) — travels with a consignment for
  physical verification at dispatch.
- [`pdf/invoice-pdf.tsx`](./src/lib/pdf/invoice-pdf.tsx.md) — GST tax invoice.
- [`pdf/purchase-order-pdf.tsx`](./src/lib/pdf/purchase-order-pdf.tsx.md) — the buying-side mirror of a
  quotation, including its revision banner.
- [`pdf/mtc-certificate-pdf.tsx`](./src/lib/pdf/mtc-certificate-pdf.tsx.md) — mill test certificate.
- [`pdf/dossier-pdf.tsx`](./src/lib/pdf/dossier-pdf.tsx.md) — the dispatch dossier, and the dispatch-note bundle
  rendered from a narrower section list.
- [`pdf/dossier-data.ts`](./src/lib/pdf/dossier-data.ts.md) — the one traversal both dossier routes share.

**HTML templates still in use** (browser preview / print, no Chromium)
- [`pdf/print-wrapper.ts`](./src/lib/pdf/print-wrapper.ts.md)
- [`pdf/quotation-standard-template.ts`](./src/lib/pdf/quotation-standard-template.ts.md)
- [`pdf/quotation-nonstandard-template.ts`](./src/lib/pdf/quotation-nonstandard-template.ts.md)
- [`pdf/po-acceptance-template.ts`](./src/lib/pdf/po-acceptance-template.ts.md)
- [`pdf/issue-slip-template.ts`](./src/lib/pdf/issue-slip-template.ts.md)
- [`pdf/client-status-report-template.ts`](./src/lib/pdf/client-status-report-template.ts.md) —
  now only the HTML preview route and the `ClientStatusReportData` type.

### Data fetching (src/hooks)
- [`hooks/use-api-query.ts`](./src/hooks/use-api-query.ts.md) — the one way screens read from this app's API:
  a cached `useQuery` wrapper, `ApiError` carrying the HTTP status, a
  debounce helper for search keys, and `useInvalidate` for post-write
  refreshes.
- [`hooks/use-masters.ts`](./src/hooks/use-masters.ts.md) — one shared, cached read per master list. The
  customer master alone was being fetched from fourteen screens.
- [`hooks/use-units.ts`](./src/hooks/use-units.ts.md) — UOM codes, now
  sharing the Unit Master screen's cache entry.
- [`hooks/use-logout.ts`](./src/hooks/use-logout.ts.md) — empties the cache
  before signing out. Sessions last a year and end only here, and the
  terminals are shared.

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
- **Some masters are edited but never read.** Unit Master was the first case
  found and is now wired via
  [`hooks/use-units.ts`](./src/hooks/use-units.ts.md). Still unwired:
  `CurrencyMaster` (4 rows; `/api/masters/currencies` exists but no screen
  calls it — the quotation forms hardcode `CURRENCY_OPTIONS`), `TaxMaster`
  (9 rows; the quotation forms hardcode `GST_RATES`), and
  `DimensionalStandardMaster` / `SizeMaster` schedules (the material-code
  screens hardcode `STANDARDS` and `SCHEDULES`). The material-code and
  lab-letter screens also hardcode an upper-case `UNITS` list that does not
  match Unit Master's mixed-case codes.
