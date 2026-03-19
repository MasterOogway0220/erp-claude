// Migrate all master data to assign companyId to existing records
// Run: source .env && export DATABASE_URL && npx tsx scripts/migrate-master-data-to-company.ts

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

async function main() {
  // Find the NPS company (first company in the system)
  const company = await prisma.companyMaster.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) {
    console.error("No company found in the system. Create a company first.");
    return;
  }

  console.log(`Migrating master data to company: ${company.companyName} (${company.id})`);
  const companyId = company.id;

  const tables = [
    { name: "ProductSpecMaster", model: prisma.productSpecMaster },
    { name: "AdditionalSpecOption", model: prisma.additionalSpecOption },
    { name: "SizeMaster", model: prisma.sizeMaster },
    { name: "TestingMaster", model: prisma.testingMaster },
    { name: "LengthMaster", model: prisma.lengthMaster },
    { name: "PaymentTermsMaster", model: prisma.paymentTermsMaster },
    { name: "DeliveryTermsMaster", model: prisma.deliveryTermsMaster },
    { name: "InspectionAgencyMaster", model: prisma.inspectionAgencyMaster },
    { name: "DimensionalStandardMaster", model: prisma.dimensionalStandardMaster },
    { name: "BuyerMaster", model: prisma.buyerMaster },
    { name: "Tag", model: prisma.tag },
    { name: "MaterialCodeMaster", model: prisma.materialCodeMaster },
    { name: "FittingMaster", model: prisma.fittingMaster },
    { name: "FlangeMaster", model: prisma.flangeMaster },
  ] as const;

  for (const table of tables) {
    try {
      const result = await (table.model as any).updateMany({
        where: { companyId: null },
        data: { companyId },
      });
      console.log(`  ${table.name}: updated ${result.count} records`);
    } catch (error: any) {
      console.error(`  ${table.name}: FAILED - ${error.message}`);
    }
  }

  console.log("\nMigration complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
