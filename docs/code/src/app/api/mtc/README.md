# src/app/api/mtc/ — mill test certificates

See [the API pattern](../README.md) for the conventions every route follows.

Issuing MTCs to clients. `MTCMaterialSpec` declares which chemical elements and mechanical properties apply to a grade and their permitted ranges; `MTCCertificate` records measured results per heat against that spec, so an out-of-range value is detectable rather than merely stored.

An MTC is issued against a heat, and one certificate can cover many items sharing that heat. This is the document a client keeps as proof of material provenance.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
