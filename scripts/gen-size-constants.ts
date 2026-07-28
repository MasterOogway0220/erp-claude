// Regenerates src/lib/fitting-flange-sizes.ts from the "new master" Excel files.
// Run: npx tsx scripts/gen-size-constants.ts
//
// The helper functions at the bottom of the generated file come from HELPERS
// below — edit them here, never in the generated file, or the next run silently
// reverts them.
import fs from "node:fs";
import path from "node:path";
import { parseSectioned } from "../src/lib/masters/spec-import";

const dir = path.join(__dirname, "..", "new master");
const isSS = (p: string) => /^(S\.S\.|D\.S\.)/.test(p);

function pools(file: ReturnType<typeof parseSectioned>) {
  const cs = new Set<string>();
  const ss = new Set<string>();
  for (const sec of file.sections) {
    const target = isSS(sec.products[0] || "") ? ss : cs;
    for (const z of sec.sizes) target.add(z.label);
  }
  return { cs: [...cs], ss: [...ss] };
}

const bw = pools(parseSectioned(path.join(dir, "PRODUCT SPEC MASTER - BW FITTING.xlsx")));
const sw = pools(parseSectioned(path.join(dir, "PRODUCT SPEC MASTER - SW FITTING.xlsx")));
const thrd = pools(parseSectioned(path.join(dir, "PRODUCT SPEC MASTER - THRD FITTING.xlsx")));
const flange = parseSectioned(path.join(dir, "PRODUCT SPEC MASTER - FLANGE B16.5.xlsx"));

// Flange sizes key off the flange TYPE, not only the material class: weld neck
// / socket weld / slip on are bored, so their size carries a schedule; blind,
// lap joint and threaded have no bore. The no-bore pools are byte-identical
// across all four material classes, so they collapse to one list each.
const flangeType = (p: string): "THREADED" | "PLAIN" | "BORED" =>
  /THREADED/i.test(p) ? "THREADED" : /BLIND|LAP\s*JOINT/i.test(p) ? "PLAIN" : "BORED";

const seenPerPool = new Map<string, { sizes: string[]; products: string }>();

const flangePools = (() => {
  const out: Record<string, Set<string>> = {
    BORED_CS_AS: new Set<string>(),
    BORED_SS_DS: new Set<string>(),
    PLAIN: new Set<string>(),
    THREADED: new Set<string>(),
  };
  for (const sec of flange.sections) {
    const types = new Set(sec.products.map(flangeType));
    if (types.size !== 1) {
      throw new Error(
        `Flange section mixes types (${[...types].join("/")}): ${sec.products.join(", ")}. ` +
          `Sizes are a section-level pool, so a mixed section cannot be split — check the master file.`
      );
    }
    const t = flangeType(sec.products[0]);
    const key =
      t === "THREADED" ? "THREADED"
      : t === "PLAIN" ? "PLAIN"
      : isSS(sec.products[0]) ? "BORED_SS_DS"
      : "BORED_CS_AS";
    const sizes = sec.sizes.map((z) => z.label);
    // PLAIN and THREADED collapse four material-class sections into one pool,
    // which is only valid while those sections are identical. If a future
    // master diverges them, a silent union would offer sizes the product
    // cannot take — fail loudly instead.
    const seen = seenPerPool.get(key);
    if (seen && (seen.sizes.length !== sizes.length || seen.sizes.some((s, i) => s !== sizes[i]))) {
      throw new Error(
        `Flange sections "${seen.products}" and "${sec.products.join(", ")}" both map to pool ${key} ` +
          `but their size lists differ (${seen.sizes.length} vs ${sizes.length}). ` +
          `Split the pool in this script instead of letting the union hide the difference.`
      );
    }
    if (!seen) seenPerPool.set(key, { sizes, products: sec.products.join(", ") });
    for (const label of sizes) out[key].add(label);
  }
  return out;
})();

const j = (a: Iterable<string>) => JSON.stringify([...a], null, 2);

