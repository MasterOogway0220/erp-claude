import { describe, expect, it } from "vitest";
import { productKey, uniqueProductNames } from "./product-names";

// The live product master holds "C.S. SEAMLESS PIPE" and "C.S. SEAMLESS PIPE "
// (trailing space); the picker listed both. Case variants behave the same.
describe("product names", () => {
  it("keys ignore case and surrounding spaces", () => {
    expect(productKey(" C.S. Seamless Pipe ")).toBe(productKey("C.S. SEAMLESS PIPE"));
  });

  it("lists each product once, keeping the first spelling, trimmed and sorted", () => {
    expect(
      uniqueProductNames(["C.S. SEAMLESS PIPE", "S.S. SEAMLESS PIPE", "C.S. SEAMLESS PIPE ", "c.s. seamless pipe"])
    ).toEqual(["C.S. SEAMLESS PIPE", "S.S. SEAMLESS PIPE"]);
  });
});
