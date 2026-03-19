// Seed script to import flange sizes from FLANGE SIZE MASTER.xlsx
// Run: npx tsx scripts/seed-flange-sizes.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 20 sizes x 7 classes = 140 combinations from the Excel
const SIZES = [
  '1/2"', '3/4"', '1"', '1.25"', '1.5"', '2"', '2.5"', '3"',
  '4"', '5"', '6"', '8"', '10"', '12"', '14"', '16"', '18"', '20"', '22"', '24"',
];

const RATINGS = ["150", "300", "400", "600", "900", "1500", "2500"];

const TYPES = [
  "Weld Neck",
  "Slip On",
  "Socket Weld",
  "Blind",
  "Lap Joint",
  "Threaded",
];

// We seed one entry per Type x Size x Rating with a placeholder material grade
// Users will then set the actual material grades when creating quotations

async function main() {
  console.log("Checking existing flange data...");
  const existingCount = await prisma.flangeMaster.count();
  console.log(`Found ${existingCount} existing flange records.`);

  if (existingCount > 0) {
    console.log("Flange data already exists. Skipping seed to avoid duplicates.");
    console.log("To re-seed, delete existing records first.");
    return;
  }

  console.log("Seeding flange master with all Type x Size x Rating combinations...");

  const records: any[] = [];
  for (const type of TYPES) {
    for (const size of SIZES) {
      for (const rating of RATINGS) {
        records.push({
          type,
          size,
          rating,
          materialGrade: "ASTM A105", // Default CS material, users can edit
          standard: "ASME B16.5",
          facing: "RF",
          description: `${type} ${size}NB x ${rating}# RF, ASTM A105, ASME B16.5`,
        });
      }
    }
  }

  console.log(`Inserting ${records.length} flange records...`);

  // Batch insert in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await prisma.flangeMaster.createMany({ data: chunk });
    console.log(`  Inserted ${Math.min(i + chunkSize, records.length)} / ${records.length}`);
  }

  console.log("Done! Flange master seeded successfully.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
