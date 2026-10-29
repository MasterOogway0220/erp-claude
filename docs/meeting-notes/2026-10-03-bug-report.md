# N-Pipe Solution meeting 03/10/26 — issue report with prompts

Source: four handwritten notebook pages from the 03/10/26 meeting. Every note
below was traced to the code on 2026-10-05 (branch `master`, HEAD `487b6b8`).
Each item has: what the note says, what the code actually does (with
file:line evidence), a verdict, the minimal fix, and a prompt you can paste
into Claude Code to get it done.

Verdict key: **BUG** = confirmed defect · **MISSING** = feature does not exist ·
**PARTIAL** = exists in one place, missing in another · **DONE** = already
built · **UNCLEAR** = could not reproduce as written, needs a screenshot.

## Priority order

| # | Item | Verdict | Why this rank |
|---|---|---|---|
| 15 | Additional charges: tax applicable not working | **BUG** | Money. Three of six tax flags are silently dropped, GST under-computed. One-file fix. |
| 19 | PDF not open in PO acceptance | **BUG** | Blocks the acceptance letter every time. Root cause certain. |
| 7 | Fail to save processing data | **BUG** | The real error is thrown away before the user sees it. Two-line fix unblocks diagnosis. |
| 6 | In-house: no TPI agency option needed | **BUG** | In-house orders are mislabelled "Third Party Inspection" and the label leaks to purchase and inspection offers. |
| 16 | CDD auto-fetch on generate acceptance | **MISSING** | One line. Data already in the response. |
| 17 | PO acceptance PDF: company logo | **MISSING** | One line in the template, field already plumbed. |
| 18 | PO acceptance PDF: follow-up person | **UNCLEAR** | Client contacts already print. Our own signatory does not. Needs a one-question confirmation. |
| 5 | Order processing: no reference quotation | **PARTIAL** | Data exists, processing screen never shows it. |
| 3 | Tender ref / quotation ref in search | **PARTIAL** | Tender ref searchable only on the tender list; client enquiry number searchable nowhere. |
| 4 | Create quotation / create order auto-fetch | **PARTIAL** | Quotation form never stores payment/delivery terms, so every downstream auto-fill of them is dead wiring. |
| 2 | Soft delete | **MISSING** | Column and helper exist, nothing uses them. Hard delete today. |
| 1 | Tender quotation edit | **MISSING** | No edit screen for tenders at all. |
| 9 | Line item SNO, item code | **PARTIAL** | On the create form. Not on detail page, not on acceptance PDF. |
| 14 | "Other" charge: say what it is | **MISSING** | No description column anywhere. |
| 13 | Custom billing and dispatch address | **MISSING** | Dropdown-only from saved sites. |
| 10 | Copy item | **MISSING** | Needs a scope decision (duplicate row vs copy-from). |
| 11 | CS Seamless appearing twice | **BUG (elsewhere)** | Not on the CPO screen. Case-sensitive dedupe in the shared product picker. Verify live DB rows. |
| 12 | Terms and conditions twice | **UNCLEAR** | Renders once everywhere. Likely the two sidebar entries. Needs a screenshot. |
| 8 | PO document upload | **DONE** | Exists. Only gap: cannot replace the file after create. |
| — | Purchase Order / Reports / Inspection report | **NO DETAIL** | Headings only in the notebook. Nothing to act on yet. |

---

## Page 1 — Quotation module

### 1. Tender Quotation edit module — MISSING

**Note:** "Tender Quotation edit Module"

**What the code does.** The "Tender Quotation" card on New Quotation routes to
`/tenders/create` (`src/app/(dashboard)/quotations/create/page.tsx:72`). After
that there is no way back in:

- No `tenders/[id]/edit` folder, and `tenders/create/page.tsx` never reads an
  `editId` (zero matches), unlike the quotation create page which does
  (`quotations/create/standard/page.tsx:158`).
- The tender detail page offers only Advance Status, document upload, and
  Create Quotation / Create Order when WON (`tenders/[id]/page.tsx:326-348,
  413-422`). No Edit button, no Delete.
- `PATCH /api/tenders/[id]` accepts header fields (`route.ts:93-110`) but the
  only caller sends `{ status }`. Line items are not in the PATCH at all, so a
  wrong BOQ quantity cannot be corrected.
- `tenders/[id]/route.ts` GET and PATCH use bare `findUnique` with no
  `companyFilter`. Not company-scoped.

Quotations converted from a tender are editable normally and keep
`sourceTenderId` through edits (`create/standard/page.tsx:625`,
`api/quotations/[id]/route.ts:494`).

**Side finding.** `sales/create` from a WON tender copies customer, project and
tender id but no items (`sales/create/page.tsx:142-154`). The quotation create
page does copy them (`quotations/create/standard/page.tsx:722-745`).

**Fix.** Add `?editId=` mode to `tenders/create/page.tsx` seeded from
`GET /api/tenders/[id]`, submit via PATCH; add `items` to the PATCH using the
delete-and-recreate transaction pattern from `api/quotations/[id]/route.ts:461-465`;
add an Edit button on the tender detail page gated on non-terminal status; add
`companyFilter` to the tender GET/PATCH.

**Prompt:**

```
Tenders cannot be edited after registration. Add an edit mode to the tender
register.

1. src/app/(dashboard)/tenders/create/page.tsx: read ?editId= via
   useSearchParams (wrap in Suspense), fetch GET /api/tenders/[id], seed all
   header fields and the items grid, and submit with PATCH instead of POST
   when editId is set. Follow the same shape as
   src/app/(dashboard)/quotations/create/standard/page.tsx (editId, editLoadedRef
   guard, staleTime 0 on the edit query).
2. src/app/api/tenders/[id]/route.ts PATCH: accept `items` and replace them in
   a transaction (delete then recreate), the way
   src/app/api/quotations/[id]/route.ts:461-465 does. Also add
   companyFilter(companyId) to the findUnique in both GET and PATCH; the route
   is currently not company-scoped.
3. src/app/(dashboard)/tenders/[id]/page.tsx: add an Edit button linking to
   /tenders/create?editId={id}, hidden when the status is terminal (isTerminal
   is already computed around line 310).
4. Update docs/code/ companions for the three files.

Do not change the tender number on edit. Write a test for the PATCH items
replacement first.
```

### 2. Soft delete — MISSING (hard delete today)

**Note:** "soft delete"

**What the code does.** `DELETE /api/quotations/[id]` hard-deletes in a
transaction (`src/app/api/quotations/[id]/route.ts:284-289`): email logs,
items, terms, then the quotation. DRAFT only. Tenders have no DELETE at all.

The infrastructure for soft delete already exists and is unused:

- `Quotation.deletedAt DateTime?` is in the schema (`prisma/schema.prisma:472`)
  and in the DB (`prisma/migrations/20260420152945_add_soft_delete_deleted_at`).
