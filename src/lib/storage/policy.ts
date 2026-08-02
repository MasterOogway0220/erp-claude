// What we do to a file before it goes into the database. Kept free of Prisma
// and sharp so the rules can be tested without a DB or a native image build.

/**
 * Hard ceiling on an upload. The host's wait_timeout is 20s, so a request has
 * to finish inside that; 25 MB is comfortably under it on any usable link and
 * still takes a scanned multi-page MTC.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Longest edge for a stored photo. Inspection shots are evidence, not print art. */
export const IMAGE_MAX_EDGE = 1600;
export const IMAGE_JPEG_QUALITY = 80;

/** Below this, re-encoding an image costs CPU and saves nothing worth having. */
export const IMAGE_DOWNSCALE_MIN_BYTES = 300 * 1024;

const DOWNSCALABLE = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

/**
 * Should this image be re-encoded smaller? Photos off a phone are 3–5 MB and
 * reduce by roughly 90%, which dwarfs anything gzip achieves — measured on the
 * real documents, gzip returns 6–10% on PDFs because they are already
 * compressed internally.
 */
export function shouldDownscale(mimeType: string, size: number): boolean {
  return DOWNSCALABLE.has(mimeType.toLowerCase()) && size > IMAGE_DOWNSCALE_MIN_BYTES;
}

/**
 * Keep the compressed copy only when it actually wins. Gzipping an already
 * compressed container (PDF, xlsx, JPEG) can come out *larger*, and storing
 * that would cost space and CPU to undo.
 */
export function pickSmaller(
  raw: Buffer,
  compressed: Buffer
): { data: Buffer; gzipped: boolean } {
  return compressed.length < raw.length
    ? { data: compressed, gzipped: true }
    : { data: raw, gzipped: false };
}

/** Reject before reading the body into memory where possible. */
export function tooLarge(size: number): boolean {
  return size > MAX_UPLOAD_BYTES;
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
