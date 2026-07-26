// Parsers for the "new master" Excel files.
//
// Two layouts exist:
//  - PIPES + pipe-size files: plain row-wise tables.
//  - Fitting/flange files: SECTIONED COLUMN POOLS. Each material-class section
//    lists its products, specs, and sizes as independent columns that merely
//    share rows — row alignment carries NO meaning. Reading them row-wise
//    produces garbage pairings (this is exactly what the legacy seed.ts did).
//
// A section starts on any row whose Product cell is non-empty after an empty
// one; every valid combination is (any product × any spec × any size) within
// that section.

import * as XLSX from "xlsx";

const s = (v: unknown) => String(v ?? "").trim();

function sheetRows(path: string): string[][] {
  const wb = XLSX.readFile(path);
  const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    defval: "",
  }) as unknown[][];
  return raw.slice(1).map((r) => (r ?? []).map(s));
}

// ── Pipe sizes (Size | OD | WT | Weight) ────────────────────────────────────

export interface PipeSizeRow {
  sizeLabel: string;
  od: number;
  wt: number;
  weight: number;
  nps: number | null;
  schedule: string | null;
}

export function parseNps(sizeLabel: string): number | null {
  const m = sizeLabel.match(/^([\d/.]+)"/);
  if (!m) return null;
  if (m[1].includes("/")) {
    const [num, den] = m[1].split("/").map(Number);
    return den ? num / den : null;
  }
  return parseFloat(m[1]) || null;
}

export function parsePipeSizes(path: string): PipeSizeRow[] {
  const rows: PipeSizeRow[] = [];
  for (const r of sheetRows(path)) {
    const [label, od, wt, weight] = r;
    if (!label || isNaN(parseFloat(od)) || isNaN(parseFloat(wt))) continue;
    const sch = label.match(/X\s+(SCH\s+\S+)/i);
    rows.push({
      sizeLabel: label,
      od: parseFloat(od),
      wt: parseFloat(wt),
      weight: parseFloat(weight) || 0,
      nps: parseNps(label),
      schedule: sch ? sch[1].trim() : null,
    });
  }
  return rows;
}

// ── Pipe specs (row-wise: Category | Product | Specification | Dimension) ───

export interface PipeSpecRow {
  product: string;
  material: string;
  dimStandard: string | null;
}

export function parsePipeSpecs(path: string): PipeSpecRow[] {
  const rows: PipeSpecRow[] = [];
  for (const r of sheetRows(path)) {
    const [, product, material, dim] = r;
    if (!product || !material) continue;
    rows.push({ product, material, dimStandard: dim && dim !== "-" ? dim : null });
  }
  return rows;
}

// ── Sectioned pool files (fittings + flanges) ───────────────────────────────

export interface PoolSection {
  products: string[];
  specs: string[];
  sizes: { label: string; dim: string }[];
}

export interface SectionedFile {
  sections: PoolSection[];
  ends: string | null; // constant per fitting file (BW / SW / NPT); null for flanges
}

export function parseSectioned(path: string): SectionedFile {
  const rows = sheetRows(path);
  const sections: PoolSection[] = [];
  let cur: PoolSection | null = null;
  let prevProduct = "";
  let ends: string | null = null;

  for (const r of rows) {
    const [, product, spec, dim, size, end] = r;
    if (product && !prevProduct) {
      cur = { products: [], specs: [], sizes: [] };
      sections.push(cur);
    }
    prevProduct = product;
    if (!cur) continue; // preamble rows before any section (none in practice)
    if (product) cur.products.push(product);
    if (spec) cur.specs.push(spec);
    if (size) cur.sizes.push({ label: size, dim });
    if (end && !ends) ends = end;
  }
  return { sections, ends };
}

// Every (product × spec) combination, deduped across sections (THRD repeats
// its products in the 2000# and 3000/6000# sections).
export function toProductSpecPairs(file: SectionedFile): { product: string; material: string }[] {
  const seen = new Set<string>();
  const pairs: { product: string; material: string }[] = [];
  for (const sec of file.sections) {
    for (const product of sec.products) {
      for (const material of sec.specs) {
        const key = `${product}§${material}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ product, material });
      }
    }
  }
  return pairs;
}
