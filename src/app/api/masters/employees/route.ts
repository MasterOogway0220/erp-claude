import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = { ...companyFilter(companyId) };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { employeeCode: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const raw = await prisma.employeeMaster.findMany({
      where,
      include: {
        linkedUser: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { name: "asc" },
    });

    const employees = raw.map((e) => ({
      id: e.id,
      code: e.employeeCode,
      name: e.name,
      department: e.department,
      designation: e.designation,
      email: e.email,
      mobile: e.mobile,
      userId: e.linkedUserId,
      user: e.linkedUser,
      role: e.linkedUser?.role || null,
      moduleAccess: e.moduleAccess ? (() => { try { return JSON.parse(e.moduleAccess!); } catch { return []; } })() : [],
      isActive: e.isActive,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

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
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "Employee name is required" }, { status: 400 });
    }
    if (!body.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!body.password || body.password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    if (!body.role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    // Check if email already exists as a user
    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    // Auto-generate employee code (scoped to company)
    const count = await prisma.employeeMaster.count({
      where: { ...companyFilter(companyId) },
    });
    const employeeCode = `EMP${(count + 1).toString().padStart(4, "0")}`;

    // Hash password and create user account
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        role: body.role,
        phone: body.mobile || null,
        companyId: companyId || null,
      },
    });

    // Create employee linked to the new user
    const employee = await prisma.employeeMaster.create({
      data: {
        companyId,
        employeeCode,
        name: body.name,
        department: body.department || null,
        designation: body.designation || null,
        email: body.email,
        mobile: body.mobile || null,
        linkedUserId: user.id,
        moduleAccess: Array.isArray(body.moduleAccess) ? JSON.stringify(body.moduleAccess) : "[]",
        isActive: true,
      },
      include: {
        linkedUser: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await createAuditLog({
      tableName: "EmployeeMaster",
      recordId: employee.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
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
