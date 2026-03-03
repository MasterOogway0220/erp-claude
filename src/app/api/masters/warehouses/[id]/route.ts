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
    const { name, gstNo, addressLine1, addressLine2, pincode, state, country, stockVisible, isSelfStock, isActive } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (gstNo !== undefined) data.gstNo = gstNo || null;
    if (addressLine1 !== undefined) data.addressLine1 = addressLine1 || null;
    if (addressLine2 !== undefined) data.addressLine2 = addressLine2 || null;
    if (pincode !== undefined) data.pincode = pincode || null;
    if (state !== undefined) data.state = state || null;
    if (country !== undefined) data.country = country || "India";
    if (stockVisible !== undefined) data.stockVisible = stockVisible;
    if (isSelfStock !== undefined) data.isSelfStock = isSelfStock;
    if (isActive !== undefined) data.isActive = isActive;

    const warehouse = await prisma.warehouseMaster.update({
      where: { id },
      data,
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
