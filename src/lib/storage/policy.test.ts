import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  IMAGE_DOWNSCALE_MIN_BYTES,
  MAX_UPLOAD_BYTES,
  humanSize,
  pickSmaller,
  shouldDownscale,
  tooLarge,
} from "./policy";

describe("pickSmaller", () => {
  it("keeps the compressed copy when it actually wins", () => {
    // Text-ish payloads are where gzip pays: the sample HTML measured 76%.
    const raw = Buffer.from("<html>" + "a".repeat(5000) + "</html>");
    const out = pickSmaller(raw, gzipSync(raw));
    expect(out.gzipped).toBe(true);
    expect(out.data.length).toBeLessThan(raw.length);
  });

  it("keeps the original when compressing makes it bigger", () => {
    // Already-compressed containers (PDF, xlsx, JPEG) can grow under gzip.
    // Storing the larger copy would cost space AND CPU to undo.
    const raw = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const out = pickSmaller(raw, gzipSync(raw));
    expect(out.gzipped).toBe(false);
    expect(out.data).toBe(raw);
  });

  it("does not compress on a tie", () => {
    const raw = Buffer.alloc(10, 7);
    expect(pickSmaller(raw, Buffer.alloc(10, 1)).gzipped).toBe(false);
  });
});

describe("shouldDownscale", () => {
  const big = IMAGE_DOWNSCALE_MIN_BYTES + 1;

  it("re-encodes big photos — the only change that meaningfully shrinks storage", () => {
    for (const m of ["image/jpeg", "image/png", "image/webp", "IMAGE/JPEG"]) {
      expect(shouldDownscale(m, big)).toBe(true);
    }
  });

  it("leaves documents alone", () => {
    expect(shouldDownscale("application/pdf", big)).toBe(false);
    expect(shouldDownscale("application/vnd.ms-excel", big)).toBe(false);
    // An SVG is markup — re-encoding it to JPEG would destroy it.
    expect(shouldDownscale("image/svg+xml", big)).toBe(false);
  });

  it("leaves small images alone — re-encoding costs CPU and saves nothing", () => {
    expect(shouldDownscale("image/jpeg", IMAGE_DOWNSCALE_MIN_BYTES)).toBe(false);
  });
});

describe("tooLarge", () => {
  it("allows exactly the cap and rejects past it", () => {
    expect(tooLarge(MAX_UPLOAD_BYTES)).toBe(false);
    expect(tooLarge(MAX_UPLOAD_BYTES + 1)).toBe(true);
  });
});

describe("humanSize", () => {
  it("reads sensibly in an error message", () => {
    expect(humanSize(512)).toBe("512 B");
    expect(humanSize(2048)).toBe("2 KB");
    expect(humanSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
