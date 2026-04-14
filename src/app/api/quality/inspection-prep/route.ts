import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("inspectionPrep", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = { ...companyFilter(companyId) };
    if (search) {
      where.OR = [
        { prepNo: { contains: search, mode: "insensitive" } },
        { purchaseOrder: { poNo: { contains: search, mode: "insensitive" } } },
      ];
    }

    const preps = await prisma.inspectionPrep.findMany({
      where,
      include: {
        purchaseOrder: { select: { id: true, poNo: true } },
        warehouseIntimation: { select: { id: true, mprNo: true } },
        preparedBy: { select: { name: true } },
        items: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ preps });
  } catch (error) {
    console.error("Error fetching inspection preps:", error);
    return NextResponse.json({ error: "Failed to fetch inspection preps" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { poId, warehouseIntimationId, itemsToInclude } = body;

    if (!poId && !warehouseIntimationId) {
      return NextResponse.json(
        { error: "Either a Purchase Order or Warehouse Intimation is required" },
        { status: 400 }
      );
    }

    const prepNo = await generateDocumentNumber("INSPECTION_PREP", companyId);

    const prep = await prisma.inspectionPrep.create({
      data: {
        prepNo,
        companyId,
        poId: poId || null,
        warehouseIntimationId: warehouseIntimationId || null,
        preparedById: session.user.id,
        status: "DRAFT",
        items: itemsToInclude?.length
          ? {
              create: itemsToInclude.map((item: any) => ({
                poItemId: item.poItemId || null,
                description: item.description || null,
                sizeLabel: item.sizeLabel || null,
                uom: item.uom || null,
                make: item.make || null,
                status: "PENDING",
              })),
            }
          : undefined,
      },
      include: {
        items: true,
        purchaseOrder: { select: { id: true, poNo: true } },
        warehouseIntimation: { select: { id: true, mprNo: true } },
      },
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "CREATE",
      tableName: "InspectionPrep",
      recordId: prep.id,
      newValue: JSON.stringify({ prepNo: prep.prepNo }),
    }).catch(console.error);

    return NextResponse.json(prep, { status: 201 });
  } catch (error: any) {
    console.error("Error creating inspection prep:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create inspection prep" },
      { status: 500 }
    );
  }
}
