import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { softDeleteData } from "@/lib/soft-delete";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (body.name !== undefined && !body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.paymentTermsMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Payment term not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.paymentTermsMaster.update({
      where: { id, ...companyFilter(companyId) },
      data: {
        code: body.code !== undefined ? (body.code || null) : undefined,
        name: body.name ?? undefined,
        description: body.description !== undefined ? (body.description || null) : undefined,
        days: body.days ?? undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "PaymentTermsMaster",
      recordId: id,
      oldValue: existing.name,
      newValue: updated.name,
      companyId,
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Payment term code already exists" },
        { status: 400 }
      );
    }
    console.error("Error updating payment term:", error);
    return NextResponse.json(
      { error: "Failed to update payment term" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const existing = await prisma.paymentTermsMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: {
        name: true,
        _count: {
          select: {
            customers: true,
            quotations: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Payment term not found" },
        { status: 404 }
      );
    }

    const linkedCount = existing._count.customers + existing._count.quotations;
    if (linkedCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${existing.name}". It is linked to ${existing._count.customers} customers and ${existing._count.quotations} quotations. Deactivate instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.paymentTermsMaster.update({ where: { id, ...companyFilter(companyId) }, data: softDeleteData(true) });

    createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      tableName: "PaymentTermsMaster",
      recordId: id,
      oldValue: existing.name,
      companyId,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment term:", error);
    return NextResponse.json(
      { error: "Failed to delete payment term" },
      { status: 500 }
    );
  }
}
