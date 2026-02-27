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
        locations: {
          select: { id: true, zone: true, rack: true, bay: true, shelf: true, locationType: true, isActive: true },
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
    const { code, name, address, locations } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    const existing = await prisma.warehouseMaster.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "Warehouse code already exists" }, { status: 400 });
    }

    const warehouse = await prisma.warehouseMaster.create({
      data: {
        code,
        name,
        address: address || null,
        locations: locations?.length ? {
          create: locations.map((loc: any) => ({
            zone: loc.zone || null,
            rack: loc.rack || null,
            bay: loc.bay || null,
            shelf: loc.shelf || null,
            locationType: loc.locationType || "GENERAL",
            capacity: loc.capacity || null,
          })),
        } : undefined,
      },
      include: { locations: true },
    });

    await createAuditLog({ tableName: "WAREHOUSE", recordId: warehouse.id, action: "CREATE", userId: session!.user.id });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
  }
}
