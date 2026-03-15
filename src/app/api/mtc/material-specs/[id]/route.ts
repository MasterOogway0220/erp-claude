import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("mtc", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const spec = await prisma.mTCMaterialSpec.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        chemicalElements: { orderBy: { sortOrder: "asc" } },
        mechanicalProperties: { orderBy: { sortOrder: "asc" } },
        impactProperties: true,
      },
    });

    if (!spec) {
      return NextResponse.json(
        { error: "Material spec not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ materialSpec: spec });
  } catch (error) {
    console.error("Error fetching material spec:", error);
    return NextResponse.json(
      { error: "Failed to fetch material spec" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("mtc", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.mTCMaterialSpec.findFirst({
      where: { id, ...companyFilter(companyId) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Material spec not found" },
        { status: 404 }
      );
    }

    const {
      materialSpec,
      description,
      startingMaterial,
      heatTreatment,
      heatTreatmentType,
      constructionType,
      dimensionStandard,
      defaultNotes,
      isActive,
      chemicalElements,
      mechanicalProperties,
      impactProperties,
    } = body;

    // Use a transaction to delete and recreate nested data
    const spec = await prisma.$transaction(async (tx) => {
      // Delete existing nested data if new arrays are provided
      if (chemicalElements !== undefined) {
        await tx.mTCChemicalElement.deleteMany({ where: { materialSpecId: id } });
      }
      if (mechanicalProperties !== undefined) {
        await tx.mTCMechanicalProperty.deleteMany({ where: { materialSpecId: id } });
      }
      if (impactProperties !== undefined) {
        await tx.mTCImpactProperty.deleteMany({ where: { materialSpecId: id } });
      }

      // Update the spec and recreate nested data
      return tx.mTCMaterialSpec.update({
        where: { id },
        data: {
          ...(materialSpec !== undefined && { materialSpec }),
          ...(description !== undefined && { description }),
          ...(startingMaterial !== undefined && { startingMaterial }),
          ...(heatTreatment !== undefined && { heatTreatment }),
          ...(heatTreatmentType !== undefined && { heatTreatmentType }),
          ...(constructionType !== undefined && { constructionType }),
          ...(dimensionStandard !== undefined && { dimensionStandard }),
          ...(defaultNotes !== undefined && { defaultNotes }),
          ...(isActive !== undefined && { isActive }),
          ...(chemicalElements !== undefined && {
            chemicalElements: {
              create: chemicalElements.map((el: any) => ({
                element: el.element,
                sortOrder: el.sortOrder || 0,
                minValue: el.minValue,
                maxValue: el.maxValue,
                resultMinValue: el.resultMinValue,
                resultMaxValue: el.resultMaxValue,
              })),
            },
          }),
          ...(mechanicalProperties !== undefined && {
            mechanicalProperties: {
              create: mechanicalProperties.map((mp: any) => ({
                propertyName: mp.propertyName,
                unit: mp.unit,
                sortOrder: mp.sortOrder || 0,
                minValue: mp.minValue,
                maxValue: mp.maxValue,
                resultMinValue: mp.resultMinValue,
                resultMaxValue: mp.resultMaxValue,
              })),
            },
          }),
          ...(impactProperties !== undefined && {
            impactProperties: {
              create: impactProperties.map((ip: any) => ({
                testTemperature: ip.testTemperature,
                specimenSize: ip.specimenSize,
                minEnergy: ip.minEnergy,
                resultMinValue: ip.resultMinValue,
                resultMaxValue: ip.resultMaxValue,
              })),
            },
          }),
        },
        include: {
          chemicalElements: { orderBy: { sortOrder: "asc" } },
          mechanicalProperties: { orderBy: { sortOrder: "asc" } },
          impactProperties: true,
        },
      });
    });

    await createAuditLog({
      tableName: "MTCMaterialSpec",
      recordId: id,
      action: "UPDATE",
      userId: session?.user?.id,
      companyId,
    });

    return NextResponse.json({ materialSpec: spec });
  } catch (error) {
    console.error("Error updating material spec:", error);
    return NextResponse.json(
      { error: "Failed to update material spec" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("mtc", "delete");
    if (!authorized) return response!;

    const { id } = await params;

    const existing = await prisma.mTCMaterialSpec.findFirst({
      where: { id, ...companyFilter(companyId) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Material spec not found" },
        { status: 404 }
      );
    }

    // Delete nested data first, then the spec
    await prisma.$transaction(async (tx) => {
      await tx.mTCChemicalElement.deleteMany({ where: { materialSpecId: id } });
      await tx.mTCMechanicalProperty.deleteMany({ where: { materialSpecId: id } });
      await tx.mTCImpactProperty.deleteMany({ where: { materialSpecId: id } });
      await tx.mTCMaterialSpec.delete({ where: { id } });
    });

    await createAuditLog({
      tableName: "MTCMaterialSpec",
      recordId: id,
      action: "DELETE",
      userId: session?.user?.id,
      companyId,
    });

    return NextResponse.json({ message: "Material spec deleted successfully" });
  } catch (error) {
    console.error("Error deleting material spec:", error);
    return NextResponse.json(
      { error: "Failed to delete material spec" },
      { status: 500 }
    );
  }
}
