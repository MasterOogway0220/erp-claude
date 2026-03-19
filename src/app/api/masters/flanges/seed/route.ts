import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

// ASME B16.5: up to 24" — all 6 types
const SIZES_B165 = [
  '1/2"', '3/4"', '1"', '1.25"', '1.5"', '2"', '2.5"', '3"',
  '4"', '5"', '6"', '8"', '10"', '12"', '14"', '16"', '18"', '20"', '22"', '24"',
];
const RATINGS_B165 = ["150", "300", "400", "600", "900", "1500", "2500"];
const TYPES_B165 = ["Weld Neck", "Slip On", "Socket Weld", "Blind", "Lap Joint", "Threaded"];

// ASME B16.47 Series A: 26"-60" in 150#, 300#, 400#, 600#, 900# — only WN & BL
const SIZES_B1647 = [
  '26"', '28"', '30"', '32"', '34"', '36"', '38"', '40"',
  '42"', '44"', '46"', '48"', '50"', '52"', '54"', '56"', '58"', '60"',
];
const RATINGS_B1647_A = ["150", "300", "400", "600", "900"];

// ASME B16.47 Series B: varies by rating
const RATINGS_B1647_B_FULL = ["75", "150", "300"]; // 26"-60"
const RATINGS_B1647_B_LIMITED: [string, string[]][] = [
  ["400", ['26"', '28"', '30"', '32"', '34"', '36"']],
  ["600", ['26"', '28"', '30"', '32"', '34"', '36"']],
  ["900", ['26"', '28"', '30"', '32"', '34"', '36"']],
];

const TYPES_B1647 = ["Weld Neck", "Blind"];

export async function POST() {
  try {
    const { authorized, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const existingCount = await prisma.flangeMaster.count();
    if (existingCount > 0) {
      return NextResponse.json(
        { error: `Flange master already has ${existingCount} records. Delete existing records before re-seeding.` },
        { status: 400 }
      );
    }

    const records: any[] = [];

    // ASME B16.5 flanges
    for (const type of TYPES_B165) {
      for (const size of SIZES_B165) {
        for (const rating of RATINGS_B165) {
          records.push({
            type, size, rating,
            materialGrade: "ASTM A105",
            standard: "ASME B16.5",
            facing: "RF",
            description: `${type} ${size}NB x ${rating}# RF, ASTM A105, ASME B16.5`,
          });
        }
      }
    }

    // ASME B16.47 Series A flanges
    for (const type of TYPES_B1647) {
      for (const size of SIZES_B1647) {
        for (const rating of RATINGS_B1647_A) {
          records.push({
            type, size, rating,
            materialGrade: "ASTM A105",
            standard: "ASME B16.47 Series A",
            facing: "RF",
            description: `${type} ${size}NB x ${rating}# RF, ASTM A105, ASME B16.47 Series A`,
          });
        }
      }
    }

    // ASME B16.47 Series B flanges — full sizes
    for (const type of TYPES_B1647) {
      for (const size of SIZES_B1647) {
        for (const rating of RATINGS_B1647_B_FULL) {
          records.push({
            type, size, rating,
            materialGrade: "ASTM A105",
            standard: "ASME B16.47 Series B",
            facing: "RF",
            description: `${type} ${size}NB x ${rating}# RF, ASTM A105, ASME B16.47 Series B`,
          });
        }
      }
    }

    // ASME B16.47 Series B flanges — limited sizes (400#, 600#, 900# only up to 36")
    for (const type of TYPES_B1647) {
      for (const [rating, sizes] of RATINGS_B1647_B_LIMITED) {
        for (const size of sizes) {
          records.push({
            type, size, rating,
            materialGrade: "ASTM A105",
            standard: "ASME B16.47 Series B",
            facing: "RF",
            description: `${type} ${size}NB x ${rating}# RF, ASTM A105, ASME B16.47 Series B`,
          });
        }
      }
    }

    // Batch insert
    const chunkSize = 100;
    for (let i = 0; i < records.length; i += chunkSize) {
      await prisma.flangeMaster.createMany({ data: records.slice(i, i + chunkSize) });
    }

    return NextResponse.json({
      message: `Successfully seeded ${records.length} flange records (B16.5 + B16.47 Series A & B)`,
      count: records.length,
    });
  } catch (error) {
    console.error("Error seeding flanges:", error);
    return NextResponse.json({ error: "Failed to seed flanges" }, { status: 500 });
  }
}
