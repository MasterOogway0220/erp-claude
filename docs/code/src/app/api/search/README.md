# src/app/api/search/ — global search

See [the API pattern](../README.md) for the conventions every route follows.

Cross-document search for the topbar. Staff work from document numbers, and being handed `NPS/26/15213` on a phone call should not require guessing the module.

Matches document numbers and names, not line-item contents. Company-scoped.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
