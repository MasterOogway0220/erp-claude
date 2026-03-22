import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/masters/material-codes/check-duplicate
 * Check if a material code with the same product specifications already exists.
 */
export async function POST(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const body = await request.json();
    const { productType, materialGrade, size, schedule, code } = body;

    if (!productType && !materialGrade && !size) {
      return NextResponse.json({ duplicates: [] });
    }

    const where: any = { ...companyFilter(companyId) };
    const conditions: any[] = [];

    if (productType) conditions.push({ productType: { equals: productType } });
    if (materialGrade) conditions.push({ materialGrade: { equals: materialGrade } });
    if (size) conditions.push({ size: { equals: size } });
    if (schedule) conditions.push({ schedule: { equals: schedule } });

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    // Exclude the current code from results
    if (code) {
      where.NOT = { code };
    }

    const duplicates = await prisma.materialCodeMaster.findMany({
      where,
      take: 5,
      select: {
        id: true,
        code: true,
        productType: true,
        materialGrade: true,
        size: true,
        schedule: true,
        description: true,
      },
    });

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error("Error checking duplicate material codes:", error);
    return NextResponse.json(
      { error: "Failed to check duplicates" },
      { status: 500 }
    );
  }
}
