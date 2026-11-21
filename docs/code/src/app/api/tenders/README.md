# src/app/api/tenders/ — tenders

See [the API pattern](../README.md) for the conventions every route follows.

Tender records. **Tenders share the quotation number series**, so they appear in the quotation listing and draw from the same `DocumentSequence` counter — `PREFIXES.TENDER` exists but is unused.

A tender can be converted into a quotation, carrying its items across (`sourceTenderId` preserves the link through revisions).

A client PO can be registered against a tender: [`for-client`](./for-client/route.ts.md) lists a client's orderable tenders, and [`[id]/order-quotation`](./[id]/order-quotation/route.ts.md) returns the quotation the PO is registered against, building it from the tender the first time.

Tender documents upload to the database; this route previously wrote to a read-only filesystem and threw.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
