// Migrate WarehouseItemDetail rows with heatNo to HeatEntry + HeatMTCDocument
// Run: source .env && export DATABASE_URL && npx tsx scripts/migrate-warehouse-details-to-heats.ts

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
  console.log(
    "Starting migration: WarehouseItemDetail → HeatEntry + HeatMTCDocument"
  );

  // Get all WarehouseItemDetail rows that have a heatNo set
  const details = await prisma.warehouseItemDetail.findMany({
    where: {
      heatNo: { not: null },
    },
    include: {
      warehouseIntimationItem: {
        include: {
          warehouseIntimation: true,
        },
      },
    },
  });

  console.log(
    `Found ${details.length} WarehouseItemDetail rows with heatNo set`
  );

  let created = 0;
  let skipped = 0;

  for (const detail of details) {
    const intimation = detail.warehouseIntimationItem.warehouseIntimation;

    // Find or create InspectionPrep for this intimation
    let prep = await prisma.inspectionPrep.findFirst({
      where: { warehouseIntimationId: intimation.id },
    });

    if (!prep) {
      // Generate a unique prepNo for migrated records
      const prepNo = `MIGRATED-${intimation.id.slice(-8).toUpperCase()}`;

      // Check if this prepNo already exists (shouldn't happen but be safe)
      const existing = await prisma.inspectionPrep.findUnique({
        where: { prepNo },
      });
      if (existing) {
        prep = existing;
      } else {
        prep = await prisma.inspectionPrep.create({
          data: {
            prepNo,
            companyId: intimation.companyId || null,
            warehouseIntimationId: intimation.id,
            status: "READY",
          },
        });
        console.log(
          `  Created InspectionPrep ${prepNo} for intimation ${intimation.id}`
        );
      }
    }

    // Find or create InspectionPrepItem for this intimation item
    let prepItem = await prisma.inspectionPrepItem.findFirst({
      where: {
        inspectionPrepId: prep.id,
        // match by poItemId if available, otherwise just by prep
        ...(detail.warehouseIntimationItem.poItemId
          ? { poItemId: detail.warehouseIntimationItem.poItemId }
          : {}),
      },
    });

    if (!prepItem) {
      prepItem = await prisma.inspectionPrepItem.create({
        data: {
          inspectionPrepId: prep.id,
          poItemId: detail.warehouseIntimationItem.poItemId || null,
          make: detail.make || null,
          status: "READY",
        },
      });
    }

    // Create HeatEntry (check unique constraint: inspectionPrepItemId + heatNo)
    let heatEntry = await prisma.heatEntry.findUnique({
      where: {
        inspectionPrepItemId_heatNo: {
          inspectionPrepItemId: prepItem.id,
          heatNo: detail.heatNo!,
        },
      },
    });

    if (!heatEntry) {
      heatEntry = await prisma.heatEntry.create({
        data: {
          inspectionPrepItemId: prepItem.id,
          heatNo: detail.heatNo!,
          lengthMtr: detail.lengthMtr ?? null,
          pieces: detail.pieces ?? null,
          make: detail.make ?? null,
        },
      });

      // Create HeatMTCDocument if mtcNo exists
      if (detail.mtcNo) {
        await prisma.heatMTCDocument.create({
          data: {
            heatEntryId: heatEntry.id,
            mtcNo: detail.mtcNo,
            mtcDate: detail.mtcDate ?? null,
          },
        });
      }

      created++;
      console.log(`  Created HeatEntry for heat ${detail.heatNo}`);
    } else {
      skipped++;
      console.log(`  Skipped duplicate: heat ${detail.heatNo} already exists`);
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  ${created} heat entries created`);
  console.log(`  ${skipped} skipped (already existed)`);
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
