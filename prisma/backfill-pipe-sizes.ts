/**
 * Backfill Script: Parse PipeSizeMaster sizeLabel → nps + schedule
 *
 * Parses patterns like:
 *   1/2" NB X Sch 40  →  nps=0.5,  schedule="Sch 40"
 *   3/4" NB X Sch 80S →  nps=0.75, schedule="Sch 80S"
 *   1-1/2" NB X XS    →  nps=1.5,  schedule="XS"
 *   6" NB X STD        →  nps=6,    schedule="STD"
 *
 * Run: npx tsx prisma/backfill-pipe-sizes.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseFraction(s: string): number | null {
  s = s.trim();

  // Mixed fraction: e.g. "1-1/2"
  const mixedMatch = s.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return null;
    return whole + num / den;
  }

  // Simple fraction: e.g. "1/2", "3/4"
  const fracMatch = s.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    if (den === 0) return null;
    return num / den;
  }

  // Whole number or decimal: e.g. "6", "10", "0.5"
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

function parseSizeLabel(sizeLabel: string): { nps: number | null; schedule: string | null } {
  // Normalize whitespace
  const label = sizeLabel.trim();

  // Try to match pattern: {SIZE}" NB X {SCHEDULE}
  // or {SIZE}" NB x {SCHEDULE} (case insensitive X)
  const match = label.match(/^(.+?)"\s*NB\s*[Xx]\s*(.+)$/);
  if (!match) {
    // Try without NB: {SIZE}" X {SCHEDULE}
    const match2 = label.match(/^(.+?)"\s*[Xx]\s*(.+)$/);
    if (!match2) {
      return { nps: null, schedule: null };
    }
    const nps = parseFraction(match2[1]);
    const schedule = match2[2].trim() || null;
    return { nps, schedule };
  }

  const nps = parseFraction(match[1]);
  const schedule = match[2].trim() || null;
  return { nps, schedule };
}

async function main() {
  console.log("Backfilling PipeSizeMaster nps + schedule from sizeLabel...\n");

  const allSizes = await prisma.pipeSizeMaster.findMany();
  console.log(`Found ${allSizes.length} pipe size records`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const size of allSizes) {
    const { nps, schedule } = parseSizeLabel(size.sizeLabel);

    if (nps === null && schedule === null) {
      console.log(`  SKIP: "${size.sizeLabel}" — could not parse`);
      skipped++;
      continue;
    }

    try {
      await prisma.pipeSizeMaster.update({
        where: { id: size.id },
        data: {
          nps: nps !== null ? nps : undefined,
          schedule: schedule !== null ? schedule : undefined,
        },
      });
      updated++;
    } catch (err) {
      console.error(`  FAIL: "${size.sizeLabel}" — ${err}`);
      failed++;
    }
  }

  console.log(`\nBackfill complete:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed:  ${failed}`);
}

main()
  .catch((e) => {
    console.error("Backfill error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
