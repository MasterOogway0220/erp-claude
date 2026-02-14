import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

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
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

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

    await createAuditLog({
      tableName: "EmployeeMaster",
      recordId: employee.id,
      action: "CREATE",
      userId: session.user?.id,
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
