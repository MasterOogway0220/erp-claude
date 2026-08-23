# src/lib/pdf/inspection-offer-pdf.tsx

> The four sheets a quality inspection produces — offer letter, length tally,
> colour-code list and criteria checklist — as react-pdf documents.

See [README.md](./README.md) for the shared PDF pattern, and
[bordered-doc.tsx](../../../../src/lib/pdf/bordered-doc.tsx) for the chrome all
four are built on.

## Why this exists

**Business reason.** Nothing is dispatched to a client until their inspector has
seen the material and signed for it. **TPI** — third-party inspection — is an
independent agency the *customer* appoints and pays; their sign-off, not ours,
is the precondition of dispatch. These four sheets are that whole exchange on
paper: one invites the client and their TPI agency to come and inspect, and
three are printed and carried to the inspection floor for the inspector to write
on. Delete this file and the route at
`src/app/api/quality/inspection-offers/[id]/pdf/route.tsx` fails to import —
every button on the inspection-offer screen 500s, and QC is back to maintaining
these forms in Excel per offer.

**Why react-pdf and not HTML.** This file replaces
`inspection-offer-template.ts`, which produced the same four documents as HTML
strings for headless Chromium to print. Puppeteer/Chromium has since been
removed from the app entirely — no browser binary in the image, no 300 MB–1 GB
of memory and no process spawn per render — and every PDF is now rendered
in-process by `@react-pdf/renderer`. The HTML template is deleted; this is the
only implementation.

The HTML version was 433 lines for four documents largely because each one
re-declared the same form CSS. Here that chrome lives once in `bordered-doc.tsx`
and a document is reduced to a column list, a title and a footer.

## What it does

Four exported components, each a complete `<Document>`, plus the three data
interfaces callers construct.

| Export | Sheet | Page | Signature slots |
|---|---|---|---|
| `InspectionOfferDocument` | Inspection offer letter | A4 portrait | Prepared By + Authorised Signatory |
| `LengthTallyDocument` | Length tally list | A4 **landscape** | Tallied By, Verified By, Authorised Signatory |
| `ColourCodeDocument` | Colour code compliance list | A4 portrait | Checked By + QC In-Charge |
| `CriteriaChecklistDocument` | Inspection criteria checklist | A4 **landscape** | Inspector, TPI Representative, QC Manager |

Types: `InspectionCompany` (letterhead), `InspectionItem` (one line),
`InspectionOfferData` (the first three documents) and `CriteriaData` (the
fourth).

Callers must know two things that are not obvious from the signatures:

1. **The criteria checklist does not use the offer's items at all.** Three
   documents take `InspectionOfferData`; `CriteriaChecklistDocument` takes
   `CriteriaData`, whose `criteria` rows the route sources from the
   `qualityRequirement` table — the company's standing list of parameters to
   check (chemical composition, dimensional, hardness…), filtered to
   `isActive` and the current company. They are *not* per-offer. Their `sNo` is
   re-derived by array index in the route, so it is positional: de-activate one
   requirement and every S/N below it shifts.
2. **Nothing here queries or calculates.** Both a company block and fully
   formed data are passed in. Three companies share this database, so letterhead
   must come from the caller.

Rendering is the caller's job too: the route calls `renderToBuffer(doc)` and
picks the document from a `?type=offer|tally|colour|criteria` query parameter.

## How it works

Each document is the same five moves — `CompanyHeader`, `TitleBar`, `InfoGrid`,
`ItemsTable`, footer + disclaimer — so the only real content in this file is the
four `Column[]` arrays.

**A column is data, not markup.** `{ header, width, align?, bold?, mono?,
render }`. `render` returns a string for the common case, or a node when the
cell needs its own colour (`YesNo`, the red `PENDING`). `t()` is the local
null-to-empty-string coercion, so a null column prints blank rather than
`"null"`.

**Deliberately blank columns.** `Length (Individual)` and `Tally Verified` on
the tally, `Result` on the checklist, and `Compliance` on the colour list all
render `" "` — a single space, never `""`. The sheet is printed and filled in by
hand at the inspection, so those cells must exist and be tall enough to write
in. The space is what guarantees a line box: an empty string can collapse the
cell's height and break alignment with the rest of the row, which is drawn as
`wrap={false}` flexbox and has no table model to keep it square.

**`PENDING` in red.** On the colour-code list, a line whose `colourCodeRequired`
is true but whose `colourCode` is null prints `PENDING` in red rather than
blank. That case *is the purpose of the sheet* — a missing band is the finding —
and a blank cell reads as "nothing to do here". The test fixture carries such a
line on purpose.

**`labelWidth` differs per document** (120 on the offer, 85 on tally and colour,
95 on the checklist). It is a fixed point width for the label column of the
reference grid, and it has to clear the longest label on that sheet — the offer
carries `Inspection Location`, the others do not. Too small and the label wraps
under its own value.

**`RefColumn`** is the one piece of shared body: Offer/Ref No., Date, PO Number.
It is structurally typed on the three fields it reads, which is why it accepts
both `InspectionOfferData` and `CriteriaData` without a union.

