# src/lib/pdf/inspection-offer-template.ts

> The inspection offer sent to a third-party inspection agency, inviting them
> to witness.

See [README.md](./README.md) for the shared pattern.

## Why this exists

Where a client requires third-party inspection, material cannot ship until a
TPI agency has witnessed and released it. The offer is the formal invitation:
material is ready, here is what and how much, here is where and when.

## What it does

HTML for the offer: PO and client references, item details, quantity ready,
inspection location, proposed date and the TPI agency — plus the supporting
lists the agency works from.

## How it works

Beyond the header and items, the document carries what the order processing
flow specifies:

- **Length tally list** — every individual pipe with its length. An inspector
  physically counts and measures against it.
- **Colour code compliance** — the client's colour marking scheme, confirming
  material is marked correctly.
- **Inspection criteria** — what is being checked.

The heat-level detail comes from `InspectionOfferItemHeat`, tying each offered
item back to specific heats and their certificates.

## Domain notes

- **TPI** — Third Party Inspection. Lloyd's, BV, TUV, SGS. Nominated by the
  client, independent of both parties.
- **Length tally** — pipe is supplied in random lengths, so a 100 m order is
  some number of pieces of varying length. The tally is the piece-by-piece
  record; total metres must reconcile.
- **Colour coding** — painted bands identifying grade or heat, so material
  cannot be confused on site. Client-specified.
- **Heat number** — identifies the batch of molten steel an item came from, and
  is the link to its MTC.

## Gotchas and constraints

- Generated from the warehouse intimation once material is prepared, so it
  depends on the MPR being complete.
- Quantity ready may be less than ordered — partial inspection is normal.
- The proposed date is a proposal; the agency confirms separately, and nothing
  models that confirmation.

## Related

- `src/lib/quality/qap.ts` — `qapToOfferPrefill`.
- `src/app/api/warehouse/intimation/[id]/generate-inspection-offer/route.ts`
- `src/app/api/quality/inspection-offers/[id]/pdf/route.tsx`
- `prisma/schema.prisma` → `InspectionOffer`, `InspectionOfferItemHeat`.
