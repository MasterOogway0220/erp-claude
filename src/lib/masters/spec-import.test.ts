// Count-locked against the "new master" files. If the client ships revised
// files, re-verify the layout assumptions (sectioned pools!) and update counts.
import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  parsePipeSizes,
  parsePipeSpecs,
  parseSectioned,
  sectionDim,
  toFlangeSpecRows,
  toProductSpecPairs,
} from "./spec-import";
import {
  FITTING_SIZES,
  FLANGE_SIZES,
  flangeDimForSize,
  getFittingSizeOptions,
  getFlangeSizeOptions,
} from "../fitting-flange-sizes";

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
    // "PIPES 2" is the file the seeder loads — the Aug-2026 revision that adds
    // the API 5L PSL-1/PSL-2 grades to C.S. LSAW PIPE (263 -> 277 rows).
    const rows = parsePipeSpecs(f("PRODUCT SPEC MASTER - PIPES 2.xlsx"));
    expect(rows).toHaveLength(277);
    expect(new Set(rows.map((r) => r.product)).size).toBe(12);
    expect(new Set(rows.map((r) => `${r.product}§${r.material}`)).size).toBe(277); // no dups
    expect(
      rows.filter((r) => r.product === "C.S. LSAW PIPE" && /^API 5L GR\..+ PSL-[12]$/.test(r.material))
    ).toHaveLength(14);
    // 3 IS-standard ERW + the 14 new API 5L LSAW rows: the client's file writes
    // "-" in the Dimension column for both, which prints as "-" on quotations.
    expect(rows.filter((r) => r.dimStandard === null)).toHaveLength(17);
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

  // Added Aug 2026. Extends (does not replace) the BW file with the reducing
  // fittings, whose sizes are "<large end> - <small end>" pairs.
  it("BW-2: 4 sections of reducing fittings, all two-size", () => {
    const file = parseSectioned(f("PRODUCT SPEC MASTER - BW FITTING-2.xlsx"));
    expect(file.sections).toHaveLength(4);
    expect(file.ends).toBe("BW");
    expect(file.sections.map((s) => s.products.length)).toEqual([4, 4, 4, 4]);
    expect(file.sections.map((s) => s.specs.length)).toEqual([14, 22, 30, 8]);
    expect(file.sections.map(sectionDim)).toEqual(Array(4).fill("ASME B16.9"));
    expect(toProductSpecPairs(file)).toHaveLength(296);

    // One pool shared by all four material classes, every entry a pair.
    const pools = file.sections.map((s) => s.sizes.map((z) => z.label).join("|"));
    expect(new Set(pools).size).toBe(1);
    const sizes = [...new Set(file.sections[0].sizes.map((z) => z.label))];
    expect(sizes).toHaveLength(5626);
    expect(sizes.every((s) => s.split(" - ").length === 2)).toBe(true);
    // Large end first: a pair that reduced upward would be a data error.
    const nps = (s: string) => parseFloat(s.match(/^([\d.]+)"/)?.[1] ?? "0");
    expect(sizes.every((s) => { const [l, r] = s.split(" - "); return nps(l) > nps(r); })).toBe(true);

    // No product appears in both BW files — BW-2 extends, never replaces.
    const bw1 = parseSectioned(f("PRODUCT SPEC MASTER - BW FITTING.xlsx"));
    const bw1Products = new Set(bw1.sections.flatMap((s) => s.products));
    expect(file.sections.flatMap((s) => s.products).filter((p) => bw1Products.has(p))).toEqual([]);
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
    // No Ends column in this file — flange end finish only exists for B16.47.
    expect(file.sections.every((s) => s.ends.length === 0)).toBe(true);
  });

  // Added Aug 2026 alongside B16.5. Ends is a pool like every other column:
  // Sr. A offers RF and RTJ, Sr. B is RF-only. That asymmetry is the whole
  // reason ends can't be a per-file constant the way it is for fittings.
  it("FLANGE B16.47: Sr. A carries RF+RTJ, Sr. B only RF", () => {
    const file = parseSectioned(f("PRODUCT SPEC MASTER - FLANGE B16.47 SER. A & B.xlsx"));
    expect(file.sections).toHaveLength(8);
    // 4 material classes x Sr. A, then the same 4 x Sr. B
    expect(file.sections.map(sectionDim)).toEqual([
      ...Array(4).fill("ASME B16.47 Sr. A"),
      ...Array(4).fill("ASME B16.47 Sr. B"),
    ]);
    expect(file.sections.slice(0, 4).map((s) => s.ends)).toEqual(Array(4).fill(["RF", "RTJ"]));
    expect(file.sections.slice(4).map((s) => s.ends)).toEqual(Array(4).fill(["RF"]));
    // Only weld neck and blind exist in B16.47 — no socket weld / slip on /
    // lap joint / threaded, so those must not gain 26"+ sizes.
    expect(new Set(file.sections.flatMap((s) => s.products)).size).toBe(8);
    expect(file.sections.flatMap((s) => s.products).every((p) => /WELD NECK|BLIND/.test(p))).toBe(true);

    const rows = toFlangeSpecRows(file);
    expect(rows).toHaveLength(396);
    // Sr. A pairs are doubled by the two end finishes; Sr. B are not.
    const byDim = (d: string) => rows.filter((r) => r.dim === d);
    expect(new Set(byDim("ASME B16.47 Sr. A").map((r) => r.ends))).toEqual(new Set(["RF", "RTJ"]));
    expect(new Set(byDim("ASME B16.47 Sr. B").map((r) => r.ends))).toEqual(new Set(["RF"]));
    expect(byDim("ASME B16.47 Sr. A")).toHaveLength(264);
    expect(byDim("ASME B16.47 Sr. B")).toHaveLength(132);
  });

  it("sectionDim rejects a section that mixes standards", () => {
    expect(() =>
      sectionDim({
        products: ["C.S. FLANGE, WELD NECK"],
        specs: [],
        ends: [],
        sizes: [
          { label: '26"NB X 150#', dim: "ASME B16.47 Sr. A" },
          { label: '28"NB X 150#', dim: "ASME B16.47 Sr. B" },
        ],
      })
    ).toThrow(/2 dimensional standards/);
  });
});

