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

    const locations = await prisma.warehouseLocation.findMany({
      where: { warehouseId: id },
      include: {
        _count: { select: { inventoryStocks: true } },
      },
      orderBy: [{ zone: "asc" }, { rack: "asc" }],
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { zone, rack, bay, shelf, locationType, capacity } = body;

    const warehouse = await prisma.warehouseMaster.findUnique({ where: { id } });
    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    const location = await prisma.warehouseLocation.create({
      data: {
        warehouseId: id,
        zone: zone || null,
        rack: rack || null,
        bay: bay || null,
        shelf: shelf || null,
        locationType: locationType || "GENERAL",
        capacity: capacity || null,
      },
    });

    await createAuditLog({
      tableName: "WarehouseLocation",
      recordId: location.id,
      action: "CREATE",
      userId: session.user?.id,
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
