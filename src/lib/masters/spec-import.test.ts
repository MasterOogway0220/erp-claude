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
import { FLANGE_SIZES, getFlangeSizeOptions } from "../fitting-flange-sizes";

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

  // Replaced July 2026: the client's B16.5-only master. Unlike the previous
  // flange file it splits each material class into three sections by flange
  // TYPE, because only bored types (weld neck / socket weld / slip on) carry a
  // schedule in their size.
  it("FLANGE B16.5: 12 sections, 24 products, 396 pairs, B16.5 throughout", () => {
    const file = parseSectioned(f("PRODUCT SPEC MASTER - FLANGE B16.5.xlsx"));
    expect(file.sections).toHaveLength(12);
    expect(file.sections.map((s) => s.products.length)).toEqual([3, 2, 1, 3, 2, 1, 3, 2, 1, 3, 2, 1]);
    expect(file.sections.map((s) => s.specs.length)).toEqual([6, 6, 6, 22, 22, 22, 30, 30, 30, 8, 8, 8]);
    const pairs = toProductSpecPairs(file);
    expect(pairs).toHaveLength(396);
    expect(new Set(pairs.map((p) => p.product)).size).toBe(24);
    const sizes = file.sections.flatMap((s) => s.sizes);
    expect(new Set(sizes.map((z) => z.dim))).toEqual(new Set(["ASME B16.5"]));
    // Bored sections carry a schedule; blind/lap-joint and threaded do not.
    expect(file.sections[0].sizes.every((z) => /SCH/.test(z.label))).toBe(true);
    expect(file.sections[1].sizes.some((z) => /SCH/.test(z.label))).toBe(false);
    expect(file.sections[2].sizes.some((z) => /SCH/.test(z.label))).toBe(false);
  });
});

describe("flange size pools", () => {
  it("routes each flange type to the pool that matches its size format", () => {
    // Guards the generated FLANGE_SIZES split — a mis-routed product would
    // offer schedule-bearing sizes for a blind flange, or none at all.
    expect(getFlangeSizeOptions("C.S. FLANGE, WELD NECK")).toBe(FLANGE_SIZES.BORED_CS_AS);
    expect(getFlangeSizeOptions("A.S. FLANGE, SLIP ON")).toBe(FLANGE_SIZES.BORED_CS_AS);
    expect(getFlangeSizeOptions("S.S. FLANGE, SOCKET WELD")).toBe(FLANGE_SIZES.BORED_SS_DS);
    expect(getFlangeSizeOptions("D.S. FLANGE, WELD NECK")).toBe(FLANGE_SIZES.BORED_SS_DS);
    expect(getFlangeSizeOptions("C.S. FLANGE, BLIND")).toBe(FLANGE_SIZES.PLAIN);
    expect(getFlangeSizeOptions("S.S. FLANGE, LAP JOINT")).toBe(FLANGE_SIZES.PLAIN);
    expect(getFlangeSizeOptions("A.S. FLANGE, THREADED")).toBe(FLANGE_SIZES.THREADED);
    expect(FLANGE_SIZES.BORED_CS_AS).toHaveLength(855);
    expect(FLANGE_SIZES.BORED_SS_DS).toHaveLength(754);
    expect(FLANGE_SIZES.PLAIN).toHaveLength(120);
    expect(FLANGE_SIZES.THREADED).toHaveLength(50);
  });

  it("covers every product in the master", () => {
    const file = parseSectioned(f("PRODUCT SPEC MASTER - FLANGE B16.5.xlsx"));
    for (const sec of file.sections) {
      const pool = new Set(getFlangeSizeOptions(sec.products[0]));
      for (const product of sec.products) {
        // every product in a section must resolve to that section's own sizes
        expect(getFlangeSizeOptions(product)).toEqual([...pool]);
        for (const z of sec.sizes) expect(pool.has(z.label)).toBe(true);
      }
    }
  });
});
