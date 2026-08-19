# prisma/schema.prisma

> 112 models and 44 enums — the whole data model. This is the map of the
> business; read it before anything else.

## Why this exists

Everything else in the codebase is a view onto these tables. The schema encodes
the company's actual process — enquiry to quotation to order to procurement to
inspection to dispatch to invoice — and the shape of it is the shape of the
business.

## The spine

The document chain, in the order paperwork actually moves. Following this one
path explains most of the schema:

```
Quotation ──► ClientPurchaseOrder ──► POAcceptance ──► SalesOrder
                                                          │
                        ┌─────────────────────────────────┤
                        ▼                                 ▼
              PurchaseRequisition                WarehouseIntimation (MPR)
                        │                                 │
                       RFQ                          InspectionPrep
                        │                                 │
                 VendorQuotation                   InspectionOffer
                        │                                 │
              ComparativeStatement                   Inspection
                        │                                 │
                  PurchaseOrder                       QCRelease
                        │                                 │
                GoodsReceiptNote ──► InventoryStock ──────┤
                                                          ▼
                                              PackingList ─► DispatchNote
                                                                 │
                                                              Invoice
                                                                 │
                                                          PaymentReceipt
```

The right branch prepares and certifies material; the left branch buys what
stock cannot cover. Both converge on dispatch.

## Model groups

### Masters (~25)
`CustomerMaster`, `VendorMaster`, `ProductSpecMaster`, `SizeMaster`,
`MaterialCodeMaster`, `EmployeeMaster`, `WarehouseMaster`, `BuyerMaster`,
`CustomerDispatchAddress`, `PaymentTermsMaster`, `DeliveryTermsMaster`,
`DimensionalStandardMaster`, `InspectionAgencyMaster`, `TestingMaster`,
`AdditionalSpecOption`, `OfferTermTemplate`, `DepartmentMaster`, …

**`ProductSpecMaster` is the catalogue** — 3,557 rows of product × material ×
category, loaded from the client's Excel by `scripts/seed-new-masters.ts`. It
is deliberately **not company-scoped**: the physical steel is the same whichever
of the three companies sells it.

**`SizeMaster` is pipes only** (344 rows). Fitting and flange sizes are strings
baked into `src/lib/fitting-flange-sizes.ts` at build time.

### Sales
`Quotation` → `QuotationItem` / `QuotationTerm`, `Tender`,
`ClientPurchaseOrder` → `ClientPOItem`, `POAcceptance`, `SalesOrder` →
`SalesOrderItem`, `OrderProcessingItem`, `StockReservation`.

**`Quotation` is the largest model** and the most revised. Revisions share a
`quotationNo` and increment `version`, linked by `parentQuotationId`.

### Purchase
`PurchaseRequisition` → `PRItem`, `RFQ` → `RFQVendor` → `VendorQuotation`,
`ComparativeStatement` → `CSEntry`, `PurchaseOrder` → `POItem`,
`SupplierQuotation` + charges + documents, `RateRevision`.

### Inventory and warehouse
`GoodsReceiptNote` → `GRNItem`, `InventoryStock`, `PipeMaterialDetail`,
`HeatEntry`, `StockIssue`, `WarehouseIntimation` → `WarehouseIntimationItem`,
`WarehouseItemDetail`, `WarehouseLocation`.

### Quality (the largest cluster, ~20)
`Inspection` → `InspectionParameter`, `InspectionPrep`, `InspectionOffer` →
`InspectionOfferItem` → `InspectionOfferItemHeat`, `QCRelease`, `NCR`,
`LabLetter`, `LabReport`, and the MTC family: `MTCCertificate` →
`MTCCertificateItem` → chemical / mechanical / impact results, against
`MTCMaterialSpec` → element and property definitions.

The MTC cluster is big because a mill certificate is a structured document —
declared composition and properties per grade, then measured results per heat,
each comparable against the spec.

### Dispatch and finance
`PackingList` → `PackingListItem`, `DispatchNote`, `Invoice` → `InvoiceItem`,
`PaymentReceipt`, email logs.

### Platform
`User`, `CompanyMaster`, `AuditLog`, `DocumentSequence`, `Alert`, `EmailOtp`,
`StoredFile`, `FinancialYear`.

## Conventions that hold across the schema

### Company scoping
Most models carry a nullable `companyId`. Three companies share this database.
Queries apply `companyFilter(companyId)` from `rbac.ts` — **it is per query, not
enforced by the database**, so a missing filter silently leaks across tenants.

Catalogue masters deliberately opt out; see above.

