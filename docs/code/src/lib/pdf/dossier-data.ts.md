# src/lib/pdf/dossier-data.ts

> One deep read of the dispatch document chain, plus the readiness rule that
> decides whether a dossier may be issued at all.

See [README.md](./README.md) for the shared PDF pattern.

## Why this exists

A **dispatch dossier** is the evidence pack that travels with a consignment of
pipe: it has to prove that these specific goods came from these specific heats
of steel, that those heats were certified, inspected and released, and that the
whole lot traces back to a customer order. Assembling it means walking almost
every table in the dispatch half of the schema.

Three routes need that same walk, and they used to get it three different ways.
The worst of them was the email route: it ran the full query set itself, then
issued an **HTTP request to its own dossier GET endpoint** to obtain the PDF —
which ran the entire query set a second time. That is two serverless
invocations and two deep traversals per email sent, against a Hostinger shared
MySQL instance with a hard **75-connection cap** and a firewall that bans
connection churn (see `src/lib/prisma.ts.md` for what that cap costs). Extracting
the traversal into a plain function removed the self-call. All three routes now
`await buildDossierData(id)` in-process.

Delete this file and the dossier, the dispatch bundle and the dossier email all
lose their data layer, and whoever rebuilds it has to rediscover two things that
are not obvious from the schema: which records must be de-duplicated, and the
two different ways a client PO can be reached.

## What it does

Two exports, deliberately separate.

**`buildDossierData(id: string)`** — async. Returns `null` when no dispatch note
has that id; the caller decides how to report that (the GET routes answer 404,
the email route uses its own error shape). Otherwise returns a flat object:

| Key | Contents |
|---|---|
| `dispatchNote` | The note with `packingList.items[].inventoryStock` and everything hanging off it, plus `dispatchAddress` and `transporter` |
| `customer`, `so`, `plItems`, `invoice` | Convenience aliases already unwrapped from the nested result |
| `clientPO`, `poAcceptance` | Resolved by two strategies — see below |
| `allMtcs`, `allInspections`, `allLabReports` | De-duplicated across packing-list lines |
| `tpiInspections` | The subset of `allInspections` with a `tpiAgencyId` |
| `allPipeDetails`, `allQcReleases` | **Not** de-duplicated |

**`computeDossierReadiness(d)`** — pure and synchronous. Takes five loosely typed
fields (`unknown` / `unknown[]`, so it can be called with a real result or a
fixture) and returns `{ missing, present }` string arrays for the five mandatory
documents: Client PO, PO Acceptance, at least one MTC, at least one Inspection
Report, and an Invoice. It only reports; it does not enforce. The dossier GET
route is what turns a non-empty `missing` into a **409** unless `?force=true`,
and `?validate=true` returns the readiness verdict without rendering anything.
The bundle route deliberately does not call it at all — a bundle is an
operational document that travels with the goods and must print from whatever
exists at dispatch time.

## How it works

### One query, then two lookups

The bulk of the data comes from a single `findUnique` with a nested `include`
five levels deep: dispatch note → packing list → items → inventory stock → that
stock's MTCs, inspections (with parameters and TPI agency), pipe details, lab
reports and QC releases. Prisma issues this as a handful of batched queries, not
one per row, which is the entire point given the connection cap.

Only the client PO needs extra round trips, because there is no foreign key from
the dispatch chain to it. Two strategies run in order:

1. **Through the quotation** — `clientPurchaseOrder.findFirst({ where: {
   quotationId } , orderBy: { createdAt: "desc" } })`. This is the reliable path.
   `findFirst` with a descending sort is used rather than `findUnique` because a
   quotation can have more than one client PO against it over its life, and the
   newest is the one that governs.
2. **By PO number** — if the first found nothing and the sales order carries a
   `customerPoNo`, match `clientPoNumber` against it.

Whichever hit, the PO acceptance is then fetched by `clientPurchaseOrderId`.

### Flattening, and why every row carries its stock's identity

Records reached through more than one packing-list line would otherwise appear
twice, so MTCs, inspections and lab reports are pushed through `Set`s of seen
ids. As each one is collected it is spread into a new object with
`stockHeatNo`, `stockProduct` and `stockSize` attached (pipe details also get
`stockSpec`).

That denormalisation is not laziness — it is the workaround for the single most
surprising limitation of the rendering layer. **`@react-pdf/renderer` has no
`rowspan`, no `colspan` and no `border-collapse`.** A table there is nested
`<View>`s, so a "Heat No." column that spans the four rows belonging to one heat
is simply not expressible. The document layer therefore either repeats the heat
on every row, or re-groups the flat array by `stockHeatNo` and draws a titled
sub-table per heat — which is exactly what the length-tally page in
`dossier-pdf.tsx` does. Either way the grouping key has to live **on the row**,
because by the time the row reaches the renderer its parent stock is gone.

