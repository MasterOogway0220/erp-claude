# src/components/order-wizard/ProcessStep.tsx

> Step 1 — per-item quality and processing requirements.

See [README.md](./README.md) for the wizard's purpose, the three-step flow and
the domain background — this doc covers only what is specific to this step.

## Notes

The TPI agency dropdown reads the shared `useInspectionAgencies` list. It used
to be fetched in the same `Promise.all` as the order's QAP; only the QAP fetch
remains there, since that one is genuinely per-order while the agency master is
the same list every inspection screen shows.

The largest file in the codebase at 1,677 lines. Every field maps to a column on `OrderProcessingItem`; the picklists come from `src/lib/constants/order-processing.ts`. What is ticked here decides which inspections, tests and certificates the order needs, and therefore what the client eventually receives in the dossier.

## What was added to close the order-processing gaps

- **Apply to other items.** The step is still one item at a time, but the
  configuration can be written to any number of other pending lines in the same
  save (`salesOrderItemIds` on the POST). A multi-line order usually shares one
  inspection and testing regime; filling the same form 30 times was the biggest
  source of user time and of mismatched lines. The client's own PO S.No / item
  code are never copied — they belong to the line.
- **Order-level inspection option.** A select in the order-level Quality/QAP
  card records whether the *order* is inspected under TPI / client QA or by
  NPIPE's own QA (`SalesOrder.orderInspectionType`). It is the default for items
  processed after it is saved; an item can still be switched individually. Read
  through `orderInspectionTypeRef` rather than state, because the form for an
  item is built inside callbacks that captured an older `qap`.
- **PO references pre-fill** from the sales-order line, which inherited them
  from the client PO — they used to be typed here a second time.
- **Two different specs.** "Additional spec the product must meet" is what the
  product has to comply with (`OrderProcessingItem.additionalSpec`, new);
  "Additional spec to be printed/stencilled on pipe" is what gets marked on it.
  The quotation's own spec is shown underneath, read-only.
- **Other test.** Free text for a lab test outside the eleven standard ones; it
  reaches the lab letter by name and can enable the letter on its own.

## Gotchas

- Large file; read before editing rather than pattern-matching from a sibling.
- Shares draft state with the other steps through `OrderWizard`.

## Related

- [Wizard overview](./README.md)
- `src/app/api/sales-orders/[id]/processing/route.ts`, `allotment/route.ts`,
  `qap/route.ts`
- `src/lib/constants/order-processing.ts` — including `ORDER_INSPECTION_TYPES`.
