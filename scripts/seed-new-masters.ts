// Replace product/size master data from the "new master" Excel files.
//
//   npx tsx scripts/seed-new-masters.ts --dry-run   # report only, no writes
//   npx tsx scripts/seed-new-masters.ts             # apply
//
// - SizeMaster: labels renamed in place (1/2" -> 0.5", 3/4" -> 0.75"). No
//   deletes — QuotationItem.sizeId FKs reference these rows.
// - ProductSpecMaster: full wipe + reload. The legacy rows were seeded
//   row-wise from pool-layout Excel (mis-paired product/material) so nothing
//   is worth keeping. Quotation items copy strings, not FKs — safe.
// - FittingMaster/FlangeMaster: untouched (historical fittingId/flangeId FKs).
import "dotenv/config";
import path from "node:path";
import { PrismaClient, ProductCategory } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
  parsePipeSizes,
  parsePipeSpecs,
  parseSectioned,
  toFlangeSpecRows,
  toProductSpecPairs,
} from "../src/lib/masters/spec-import";

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: url.port ? parseInt(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

const DRY = process.argv.includes("--dry-run");
const DIR = path.join(__dirname, "..", "new master");
const f = (name: string) => path.join(DIR, name);

// "0.5"NB X ..." -> legacy label "1/2"NB X ..." (only 0.5 / 0.75 were renamed)
const legacyLabel = (label: string) =>
  label.replace(/^0\.5"/, '1/2"').replace(/^0\.75"/, '3/4"');

async function updatePipeSizes(pipeType: "CS_AS" | "SS_DS", file: string) {
  const rows = parsePipeSizes(f(file));
  let same = 0,
    renamed = 0,
    created = 0;
  for (const r of rows) {
    const existing = await prisma.sizeMaster.findFirst({
      where: { sizeLabel: r.sizeLabel, pipeType },
    });
    if (existing) {
      same++;
      continue;
    }
    const legacy = await prisma.sizeMaster.findFirst({
      where: { sizeLabel: legacyLabel(r.sizeLabel), pipeType },
    });
    if (legacy) {
      renamed++;
      if (!DRY)
        await prisma.sizeMaster.update({
          where: { id: legacy.id },
          data: { sizeLabel: r.sizeLabel, nps: r.nps },
        });
    } else {
      created++;
      if (!DRY)
        await prisma.sizeMaster.create({
          data: {
            sizeLabel: r.sizeLabel,
            od: r.od,
            wt: r.wt,
            weight: r.weight,
            pipeType,
            nps: r.nps,
            schedule: r.schedule,
          },
        });
    }
  }
  console.log(`SizeMaster ${pipeType}: ${same} unchanged, ${renamed} renamed, ${created} created`);
}

async function main() {
  console.log(DRY ? "── DRY RUN (no writes) ──" : "── APPLYING ──");

  const company = await prisma.companyMaster.findFirst({ select: { id: true, companyName: true } });
  if (!company) throw new Error("No company found");
  console.log(`Company: ${company.companyName}`);

  // 1. Pipe sizes — in-place label rename
  await updatePipeSizes("CS_AS", "PIPES SIZE MASTER CS & AS PIPES.xlsx");
  await updatePipeSizes("SS_DS", "PIPES SIZE MASTER SS & DS PIPES.xlsx");

  // 2. Build the new ProductSpecMaster rows
  const dimIds = new Map<string, string>();
  async function dimId(name: string | null): Promise<string | null> {
    if (!name) return null;
    if (dimIds.has(name)) return dimIds.get(name)!;
    const code = name.replace(/\s+/g, "_").toUpperCase();
    // Look up by NAME, not by the derived code: the legacy seed wrote
    // "ASME_B36_10" where this derivation yields "ASME_B36.10", so keying on
    // code created a second row for the same standard.
    let row = await prisma.dimensionalStandardMaster.findFirst({ where: { name } });
    if (!row) {
      if (DRY) {
        console.log(`  (would create dimensional standard: ${name})`);
        dimIds.set(name, "DRY");
        return "DRY";
      }
      row = await prisma.dimensionalStandardMaster.create({ data: { name, code } });
    }
    dimIds.set(name, row.id);
    return row.id;
  }

  type NewRow = {
    product: string;
    material: string;
    category: ProductCategory;
    ends: string | null;
    dim: string | null;
  };
  const newRows: NewRow[] = [];

  // "PIPES 2" is the client's Aug-2026 revision of the pipe master (adds the
  // API 5L PSL-1/PSL-2 grades to C.S. LSAW PIPE). The original file is kept on
  // disk for reference only.
  for (const r of parsePipeSpecs(f("PRODUCT SPEC MASTER - PIPES 2.xlsx")))
    newRows.push({ product: r.product, material: r.material, category: "PIPES", ends: null, dim: r.dimStandard });

  const fittingFiles: [string, string][] = [
    ["PRODUCT SPEC MASTER - BW FITTING.xlsx", "ASME B16.9"],
    // "BW FITTING-2" adds the reducing butt-weld fittings (conc./eccn. reducer,
    // unequal + reducing tee). It extends the first file rather than replacing
    // it — no product appears in both.
    ["PRODUCT SPEC MASTER - BW FITTING-2.xlsx", "ASME B16.9"],
    ["PRODUCT SPEC MASTER - SW FITTING.xlsx", "ASME B16.11"],
    ["PRODUCT SPEC MASTER - THRD FITTING.xlsx", "ASME B16.11"],
  ];
  for (const [file, dim] of fittingFiles) {
    const parsed = parseSectioned(f(file));
    for (const p of toProductSpecPairs(parsed))
      newRows.push({ product: p.product, material: p.material, category: "FITTINGS", ends: parsed.ends, dim });
  }

  // B16.5 covers 0.5"–24" and has no Ends column — one standard, no end finish.
  for (const p of toProductSpecPairs(parseSectioned(f("PRODUCT SPEC MASTER - FLANGE B16.5.xlsx"))))
    newRows.push({ product: p.product, material: p.material, category: "FLANGES", ends: null, dim: "ASME B16.5" });

  // B16.47 covers 26"–60" in two series that share product and material names,
  // so the standard AND the end finish come from the section, not the product.
  // Sr. A ships RF and RTJ (two rows per pair), Sr. B is RF-only (one row).
  for (const r of toFlangeSpecRows(parseSectioned(f("PRODUCT SPEC MASTER - FLANGE B16.47 SER. A & B.xlsx"))))
    newRows.push({ product: r.product, material: r.material, category: "FLANGES", ends: r.ends, dim: r.dim });

  const byCat = newRows.reduce<Record<string, number>>((a, r) => ((a[r.category] = (a[r.category] || 0) + 1), a), {});
  console.log(`New ProductSpecMaster rows: ${newRows.length}`, byCat);

  // 3. Wipe + reload ProductSpecMaster
  //
  // Two things must survive a reload, because the Excel files cannot recreate
  // them: categories with no source file (PLATES, VALVES, …), and rows a user
  // typed in Masters > Products. This seed only ever writes product, material,
  // category, ends and dimensionalStandardId — so a row carrying a size,
  // specification, grade or length was entered by hand.
  const handEntered = {
    OR: [
      { size: { not: null } },
      { specification: { not: null } },
      { grade: { not: null } },
      { length: { not: null } },
    ],
  };
  const wipeWhere = {
    category: { in: ["PIPES", "FITTINGS", "FLANGES"] as ProductCategory[] },
    NOT: handEntered,
  };

  const existing = await prisma.productSpecMaster.groupBy({ by: ["category"], _count: true });
  console.log(
    "Existing ProductSpecMaster rows:",
    existing.map((e) => `${e.category ?? "null"}=${e._count}`).join(", ") || "none"
  );
  const keep = await prisma.productSpecMaster.findMany({
    where: { category: { in: ["PIPES", "FITTINGS", "FLANGES"] }, ...handEntered },
    select: { product: true, material: true, category: true, size: true },
  });
  console.log(`  to delete: ${await prisma.productSpecMaster.count({ where: wipeWhere })}`);
  console.log(`  hand-entered, preserved: ${keep.length}`);
  for (const k of keep) console.log(`    · ${k.category} ${k.product} / ${k.material ?? "-"} / ${k.size ?? "-"}`);

  // A preserved row whose product/material also exists in the Excel would gain
  // a twin on every reload (no unique constraint, so createMany can't skip it),
  // and the twins accumulate. Drop the file's copy — the preserved row carries
  // strictly more information.
  const preservedKeys = new Set(keep.map((k) => `${k.category}§${k.product}§${k.material ?? ""}`));
  const beforeDedupe = newRows.length;
  const insertRows = newRows.filter(
    (r) => !preservedKeys.has(`${r.category}§${r.product}§${r.material}`)
  );
  if (insertRows.length !== beforeDedupe)
    console.log(`  skipped ${beforeDedupe - insertRows.length} file row(s) already covered by a preserved row`);

  if (!DRY) {
    await prisma.productSpecMaster.deleteMany({ where: wipeWhere });
    const chunk = 100;
    for (let i = 0; i < insertRows.length; i += chunk) {
      const data = [];
      for (const r of insertRows.slice(i, i + chunk)) {
        data.push({
          product: r.product,
          material: r.material,
          category: r.category,
          ends: r.ends,
          dimensionalStandardId: await dimId(r.dim),
          companyId: company.id,
        });
      }
      await prisma.productSpecMaster.createMany({ data });
      console.log(`  inserted ${Math.min(i + chunk, insertRows.length)} / ${insertRows.length}`);
    }
    const final = await prisma.productSpecMaster.groupBy({ by: ["category"], _count: true });
    console.log("Final:", final.map((e) => `${e.category}=${e._count}`).join(", "));
  } else {
    for (const name of ["ASME B36.10", "ASME B36.19", "ASME B16.9", "ASME B16.11"]) await dimId(name);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
