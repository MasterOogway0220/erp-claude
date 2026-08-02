# src/lib/storage/files.ts

> Stores uploaded documents as rows in the database and reads them back —
> the single write path for every file in the ERP.

## Why this exists

Because before it, **every upload in the application was silently lost.**

The app runs on Vercel. Vercel's filesystem is read-only at runtime apart from
`/tmp`, and `/tmp` is wiped whenever the serverless function freezes. Three
routes were writing to disk:

- `/api/upload` wrote to `/tmp/uploads` and returned a URL of the form
  `/uploads/<name>`. The write appeared to succeed; the bytes vanished when the
  function froze; and nothing ever served `/uploads/...` anyway, because there
  is no `public/uploads` directory and no rewrite. So the URL 404'd even in the
  window where the file still existed.
- `/api/tenders/[id]/documents` and
  `/api/purchase/supplier-quotations/[id]/documents` wrote under
  `process.cwd()/public/uploads/...`, which is read-only. Those threw outright.

The visible symptom was zero: QAP documents, inspection photographs, lab
reports and tender attachments all reported success and were gone. This
mattered well beyond the upload screens, because the dispatch dossier — the
single compiled PDF handed to the client — is assembled from exactly those
stored documents.

The fix could have been an object store (S3, Vercel Blob). It is the database
instead, because the numbers did not justify a new dependency: the whole
database is **11.77 MB across 112 tables**, and `max_allowed_packet` on this
host is **1 GB**. There was nothing to solve.

## What it does

| Export | Purpose |
|---|---|
| `storeFile(file, meta?)` | Takes a web `File`, returns `StoredFileRef` with `filePath`. Throws on oversize. |
| `readStoredFile(id)` | Returns `{ fileName, mimeType, data }` or `null`. Inflates transparently. |
| `deleteStoredFile(filePath)` | Best-effort delete by path. Never throws. |
| `filePathFor(id)` | `id` → `/api/files/<id>`. |
| `fileIdFromPath(path)` | The inverse, or `null` if the path is not one of ours. |

Re-exports everything from `./policy`, so callers need one import.

### The contract that made this cheap

`storeFile` returns `filePath` as `/api/files/<id>`, and every caller stores
that string in whatever column it already had — `qapDocumentPath`,
`TenderDocument.filePath`, `POAcceptance.signedCopyPath`. Because the shape of
the response did not change, **none of the ten existing upload call sites
needed editing**. Only where the bytes live changed. Preserve this if you
refactor: it is the reason the migration was a small diff instead of a large
one.

## How it works

### Writing

1. **Reject oversize twice.** Once on `file.size`, then again on the real
   buffer length. `file.size` is client-reported and can be absent or wrong;
   the buffer is the truth. Cheap check first so a hostile client is refused
   before the body is materialised.
2. **Downscale if it is a big image** (see `policy.ts`). Via a dynamic
   `await import("sharp")` — dynamic so the native binary is only loaded on
   upload paths, not on every module that transitively imports this file.
   `.rotate()` is called first with no argument, which applies the EXIF
   orientation tag before the metadata is dropped; without it, photos taken in
   portrait on a phone store rotated 90°.
3. **Keep the smaller of original and downscaled.** A small PNG can grow when
   re-encoded to JPEG. The stored mime type only becomes `image/jpeg` if the
   re-encoded version actually won — otherwise the original bytes and original
   mime type are kept together, which matters because they must agree.
4. **Gzip only if that wins** (`pickSmaller`).
5. **Insert**, storing both `originalSize` (what the user sent, for display)
   and `size` (what the row costs, for capacity planning).

### Reading

`readStoredFile` inflates when `gzipped` is set. Callers never see the
compression; it is purely a storage detail.

### Failure behaviour

`downscale` catches its own errors and returns the original buffer. A corrupt
or exotic image must still be storable — losing an upload because an
*optimisation* failed would reintroduce the exact class of bug this file was
written to fix. The failure is logged, not raised.

`deleteStoredFile` swallows a missing row. Deleting something already gone is
not a condition worth surfacing to a user.

## Domain notes

None specific — this is infrastructure. The documents flowing through it are
described in `policy.ts`.

## Gotchas and constraints

- **`Bytes` needs a plain `Uint8Array`.** Prisma's `Bytes` field will not
  accept a Node `Buffer` under this TypeScript config —
  `Buffer<ArrayBufferLike>` is not assignable to `Uint8Array<ArrayBuffer>`.
  Hence `new Uint8Array(data)` at the insert. Passing a `Buffer` fails to
  compile, so this cannot break silently.
- **`sharp` is declared in `package.json` but ships with Next.js anyway.** It
  is used for image optimisation by the framework. It is declared explicitly
  because this file imports it directly; relying on a transitive hoist would be
  fragile. It costs no extra download.
- **Reads pull the whole blob into function memory.** Fine at the 25 MB cap;
  it would not be fine if the cap were raised substantially. There is no
  streaming path.
- **No orphan cleanup.** If a caller stores a file and then fails to persist
  the returned `filePath`, the row is unreferenced forever. Nothing sweeps
  these. At current volumes that is not worth building; if uploads become
  frequent it will be.
- **No deduplication.** The same MTC attached to two orders is stored twice.
  Deliberate: content-hash dedup adds a lookup on every write and a reference
  count on every delete, for a saving that does not exist yet.

## Related

- `src/lib/storage/policy.ts` — the rules; read that first.
- `src/app/api/files/[id]/route.ts` — serves what this writes, behind auth.
- `src/app/api/upload/route.ts` — the generic endpoint.
- `src/app/api/tenders/[id]/documents/route.ts`,
  `src/app/api/purchase/supplier-quotations/[id]/documents/route.ts` — the two
  routes that were throwing on a read-only filesystem.
- `prisma/schema.prisma` → `StoredFile`.
