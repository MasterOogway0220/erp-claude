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

// Butt-weld REDUCING fittings (conc./eccn. reducer, unequal + reducing tee) are
// quoted as two sizes, "<large end> - <small end>", so their pool is the list of
// valid pairs rather than the single-size BW pool. The client lists one identical
// pool under all four material classes — verified below rather than assumed,
// because a union would silently offer a C.S. reducer an S.S.-only pair.
const bwReducing = (() => {
  const file = parseSectioned(path.join(dir, "PRODUCT SPEC MASTER - BW FITTING-2.xlsx"));
  const sigs = file.sections.map((s) => s.sizes.map((z) => z.label).join("|"));
  if (new Set(sigs).size !== 1) {
    throw new Error(
      `BW FITTING-2 sections no longer share one size pool (${new Set(sigs).size} distinct). ` +
        `Split BW_REDUCING by material class in this script instead of unioning them.`
    );
  }
  const sizes = [...new Set(file.sections[0].sizes.map((z) => z.label))];
  const notPairs = sizes.filter((s) => s.split(" - ").length !== 2);
  if (notPairs.length) {
    throw new Error(`BW FITTING-2 has ${notPairs.length} size(s) that are not "large - small" pairs, e.g. ${notPairs[0]}`);
  }
  return sizes;
})();
const sw = pools(parseSectioned(path.join(dir, "PRODUCT SPEC MASTER - SW FITTING.xlsx")));
const thrd = pools(parseSectioned(path.join(dir, "PRODUCT SPEC MASTER - THRD FITTING.xlsx")));
const flange = parseSectioned(path.join(dir, "PRODUCT SPEC MASTER - FLANGE B16.5.xlsx"));
const flange1647 = parseSectioned(
  path.join(dir, "PRODUCT SPEC MASTER - FLANGE B16.47 SER. A & B.xlsx")
);

// B16.47 picks up where B16.5 stops (26"–60"). Its sizes carry no schedule
// even for weld neck, and Sr. A / Sr. B share labels, so they form one pool
// that hangs off the two product types B16.47 actually covers: weld neck and
// blind. Sr. B's 26"–48" range is a subset of Sr. A's, hence a single list.
const b1647Sizes = new Set(flange1647.sections.flatMap((s) => s.sizes.map((z) => z.label)));

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
  // Butt-weld reducing fittings are quoted "<large end> - <small end>" and draw
  // from the pair pool. This test sits AFTER the ends split on purpose: the SW
  // and threaded masters also carry a "REDUCING TEE", but those are single-size
  // and must keep their own pools.
  if (/REDUCER|UNEQUAL\\s*TEE|REDUCING\\s*TEE/.test(p)) return FITTING_SIZES.BW_REDUCING;
  return /^(S\\.S\\.|D\\.S\\.)/.test(p)
    ? FITTING_SIZES.BW_SS_DS
    : FITTING_SIZES.BW_CS_AS;
}

export function getFittingDimStandard(product: string): string {
  return getFittingEnds(product) === "BW" ? "ASME B16.9" : "ASME B16.11";
}

// B16.5 is the default standard for flanges up to 24". B16.47 sizes are the
// exception and are handled by flangeDimForSize below.
export const FLANGE_DIM_STANDARD = "ASME B16.5";

const B16_47_SIZES = new Set(FLANGE_SIZES.B16_47);

// Which standard a chosen flange size implies. B16.47 Sr. A and Sr. B list
// identical size labels, so a 26"+ size cannot say which series it is —
// return null and let the user pick rather than stamping "ASME B16.5", which
// would print the wrong standard on the quotation.
export function flangeDimForSize(sizeLabel: string): string | null {
  if (!sizeLabel) return null;
  return B16_47_SIZES.has(sizeLabel.trim()) ? null : FLANGE_DIM_STANDARD;
}

// Blind and lap-joint flanges have no bore and threaded ones are NPT, so only
// weld neck / socket weld / slip on take a schedule in their size. Weld neck
// and blind additionally reach into B16.47 territory above 24".
export function getFlangeSizeOptions(product: string): string[] {
  const p = (product || "").trim().toUpperCase();
  if (!p) return []; // see getFittingSizeOptions — no product, no pool
  if (p.includes("THREADED")) return FLANGE_SIZES.THREADED;
  if (/LAP\\s*JOINT/.test(p)) return FLANGE_SIZES.PLAIN;
  if (p.includes("BLIND")) return [...FLANGE_SIZES.PLAIN, ...FLANGE_SIZES.B16_47];
  // match the material class on the same uppercased string as the type tests —
  // a free-typed "s.s. flange, weld neck" must not fall through to the CS pool
  const bored = /^(S\\.S\\.|D\\.S\\.)/.test(p)
    ? FLANGE_SIZES.BORED_SS_DS
    : FLANGE_SIZES.BORED_CS_AS;
  return /WELD\\s*NECK/.test(p) ? [...bored, ...FLANGE_SIZES.B16_47] : bored;
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
  BW_REDUCING: ${j(bwReducing)},
};

export const FLANGE_SIZES = {
  BORED_CS_AS: ${j(flangePools.BORED_CS_AS)},
  BORED_SS_DS: ${j(flangePools.BORED_SS_DS)},
  PLAIN: ${j(flangePools.PLAIN)},
  THREADED: ${j(flangePools.THREADED)},
  B16_47: ${j(b1647Sizes)},
};

// ── helpers ─────────────────────────────────────────────────────────────────
${HELPERS}`;

const dest = path.join(__dirname, "..", "src", "lib", "fitting-flange-sizes.ts");
fs.writeFileSync(dest, out);
console.log(
  `Wrote ${dest}\n` +
    `  BW_CS_AS=${bw.cs.length} BW_SS_DS=${bw.ss.length} ` +
    `SW=${new Set([...sw.cs, ...sw.ss]).size} THRD=${new Set([...thrd.cs, ...thrd.ss]).size} ` +
    `BW_REDUCING=${bwReducing.length}\n` +
    `  FLANGE BORED_CS_AS=${flangePools.BORED_CS_AS.size} BORED_SS_DS=${flangePools.BORED_SS_DS.size} ` +
    `PLAIN=${flangePools.PLAIN.size} THREADED=${flangePools.THREADED.size} B16_47=${b1647Sizes.size}`
);