**Title-bar colours differ by document** — blue `#E8F0FE` for offer and tally,
orange `#FFF3E0` for colour code, green `#E8F5E9` for the checklist. Cosmetic,
but intentional: these come off a printer as a stack and are told apart by the
band.

**The remarks band flips its rule.** It sets `borderBottomWidth: 0` and draws a
top border instead, because the footer immediately below already draws a 2pt top
rule; leaving the band's own bottom rule in place stacks two lines. See the
gotcha below on why it is `borderBottomWidth: 0` and not `borderWidth: 0`.

## Domain notes

- **TPI** — third-party inspection. An independent agency (TÜV, Lloyd's, BV…)
  appointed by the customer. `tpiAgency` is nullable because an offer is often
  raised before the customer names one; the whole TPI panel then drops off the
  letter.
- **Heat number** — identifies the melt of steel a pipe was cast from, and is
  the traceability key back to its mill test certificate. It is monospaced
  (`mono: true`) on all three item tables so a transcription error is visible.
- **Colour coding / banding** — piping is painted with coloured bands so its
  material grade is identifiable on site after the paperwork is gone. Some
  contracts mandate it; the colour-code list is the record of whether each line
  actually got its band.
- **Length tally** — pipe is sold by the metre but arrives in random lengths.
  The inspector measures each piece and tallies the total against the declared
  quantity, by hand, on this sheet.
- **`quantity` vs `quantityReady`** — the ordered quantity and what is actually
  ready to show. They diverge on partial readiness, which is why the offer
  bolds Qty Ready.
- **`sizeLabel`** — a pre-formatted pipe size such as `6" SCH 40` (nominal bore
  and wall schedule). It arrives already rendered; do not attempt to reformat it
  here.

## Gotchas and constraints

- **`OFFER_COLUMNS` totals 96%, not 100%.** 4+15+14+10+12+15+10+10+6. The other
  three arrays total exactly 100. react-pdf has no table model — these are
  flexbox rows with percentage widths — and **nothing type-checks the sum**;
  under 100 leaves a gap before the outer border, over 100 shrinks or overflows
  the row. Check the sum by hand whenever a column is added or a width edited,
  and look at a real render.
- **No rowspan, no colspan, no `border-collapse`.** A cell that spanned columns
  in HTML must become one cell whose width is the sum of theirs (see
  `TotalsRow` in `bordered-doc.tsx`; this file has no totals row). And because
  borders do not collapse, cells paint only their right and bottom edges — the
  container supplies the outer box. Add a left or top border to a cell and it
  renders double-width against its neighbour.
- **`borderWidth: 0` throws at render time.** react-pdf rejects the shorthand
  set to zero. Zero out a specific side instead — `borderBottomWidth: 0`, as the
  remarks band does. This fails only when a PDF is actually rendered, so it
  escapes both type-checking and lint.
- **The route casts the company with `as never`.** `companyInfo` is a Prisma
  `CompanyMaster` row (or the route's `DEFAULT_COMPANY` literal) and does not
  structurally match `InspectionCompany`, so the cast silences the mismatch.
  Rename a column in `companyMaster` and the letterhead field arrives
  `undefined` and simply prints nothing — no compile error, no runtime error, a
  quietly blank address on a document sent to a client.
- **`InfoRow` renders nothing when its value is falsy.** There is no `"-"`
  fallback here, unlike the HTML templates. Combined with `fmtDate` returning
  `""` for an unparseable date, a malformed `proposedInspectionDate` makes the
  whole Proposed Date row vanish rather than printing `Invalid Date` — safe on
  paper, but it means "the field is missing" and "the field is broken" look
  identical.
- **An empty `items` array renders the header row and nothing else.** Valid, and
  covered by the test, but the sheet goes out with an empty grid.
- **`uom` falls back to `"Mtr"`** on the offer and tally when null. Fittings are
  counted in `Nos`; a null UOM on a fittings line prints the wrong unit.
- **Pagination is react-pdf's own flow.** `ItemsTable` marks the header row
  `fixed` so it repeats on the next page, which `<thead>` did for free in HTML.
  The test renders a 70-line tally to exercise that path.
- Changing anything in `bordered-doc.tsx` changes all four of these documents
  *and* the other bordered-form documents at once.

## Related

- `src/lib/pdf/bordered-doc.tsx` — the chrome, the column model and the table.
  Almost every layout question about this file is answered there.
- `src/lib/pdf/primitives.tsx` — only `fmtDate` is used from here.
- `src/app/api/quality/inspection-offers/[id]/pdf/route.tsx` — the sole caller;
  owns the `?type=` switch, the `qualityRequirement` query behind the checklist,
  and the filename.
- `src/app/(dashboard)/quality/inspection-offers/[id]/page.tsx` — the screen
  whose buttons hit that route.
- `src/lib/pdf/inspection-offer-pdf.test.ts` — renders all four for real, plus a
  no-TPI/no-items offer and a 70-line tally. A react-pdf layout fault surfaces
  no other way.
- `docs/code/src/lib/pdf/README.md` — describes the older Chromium/HTML
  pipeline; the mechanics there no longer apply to this file.
