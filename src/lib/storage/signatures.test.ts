import { describe, it, expect } from "vitest";
import { matchesSignature } from "./signatures";

const bytes = (...b: number[]) => Buffer.from(b);

describe("matchesSignature", () => {
  it("accepts a PDF only when it starts with %PDF", () => {
    expect(matchesSignature("application/pdf", Buffer.from("%PDF-1.7 rest"))).toBe(true);
    expect(matchesSignature("application/pdf", Buffer.from("<html>"))).toBe(false);
  });

  it("rejects HTML and SVG even when the bytes look like text", () => {
    expect(matchesSignature("text/html", Buffer.from("<script>x</script>"))).toBe(false);
    expect(matchesSignature("image/svg+xml", Buffer.from("<svg></svg>"))).toBe(false);
  });

  it("checks a JPEG and a PNG by their leading bytes", () => {
    expect(matchesSignature("image/jpeg", bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(matchesSignature("image/png", bytes(0x89, 0x50, 0x4e, 0x47))).toBe(true);
    expect(matchesSignature("image/png", bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(false);
  });

  it("treats xlsx and docx as zip containers", () => {
    const zip = bytes(0x50, 0x4b, 0x03, 0x04);
    expect(matchesSignature("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", zip)).toBe(true);
    expect(matchesSignature("application/vnd.openxmlformats-officedocument.wordprocessingml.document", zip)).toBe(true);
  });

  it("refuses an unknown type even with a valid-looking body", () => {
    expect(matchesSignature("application/octet-stream", Buffer.from("%PDF"))).toBe(false);
  });
});
