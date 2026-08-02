# src/lib/pdf/packing-list-template.ts

> The packing list that travels with a consignment.

See [README.md](./README.md) for the shared pattern.

## Why this exists

Whoever receives the material needs to check what physically arrived against
what was sent, without reference to the commercial paperwork. A packing list
carries quantities, package marks and weights — and deliberately no prices, so
it can be handed to a transporter or shown at a gate.

## What it does

HTML listing packed items with quantities, package details, and gross/net
weights.

## How it works

Straightforward table over the packing list's items. The weights matter for
transport booking and, on exports, for customs.

## Domain notes

- **Gross vs net weight** — net is the material, gross includes packing.
  Transporters charge on gross; the invoice values net.
- **Heat numbers** may appear per item, tying the physical pipe back to its
  mill certificate. This is what makes traceability work in the field: a length
  of pipe on site can be traced to its MTC through the heat number stamped on
  it.
- The packing list is part of the dispatch dossier compiled for the client.

## Gotchas and constraints

- **No prices, deliberately.** It goes to parties who should not see
  commercial terms.
- Weights come from the packing record, not recomputed from
  `weight-calculation.ts` — that computes nominal weight, this reports actual.

## Related

- `prisma/schema.prisma` → `PackingList`, `PackingListItem`.
- `src/app/api/dispatch/dispatch-notes/[id]/dossier/route.tsx` — includes it.
