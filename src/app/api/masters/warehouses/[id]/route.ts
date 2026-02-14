import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const warehouse = await prisma.warehouseMaster.findUnique({
      where: { id },
      include: {
        locations: {
          orderBy: { zone: "asc" },
          include: {
            _count: { select: { inventoryStocks: true } },
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    return NextResponse.json({ error: "Failed to fetch warehouse" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { name, address, isActive } = body;

    const warehouse = await prisma.warehouseMaster.update({
      where: { id },
      data: {
        name: name || undefined,
        address: address !== undefined ? address : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      include: { locations: true },
    });

    await createAuditLog({
      tableName: "WarehouseMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return NextResponse.json({ error: "Failed to update warehouse" }, { status: 500 });
  }
}
