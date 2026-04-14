import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const employee = await prisma.employeeMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      include: {
        linkedUser: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    // Update employee record
    const employee = await prisma.employeeMaster.update({
      where: { id, ...companyFilter(companyId) },
      data: {
        name: body.name ?? undefined,
        department: body.department ?? undefined,
        designation: body.designation ?? undefined,
        email: body.email ?? undefined,
        mobile: body.mobile ?? undefined,
        moduleAccess: Array.isArray(body.moduleAccess) ? JSON.stringify(body.moduleAccess) : undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    // Update linked user's role and optionally password
    if (employee.linkedUserId) {
      const userUpdate: Record<string, unknown> = {};

      if (body.role) {
        userUpdate.role = body.role;
      }
      if (body.email) {
        userUpdate.email = body.email;
      }
      if (body.name) {
        userUpdate.name = body.name;
      }
      if (body.password && body.password.length >= 6) {
        userUpdate.passwordHash = await bcrypt.hash(body.password, 10);
      }

      if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({
          where: { id: employee.linkedUserId },
          data: userUpdate,
        });
      }
    }

    await createAuditLog({
      tableName: "EmployeeMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const { id } = await params;

    const employee = await prisma.employeeMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: {
        name: true,
        _count: { select: { quotationsPrepared: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (employee._count.quotationsPrepared > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete employee "${employee.name}". They have ${employee._count.quotationsPrepared} quotation(s) linked. Deactivate instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.employeeMaster.delete({ where: { id, ...companyFilter(companyId) } });

    await createAuditLog({
      tableName: "EmployeeMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
