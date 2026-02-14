import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const employee = await prisma.employeeMaster.findUnique({
      where: { id },
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
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const employee = await prisma.employeeMaster.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        department: body.department ?? undefined,
        designation: body.designation ?? undefined,
        email: body.email ?? undefined,
        mobile: body.mobile ?? undefined,
        telephone: body.telephone ?? undefined,
        linkedUserId: body.linkedUserId ?? undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    await createAuditLog({
      tableName: "EmployeeMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
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
    const { authorized, session, response } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const { id } = await params;

    const employee = await prisma.employeeMaster.findUnique({
      where: { id },
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

    await prisma.employeeMaster.delete({ where: { id } });

    await createAuditLog({
      tableName: "EmployeeMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
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
