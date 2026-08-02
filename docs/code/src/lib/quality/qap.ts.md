# src/lib/quality/qap.ts

> Quality Assurance Plan helpers — validate the QAP form, derive warehouse
> checklist statuses, prefill an inspection offer.

## Why this exists

A **QAP** records what the client requires before material can ship: whether an
inspection happens, where, which third-party agency witnesses it, and what
testing applies. It is agreed per order and drives the warehouse and QC
checklists downstream.

Three separate places needed consistent answers — the QAP save endpoint, the
warehouse intimation builder, and the inspection offer form. Each had its own
interpretation of when a check counts as required, which meant an item could
show "testing pending" on one screen and "not applicable" on another.

## What it does

| Export | Purpose |
|---|---|
| `VALID_QAP_LOCATIONS` | `["WAREHOUSE", "LAB"]`. |
| `deriveWarehouseStatuses(required, item)` | Inspection and testing status for one MPR line. |
| `qapToOfferPrefill(qap)` | QAP header → inspection-offer form shape. |
| `normalizeQapInput(body)` | Validate and normalise the PUT body. Throws on a bad location. |

## How it works

### Two statuses from two different levels

The asymmetry is the thing to understand:

- **Inspection** is an *order-level* decision. One `qapInspectionRequired` flag
  covers every line.
- **Testing** is *per item*. A line needs testing if any of
  `labTestingRequired`, `pmiRequired`, `ndtRequired`, `vdiRequired` or
  `hydroTestRequired` is set on its `OrderProcessingItem`.

So `deriveWarehouseStatuses` takes both and returns `PENDING` where something
is required and `NA` where it is not. `NA` rather than `COMPLETED` matters: a
warehouse operator must be able to tell "nothing needed here" from "done",
because the second is a claim and the first is not.

### `blankToNull`

Every optional field runs through it. An HTML form posts `""` for an untouched
input, and `""` in a foreign-key column is not null — it is an invalid
reference that fails a join later rather than at write time. Trimming to `null`
at the boundary is the fix.

### Throwing on a bad location

`normalizeQapInput` throws if the location is neither `WAREHOUSE` nor `LAB`.
Deliberately loud: this value decides where an inspection is physically
scheduled, and silently accepting a typo produces an inspection offer nobody
can act on.

## Domain notes

- **QAP** — Quality Assurance Plan. Client-agreed, sometimes a document they
  supply (hence `qapDocumentPath`).
- **TPI** — Third Party Inspection. An independent agency (Lloyd's, BV, TUV,
  SGS) the client nominates to witness. Their sign-off is part of the dispatch
  dossier.
- **The test types:**
  - **PMI** — Positive Material Identification, confirms the alloy is what the
    certificate says.
  - **NDT** — Non-Destructive Testing (radiography, ultrasonic, dye penetrant).
  - **VDI** — Visual and Dimensional Inspection, often on a witnessed
    percentage of the lot.
  - **Hydro** — pressure test, also typically on a sampled percentage.
  - **IGC** — Intergranular Corrosion, for stainless.
- **MPR** — Material Preparation Request, the warehouse intimation that tells
  stores to pick and prepare material.

## Gotchas and constraints

- `normalizeQapInput` **throws** rather than returning an error — callers need
  a `try/catch`.
- `qapInspectionRequired` is coerced with `!!`, so any truthy value passes. The
  form sends a real boolean.
- The QAP header fields live on the sales order with a `qap` prefix, not in a
  separate table.
- `qapDocumentPath` now holds an `/api/files/<id>` path; previously it pointed
  at a filesystem path that never existed in production.

## Related

- `src/lib/quality/qap.test.ts`
- `src/app/api/sales-orders/[id]/processing/route.ts`
- `src/app/api/warehouse/intimation/[id]/generate-inspection-offer/route.ts`
- `src/lib/constants/order-processing.ts` — the per-item testing flags.