### Soft delete
Many masters carry `deletedAt`. Nothing hard-deletes a master, because
historical documents must keep rendering. Use `notDeleted` from
`src/lib/soft-delete.ts`. **No middleware enforces this** — every query opts
in.

### Denormalised snapshots
Document items copy `product`, `material`, `sizeLabel`, `additionalSpec` as
**strings** rather than pointing at the master. Deliberate: a quotation issued
three years ago must print exactly as issued even if the master has since
changed. Where a real FK exists (`QuotationItem.sizeId`, `materialCodeId`) it
is for lookups, not for rendering.

### Money
`Decimal` with explicit precision — `@db.Decimal(14, 2)` for amounts,
`(10, 3)` for quantities, `(12, 2)` for rates, `(10, 4)` for weights. Never
`Float`.

**`QuotationItem.unitRate` is nullable, and the null is load-bearing.** `NULL`
means nobody has priced the line yet (the price gate blocks approval); `0`
means deliberately quoted at zero. A third state, `isRegret`, means we decline
to quote that line at all — it prints `REGRET` on the PDF and contributes
nothing to the total. Code that reads a quotation rate must not collapse
`NULL` into `0`. Every other `unitRate` in the schema (`POItem`,
`SalesOrderItem`, `InvoiceItem`, …) is still non-null: those documents only
exist once a price is agreed. See `src/lib/quotations/pricing.ts`.

### JSON in text columns
`EmployeeMaster.moduleAccess`, `OrderProcessingItem.ndtTests` and
`requiredLabTests`, `Quotation.changeSnapshot` hold JSON in `LongText`. Parse
defensively — `Array.isArray()` on a JSON *string* is false, which is exactly
the bug `parseModuleAccess` exists to prevent.

### Document numbering
Documents carry a unique human number (`quotationNo`, `poNo`, `cpoNo`) from
`DocumentSequence` via `src/lib/document-numbering.ts`, per company and
financial year.

## Domain notes

- **NB / SCH** — nominal bore and schedule identify a pipe.
- **MTC** — Mill Test Certificate, the mill's proof of a heat's chemistry and
  properties. The single most important document in the chain.
- **Heat number** — identifies a batch of molten steel, stamped on the pipe and
  linking it to its MTC. `HeatEntry` and `PipeMaterialDetail` carry it; this is
  what makes physical traceability work.
- **TPI** — Third Party Inspection agency, nominated by the client.
- **MPR** — Material Preparation Request (`WarehouseIntimation`).
- **CPO / POA** — Client Purchase Order and its Acceptance.
- **L1/L2/L3** — vendor ranking by total landed cost on a comparative
  statement.

## Gotchas and constraints

- **`prisma migrate dev` does not work.** The host denies `CREATE DATABASE`, so
  Prisma cannot build its shadow database. Every migration here was
  hand-written and applied with `prisma migrate deploy`, then verified with
  `SHOW COLUMNS`. See `docs/code/prisma/migrations.md`.
- **MariaDB, not MySQL or Postgres** — via `@prisma/adapter-mariadb`.
- **`VendorMaster` has no `code` field** — just `id` and `name`. A recurring
  wrong assumption.
- **`PRStatus` is `DRAFT / PENDING_APPROVAL / APPROVED / REJECTED /
  PO_CREATED`** — not "CONVERTED".
- **Stock lifecycle:** `UNDER_INSPECTION` → `ACCEPTED` / `REJECTED` / `HOLD` →
  `RESERVED` → `DISPATCHED`.
- **`POStatus` gained three vendor milestones** (`ACKNOWLEDGED`,
  `IN_PRODUCTION`, `READY_FOR_DISPATCH`) between `SENT_TO_VENDOR` and receipt.
- **`FittingMaster` and `FlangeMaster` are retired** — kept only for historical
  FKs. Fittings and flanges now live in `ProductSpecMaster` with category
  `FITTINGS` / `FLANGES`.
- **No minimum stock level exists anywhere**, so stock-replenishment PRs cannot
  be suggested automatically.
- Cascades are sparse. Most child rows use `onDelete: Cascade` from their
  parent document; masters do not cascade, by design.

## Related

- `docs/code/prisma/migrations.md` — the hand-written migration procedure.
- `src/lib/prisma.ts` — the client and its pool limits.
- `src/lib/rbac.ts` — `companyFilter`.
- `src/lib/soft-delete.ts`
- `src/lib/document-numbering.ts`
- `graphify-out/GRAPH_REPORT.md` — generated structural view.
