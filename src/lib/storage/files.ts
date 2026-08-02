import { gunzipSync, gzipSync } from "node:zlib";
import { prisma } from "@/lib/prisma";
import {
  IMAGE_JPEG_QUALITY,
  IMAGE_MAX_EDGE,
  humanSize,
  MAX_UPLOAD_BYTES,
  pickSmaller,
  shouldDownscale,
  tooLarge,
} from "./policy";

export interface StoredFileRef {
  id: string;
  /** What callers persist in their own filePath/documentPath columns. */
  filePath: string;
  fileName: string;
  mimeType: string;
  originalSize: number;
  size: number;
}

/** The URL a stored file is served from. Callers store this string verbatim. */
export function filePathFor(id: string): string {
  return `/api/files/${id}`;
}

/** Pull the id back out of a stored path, for deletes and re-reads. */
export function fileIdFromPath(filePath: string | null | undefined): string | null {
  const m = (filePath ?? "").match(/^\/api\/files\/([A-Za-z0-9_-]+)$/);
  return m ? m[1] : null;
}

async function downscale(buf: Buffer, mimeType: string): Promise<Buffer> {
  try {
    // sharp ships with Next.js for image optimisation, so this adds no download.
    const sharp = (await import("sharp")).default;
    return await sharp(buf)
      .rotate() // honour EXIF orientation before dropping the metadata
      .resize({ width: IMAGE_MAX_EDGE, height: IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: IMAGE_JPEG_QUALITY })
      .toBuffer();
  } catch (err) {
    // A corrupt or exotic image must still be storable — keep the original
    // rather than failing the upload over an optimisation.
    console.error("[storage] image downscale skipped:", err);
    return buf;
  }
}

/**
 * Put a file in the database. Images are re-encoded down first (that is where
 * the real savings are), then the result is gzipped only if that comes out
 * smaller — PDFs and xlsx are already compressed and often grow.
 */
export async function storeFile(
  file: File,
  meta: { uploadedById?: string | null; companyId?: string | null } = {}
): Promise<StoredFileRef> {
  if (tooLarge(file.size)) {
    throw new Error(
      `File is ${humanSize(file.size)} — the limit is ${humanSize(MAX_UPLOAD_BYTES)}.`
    );
  }

  const original = Buffer.from(await file.arrayBuffer());
  // file.size can be absent or wrong on some clients; the real buffer is truth.
  if (tooLarge(original.length)) {
    throw new Error(
      `File is ${humanSize(original.length)} — the limit is ${humanSize(MAX_UPLOAD_BYTES)}.`
    );
  }

  const mimeType = file.type || "application/octet-stream";
  const reduced = shouldDownscale(mimeType, original.length)
    ? await downscale(original, mimeType)
    : original;

  // If downscaling made it bigger (tiny PNGs can), keep the original.
  const best = reduced.length < original.length ? reduced : original;
  const storedMime = best === reduced && reduced !== original ? "image/jpeg" : mimeType;

  const { data, gzipped } = pickSmaller(best, gzipSync(best, { level: 9 }));

  const row = await prisma.storedFile.create({
    data: {
      fileName: file.name || "upload",
      mimeType: storedMime,
      originalSize: original.length,
      size: data.length,
      gzipped,
      // Prisma's Bytes wants a plain Uint8Array; Buffer's ArrayBufferLike
      // doesn't satisfy it under this TS config.
      data: new Uint8Array(data),
      uploadedById: meta.uploadedById ?? null,
      companyId: meta.companyId ?? null,
    },
    select: { id: true, fileName: true, mimeType: true, originalSize: true, size: true },
  });

  return { ...row, filePath: filePathFor(row.id) };
}

/** Read a file back, transparently un-gzipping. */
export async function readStoredFile(id: string) {
  const row = await prisma.storedFile.findUnique({ where: { id } });
  if (!row) return null;
  const data = row.gzipped ? gunzipSync(Buffer.from(row.data)) : Buffer.from(row.data);
  return { fileName: row.fileName, mimeType: row.mimeType, data };
}

/** Best-effort cleanup — a missing row is not an error worth surfacing. */
export async function deleteStoredFile(filePath: string | null | undefined) {
  const id = fileIdFromPath(filePath);
  if (!id) return;
  await prisma.storedFile.delete({ where: { id } }).catch(() => {});
}
