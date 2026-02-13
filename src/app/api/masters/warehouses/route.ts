import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" as const } },
        { name: { contains: search, mode: "insensitive" as const } },
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
  }
}
