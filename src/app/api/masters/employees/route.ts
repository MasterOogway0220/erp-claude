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
        { name: { contains: search, mode: "insensitive" as const } },
        { employeeCode: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const employees = await prisma.employeeMaster.findMany({
      where,
      include: {
        linkedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Employee name is required" },
        { status: 400 }
      );
    }

    // Auto-generate employee code
    const count = await prisma.employeeMaster.count();
    const employeeCode = `EMP${(count + 1).toString().padStart(4, "0")}`;

    const employee = await prisma.employeeMaster.create({
      data: {
        employeeCode,
        name: body.name,
        department: body.department || null,
        designation: body.designation || null,
        email: body.email || null,
        mobile: body.mobile || null,
        telephone: body.telephone || null,
        linkedUserId: body.linkedUserId || null,
        isActive: body.isActive ?? true,
      },
      include: {
        linkedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