// Kept verbatim in the generated file. Anything hand-edited there is lost on
// the next run, so it lives here instead.
const HELPERS = `
// End connection from the product-name suffix convention:
// ", SW" → socket weld, ", SCRD" → threaded (NPT), otherwise butt-weld (SMLS).
export function getFittingEnds(product: string): "BW" | "SW" | "NPT" {
  if (/,\\s*SW$/i.test(product)) return "SW";
  if (/,\\s*SCRD$/i.test(product)) return "NPT";
  return "BW";
}

// Prefer the item's actual ends value (autofilled from the master row) over
// the name-suffix convention, so custom master products that don't follow
// the ", SW"/", SCRD" naming still route to the right pool.
export function getFittingSizeOptions(product: string, knownEnds?: string): string[] {
  const p = (product || "").trim().toUpperCase();
  // No product yet means no pool is decided — offering one anyway lets a size
  // be picked that the eventual product cannot take. The call sites already
  // say "Select product first".
  if (!p) return [];
  const ends = knownEnds === "SW" || knownEnds === "NPT" || knownEnds === "BW"
    ? knownEnds
    : getFittingEnds(product);
  if (ends === "SW") return FITTING_SIZES.SW;
  if (ends === "NPT") return FITTING_SIZES.THRD;
  return /^(S\\.S\\.|D\\.S\\.)/.test(p)
    ? FITTING_SIZES.BW_SS_DS
    : FITTING_SIZES.BW_CS_AS;
}

export function getFittingDimStandard(product: string): string {
  return getFittingEnds(product) === "BW" ? "ASME B16.9" : "ASME B16.11";
}

// The whole flange master is ASME B16.5 — the size no longer decides the
// standard (the previous master also carried B16.47 Sr. A/B).
export const FLANGE_DIM_STANDARD = "ASME B16.5";

// Blind and lap-joint flanges have no bore and threaded ones are NPT, so only
// weld neck / socket weld / slip on take a schedule in their size.
export function getFlangeSizeOptions(product: string): string[] {
  const p = (product || "").trim().toUpperCase();
  if (!p) return []; // see getFittingSizeOptions — no product, no pool
  if (p.includes("THREADED")) return FLANGE_SIZES.THREADED;
  if (/BLIND|LAP\\s*JOINT/.test(p)) return FLANGE_SIZES.PLAIN;
  // match the material class on the same uppercased string as the type tests —
  // a free-typed "s.s. flange, weld neck" must not fall through to the CS pool
  return /^(S\\.S\\.|D\\.S\\.)/.test(p)
    ? FLANGE_SIZES.BORED_SS_DS
    : FLANGE_SIZES.BORED_CS_AS;
}

// Best-effort Pipe/Fitting/Flange classification from a product name — for
// rows that arrive without a stored category (tender items, PO edit loads).
export function inferItemCategory(product: string): "Pipe" | "Fitting" | "Flange" {
  const p = (product || "").toUpperCase();
  if (p.includes("FLANGE")) return "Flange";
  if (/(ELBOW|TEE\\b|END CAP|COUPLING|STUB\\s?END|CROSS\\b|BOSS\\b|PLUG|NIPPLE|REDUCER|UNION|BEND)/.test(p))
    return "Fitting";
  return "Pipe";
}
`;

const out = `// GENERATED by scripts/gen-size-constants.ts from the "new master" Excel
// files — do not hand-edit. Both the data blocks AND the helpers below are
// overwritten on every run; change scripts/gen-size-constants.ts instead.

export const FITTING_SIZES = {
  BW_CS_AS: ${j(bw.cs)},
  BW_SS_DS: ${j(bw.ss)},
  SW: ${j(new Set([...sw.cs, ...sw.ss]))},
  THRD: ${j(new Set([...thrd.cs, ...thrd.ss]))},
};

export const FLANGE_SIZES = {
  BORED_CS_AS: ${j(flangePools.BORED_CS_AS)},
  BORED_SS_DS: ${j(flangePools.BORED_SS_DS)},
  PLAIN: ${j(flangePools.PLAIN)},
  THREADED: ${j(flangePools.THREADED)},
};

// ── helpers ─────────────────────────────────────────────────────────────────
${HELPERS}`;

const dest = path.join(__dirname, "..", "src", "lib", "fitting-flange-sizes.ts");
fs.writeFileSync(dest, out);
console.log(
  `Wrote ${dest}\n` +
    `  BW_CS_AS=${bw.cs.length} BW_SS_DS=${bw.ss.length} ` +
    `SW=${new Set([...sw.cs, ...sw.ss]).size} THRD=${new Set([...thrd.cs, ...thrd.ss]).size}\n` +
    `  FLANGE BORED_CS_AS=${flangePools.BORED_CS_AS.size} BORED_SS_DS=${flangePools.BORED_SS_DS.size} ` +
    `PLAIN=${flangePools.PLAIN.size} THREADED=${flangePools.THREADED.size}`
);
