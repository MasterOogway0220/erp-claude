// Seed pipe sizes from Excel files
// Run: npx tsx scripts/seed-pipe-sizes.ts

import XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

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

interface SizeRow {
  sizeLabel: string;
  od: number;
  wt: number;
  weight: number;
  pipeType: "CS_AS" | "SS_DS";
  nps: number | null;
  schedule: string | null;
}

function parseNps(sizeLabel: string): number | null {
  // Extract NPS from label like '1/2"NB X SCH 40'
  const match = sizeLabel.match(/^([\d/.]+)"/);
  if (!match) return null;
  const val = match[1];
  if (val.includes("/")) {
    const [num, den] = val.split("/").map(Number);
    return den ? num / den : null;
  }
  return parseFloat(val) || null;
}

function parseSchedule(sizeLabel: string): string | null {
  const match = sizeLabel.match(/X\s+(SCH\s+\S+|SCH\s+\S+)/i);
  return match ? match[1].trim() : null;
}

function readExcel(filePath: string, pipeType: "CS_AS" | "SS_DS"): SizeRow[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

  const rows: SizeRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as any[];
    if (!row || !row[0]) continue;

    const sizeLabel = String(row[0]).trim();
    const od = parseFloat(row[1]);
    const wt = parseFloat(row[2]);
    const weight = parseFloat(row[3]);

    if (isNaN(od) || isNaN(wt)) continue;

    rows.push({
      sizeLabel,
      od,
      wt,
      weight: isNaN(weight) ? 0 : weight,
      pipeType,
      nps: parseNps(sizeLabel),
      schedule: parseSchedule(sizeLabel),
    });
  }

  return rows;
}

async function main() {
  console.log("Reading Excel files...");

  const csRows = readExcel("documents/PIPES SIZE MASTER CS & AS PIPES.xlsx", "CS_AS");
  const ssRows = readExcel("documents/PIPES SIZE MASTER SS & DS PIPES.xlsx", "SS_DS");

  console.log(`CS/AS: ${csRows.length} rows`);
  console.log(`SS/DS: ${ssRows.length} rows`);

  // Delete existing sizes
  const existingCount = await prisma.sizeMaster.count();
  console.log(`Existing sizes in DB: ${existingCount}`);

  if (existingCount > 0) {
    console.log("Deleting existing pipe sizes...");
    await prisma.sizeMaster.deleteMany({});
    console.log("Deleted.");
  }

  // Insert all rows
  const allRows = [...csRows, ...ssRows];
  console.log(`Inserting ${allRows.length} pipe sizes...`);

  const chunkSize = 50;
  for (let i = 0; i < allRows.length; i += chunkSize) {
    const chunk = allRows.slice(i, i + chunkSize);
    await prisma.sizeMaster.createMany({
      data: chunk.map((r) => ({
        sizeLabel: r.sizeLabel,
        od: r.od,
        wt: r.wt,
        weight: r.weight,
        pipeType: r.pipeType,
        nps: r.nps,
        schedule: r.schedule,
      })),
    });
    console.log(`  Inserted ${Math.min(i + chunkSize, allRows.length)} / ${allRows.length}`);
  }

  // Verify
  const finalCount = await prisma.sizeMaster.count();
  const csCount = await prisma.sizeMaster.count({ where: { pipeType: "CS_AS" } });
  const ssCount = await prisma.sizeMaster.count({ where: { pipeType: "SS_DS" } });
  console.log(`\nDone! Total: ${finalCount} (CS/AS: ${csCount}, SS/DS: ${ssCount})`);

  // Show sample with weight
  const samples = await prisma.sizeMaster.findMany({ take: 5, orderBy: { sizeLabel: "asc" } });
  console.log("\nSample entries:");
  samples.forEach((s: any) => {
    console.log(`  ${s.sizeLabel} | OD: ${s.od} | WT: ${s.wt} | Weight: ${s.weight} kg/m | ${s.pipeType}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
