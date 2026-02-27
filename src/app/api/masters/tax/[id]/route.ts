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
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = await prisma.taxMaster.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tax rate not found" }, { status: 404 });
    }

    const updated = await prisma.taxMaster.update({
      where: { id },
      data: {
        code: body.code !== undefined ? (body.code || null) : undefined,
        name: body.name ?? undefined,
        percentage: body.percentage ?? undefined,
        taxType: body.taxType !== undefined ? (body.taxType || null) : undefined,
        hsnCode: body.hsnCode !== undefined ? (body.hsnCode || null) : undefined,
        effectiveFrom: body.effectiveFrom !== undefined ? (body.effectiveFrom ? new Date(body.effectiveFrom) : null) : undefined,
        effectiveTo: body.effectiveTo !== undefined ? (body.effectiveTo ? new Date(body.effectiveTo) : null) : undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    createAuditLog({ userId: session.user.id, action: "UPDATE", tableName: "TaxMaster", recordId: id, oldValue: existing.name, newValue: updated.name }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating tax rate:", error);
    return NextResponse.json({ error: "Failed to update tax rate" }, { status: 500 });
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

    const existing = await prisma.taxMaster.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tax rate not found" }, { status: 404 });
    }

    await prisma.taxMaster.delete({ where: { id } });

    createAuditLog({ userId: session.user.id, action: "DELETE", tableName: "TaxMaster", recordId: id, oldValue: existing.name }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tax rate:", error);
    return NextResponse.json({ error: "Failed to delete tax rate" }, { status: 500 });
  }
}
