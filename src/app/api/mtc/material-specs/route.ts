import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("mtc", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = { ...companyFilter(companyId), isActive: true };

    if (search) {
      where.OR = [
        { materialSpec: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const materialSpecs = await prisma.mTCMaterialSpec.findMany({
      where,
      include: {
        chemicalElements: { orderBy: { sortOrder: "asc" } },
        mechanicalProperties: { orderBy: { sortOrder: "asc" } },
        impactProperties: true,
      },
      orderBy: { materialSpec: "asc" },
    });

    return NextResponse.json({ materialSpecs });
  } catch (error) {
    console.error("Error fetching material specs:", error);
    return NextResponse.json(
      { error: "Failed to fetch material specs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("mtc", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      materialSpec,
      description,
      startingMaterial,
      heatTreatment,
      heatTreatmentType,
      constructionType,
      dimensionStandard,
      defaultNotes,
      chemicalElements = [],
      mechanicalProperties = [],
      impactProperties = [],
    } = body;

    if (!materialSpec) {
      return NextResponse.json(
        { error: "Material specification is required" },
        { status: 400 }
      );
    }

    const spec = await prisma.mTCMaterialSpec.create({
      data: {
        companyId: companyId || undefined,
        materialSpec,
        description,
        startingMaterial,
        heatTreatment,
        heatTreatmentType,
        constructionType,
        dimensionStandard,
        defaultNotes,
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
        impactProperties: {
          create: impactProperties.map((ip: any) => ({
            testTemperature: ip.testTemperature,
            specimenSize: ip.specimenSize,
            minEnergy: ip.minEnergy,
            resultMinValue: ip.resultMinValue,
            resultMaxValue: ip.resultMaxValue,
          })),
        },
      },
      include: {
        chemicalElements: { orderBy: { sortOrder: "asc" } },
        mechanicalProperties: { orderBy: { sortOrder: "asc" } },
        impactProperties: true,
      },
    });

    await createAuditLog({
      tableName: "MTCMaterialSpec",
      recordId: spec.id,
      action: "CREATE",
      userId: session?.user?.id,
      companyId,
    });

    return NextResponse.json({ materialSpec: spec }, { status: 201 });
  } catch (error) {
    console.error("Error creating material spec:", error);
    return NextResponse.json(
      { error: "Failed to create material spec" },
      { status: 500 }
    );
  }
}
