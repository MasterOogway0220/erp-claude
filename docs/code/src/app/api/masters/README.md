# src/app/api/masters/ — reference data endpoints

51 files, the largest module. Customers, vendors, products, sizes, employees,
warehouses, terms, and the smaller lookup tables.

See [the API pattern](../README.md) for shared conventions.

## Two kinds of master, scoped differently

This is the thing to understand before touching any route here.

**Company-scoped** — customers, vendors, employees, warehouses, buyers,
dispatch addresses, terms. Each of the three companies has its own.
`companyFilter(companyId)` applies.

**Global catalogue** — products, sizes, additional specs, dimensional
standards, material codes, UOM, testing types. **Deliberately not scoped.** The
physical steel is identical whichever entity sells it, and the test user
belongs to a different company from the live data, so scoping these would empty
their dropdowns. The affected routes carry a comment saying so.

Adding a `companyFilter` to a catalogue route looks like a bug fix and is a
regression.

## Soft delete

Masters are never hard-deleted — historical documents reference them and must
keep rendering. `DELETE` sets `deletedAt` via `softDeleteData()`, and reads
must spread `notDeleted`. Nothing enforces that; a query missing it shows
deleted masters in a live dropdown.

Several routes check for references before allowing a delete.

## Where the catalogue actually comes from

`ProductSpecMaster` (3,557 rows) and `SizeMaster` (344) are **loaded from the
client's Excel by `scripts/seed-new-masters.ts`**, not entered through these
screens. The UI edits are for corrections and additions; a reload wipes and
replaces everything except rows a user hand-entered (identified by carrying a
size, specification, grade or length).

Read `src/lib/masters/spec-import.ts` before touching anything that imports
these files — the spreadsheets are sectioned column pools, and reading them
row-wise silently corrupts the master.

## Notable routes

| Route | Note |
|---|---|
| `products/route.ts` | The catalogue. `limit` must cover all 3,557 rows — the dropdown fetch asks for 20,000 and checks the returned total. |
| `additional-specs/route.ts` | Global. Its POST used to be unreachable because the panel required a product the form never set. |
| `customers/[id]/dispatch-addresses/` | Ship-to sites; drives place of supply and therefore the GST split. |
| `customers/[id]/terms/` | Customer-specific terms, overriding the global templates. |
| `sizes/route.ts` | Pipes only. Fitting and flange sizes are build-time constants. |
| `employees/` | `moduleAccess` is a JSON array in a text column — parse with `parseModuleAccess`. |

## Gotchas

- **`VendorMaster` has no `code` field.** Recurring wrong assumption.
- **Mutating products or additional specs requires calling
  `invalidateProductCache()`** on the client, or the change stays invisible
  until a full reload.
- Uniqueness is enforced by database constraints in places; a P2002 is turned
  into a readable message.

## Related

- `scripts/seed-new-masters.ts`, `src/lib/masters/spec-import.ts`
- `src/lib/soft-delete.ts`, `src/lib/rbac.ts`
- `src/components/shared/product-material-select.tsx`
