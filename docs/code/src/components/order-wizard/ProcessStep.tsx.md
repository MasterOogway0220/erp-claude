# src/components/order-wizard/ProcessStep.tsx

> Step 1 — per-item quality and processing requirements.

See [README.md](./README.md) for the wizard's purpose, the three-step flow and
the domain background — this doc covers only what is specific to this step.

## Notes

The TPI agency dropdown reads the shared `useInspectionAgencies` list. It used
to be fetched in the same `Promise.all` as the order's QAP; only the QAP fetch
remains there, since that one is genuinely per-order while the agency master is
the same list every inspection screen shows.

A large file: 1,843 lines in the sandbox copy. Every field maps to a column on `OrderProcessingItem`; the picklists come from `src/lib/constants/order-processing.ts`. What is ticked here decides which inspections, tests and certificates the order needs, and therefore what the client eventually receives in the dossier.

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
- **Order context line.** Above the QAP card: SO number, reference quotation
  (link to `/quotations/[id]`) and client PO (link to
  `/client-purchase-orders/[id]`, with the client's own PO number). Without it
  the step showed item chips and the QAP card with no way to tell which order
  or quotation it belonged to. "No reference quotation linked" when the SO has
  none. The spec hint under "Additional spec the product must meet" says
  "From the order line": the sales-order line got it from the client PO or,
  for an order made straight from a quotation, from the quotation.
- **In-house QA is not a third party.** When the order option is "Inspection
  by Inhouse QA" the **TPI Agency** select is hidden and any agency picked
  earlier is cleared (TPI = third-party inspection agency such as Lloyd's, BV,
  TUV or SGS, nominated by the client). New items start with the per-item
  "Inspection" box ticked only under TPI / client QA; under in-house QA it
  starts unticked with the type preset to in-house. Before 5 Oct 2026 every
  in-house item was ticked "Third Party Inspection", and the purchase
  requisition printed "TPI: Inspection by Inhouse QA". The per-item checkbox
  (`tpiRequired`) is labelled "Inspection" because its type can be either.
  Only the VDI (visual and dimensional inspection) and hydro (pressure) test
  witness % — the share of that work the third-party or client inspector
  watches in person — stay in the TPI-only card; the lab tests moved out, see
  below.
- **Who does the lab testing.** Ticking **Lab Testing** opens **Testing by**:
  In-house or TPI agency, and for a TPI agency a **Testing agency** picked from
  the same agency master as the QAP card. Stored as
  `OrderProcessingItem.labTestingBy` (`INHOUSE` / `TPI_AGENCY`) and
  `labTestingAgencyId`, separate from `tpiType`, which says who *inspects*.
  Unticking Lab Testing clears both; choosing In-house clears the agency. On an
  item not under TPI / client QA, unticking it also clears the lab tests and
  Other test: their card hides, and tests left behind would still print on the
  PR / vendor PO.
  "Apply to other items" copies both. Until 6 Oct 2026 Lab Testing was a bare
  tick with no way to say who tests.
- **Lab Tests card.** Lab Tests Required, Other test and Generate Lab Letter
  have their own card, shown when Lab Testing is ticked *or* the item is
  under TPI / client QA. Until 6 Oct 2026 they sat inside the TPI-only card,
  so an in-house item could not name its tests or get a lab letter. The
  letter is built by `[itemId]/lab-letter` from the *saved* tests, so the
  item must be saved and marked processed first.
- **Non-standard lines** show their own description
  (`SalesOrderItem.itemDescription`) in the item bar in place of the product,
  which for those lines reads only "Non-Standard Item".
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
- Save, mark-processed and reopen toasts show the server's `detail` before its
  generic `error`. "Failed to save processing data" alone told nobody what
  broke; the Prisma message in `detail` does.
- The live MySQL truncates over-long text silently instead of rejecting it.
  Colour code, stencil spec and coating type are VARCHAR(191) and capped with
  `maxLength={191}`; the compliance spec and "other test" are TEXT. The two
  witness-% inputs take whole numbers (`step={1}`); the API rounds anyway.
- Next, Previous and the item dots save first, then build the next form.
  They must build it from what `saveDraft` resolves to (the reloaded list
  after a multi-item save), not from the `items` their callback captured:
  until 6 Oct 2026 a line just written by "Apply this configuration to other
  items" opened with its old values, and the next save overwrote the copy.
  If the reload after such a save fails, `saveDraft` resolves to `false`: the
  navigation stays on the item with the targets still ticked, and the next
  save re-applies the copy and reloads.
- The step keeps the POST reply as the item's record, so the reply must have
  the GET's shape. Until 6 Oct 2026 it carried `ndtTests` /
  `requiredLabTests` as stored JSON text, `recordToFormData` read that as no
  tests, and the next save (Next/Previous save automatically) wrote them as
  NULL.
- The Quality/QAP card is read once, on first load (`qapLoadedRef`). The item
  list is re-read after every multi-item save, Mark as Processed, Reopen and
  Confirm Allotment; until 6 Oct 2026 the QAP was re-read with it, throwing
  away card edits not yet saved with "Save QAP".

## Sandbox preview (temporary, from 5 Oct 2026)

`ProcessStep.tsx` is currently a gate: the sandbox login gets `ProcessStep.sandbox.tsx`
— the behaviour this doc describes — and every other user gets
`ProcessStep.legacy`, the version from before the 03/10/26 meeting fixes. See
`src/lib/sandbox/preview.ts.md`. Going live: replace this file with the
`.sandbox` copy and delete both copies; then delete this section.

The 6 Oct 2026 changes (who does the lab testing, the Lab Tests card, the
three save fixes under Gotchas, the non-standard description) are in the
`.sandbox` copy only: other users keep the old behaviour, defects included,
until go-live.

## Related

- [Wizard overview](./README.md)
- `src/app/api/sales-orders/[id]/processing/route.ts`, `allotment/route.ts`,
  `qap/route.ts`, `processing/[itemId]/lab-letter/route.ts`
- `src/lib/constants/order-processing.ts` — including `ORDER_INSPECTION_TYPES`.
- Migration `20261006110000_processing_testing_and_line_descriptions` —
  `labTestingBy`, `labTestingAgencyId` and `SalesOrderItem.itemDescription`.