### Why `any` is switched off here

The file disables `@typescript-eslint/no-explicit-any` with a reason comment.
The rows are Prisma results whose shape differs per branch, and the document
layer reads them defensively through accessor helpers rather than by type. The
routes make this explicit by casting the whole payload `as never` at the
`DossierDocument` boundary — so **nothing type-checks the contract between this
file and the PDF**. Renaming a key here fails silently at render time as a blank
cell, not at compile time. `src/lib/pdf/dossier-pdf.test.ts` renders every
section, populated and empty, and is the only thing standing between a rename
and a blank page.

## Domain notes

- **MTC** (mill test certificate) — the mill's chemical and mechanical test
  report for one *heat* of steel.
- **Heat number** — identifies a single melt at the mill. It is the traceability
  key for the whole dossier: every MTC, inspection, lab report and pipe length
  is tied to a heat, and the customer's inspector reconciles the paperwork
  against the numbers stamped on the pipe.
- **TPI** — third-party inspection, an independent agency the customer appoints.
  Here it is not a separate table: a TPI inspection is just an inspection row
  that has a `tpiAgency`, which is why `tpiInspections` is a filter rather than
  a query.
- **QC release** — the internal sign-off that a stock item may be dispatched.
  The colour-coding page uses the set of released `inventoryStockId`s to mark
  which packing-list lines are cleared.
- **PL / DN** — packing list and dispatch note, the two documents the dossier is
  built around.

## Gotchas and constraints

- **`allPipeDetails` and `allQcReleases` are not de-duplicated.** `seenIds` only
  covers `mtc`, `insp` and `lab`. If two packing-list lines draw on the *same*
  `inventoryStock`, every pipe length and QC release of that stock is emitted
  twice, and the length tally over-counts. The QC page happens to survive it
  because it collapses the releases into a `Set` of stock ids; the length tally
  does not.
- **A spread field can be shadowed.** `MTCDocument` and `Inspection` have their
  own nullable `heatNo` column, and `{ ...mtc, stockHeatNo }` leaves both on the
  row. `dossier-pdf.tsx` resolves it as `heatNo ?? stockHeatNo` — so a record
  whose own `heatNo` disagrees with its stock's silently wins. Do not "tidy" this
  by dropping either field.
- **The PO-number fallback is unscoped.** `clientPoNumber` is not unique in the
  schema (only `cpoNo` is) and the fallback applies no `companyId` filter, unlike
  most queries in this app (`companyFilter` in `src/lib/rbac.ts`). Three
  companies share this database; two of them raising POs with the same customer
  reference number can cross-match. The quotation path has no such problem, so
  the fallback firing at all is a hint that the quotation link is missing.
- **`invoice` is the newest invoice on the sales order, not the invoice for this
  dispatch.** It is `invoices` with `take: 1, orderBy: { createdAt: "desc" }`. On
  an order dispatched in parts, every dossier attaches the most recent invoice —
  which for older dispatches is the wrong document, and readiness will still
  report Invoice as present.
- **Readiness is advisory.** It returns arrays; it throws nothing and blocks
  nothing. A new consumer that forgets to call it will happily emit an
  evidence-free dossier, and the recipient cannot tell an incomplete pack from a
  complete one — which is the reason the gate exists.
- **Cost scales with packing-list lines, not with the dossier.** A note with many
  lines, each on a distinct stock with pipe-level detail, pulls a large object
  graph into memory before any of it is rendered. There is no pagination and no
  `take` anywhere in the traversal.
- **This is the data half only.** No Chromium is involved anywhere on this path —
  Puppeteer was removed from the app entirely and every PDF now renders
  in-process with `@react-pdf/renderer`.

## Related

- `src/lib/pdf/dossier-pdf.tsx` — the only consumer of the returned shape;
  `DOSSIER_SECTIONS` and `BUNDLE_SECTIONS` decide which pages are drawn.
- `src/lib/pdf/dossier-pdf.test.ts` — the effective contract test.
- `src/app/api/dispatch/dispatch-notes/[id]/dossier/route.tsx` — full dossier,
  owns `DOSSIER_COMPANY` and the readiness gate.
- `src/app/api/dispatch/dispatch-notes/[id]/dossier/email/route.tsx` — emails the
  same PDF; the route the self-call was removed from.
- `src/app/api/dispatch/dispatch-notes/[id]/bundle-pdf/route.tsx` — narrower
  section list, no readiness gate.
- `src/lib/pdf/primitives.tsx` — the shared react-pdf cell and format helpers.
- `src/lib/prisma.ts` — the 75-connection cap that made the self-call untenable.