- `src/lib/soft-delete.ts` exports `notDeleted` and `softDeleteData()`. Grep
  shows zero consumers anywhere in `src/`.
- 17 models carry `deletedAt`; none is read or written. The companion docs
  (`docs/code/src/lib/soft-delete.ts.md`, `docs/code/prisma/schema.prisma.md:123-126`)
  describe soft delete as live. That is documentation drift.
- No list query filters `deletedAt` (`api/quotations/route.ts:43`,
  `api/search/route.ts:32`), so the moment something writes it, deleted rows
  keep showing until every read is updated.
- `Tender` has no `deletedAt` column.

**FK trap.** `ClientPurchaseOrder.quotationId` is required with default
`Restrict` (`schema.prisma:1075, 1144`). The CPO POST does not validate
quotation status (`api/client-purchase-orders/route.ts:131-143`), so a DRAFT
can acquire a CPO, after which delete throws an FK error swallowed into
"Failed to delete quotation".

**Fix.** Replace the transaction with
`prisma.quotation.update({ where: { id }, data: softDeleteData() })`; add
`...notDeleted` to the three quotation reads; optionally add `deletedAt` to
`Tender` plus a DELETE handler (RBAC key `tender.delete` already exists at
`src/lib/rbac.ts:202`).

**Prompt:**

```
Quotation delete is a hard delete. Make it a soft delete using the helper that
already exists and is unused.

1. src/app/api/quotations/[id]/route.ts DELETE (lines ~284-289): replace the
   $transaction of deleteMany + delete with
   prisma.quotation.update({ where: { id }, data: softDeleteData() }) from
   src/lib/soft-delete.ts. Keep the DRAFT-only guard and the audit log call.
2. Add ...notDeleted (from the same helper) to the where clause of every
   quotation read: src/app/api/quotations/route.ts (list, ~line 43),
   src/app/api/quotations/[id]/route.ts GET (~line 36), and the quotation
   query in src/app/api/search/route.ts (~line 32). Also src/lib/quotations/
   listing helpers if they build their own where.
3. Add deletedAt DateTime? to the Tender model with a migration, a DELETE
   handler in src/app/api/tenders/[id]/route.ts that soft-deletes (RBAC key
   tender.delete exists in src/lib/rbac.ts), ...notDeleted in both tender
   reads (api/tenders/route.ts and the tender branch of api/quotations/route.ts),
   and a Delete button on the tender detail page.
4. Fix the drift in docs/code/src/lib/soft-delete.ts.md and
   docs/code/prisma/schema.prisma.md, which currently say masters already soft
   delete. They do not. Only say what is now true.

Write a test first: deleting a DRAFT sets deletedAt and the list no longer
returns it. Do not touch the master DELETE routes.
```

### 5. Order processing: no reference quotation — PARTIAL

**Note:** "Order Processing → Order no reference Quotation"

**What the code does.** The data is all there. `SalesOrder` has
`quotationId`, `customerPoNo`, `clientPurchaseOrderId`
(`prisma/schema.prisma:954-968`), `from-cpo` propagates `quotationId`
(`src/app/api/sales-orders/from-cpo/route.ts:100`), the SO list and SO detail
header show the quotation number (`sales/page.tsx:184-205`,
`sales/[id]/page.tsx:246-251`), and wizard step 0 shows a Reference Quotation
card (`ReviewStep.tsx:640-661`).

The gap is the Order Processing step itself:

- `ProcessStep.tsx` fetches `soNo`, `customerName`, `processingStatus` into
  `soInfo` (lines 216-220, 294-298) and never renders it. The user sees item
  chips and the QAP card with no SO number, quotation number or client PO.
- The processing GET cannot supply it anyway: its `select`
  (`api/sales-orders/[id]/processing/route.ts:46-62`) has no `quotation`,
  `customerPoNo` or `clientPurchaseOrder`.
- Nowhere is the quotation number a link. `/quotations/[id]` and
  `/client-purchase-orders/[id]` both exist.
- Minor mislabel: `ProcessStep.tsx:969-972` says "From the quotation" for a
  value copied from the client PO item.

**Fix.** Extend the processing GET select, extend `soInfo`, render one context
line with links above the QAP card.

**Prompt:**

```
The Order Processing step (src/components/order-wizard/ProcessStep.tsx) shows
no order context: no SO number, no reference quotation, no client PO number.

1. src/app/api/sales-orders/[id]/processing/route.ts GET: add to the select
   customerPoNo: true, quotation: { select: { id, quotationNo } },
   clientPurchaseOrder: { select: { id, cpoNo } }, and pass them through in
   the salesOrder object of the response (~lines 68-74).
2. ProcessStep.tsx: extend the soInfo state (~line 216) with those fields and
   render one line above the QAP card (~line 714): "SO {soNo} · Quotation
   {quotationNo} · Client PO {cpoNo}", with the quotation and client PO as
   next/link anchors to /quotations/[id] and /client-purchase-orders/[id].
3. Also make the quotation number on src/app/(dashboard)/sales/[id]/page.tsx
   (~line 249) a Link to /quotations/[id].
4. Fix the label at ProcessStep.tsx ~969: the additional spec shown there is
   copied from the client PO item, not the quotation.
5. Update the docs/code/ companions.

Keep the existing "No reference quotation linked" wording for orders with no
quotationId.
```

### 3. Tender ref or quotation ref number in search — PARTIAL

**Note:** "Tender Ref or Quotation Ref no. in search"

**What the code does.**