describe("fitting size pools", () => {
  it("sends only butt-weld reducing fittings to the two-size pool", () => {
    // The trap: the SW and threaded masters carry their own "REDUCING TEE",
    // but those are single-size. Matching on the name alone would hand them
    // 6"-4" pairs they can't be ordered in.
    expect(getFittingSizeOptions("C.S. CONC. REDUCER, SMLS")).toBe(FITTING_SIZES.BW_REDUCING);
    expect(getFittingSizeOptions("D.S. ECCN. REDUCER, SMLS")).toBe(FITTING_SIZES.BW_REDUCING);
    expect(getFittingSizeOptions("S.S. UNEQUAL TEE, SMLS")).toBe(FITTING_SIZES.BW_REDUCING);
    expect(getFittingSizeOptions("A.S. REDUCING TEE, SMLS")).toBe(FITTING_SIZES.BW_REDUCING);
    expect(getFittingSizeOptions("C.S. REDUCING TEE, SW")).toBe(FITTING_SIZES.SW);
    expect(getFittingSizeOptions("C.S. REDUCING TEE, SCRD")).toBe(FITTING_SIZES.THRD);
    // Equal tee must not be dragged in by the "UNEQUAL TEE" substring rule.
    expect(getFittingSizeOptions("C.S. EQUAL TEE, SMLS")).toBe(FITTING_SIZES.BW_CS_AS);
    expect(getFittingSizeOptions("S.S. EQUAL TEE, SMLS")).toBe(FITTING_SIZES.BW_SS_DS);
    expect(getFittingSizeOptions("C.S. 90° ELBOW, LR, SMLS")).toBe(FITTING_SIZES.BW_CS_AS);
    expect(FITTING_SIZES.BW_REDUCING).toHaveLength(5626);
  });

  it("covers every product in both BW masters", () => {
    for (const name of [
      "PRODUCT SPEC MASTER - BW FITTING.xlsx",
      "PRODUCT SPEC MASTER - BW FITTING-2.xlsx",
    ]) {
      const file = parseSectioned(f(name));
      for (const sec of file.sections) {
        for (const product of sec.products) {
          const pool = new Set(getFittingSizeOptions(product, file.ends ?? undefined));
          for (const z of sec.sizes) expect(pool.has(z.label)).toBe(true);
        }
      }
    }
  });
});

