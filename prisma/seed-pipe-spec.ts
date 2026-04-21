import { PrismaClient, ProductCategory } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import * as XLSX from "xlsx";
import path from "path";

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

const DOCUMENTS_DIR = path.join(__dirname, "..", "documents");

async function getOrCreateDimStd(name: string): Promise<string | null> {
  if (!name) return null;
  const code = name.replace(/\s+/g, "_").toUpperCase();
  const existing = await prisma.dimensionalStandardMaster.findUnique({
    where: { code },
  });
  if (existing) return existing.id;
  const created = await prisma.dimensionalStandardMaster.create({
    data: { name, code },
  });
  return created.id;
}

async function main() {
  // Resolve companyId — use first active company found
  const company = await prisma.companyMaster.findFirst({ select: { id: true, companyName: true } });
  if (!company) throw new Error("No company found in database");
  console.log(`Using company: ${company.companyName} (${company.id})`);
  const companyId = company.id;

  const filePath = path.join(DOCUMENTS_DIR, "PIPE SPEC MASTER.xlsx");
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  console.log(`Read ${rows.length} rows from PIPE SPEC MASTER.xlsx`);

  // Delete existing PIPES category records for this company
  const deleted = await prisma.productSpecMaster.deleteMany({
    where: { category: ProductCategory.PIPES, companyId },
  });
  console.log(`Deleted ${deleted.count} existing PIPES product spec records`);

  // Pre-cache dimensional standard IDs
  const dimStdCache: Record<string, string | null> = {};

  let inserted = 0;
  for (const row of rows) {
    const product = String(row["Product"] ?? "").trim();
    const specification = String(row["Specification"] ?? "").trim();
    const grade = String(row["Grade"] ?? "").trim();
    const material = String(row["Material"] ?? "").trim();
    const dimStdName = String(row["Dim. Standard"] ?? "").trim();

    if (!product && !material) continue;

    if (dimStdName && !(dimStdName in dimStdCache)) {
      dimStdCache[dimStdName] = await getOrCreateDimStd(dimStdName);
    }
    const dimensionalStandardId = dimStdName ? dimStdCache[dimStdName] : null;

    await prisma.productSpecMaster.create({
      data: {
        category: ProductCategory.PIPES,
        product: product || "",
        specification: specification || null,
        grade: grade || null,
        material: material || null,
        dimensionalStandardId: dimensionalStandardId ?? undefined,
        companyId,
      },
    });
    inserted++;
  }

  console.log(`Inserted ${inserted} PIPES product spec records`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
