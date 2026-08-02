# src/app/(dashboard)/quality/ — quality screens

Inspections, inspection prep and offers, QC release, NCRs, lab letters and reports, MTC certificates and material specs, quality requirements.

31 files — the largest module after masters, because certifying material is most of what the business does beyond moving it.

Uploads (inspection images, lab reports, MTC documents) now go to the database; they were previously written to a filesystem Vercel wipes.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/quality/README.md)
- `src/components/shared/`
