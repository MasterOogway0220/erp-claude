import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

// Additional specs mapped per product from PRODUCT SPEC MASTER - 1.xlsx
const PRODUCT_ADDITIONAL_SPECS: Record<string, string[]> = {
  "C.S. SEAMLESS PIPE": [
    "NACE MR0175", "NACE MR0103", "NACE MR0175/MR0103", "H2 SERVICE",
    "HIC", "GALVANISED", "IBR", "O2 SERVICE", "AXN1", "AXN2", "AXN4",
    "3LPE COATED", "INTERNAL EXPOXY COATED",
  ],
  "S.S. SEAMLESS PIPE": [
    "NACE MR0175", "NACE MR0103", "NACE MR0175/MR0103",
    "H2 SERVICE", "O2 SERVICE", "IBR",
  ],
  "A.S. SEAMLESS PIPE": [
    "NACE MR0175", "NACE MR0103", "NACE MR0175/MR0103",
    "H2 SERVICE", "IBR", "AXN1", "AXN2", "AXN4",
  ],
  "L.T.C.S. SEAMLESS PIPES": [
    "NACE MR0175", "NACE MR0103", "NACE MR0175/MR0103",
    "H2 SERVICE", "AXN1", "AXN2", "AXN4",
  ],
  "D.S. SEAMLESS PIPES": [
    "NACE MR0175", "NACE MR0103", "NACE MR0175/MR0103",
    "H2 SERVICE", "O2 SERVICE",
  ],
  "C.S. ERW PIPE": [
    "NACE MR0175", "NACE MR0103", "NACE MR0175/MR0103",
  ],
  "S.S. ERW PIPE": [
    "NACE MR0175", "NACE MR0103", "NACE MR0175/MR0103",
    "H2 SERVICE", "O2 SERVICE", "IBR",
  ],
  "D.S. ERW PIPES": [
    "NACE MR0175", "NACE MR0103", "NACE MR0175/MR0103",
    "H2 SERVICE", "O2 SERVICE",
  ],
  "C.S. EFSW PIPE": ["NACE MR0175"],
  "C.S. LSAW PIPE": [
    "NACE MR0103", "NACE MR0175/MR0103", "H2 SERVICE", "HIC",
    "IBR", "AXN1", "AXN2", "AXN4", "3LPE COATED", "INTERNAL EXPOXY COATED",
  ],
  "S.S. EFSW PIPE": [
    "NACE MR0175", "NACE MR0103", "NACE MR0175/MR0103",
    "H2 SERVICE", "O2 SERVICE", "IBR",
  ],
  "A.S. EFSW PIPE": ["NACE MR0175"],
  "A.S. LSAW PIPE": [
    "NACE MR0103", "NACE MR0175/MR0103", "H2 SERVICE",
    "IBR", "AXN1", "AXN2", "AXN4",
  ],
  "L.T.C.S. EFSW PIPES": ["NACE MR0175"],
  "L.T.C.S. LSAW PIPES": [
    "NACE MR0103", "NACE MR0175/MR0103", "H2 SERVICE",
    "AXN1", "AXN2", "AXN4",
  ],
};

export async function POST() {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const existing = await prisma.additionalSpecOption.count({ where: { ...companyFilter(companyId) } });
    if (existing > 0) {
      return NextResponse.json(
        { error: `Additional specs already has ${existing} records. Delete existing before re-seeding.` },
        { status: 400 }
      );
    }

    const records: { product: string; specName: string; companyId?: string }[] = [];
    for (const [product, specs] of Object.entries(PRODUCT_ADDITIONAL_SPECS)) {
      for (const specName of specs) {
        records.push({ product, specName, companyId: companyId || undefined });
      }
    }

    await prisma.additionalSpecOption.createMany({ data: records });

    return NextResponse.json({
      message: `Seeded ${records.length} additional spec options across ${Object.keys(PRODUCT_ADDITIONAL_SPECS).length} products`,
      count: records.length,
    });
  } catch (error) {
    console.error("Error seeding additional specs:", error);
    return NextResponse.json({ error: "Failed to seed additional specs" }, { status: 500 });
  }
}
