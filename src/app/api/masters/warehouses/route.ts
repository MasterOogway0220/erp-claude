import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const warehouses = await prisma.warehouseMaster.findMany({
      where,
      include: {
        addresses: { orderBy: { isDefault: "desc" } },
        locations: {
          select: { id: true, zone: true, rack: true, bay: true, shelf: true, locationType: true, isActive: true, locationTag: true, capacity: true, preservationMethod: true, storageConditions: true },
          orderBy: { zone: "asc" },
        },
        _count: { select: { locations: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ warehouses });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { code, name, gstNo, addressLine1, addressLine2, pincode, state, country, stockVisible, isSelfStock, addresses } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    const existing = await prisma.warehouseMaster.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "Warehouse code already exists" }, { status: 400 });
    }

    // Use first address fields as primary for backward-compat fields
    const primaryAddr = addresses?.[0];

    const warehouse = await prisma.warehouseMaster.create({
      data: {
        code,
        name,
        gstNo: (primaryAddr?.gstNo || gstNo) || null,
        addressLine1: (primaryAddr?.addressLine1 || addressLine1) || null,
        addressLine2: (primaryAddr?.addressLine2 || addressLine2) || null,
        pincode: (primaryAddr?.pincode || pincode) || null,
        state: (primaryAddr?.state || state) || null,
        country: (primaryAddr?.country || country) || "India",
        stockVisible: stockVisible !== undefined ? stockVisible : true,
        isSelfStock: isSelfStock !== undefined ? isSelfStock : true,
        addresses: addresses?.length ? {
          create: addresses.map((addr: any, idx: number) => ({
            label: addr.label || null,
            addressLine1: addr.addressLine1 || null,
            addressLine2: addr.addressLine2 || null,
            city: addr.city || null,
            pincode: addr.pincode || null,
            state: addr.state || null,
            country: addr.country || "India",
            gstNo: addr.gstNo || null,
            isDefault: idx === 0,
          })),
        } : undefined,
      },
      include: { addresses: true, locations: true },
    });

    await createAuditLog({ tableName: "WAREHOUSE", recordId: warehouse.id, action: "CREATE", userId: session!.user.id });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
  }
}
