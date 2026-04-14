import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("inspectionPrep", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const prep = await prisma.inspectionPrep.findUnique({
      where: { id },
      include: {
        purchaseOrder: { select: { id: true, poNo: true } },
        warehouseIntimation: { select: { id: true, mprNo: true } },
        preparedBy: { select: { id: true, name: true } },
        items: {
          include: {
            poItem: { select: { id: true, product: true, material: true, sizeLabel: true } },
            heatEntries: {
              include: {
                mtcDocuments: { orderBy: { createdAt: "asc" } },
                addedBy: { select: { name: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!prep) {
      return NextResponse.json({ error: "Inspection Prep not found" }, { status: 404 });
    }

    return NextResponse.json(prep);
  } catch (error) {
    console.error("Error fetching inspection prep:", error);
    return NextResponse.json({ error: "Failed to fetch inspection prep" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const prep = await prisma.inspectionPrep.update({
      where: { id },
      data: { status },
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "STATUS_CHANGE",
      tableName: "InspectionPrep",
      recordId: id,
      newValue: JSON.stringify({ status }),
    }).catch(console.error);

    return NextResponse.json(prep);
  } catch (error: any) {
    console.error("Error updating inspection prep:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update inspection prep" },
      { status: 500 }
    );
  }
}
