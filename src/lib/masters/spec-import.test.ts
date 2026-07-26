// Count-locked against the "new master" files. If the client ships revised
// files, re-verify the layout assumptions (sectioned pools!) and update counts.
import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  parsePipeSizes,
  parsePipeSpecs,
  parseSectioned,
  toProductSpecPairs,
} from "./spec-import";

const f = (name: string) => path.join(__dirname, "../../../new master", name);

describe("pipe sizes", () => {
  it("parses CS/AS and SS/DS with decimal labels", () => {
    const cs = parsePipeSizes(f("PIPES SIZE MASTER CS & AS PIPES.xlsx"));
    const ss = parsePipeSizes(f("PIPES SIZE MASTER SS & DS PIPES.xlsx"));
    expect(cs).toHaveLength(191);
    expect(ss).toHaveLength(153);
    // new files renamed 1/2" -> 0.5", 3/4" -> 0.75"
    expect(cs.some((r) => r.sizeLabel.includes("/"))).toBe(false);
    expect(cs[0]).toMatchObject({ sizeLabel: '0.5"NB X SCH 10', od: 21.3, nps: 0.5, schedule: "SCH 10" });
  });
});

describe("pipe specs", () => {
  it("parses row-wise with '-' dimension as null", () => {
    const rows = parsePipeSpecs(f("PRODUCT SPEC MASTER - PIPES.xlsx"));
    expect(rows).toHaveLength(263);
    expect(new Set(rows.map((r) => r.product)).size).toBe(12);
    expect(new Set(rows.map((r) => `${r.product}§${r.material}`)).size).toBe(263); // no dups
    expect(rows.filter((r) => r.dimStandard === null)).toHaveLength(3); // IS-standard ERW
  });
});

describe("sectioned fitting/flange files", () => {
  it("BW: 4 sections, 36 products, 74 specs, 668 pairs", () => {
    const file = parseSectioned(f("PRODUCT SPEC MASTER - BW FITTING.xlsx"));
    expect(file.sections).toHaveLength(4);
    expect(file.sections.map((s) => s.products.length)).toEqual([8, 8, 10, 10]);
    expect(file.sections.map((s) => s.specs.length)).toEqual([14, 22, 30, 8]);
    expect(file.ends).toBe("BW");
    expect(toProductSpecPairs(file)).toHaveLength(668);
  });

  it("SW: 4 sections, 40 products, 660 pairs", () => {
    const file = parseSectioned(f("PRODUCT SPEC MASTER - SW FITTING.xlsx"));
    expect(file.sections).toHaveLength(4);
    expect(file.sections.map((s) => s.products.length)).toEqual([10, 10, 10, 10]);
    expect(file.ends).toBe("SW");
    expect(toProductSpecPairs(file)).toHaveLength(660);
  });

  it("THRD: repeated products dedupe to 858 pairs", () => {
    const file = parseSectioned(f("PRODUCT SPEC MASTER - THRD FITTING.xlsx"));
    const pairs = toProductSpecPairs(file);
    expect(new Set(pairs.map((p) => p.product)).size).toBe(52);
    expect(file.ends).toBe("NPT");
    expect(pairs).toHaveLength(858);
  });

  it("FLANGE (1): 4 sections, 24 products, 66 specs, 396 pairs, 302 sizes/3 dims", () => {
    const file = parseSectioned(f("PRODUCT SPEC MASTER - FLANGE (1).xlsx"));
    expect(file.sections).toHaveLength(4);
    expect(file.sections.map((s) => s.products.length)).toEqual([6, 6, 6, 6]);
    expect(file.sections.map((s) => s.specs.length)).toEqual([6, 30, 22, 8]);
    expect(toProductSpecPairs(file)).toHaveLength(396);
    const sizes = file.sections.flatMap((s) => s.sizes);
    expect(sizes).toHaveLength(302);
    expect(new Set(sizes.map((z) => z.dim))).toEqual(
      new Set(["ASME B16.5", "ASME B16.47 Sr. A", "ASME B16.47 Sr. B"])
    );
  });
});
