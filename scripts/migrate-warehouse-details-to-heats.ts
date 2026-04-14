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

    // Find or create InspectionPrepItem keyed by intimation item ID
    // Store a mapping so we don't create duplicates
    const intimationItemId = detail.warehouseIntimationItem.id;

    let prepItem = await prisma.inspectionPrepItem.findFirst({
      where: {
        inspectionPrepId: prep.id,
        // We use description as a proxy — but better to use a deterministic field
        // Since there's no direct FK to WarehouseIntimationItem on InspectionPrepItem,
        // we store the intimationItemId in the description field for migration tracking
        description: `MIGRATED_ITEM_${intimationItemId}`,
      },
    });

    if (!prepItem) {
      prepItem = await prisma.inspectionPrepItem.create({
        data: {
          inspectionPrepId: prep.id,
          poItemId: null, // WarehouseIntimationItem has no poItemId per schema check
          description: `MIGRATED_ITEM_${intimationItemId}`,
          make: detail.make || null,
          status: "READY",
        },
      });
      console.log(`  Created InspectionPrepItem for intimation item ${intimationItemId}`);
    }

    // Create HeatEntry (check unique constraint: inspectionPrepItemId + heatNo)
    // Find by compound unique constraint
    let heatEntry = await prisma.heatEntry.findFirst({
      where: {
        inspectionPrepItemId: prepItem.id,
        heatNo: detail.heatNo!,
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
