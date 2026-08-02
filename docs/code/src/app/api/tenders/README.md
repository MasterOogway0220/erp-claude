# src/app/api/tenders/ — tenders

See [the API pattern](../README.md) for the conventions every route follows.

Tender records. **Tenders share the quotation number series**, so they appear in the quotation listing and draw from the same `DocumentSequence` counter — `PREFIXES.TENDER` exists but is unused.

A tender can be converted into a quotation, carrying its items across (`sourceTenderId` preserves the link through revisions).

Tender documents upload to the database; this route previously wrote to a read-only filesystem and threw.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
