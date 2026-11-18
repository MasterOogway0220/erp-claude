import { describe, it, expect } from "vitest";
import { isStaleBuildError } from "./stale-build";

describe("isStaleBuildError", () => {
  it("recognises missing-chunk errors from each browser and bundler", () => {
    expect(isStaleBuildError({ name: "ChunkLoadError", message: "x" })).toBe(true);
    expect(isStaleBuildError({ message: "Loading chunk 4521 failed." })).toBe(true);
    expect(isStaleBuildError({ message: "Loading CSS chunk app-layout failed" })).toBe(true);
    expect(isStaleBuildError({ message: "Failed to fetch dynamically imported module: https://x/_next/a.js" })).toBe(true);
    expect(isStaleBuildError({ message: "Importing a module script failed." })).toBe(true);
    expect(isStaleBuildError({ message: "error loading dynamically imported module" })).toBe(true);
  });

  it("leaves ordinary errors alone, so a real bug is never reload-looped", () => {
    expect(isStaleBuildError({ message: "Cannot read properties of undefined" })).toBe(false);
    expect(isStaleBuildError({ name: "TypeError", message: "Failed to fetch" })).toBe(false);
    expect(isStaleBuildError({})).toBe(false);
  });
});
