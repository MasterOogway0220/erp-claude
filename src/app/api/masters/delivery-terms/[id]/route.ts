import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (body.name !== undefined && !body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.deliveryTermsMaster.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Delivery term not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.deliveryTermsMaster.update({
      where: { id },
      data: {
        code: body.code !== undefined ? (body.code || null) : undefined,
        name: body.name ?? undefined,
        description: body.description !== undefined ? (body.description || null) : undefined,
        incoterms: body.incoterms !== undefined ? (body.incoterms || null) : undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "DeliveryTermsMaster",
      recordId: id,
      oldValue: existing.name,
      newValue: updated.name,
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Delivery term code already exists" },
        { status: 400 }
      );
    }
    console.error("Error updating delivery term:", error);
    return NextResponse.json(
      { error: "Failed to update delivery term" },
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
    const { authorized, session, response } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const existing = await prisma.deliveryTermsMaster.findUnique({
      where: { id },
      select: {
        name: true,
        _count: {
          select: {
            quotations: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Delivery term not found" },
        { status: 404 }
      );
    }

    if (existing._count.quotations > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${existing.name}". It is linked to ${existing._count.quotations} quotations. Deactivate instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.deliveryTermsMaster.delete({ where: { id } });

    createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      tableName: "DeliveryTermsMaster",
      recordId: id,
      oldValue: existing.name,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting delivery term:", error);
    return NextResponse.json(
      { error: "Failed to delete delivery term" },
      { status: 500 }
    );
  }
}