| Field | Where searchable today |
|---|---|
| `Quotation.quotationNo` | quotation list, global search |
| `Quotation.inquiryNo` (form label "Inquiry No.", placeholder "Client inquiry ref.") | nowhere |
| `Quotation.customerReference` | nowhere |
| `Tender.tenderNo` | tender list, quotation list |
| `Tender.tenderRef` (the client's own tender number) | tender list only |

Quotation list search is two fields (`src/app/api/quotations/route.ts:53-58`):
`quotationNo` and `customer.name`. The tender branch of the same route
(`:114-120`) searches `tenderNo`, `organization`, `projectName`,
`customer.name` but not `tenderRef`, while the standalone tender list does
(`api/tenders/route.ts:21-26`). Global search (`api/search/route.ts`) matches
one number field per entity and does not query tenders at all.

Trap: `shouldIncludeTenders` (`src/lib/quotations/listing.ts:13-20`) returns
false whenever a status, revision or conversion filter is set, so tender rows
vanish from the quotation list under any filter regardless of search.

**Fix.** Add `inquiryNo`, `customerReference` and
`sourceTender.tenderRef/tenderNo` to the quotation OR; add `tenderRef` to the
tender branch; add a tender query to global search.

**Prompt:**

```
Users cannot find a quotation by the client's enquiry/reference number or by
the tender reference. Extend search.

1. src/app/api/quotations/route.ts (~lines 53-58): add to where.OR
   { inquiryNo: { contains: search } },
   { customerReference: { contains: search } },
   { sourceTender: { tenderRef: { contains: search } } },
   { sourceTender: { tenderNo: { contains: search } } }.
   The sourceTender relation already exists on Quotation.
2. Same file, tender branch (~lines 114-120): add
   { tenderRef: { contains: search } } to match src/app/api/tenders/route.ts.
3. src/app/api/search/route.ts: add a prisma.tender.findMany to the
   Promise.all, matching tenderNo OR tenderRef, company-filtered, with
   href /tenders/{id} and type "Tender"; extend the quotation match from
   quotationNo alone to OR [quotationNo, inquiryNo]. Add a Tender icon entry
   to entityIcons in src/components/shared/global-search.tsx.
4. Update the search placeholder on src/app/(dashboard)/quotations/page.tsx
   to say it also matches enquiry ref and tender ref.
5. Update the docs/code/ companions.

Write a test first for the list route: a search string equal to a tender's
tenderRef returns that tender row.
```

### 4. Create quotation and create order: fetch auto details — PARTIAL

**Note:** "Create Quotation and create Order fetch auto details"

**What the code does.**

Quotation create already auto-fills from the customer: address display,
market type, currency, place of supply, buyer (only if exactly one), and terms
via `CustomerTermDefault` with a global template fallback
(`quotations/create/standard/page.tsx:380-547`).

What it does not auto-fill:

- **Payment terms and delivery terms are never set as structured fields.**
  Zero matches for `paymentTermsId`, `deliveryTermsId`, `deliveryPeriod` in
  both create pages. The API accepts them (`api/quotations/route.ts:168-170`)
  but the form never sends them, so `Quotation.paymentTermsId` etc. are always
  NULL.
- `CustomerMaster.defaultPaymentTermsId` (`schema.prisma:96`) has no consumer.
- The customer's GST number is not shown on the quotation form; GST rate is
  never defaulted (`useState("")` at line 185).

This is the root cause of the Create Order gap. The CPO create page already
tries to inherit `q.paymentTerms`, `q.deliveryTerms`, `q.deliveryPeriod`
(`client-purchase-orders/create/page.tsx:371-382`) via the balance route
(`api/quotations/[id]/balance/route.ts:88-90`), which resolves them from the
never-written FK. Dead wiring end to end.

`sales/create` fills only `quotationId` and `customerId` from a quotation
(`sales/create/page.tsx:100-104`), leaves payment terms, delivery schedule,
project name blank, and copies no items from a tender (item 1 side finding).

**Fix.** Add Payment Terms and Delivery Terms selects to both quotation create
pages, default from the customer master, send the ids; copy terms, schedule
and project name in `sales/create`; copy tender items in `sales/create`.

**Prompt:**

```
Quotation create never stores payment/delivery terms as structured fields, so
the client PO and sales order screens that try to inherit them get nulls.

1. src/app/(dashboard)/quotations/create/standard/page.tsx and
   create/nonstandard/page.tsx: add a Payment Terms Select (from
   /api/masters/payment-terms) and a Delivery Terms Select (from
   /api/masters/delivery-terms) plus a Delivery Period input in the header
   section. In the existing customer-select effect, default paymentTermsId
   from selectedCustomer.defaultPaymentTermsId. Send paymentTermsId,
   deliveryTermsId and deliveryPeriod in the create and edit payloads. The
   API already accepts all three (api/quotations/route.ts and [id]/route.ts);
   send null, not undefined, when cleared. Load them in edit mode.
2. Show the selected customer's GST number read-only next to the address
   block, and default taxRate to "18" when currency is INR and taxRate is
   empty.
3. src/app/(dashboard)/sales/create/page.tsx: when a quotation is selected,
   also copy paymentTerms (name), deliverySchedule (from deliveryPeriod) and
   projectName into formData, mirroring client-purchase-orders/create. When a
   tender is selected, map tender.items into the item grid using the same
   mapper as quotations/create/standard/page.tsx ~722-745.
4. Update the docs/code/ companions for every touched file.

Both quotation create pages must get the same change; past bugs came from
fixing only one. Write a test first for the quotation POST storing
paymentTermsId.
```

---

## Page 2 — Order processing

### 6. In-house: no TPI agency option needed — BUG

**Note:** "inhouse → no TPI agency option needed"

TPI = third party inspection agency (Lloyd's, BV, TUV, SGS), nominated by the
client. The order has a regime, `orderInspectionType`, with two values:
`TPI_CLIENT_QA` or `INHOUSE_QA` (`src/lib/constants/order-processing.ts:23-26, 55-60`).

**What the code does.**

- The TPI Agency select (`ProcessStep.tsx:769-777`) is gated only on
  `qap.qapInspectionRequired` (`:757`), never on the regime. Choose in-house,
  tick Inspection Required, and the "TPI Agency" dropdown still appears.
- Nothing requires an agency server-side (`src/lib/quality/qap.ts:80-105`
  stores `blankToNull`). So it is offered, not required. The confusion is the
  offering.
- Worse: for an in-house order every unprocessed item is auto-ticked
  `tpiRequired: true, tpiType: "INHOUSE_QA"` (`ProcessStep.tsx:264-268`), so
  each line renders "Third Party Inspection ✓ / TPI Type = Inspection by
  Inhouse QA".
- That flag leaks: the purchase requisition prints "TPI: Inspection by Inhouse
  QA" (`src/lib/business-logic/technical-requirements.ts:107-108`), and the
  warehouse intimation generates an Inspection Offer without branching on it
  (`api/warehouse/intimation/[id]/generate-inspection-offer/route.ts:44-45`).
- Side effect: the parameter card (VDI %, hydro %, 11 lab tests, Generate Lab
  Letter) is gated on `tpiType === "TPI_CLIENT_QA"` (`ProcessStep.tsx:1234`),
  so an in-house order can never name a lab test.

**Fix.** One file, `ProcessStep.tsx`: hide the agency block when
`orderInspectionType === "INHOUSE_QA"`; set `tpiRequired` only for
`TPI_CLIENT_QA`; relabel the item checkbox "Inspection" so it reads honestly.

**Prompt:**

```
On the Order Processing step (src/components/order-wizard/ProcessStep.tsx),
choosing the in-house QA regime still shows a "TPI Agency" dropdown and
auto-ticks "Third Party Inspection" on every item.

1. Wrap the TPI Agency select block (~lines 769-777) in
   qap.orderInspectionType !== "INHOUSE_QA" &&. When the regime changes to
   INHOUSE_QA, clear qapTpiAgencyId to "" so a stale agency is not saved.
2. In formFor (~lines 264-268), set tpiRequired: regime === "TPI_CLIENT_QA"
   instead of always true, and keep tpiType: regime.
3. Relabel the per-item "Third Party Inspection" checkbox (~line 1107) to
   "Inspection" so it is honest for both regimes.
4. Do NOT change the lab-test card gate at ~line 1234 in this change; note in
   the PR that in-house orders currently cannot name lab tests and ask whether
   that gate should become tpiType !== "".
5. Update docs/code/src/components/order-wizard/ProcessStep.tsx.md.

Check src/lib/business-logic/technical-requirements.ts ~107 still prints
sensible text for an in-house order after step 2.
```

### 7. Fail to save processing data — BUG

**Note:** "fail to save processing data"

The note quotes the toast verbatim. "Failed to save processing data" is the
500 body at `src/app/api/sales-orders/[id]/processing/route.ts:233`. The 400s
have different wording, so the user is hitting an exception inside the POST,
not a validation rejection.

**Payload audit: clean.** Client keys (`ProcessStep.tsx:97-123, 443-448`) map
1:1 onto the server's shared object (`route.ts:155-178`). No zod, no enum
columns, no dates in the payload, arrays serialised both ways, the PATCH
`itemId` is the `SalesOrderItem` id and the server looks it up that way. Not a
key mismatch.

**Why nobody can tell what fails.** The server returns `{ error, detail }`
with `detail` holding the Prisma message. The client reads only `err.error`:

```
ProcessStep.tsx:452   throw new Error(err.error || "Save failed");
ProcessStep.tsx:503   throw new Error(err.error || "Save failed");
ProcessStep.tsx:667   throw new Error(e.detail || e.error || "Failed");   // QAP save does it right
```

**Ranked candidates for the actual exception:**

1. **VARCHAR(191) overflow.** `additionalSpec`, `otherLabTests`,
   `colourCode`, `additionalPipeSpec`, `coatingType` are `String?` =
   VARCHAR(191), fed by free inputs with no `maxLength`
   (`ProcessStep.tsx:929-937, 960-968, 1058-1069, 1367-1376`). A pasted spec
   clause over 191 chars raises "Data too long" → this exact toast.
2. **Non-integer witness percentages.** `vdiWitnessPercent` /
   `hydroWitnessPercent` are `Int?` (`schema.prisma:2690, 2692`); inputs have
   no `step` and the handler does `Number(value)` (`ProcessStep.tsx:1267-1274,
   1309-1316`). Typing 12.5 → Prisma "Expected Int, provided Float".
3. **Stale `activeCompanyId` cookie** for SUPER_ADMIN → FK violation on
   `OrderProcessingItem.companyId` (the only non-nullable company FK in the
   flow, `schema.prisma:2705`). The processing route is not company-scoped on
   read, so the screen loads and only the save dies.
4. **Transaction timeout on "apply to other items".** `route.ts:180-200` is
   `prisma.$transaction(itemIds.map(...))` with the default 5 s timeout, 30
   upserts on a remote Hostinger MySQL with `connectionLimit: 5`.
5. Undeployed migration `20260822090000_order_processing_gaps`: ruled out if
   the screen loads, because the GET selects `poSlNo`/`poItemCode` from the
   same migration.

**Fix.** Surface `detail` first (two lines). Then round the two Int inputs
server-side, widen the two text columns to `@db.Text`, and add a transaction
timeout.

**Prompt:**

```
Saving on the Order Processing step sometimes fails with the toast "Failed to
save processing data" and nothing else. The server already returns the Prisma
message in `detail`; the client drops it.

1. src/components/order-wizard/ProcessStep.tsx lines ~452, ~503, ~517, ~554:
   change err.error to err.detail || err.error, matching the QAP save at
   ~667. Ship this first as its own commit so the real cause is visible in
   the toast and Vercel logs.
2. src/app/api/sales-orders/[id]/processing/route.ts ~173 and ~176: coerce
   vdiWitnessPercent and hydroWitnessPercent with
   Number.isFinite(n) ? Math.round(n) : null. The columns are Int. Also add
   step={1} to the two inputs in ProcessStep.tsx (~1262-1278, ~1304-1320).
3. prisma/schema.prisma OrderProcessingItem: change otherLabTests and
   additionalSpec to String? @db.Text with a hand-written migration (this
   host blocks the shadow DB; see the header comment in
   prisma/migrations/20260822090000_order_processing_gaps/migration.sql for
   the pattern). Add maxLength={191} to colourCode, additionalPipeSpec and
   coatingType inputs instead of widening them.
4. route.ts ~180: pass { timeout: 20000 } to the $transaction that upserts
   across itemIds.
5. Update docs/code companions for the route, the component and the schema.

Write a test first for step 2: POST with vdiWitnessPercent 12.5 stores 13 and
returns 200. Do not add zod to the route; the key mapping is already correct.
```

### Purchase Order — NO DETAIL

The notebook has the heading `# Purchase Order` with nothing under it. The
purchase order module exists (`src/app/(dashboard)/purchase/orders`, PDF at
`api/purchase/orders/[id]/pdf/route.tsx`). Nothing to act on until the
specific complaint is known. One known gap from the module docs: value-banded
approval thresholds are specified but not implemented
(`docs/code/src/app/api/purchase/README.md`).

### Reports / Inspection report — NO DETAIL

Heading only. There is no standalone inspection-report PDF route
(`api/quality/inspections/[id]` has only `route.ts`; PDFs exist for inspection
offers, lab letters, client status, dossier). If the ask is "print an
inspection report", that is a new PDF template. Needs the specific
requirement.

---

## Page 3 — Client Purchase Order create

### 8. PO document upload — DONE

**Note:** "PO document upload file option to add"

Already built: `ClientPurchaseOrder.clientPoDocumentPath/Name`
(`prisma/schema.prisma:1136-1139`), file input on create
(`client-purchase-orders/create/page.tsx:1032-1069`), link on detail
(`[id]/page.tsx:313-327`), carried to the SO (`from-cpo/route.ts:110`).

Residual gap: the PATCH route (`api/client-purchase-orders/[id]/route.ts:147`)
does not accept the document fields, so a wrong attachment cannot be replaced.
Only one file per CPO.

**Prompt (only if replace is wanted):**

```
A client PO document cannot be replaced after registration. Add
clientPoDocumentPath and clientPoDocumentName to the PATCH destructure and
update block in src/app/api/client-purchase-orders/[id]/route.ts (~147,
~163-175), and copy the upload/remove pair from
src/app/(dashboard)/po-acceptance/[id]/page.tsx ~143-186 (handleSignedCopyUpload
and its remove handler) onto the CPO detail page. No schema change. Update
the docs/code companions.
```

### 9. Line item: add SNO, item code — PARTIAL

**Note:** "Line item add SNO, item code"

`ClientPOItem` has `sNo`, `poSlNo`, `poItemCode` (`schema.prisma:1162,
1177-1178`). The create form has all three columns
(`create/page.tsx:1240-1300`), persists them (`route.ts:356-357`), and the SO
inherits them (`from-cpo/route.ts:72-73`).

Missing:

- **Detail page** (`[id]/page.tsx:379-392`) does not show `poSlNo` or
  `poItemCode`; its item interface does not even declare them, so the data
  arrives and is dropped.
- **PO acceptance PDF** item table (`src/lib/pdf/po-acceptance-template.ts:188-196`)
  prints S.No, description, size, qty, UOM, rate, amount. No client Sl. No. or
  item code, so the client cannot match the letter to their own PO lines.
- `sNo` is renumbered 1..n over selected items on a partial order
  (`route.ts:346`), so it does not preserve the quotation line number.

**Prompt:**

```
The client's PO serial number and item code are captured on the client PO
create form but never shown again.

1. src/app/(dashboard)/client-purchase-orders/[id]/page.tsx: add poSlNo and
   poItemCode to the item interface (~line 107) and two columns "Sl. No.
   (PO)" and "Item Code (PO)" after S.No in the items table (~380, ~397).
2. src/lib/pdf/po-acceptance-template.ts: add the same two columns to the
   item table header (~188-196) and to itemRows. Make sure the PDF and email
   routes under src/app/api/po-acceptance/[id]/ select those fields on
   clientPurchaseOrder.items.
3. Update docs/code companions and the po-acceptance template test if one
   exists.

No schema change. Leave the create form alone.
```

### 10. Copy item — MISSING

**Note:** "copy item"

No per-row copy, add or delete exists on the CPO line table
(`create/page.tsx:1236-1463`); rows are the quotation balance, selected by
checkbox. Grep for `duplicateItem|cloneItem|copyItem` finds nothing in the
repo.

Two readings:

- **(i) Duplicate the row** so one quoted line becomes two CPO lines with
  different Sl. No. / item code / CDD / qty. Schema-compatible
  (`quotationItemId` is not unique on `ClientPOItem`), but the balance check
  (`api/client-purchase-orders/route.ts:177-192`) validates each line alone,
  so two copies could together exceed the quoted balance. A sum guard is
  mandatory. Also `item.id` and `quotationItemId` are conflated at
  `create/page.tsx:672`.
- **(ii) "Copy From"** another row's values. This pattern already exists on
  the quotation create page (`quotations/create/standard/page.tsx:1397-1440`).

**Prompt (reading i, the likelier one):**

```
Add a per-row "Copy" action to the client PO line items table in
src/app/(dashboard)/client-purchase-orders/create/page.tsx so one quoted line
can be split into two PO lines (different PO Sl. No., item code, qty, CDD).

1. Add an actions cell with a Copy icon button that inserts a clone after the
   row with a fresh client-side id (crypto.randomUUID()), poSlNo and
   poItemCode blank, qtyOrdered 0, selected = true. Keep quotationItemId on
   the clone pointing at the original quotation item; today handleSubmit
   sends item.id as quotationItemId (~line 672), so separate the two first.
   Also allow removing a cloned row.
2. src/app/api/client-purchase-orders/route.ts (~177-192): in addition to the
   per-line balance check, group items by quotationItemId and reject when the
   summed qty exceeds the balance. This is a money path.
3. Update docs/code companions.

Write the API sum-guard test first. If the owner meant "copy values from
another row" instead, lift the Copy From dropdown from
quotations/create/standard/page.tsx ~1397-1440 instead of this.
```

### 11. CS Seamless appearing twice — BUG, but not on this screen

**Note:** "CS. Seamless appearing twice"

Neither CPO screen has a product dropdown; line product text is read-only
from the quotation. The owner saw this on a screen with a product picker,
almost certainly Quotation create.

Root cause in the shared picker `src/components/shared/product-material-select.tsx`:

```
:139  const uniqueProducts = Array.from(new Set(allProducts.map((p) => p.product))).sort();
:142  allProducts.filter((p) => p.product.toLowerCase() === product.toLowerCase())
```

The list dedupes case-sensitively while every match is case-insensitive, so
"C.S. SEAMLESS PIPE" and "C.S. Seamless Pipe" both appear and behave the same.

How two rows get in: `ProductSpecMaster` has no unique constraint
(`schema.prisma:198-218`); `POST /api/masters/products` does not trim,
normalise or check for an existing row (`route.ts:71-95`);
`scripts/seed-new-masters.ts:195-203` has a comment describing exactly this
twin problem and guards with an exact-case key, so a hand-typed variant with a
size is preserved and the Excel spelling is reinserted beside it. The Excel
source has one spelling ("C.S. SEAMLESS PIPE", 18 rows).

Not verified against the live DB (read-only session). Run the SQL below first.

**Prompt:**

```
"C.S. Seamless" shows twice in the product dropdown on quotation create.

0. First verify in the live DB:
   SELECT product, COUNT(*) FROM ProductSpecMaster
   GROUP BY UPPER(TRIM(product)) HAVING COUNT(DISTINCT product) > 1;
   Report the exact duplicate spellings before changing anything.
1. src/components/shared/product-material-select.tsx ~139: dedupe on a
   normalised key, keeping the first spelling as the label:
   Array.from(new Map(allProducts.map(p => [p.product.trim().toUpperCase(),
   p.product.trim()])).values()).sort(). This fixes all six call sites.
2. src/app/api/masters/products/route.ts POST (~73): trim product/material,
   and before create do a case-insensitive findFirst on product + material +
   category; return 409 if it exists.
3. Write a one-line SQL (or script) that merges the duplicate rows found in
   step 0 into the canonical upper-case spelling, and run it only after
   showing me the rows.
4. Update docs/code companions.

Do not add a @@unique yet; that needs the data clean-up first and
seed-new-masters.ts uses createMany.
```

### 12. Terms and conditions appearing twice — UNCLEAR

**Note:** "Terms and condition twice"

Checked every place terms render in the CPO flow: CPO create has one Payment
Terms and one Delivery Terms input (`create/page.tsx:888-908`); CPO detail
shows each once (`[id]/page.tsx:350-351`); PO acceptance create, detail and
PDF each render one terms block (`po-acceptance-template.ts:212-218`);
quotation PDFs have one OFFER TERMS block and a separate NOTES block
(`quotation-standard-template.ts:435-443`); the quotation terms loader always
replaces, never appends (`quotations/create/standard/page.tsx:480-547`).

Nothing renders twice. Two candidates:

1. **Sidebar has two entries**: "Terms & Conditions" and "Offer Terms"
   (`src/components/layout/sidebar.tsx:95-96`), two different masters. To a
   business user that reads as "terms and conditions twice".
2. **A duplicate `OfferTermTemplate` row.** No unique constraint
   (`schema.prisma:920-934`), the POST does no duplicate check
   (`api/offer-term-templates/route.ts:33-62`), and three seeders write the
   table with inconsistent keys (`prisma/seed-offer-terms.ts:68-86`,
   `seed.ts:505-518`, `seed-production.ts:236-249`). A duplicate row would
   show twice in the quotation terms list and PDF.

**Action.** Ask for a screenshot before touching anything. If it is reading 2,
run `SELECT termName, quotationType, companyId, COUNT(*) FROM OfferTermTemplate GROUP BY 1,2,3 HAVING COUNT(*) > 1`.

**Prompt (only after the screenshot confirms reading 2):**

```
Duplicate rows in OfferTermTemplate make the same term appear twice on the
quotation terms list and PDF. In src/app/api/offer-term-templates/route.ts
POST (~48), add a case-insensitive findFirst on termName + quotationType +
companyId and return 409 on a match. Then write a dedupe SQL for the existing
rows (show me first), and add @@unique([termName, quotationType, companyId])
to OfferTermTemplate with a migration after the dedupe runs. Update docs/code
companions.
```

### 13. Custom address for billing and dispatch — MISSING

**Note:** "Address custom option for billing & dispatch"

Both addresses are FK-only picks from the same `CustomerDispatchAddress`
collection (`schema.prisma:744-773`; fields on CPO at `:1128-1135`). Billing
select `create/page.tsx:980-1009`, dispatch select `:1077-1108`. The only free
text, `shipmentAddress`, is shown only for international customers with
domestic delivery (`:1144-1167`). A domestic customer must leave the screen,
create a permanent master row, and come back.

The page already has the "— Enter manually —" pattern for the contact person
(`create/page.tsx:843`).

Side gaps: `billingAddressId` is never read downstream; the CPO detail shows
billing only and never the dispatch address (`[id]/page.tsx:298-312`;
`api/client-purchase-orders/[id]/route.ts:30` includes `billingAddress` but
not `dispatchAddress`).

**Prompt:**

```
Client PO billing and dispatch addresses can only be picked from saved
customer sites. Add a one-off typed address for each.

1. prisma/schema.prisma ClientPurchaseOrder: add
   billingAddressText String? @db.Text and dispatchAddressText String? @db.Text
   with a migration. Keep the FK columns; they stay NULL when text is used.
2. src/app/(dashboard)/client-purchase-orders/create/page.tsx: add
   <SelectItem value="MANUAL">— Enter manually —</SelectItem> to both address
   selects (~1000, ~1099), following the contact-person pattern at ~843. When
   MANUAL is chosen, clear the FK and show a Textarea bound to the new field.
   Add both to formData and the submit payload.
3. src/app/api/client-purchase-orders/route.ts (~312): persist both fields.
4. src/app/(dashboard)/client-purchase-orders/[id]/page.tsx: show
   billingAddressText ?? billingAddress, and add a Dispatch Address row (it is
   missing today); add dispatchAddress: true to the include in
   src/app/api/client-purchase-orders/[id]/route.ts ~30.
5. Do not change SalesOrder in this pass; note in the PR that from-cpo only
   carries dispatchAddressId.
6. Update docs/code companions.

Write a test first for the POST storing dispatchAddressText with a null FK.
```

### 14. "Other" charge: say what it is — MISSING

**Note:** "Other: give opt to add what it is"

Six charges are a hardcoded constant (`create/page.tsx:148-155`): Freight,
TPI Charges, Testing Charges, Packing & Forwarding, Insurance, Others. The
label is static text (`:1678`). There is no description column anywhere
(zero matches for `otherChargesDescription|otherChargesLabel`). An amount
against "Others" is unexplainable on the detail page, the acceptance PDF and
the sales order. Same hole on `POAcceptance` (`schema.prisma:2432-2433`).

**Prompt:**

```
The "Others" additional charge on the client PO has no way to say what it is.

1. prisma/schema.prisma: add otherChargesDescription String? to
   ClientPurchaseOrder (after otherChargesTaxApplicable ~1112) and to
   POAcceptance (after ~2433), with a migration.
2. src/app/(dashboard)/client-purchase-orders/create/page.tsx: add
   description?: string to the AdditionalCharge type (~141), render an Input
   in the Charge Type cell (~1678) only for key === "otherCharges", extend
   updateCharge (~493) to accept "description", and send it in chargePayload
   (~638).
3. src/app/api/client-purchase-orders/route.ts: destructure and persist it.
4. src/app/(dashboard)/client-purchase-orders/[id]/page.tsx (~217): label the
   row clientPO.otherChargesDescription || "Others".
5. PO acceptance: seed the description from the CPO in
   src/app/(dashboard)/po-acceptance/create/page.tsx's existing charges
   effect (~239-261), persist in api/po-acceptance/route.ts, and print it in
   src/lib/pdf/po-acceptance-template.ts where charges are listed.
6. Update docs/code companions.

Do not turn the six charges into a variable list; one label is all that was
asked.
```

### 15. Additional charges: tax applicable not working, default yes — BUG (money)

**Note:** "Additional charges Tax applicable not working, by default keep it yes."

**Root cause.** `create/page.tsx:637-644` builds the payload by deriving the
flag name from the amount column name:

```ts
chargePayload[c.key + "TaxApplicable"] = c.taxApplicable;
```

Three of six model flag names do not follow that pattern:

| Charge key | Client sends | API expects (`route.ts:99-109`) | Result |
|---|---|---|---|
| freight | freightTaxApplicable | freightTaxApplicable | works |
| insurance | insuranceTaxApplicable | insuranceTaxApplicable | works |
| otherCharges | otherChargesTaxApplicable | otherChargesTaxApplicable | works |
| tpiCharges | tpiChargesTaxApplicable | **tpiTaxApplicable** | always false |
| testingCharges | testingChargesTaxApplicable | **testingTaxApplicable** | always false |
| packingForwarding | packingForwardingTaxApplicable | **packingTaxApplicable** | always false |

The server coerces `undefined` to `false` (`route.ts:234-238`) and computes
GST on the smaller base (`:255-263`). The on-screen preview reads local state
(`:541-545`) so it looks right until you save, then the detail page shows No
and the stored `grandTotal` is short. The acceptance PDF prints the stored
total, so it reproduces the error. The comment at `:643` "Fix naming for the
otherCharges toggle key" patched the one key that was already correct.

**Default.** All six are `taxApplicable: false` in the constant and
`@default(false)` in the schema (`:1105,1109,1112,1114,1120,1122`). Freight,
packing and insurance on a goods supply are normally part of the taxable
value under GST, so false is the wrong default.

**Also.** `from-cpo/route.ts:105-120` copies none of the charges, flags, GST
or totals to the sales order. Separate, larger piece of work.

**Prompt:**

```
Client PO additional charges: the Tax Applicable switch is lost on save for
TPI, Testing and Packing & Forwarding, so GST is under-computed. Money bug.

1. src/app/(dashboard)/client-purchase-orders/create/page.tsx: add
   taxKey: string to the AdditionalCharge type and set it explicitly in
   DEFAULT_CHARGES to the model's real flag names: freightTaxApplicable,
   tpiTaxApplicable, testingTaxApplicable, packingTaxApplicable,
   insuranceTaxApplicable, otherChargesTaxApplicable. Set taxApplicable: true
   as the default on all six. Replace the loop at ~637-644 with
   chargePayload[c.key] = c.amount || 0; chargePayload[c.taxKey] =
   c.taxApplicable; and delete the "Fix naming for the otherCharges toggle
   key" line and comment.
2. prisma/schema.prisma: flip the six ClientPurchaseOrder *TaxApplicable
   defaults and the six POAcceptance ones to @default(true), with a
   migration. Do not touch existing rows.
3. Write a unit test first, next to the page or in src/lib, asserting that
   every taxKey in DEFAULT_CHARGES is one of the keys destructured by
   src/app/api/client-purchase-orders/route.ts POST. Make it fail on the
   current code before fixing.
4. Update docs/code companions for the page, the route and the schema.

Do not change the server calculation; it is already correct. Do not touch
from-cpo in this change.
```

---

## Page 4 — PO acceptance

### 16. CDD auto-fetch on generate acceptance — MISSING

**Note:** "cdd (client delivery date) auto fetch on generate acceptance"

`POAcceptance.committedDeliveryDate` is required (`schema.prisma:2419`). The
wizard initialises it blank (`po-acceptance/create/page.tsx:132`) and the only
CPO-to-form seeding effect (`:239-261`) copies fourteen charge fields and not
the date. The CPO detail endpoint already returns `committedDeliveryDate` and
`deliveryDate` (`api/client-purchase-orders/[id]/route.ts:106` spreads the
row), so the value is in memory and never read.

`committedDeliveryDate` is canonical: CPO create writes both columns from one
input (`client-purchase-orders/create/page.tsx:656-657`) but CPO edit updates
only `committedDeliveryDate` (`[id]/route.ts:164-165`), so `deliveryDate` goes
stale after any edit.

**Prompt:**

```
On PO Acceptance create (src/app/(dashboard)/po-acceptance/create/page.tsx)
the Committed Delivery Date is blank even though the client PO already has it.

1. Add committedDeliveryDate?: string | null and deliveryDate?: string | null
   to the CpoDetail interface (~line 78).
2. In the existing effect that seeds charges from cpoDetail (~239-261), add
   committedDeliveryDate: prev.committedDeliveryDate ||
   (cpoDetail.committedDeliveryDate ?? cpoDetail.deliveryDate ?? "").slice(0, 10).
   Prefer committedDeliveryDate; deliveryDate is a stale twin. Keep any value
   the user already typed.
3. Update docs/code companion for the page.

No API or schema change.
```

### 17. PO acceptance PDF header: company logo — MISSING

**Note:** "PO acceptance header pdf add company logo"

`src/lib/pdf/po-acceptance-template.ts:14` declares `companyLogoUrl` in its
interface and never uses it; the header is text only (`:157-162`). The pdf
and email routes already include `company` (`api/po-acceptance/[id]/pdf/route.ts:30`,
`email/route.tsx:57`). `CompanyMaster.companyLogoUrl` is a site-relative path
(`schema.prisma:641`). The HTML quotation template does it in one line
(`quotation-nonstandard-template.ts:475`); the react-pdf quotation route
absolutises the URL first (`api/quotations/[id]/pdf/route.tsx:64-74`;
`api/mtc/certificates/[id]/pdf/route.tsx:45-53` has the cleaner helper).

Caveat: the email route embeds the same HTML inline, and a relative
`/uploads/...` src is a broken image in mail. Absolutise in both routes.

**Prompt:**

```
The PO acceptance letter has no company logo in its header.

1. src/lib/pdf/po-acceptance-template.ts ~158: before the <h1>, add
   ${company.companyLogoUrl ? `<img src="${company.companyLogoUrl}" alt=""
   style="max-height:50px;object-fit:contain;margin-bottom:6px;">` : ""}
   following quotation-nonstandard-template.ts ~475.
2. In src/app/api/po-acceptance/[id]/pdf/route.ts and
   [id]/email/route.tsx, pass companyLogoUrl made absolute with
   request.nextUrl.origin when it starts with "/", copying the abs() helper
   from src/app/api/mtc/certificates/[id]/pdf/route.tsx ~45-53. The email
   embeds the HTML inline, so a relative src would be a broken image.
3. Update docs/code companions.

If item 19 (PDF not opening) is being fixed with a react-pdf component at the
same time, put the logo in that component with <Image> as in
src/lib/pdf/quotation-pdf.tsx ~250-257 instead of the HTML template.
```

### 18. PO acceptance PDF: follow-up person details — UNCLEAR, two readings

**Note:** "PO acc. pdf follow up person details in pdf"

The three named contacts (Follow-up, Quality, Accounts) **are** printed as a
Department / Name / Email / Phone table (`po-acceptance-template.ts:124-133,
220-235`). They are free text, prefilled from the **client's** contact
directory (`CustomerContact` by department, `create/page.tsx:263-310`), not
from `EmployeeMaster`. The companion doc confirms: contacts are free text.

What is not there:

- **Reading A (likely):** the letter never names *our* person. The signature
  block is "For {company} / Authorized Signatory" with no name, phone or email
  (`:239-245`). The quotation PDF prints the deal owner as contact
  (`quotation-pdf.tsx:228-232, 282-287`). `POAcceptance` has no company-side
  person FK, only `createdById → User`.
- **Reading B:** the contact table is often empty because autofill is a
  manual button (`create/page.tsx:671-677`), not an effect. Skip the click
  and all nine fields stay blank, and the table is omitted from the PDF.
  `finalize/route.ts` does not require `followUpName` (PUT does).

Ask the owner: "Should the letter show the client's follow-up contact, or our
own follow-up person?" Both are small.

**Prompt (reading A):**

```
The PO acceptance letter signs off as an anonymous "Authorized Signatory".
Print our follow-up person.

1. src/app/api/po-acceptance/[id]/pdf/route.ts (~18-32) and
   [id]/email/route.tsx (~45-58): add createdBy: { select: { name, email,
   phone } } to the include (the detail route already selects it).
2. src/lib/pdf/po-acceptance-template.ts: add optional ourContact?: { name;
   email; phone } to POAcceptanceData and print name, designation line
   "Follow-up contact", email and phone in the signature block (~239-245),
   mirroring quotation-pdf.tsx ~282-287. Fall back to the current text when
   absent.
3. Update docs/code companions and the template test.

Do not add an EmployeeMaster FK; createdBy is enough unless the owner says
the follow-up owner is someone other than the person who issued the letter.
```

**Prompt (reading B):**

```
On PO Acceptance create the contact table is empty unless the user clicks
"Auto-fill from Directory". Make it fill automatically: in
src/app/(dashboard)/po-acceptance/create/page.tsx, run the body of
autoFillAllContacts in a useEffect keyed on the loaded contacts, filling only
blank fields (it already uses prev.x || value, so it is idempotent). Keep the
button. Also require followUpName in src/app/api/po-acceptance/[id]/finalize/route.ts
the way the PUT does. Update the docs/code companion.
```

### 19. PDF not open in PO acceptance — BUG (root cause certain)

**Note:** "pdf not open in PO acceptance"

**What the code does.**

- The detail page button (`po-acceptance/[id]/page.tsx:311`) calls
  `downloadFile('/api/po-acceptance/{id}/pdf', 'po-acceptance-XXX.pdf')`,
  which is fetch + blob + synthetic `<a download>` (`src/lib/download-file.ts`).
  Not `window.open`, so popups are not the cause.
- The route `src/app/api/po-acceptance/[id]/pdf/route.ts` has **no PDF
  renderer**. It returns the HTML string from
  `generatePOAcceptanceLetterHtml` with `Content-Type: text/html` (`:93-97`),
  no `Content-Disposition`.
- So the browser saves an HTML file named `.pdf`. Acrobat, Preview and the
  Chrome PDF viewer reject it. The toast still says "PDF downloaded" because
  the response was 200.
- The design spec (`docs/superpowers/specs/2026-04-11-po-acceptance-letter-email-design.md:101-108`)
  chose HTML plus "open in a new tab"; the detail page was later wired to a
  file download. The two halves disagree.
- Secondary: a 400 JSON body for non-ISSUED status (`:38-40`) renders as raw
  JSON inside the create wizard's preview iframe (`create/page.tsx:1485`).
- Ruled out: route path mismatch, missing relation includes, chromium limits
  (no chromium dependency; the project uses `@react-pdf/renderer`).

Every other working PDF route renders a react-pdf document and sets
`application/pdf` + `Content-Disposition`. Stock issue keeps both the HTML
template for email and a react-pdf component for download
(`api/inventory/stock-issue/[id]/pdf/route.tsx:53-71`). PO acceptance has
only the HTML half.

**Fix options.** (a) Lazy: keep HTML, wrap with `wrapHtmlForPrint`, and open
in a new tab synchronously in the click handler. (b) Correct: add
`src/lib/pdf/po-acceptance-pdf.tsx` with react-pdf and serve a real PDF,
keeping HTML behind `?format=html` for the email route. Option (b) also gives
items 17 and 18 a home.

**Prompt (option b, recommended):**

```
The PO acceptance "Download PDF" button saves an HTML file named .pdf, which
no PDF viewer can open. src/app/api/po-acceptance/[id]/pdf/route.ts returns
text/html from generatePOAcceptanceLetterHtml; the page then calls
downloadFile(url, "...pdf").

1. Create src/lib/pdf/po-acceptance-pdf.tsx: a @react-pdf/renderer Document
   rendering the same content as src/lib/pdf/po-acceptance-template.ts
   (header with company logo via <Image> as in quotation-pdf.tsx ~250-257,
   client block, items table including poSlNo and poItemCode, charges, GST,
   grand total, terms, the three contact rows, signature block). Reuse
   src/lib/pdf/primitives.tsx and bordered-doc.tsx.
2. Rewrite the pdf route following
   src/app/api/inventory/stock-issue/[id]/pdf/route.tsx ~53-71: renderToBuffer
   the new document, respond with Content-Type application/pdf,
   Content-Disposition attachment with the acceptance number, Cache-Control
   no-store, export const maxDuration = 60. Keep ?format=html returning the
   existing HTML so the email route and the create wizard's preview iframe
   keep working; point the iframe at ?format=html.
3. Keep the ISSUED status gate but return the error as JSON only for the
   non-html format.
4. Add src/lib/pdf/po-acceptance-pdf.test.ts in the style of the sibling
   *.test.ts files: renders without throwing and contains the acceptance
   number. Write it first.
5. Add docs/code/src/lib/pdf/po-acceptance-pdf.tsx.md, update the route doc
   and docs/code/INDEX.md.

Do not remove po-acceptance-template.ts; the email route embeds it inline by
design.
```

**Prompt (option a, if "open and print" is enough):**

```
Make the PO acceptance letter open instead of downloading a broken file. In
src/app/api/po-acceptance/[id]/pdf/route.ts return
wrapHtmlForPrint(html, false) from src/lib/pdf/print-wrapper.ts. In
src/app/(dashboard)/po-acceptance/[id]/page.tsx ~309-316 replace the
downloadFile call with a synchronous window.open(`/api/po-acceptance/${id}/pdf`,
"_blank") at the top of the click handler (not after an await, or the popup
blocker eats it), and rename the button "Open letter". Update the docs/code
companions.
```

---

## Cross-cutting findings surfaced while tracing

These were not in the notebook but affect the items above.

- `src/lib/soft-delete.ts` is dead code documented as live (item 2).
- `tenders/[id]/route.ts` GET and PATCH are not company-scoped (item 1).
- `POST /api/client-purchase-orders` accepts any quotation status; the UI
  restricts to APPROVED/SENT/WON (item 2 FK trap).
- `QuotationStatus.CANCELLED` is unreachable: no transition into it
  (`api/quotations/[id]/route.ts:12-24`) yet offered as a list filter
  (`quotations/page.tsx:209`).
- `from-cpo` drops the whole commercial calculation (charges, flags, GST,
  totals, delivery terms) at the CPO to SO boundary (item 15).
- `POAcceptance.generatedPath` is never written (`schema.prisma:2460`).
- `CustomerMaster.defaultPaymentTermsId` has no consumer (item 4).
- `sales/create` copies no items from a WON tender (item 1).

## Suggested execution order

1. Item 15 (tax flags), one file, write the constant test first.
2. Item 7 step 1 (surface `detail`), two lines, deploy, read the real error.
3. Item 19 option b, and fold items 17 and 18 (after the one-question
   confirmation) and the PDF half of item 9 into the new component.
4. Item 16, one line.
5. Item 6, one file.
6. Item 5, two files.
7. Item 3, two routes.
8. Item 4, both quotation create pages plus sales/create.
9. Items 14 and 13, one column each.
10. Item 2, then item 1.
11. Item 11 after verifying the live rows; item 10 after a scope answer;
    item 12 after a screenshot.