describe("flange size pools", () => {
  it("routes each flange type to the pool that matches its size format", () => {
    // Guards the generated FLANGE_SIZES split — a mis-routed product would
    // offer schedule-bearing sizes for a blind flange, or none at all.
    // Weld neck and blind also reach into B16.47 (26"+); the other types don't.
    expect(getFlangeSizeOptions("C.S. FLANGE, WELD NECK")).toEqual([
      ...FLANGE_SIZES.BORED_CS_AS,
      ...FLANGE_SIZES.B16_47,
    ]);
    expect(getFlangeSizeOptions("D.S. FLANGE, WELD NECK")).toEqual([
      ...FLANGE_SIZES.BORED_SS_DS,
      ...FLANGE_SIZES.B16_47,
    ]);
    expect(getFlangeSizeOptions("C.S. FLANGE, BLIND")).toEqual([
      ...FLANGE_SIZES.PLAIN,
      ...FLANGE_SIZES.B16_47,
    ]);
    expect(getFlangeSizeOptions("A.S. FLANGE, SLIP ON")).toBe(FLANGE_SIZES.BORED_CS_AS);
    expect(getFlangeSizeOptions("S.S. FLANGE, SOCKET WELD")).toBe(FLANGE_SIZES.BORED_SS_DS);
    expect(getFlangeSizeOptions("S.S. FLANGE, LAP JOINT")).toBe(FLANGE_SIZES.PLAIN);
    expect(getFlangeSizeOptions("A.S. FLANGE, THREADED")).toBe(FLANGE_SIZES.THREADED);
    expect(FLANGE_SIZES.BORED_CS_AS).toHaveLength(855);
    expect(FLANGE_SIZES.BORED_SS_DS).toHaveLength(754);
    expect(FLANGE_SIZES.PLAIN).toHaveLength(120);
    expect(FLANGE_SIZES.THREADED).toHaveLength(50);
    expect(FLANGE_SIZES.B16_47).toHaveLength(66);
  });

  it("covers every product in both flange masters", () => {
    for (const name of [
      "PRODUCT SPEC MASTER - FLANGE B16.5.xlsx",
      "PRODUCT SPEC MASTER - FLANGE B16.47 SER. A & B.xlsx",
    ]) {
      const file = parseSectioned(f(name));
      for (const sec of file.sections) {
        for (const product of sec.products) {
          const pool = new Set(getFlangeSizeOptions(product));
          // every product in a section must be offered that section's sizes
          for (const z of sec.sizes) expect(pool.has(z.label)).toBe(true);
        }
      }
    }
  });

  it("only stamps B16.5 on sizes that are actually B16.5", () => {
    // Guessing the standard from a 26"+ size is the failure this prevents:
    // Sr. A and Sr. B share size labels, so the user has to say which.
    expect(flangeDimForSize('4"NB X SCH 40 X 150#')).toBe("ASME B16.5");
    expect(flangeDimForSize('1/2"NB X 150#')).toBe("ASME B16.5");
    expect(flangeDimForSize('26"NB X 150#')).toBeNull();
    expect(flangeDimForSize('60"NB X 600#')).toBeNull();
    expect(flangeDimForSize("")).toBeNull();
  });
});
