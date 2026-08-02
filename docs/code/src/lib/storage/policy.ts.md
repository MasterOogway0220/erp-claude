# src/lib/storage/policy.ts

> The rules for what happens to an uploaded file before it is written to the
> database — size cap, image downscaling, and when compression is worth it.

## Why this exists

Two reasons, one structural and one evidential.

**Structural:** `files.ts` needs Prisma and `sharp` to do its job. Neither can
run in a plain unit test — Prisma needs a live MariaDB connection and `sharp`
is a native binary. If the rules lived in that file they would be untestable,
and these are exactly the rules that must not silently drift: a wrong size cap
means uploads hang, a wrong compression decision means the database grows
faster than anyone notices. Splitting the pure decisions out means
`policy.test.ts` can exercise every branch with no infrastructure at all.

**Evidential:** the constants here encode measurements, not guesses. They were
chosen against the client's real documents and this specific host. A future
developer who changes `IMAGE_DOWNSCALE_MIN_BYTES` to 50 KB because it "seems
low" should be able to see why 300 KB was picked.

## What it does

Exports constants and three predicates. No side effects, no I/O.

| Export | Meaning |
|---|---|
| `MAX_UPLOAD_BYTES` | 25 MB. Hard ceiling on any single upload. |
| `IMAGE_MAX_EDGE` | 1600 px. Longest edge a stored photo is reduced to. |
| `IMAGE_JPEG_QUALITY` | 80. Re-encode quality for downscaled images. |
| `IMAGE_DOWNSCALE_MIN_BYTES` | 300 KB. Below this, images are stored as-is. |
| `shouldDownscale(mimeType, size)` | Is this an image big enough to be worth re-encoding? |
| `pickSmaller(raw, compressed)` | Returns `{ data, gzipped }` — whichever buffer is actually smaller. |
| `tooLarge(size)` | Is this over the cap? |
| `humanSize(bytes)` | `"5.0 MB"` — for error messages a user reads. |

## How it works

### `shouldDownscale`

Two conditions, both required. The mime type must be in a small allowlist
(`image/jpeg`, `image/jpg`, `image/png`, `image/webp`), and the file must be
over `IMAGE_DOWNSCALE_MIN_BYTES`.

The allowlist matters more than it looks. It is an allowlist rather than a
`startsWith("image/")` check specifically so that **SVG is excluded**: an SVG
is XML, and running it through a JPEG re-encoder would destroy it — you would
get a rasterised, lossy version of what was a scalable vector. `image/gif` is
likewise absent; re-encoding an animation to JPEG keeps one frame.

The size floor exists because re-encoding costs CPU on every upload. A 40 KB
thumbnail re-encoded at 1600px may well come out *larger* than it went in, and
you have burned a `sharp` invocation to achieve that.

The comparison is `>` not `>=`, so a file exactly at the threshold is left
alone. That is arbitrary but tested, so it will not drift.

### `pickSmaller`

Returns whichever buffer is shorter, flagged. The comparison is strict `<`, so
a tie keeps the original — compressing for zero gain would only add CPU cost on
every subsequent read.

This function exists because of a measurement. Gzip is usually assumed to be
free savings, but on the file types this ERP actually stores it is close to
worthless, and occasionally negative:

| File | Original | Gzipped | Saved |
|---|---|---|---|
| `MTC-SAMPLE.pdf` | 413,507 B | 389,136 B | 5.9% |
| `MTC-SAMPLE.xlsx` | 137,572 B | 127,500 B | 7.3% |
| `Standard quotation.pdf` | 36,343 B | 32,562 B | 10.4% |
| `PIPE FLOW.pdf` | 302,738 B | 197,221 B | 34.9% |
| `ERP-Quotation-NPS.html` | 46,361 B | 11,228 B | 75.8% |

PDFs contain already-compressed image and font streams; an `.xlsx` is literally
a ZIP archive. Gzipping them a second time achieves single digits and can
expand small files past their original size, because gzip adds a header and
its own framing. Only the text-shaped payload (HTML) pays out properly.

So compression is applied opportunistically rather than always, and the flag is
stored per row (`StoredFile.gzipped`) so reads know whether to inflate.

### The real saving

Compression is not where the space is won. Downscaling is. A 4000×3000 photo
off a phone measured **10.02 MB → 672 KB, a 93.6% reduction**, versus gzip's
~6% on the same class of file. That is the entire justification for pulling
`sharp` into the upload path.

## Domain notes

The files this ERP stores are overwhelmingly **MTCs** (Mill Test Certificates —
the mill's document certifying a heat of steel's chemical and mechanical
properties, supplied to the client as proof of material provenance) and
inspection photographs. MTCs arrive as scanned PDFs. Inspection photographs
come off phones at whatever resolution the camera defaults to. Those two file
types drive every constant in this file.

## Gotchas and constraints

- **The 25 MB cap is tied to the host, not to taste.** The MariaDB instance on
  Hostinger has `wait_timeout = 20` seconds — it closes an idle connection
  after 20s. An upload has to be received, processed and written inside that.
  25 MB is comfortable on any usable link; raising it materially risks the
  write landing on a dropped connection. Note this is *not* a packet-size
  limit: `max_allowed_packet` on this host is 1 GB, so the constraint is time,
  not size.
- **Changing `IMAGE_MAX_EDGE` does not re-process stored files.** Existing rows
  keep whatever dimensions they were written at. There is no backfill.
- **Downscaling is lossy and irreversible.** The original bytes are not kept.
  This is fine for inspection evidence and deliberately wrong for anything
  requiring a pixel-exact original — if such a case appears, it needs a bypass
  flag, not a threshold change.
- Every non-image path is byte-exact. Verified against the live database: PDF,
  xlsx and HTML all round-trip identical.

## Related

- `src/lib/storage/files.ts` — applies these rules; owns Prisma and `sharp`.
- `src/lib/storage/policy.test.ts` — the tests; the tie case and the SVG
  exclusion are both pinned there.
- `src/app/api/upload/route.ts` — the generic upload endpoint.
- `prisma/migrations/20260802140000_add_stored_file/migration.sql` — creates
  the table these rules write into.
