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

    const existing = await prisma.inspectionAgencyMaster.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Inspection agency not found" }, { status: 404 });
    }

    const updated = await prisma.inspectionAgencyMaster.update({
      where: { id },
      data: {
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        contactPerson: body.contactPerson !== undefined ? (body.contactPerson || null) : undefined,
        phone: body.phone !== undefined ? (body.phone || null) : undefined,
        email: body.email !== undefined ? (body.email || null) : undefined,
        address: body.address !== undefined ? (body.address || null) : undefined,
        accreditationDetails: body.accreditationDetails !== undefined ? (body.accreditationDetails || null) : undefined,
        approvedStatus: body.approvedStatus ?? undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    createAuditLog({ userId: session.user.id, action: "UPDATE", tableName: "InspectionAgencyMaster", recordId: id, oldValue: existing.name, newValue: updated.name }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Agency code already exists" }, { status: 400 });
    }
    console.error("Error updating inspection agency:", error);
    return NextResponse.json({ error: "Failed to update inspection agency" }, { status: 500 });
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

    const existing = await prisma.inspectionAgencyMaster.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Inspection agency not found" }, { status: 404 });
    }

    await prisma.inspectionAgencyMaster.delete({ where: { id } });

    createAuditLog({ userId: session.user.id, action: "DELETE", tableName: "InspectionAgencyMaster", recordId: id, oldValue: existing.name }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting inspection agency:", error);
    return NextResponse.json({ error: "Failed to delete inspection agency" }, { status: 500 });
  }
}
