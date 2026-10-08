import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The exported `prisma` is the sandbox router (see ./router.ts), and the
 * router throws on the array form `prisma.$transaction([...])` for every user,
 * sandbox or not. One remaining caller (the order-processing save) failed with
 * "Failed to save processing data" for everyone from the sandbox deploy on
 * 2026-09-24. This scan keeps the array form out of the app.
 */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe("no array-form $transaction", () => {
  it("every $transaction call uses the callback form", () => {
    const src = path.resolve(__dirname, "../..");
    const offenders = files(src)
      .map((f) => path.relative(src, f).split(path.sep).join("/"))
      // The router names the array form in its own error message.
      .filter((rel) => rel !== "lib/sandbox/router.ts")
      .filter((rel) => {
        const text = readFileSync(path.join(src, rel), "utf8");
        // `$transaction(` followed by anything other than an async callback.
        return /\$transaction\((?!\s*(?:async\b|\(\s*tx\b))/.test(text);
      });
    expect(offenders).toEqual([]);
  });
});
