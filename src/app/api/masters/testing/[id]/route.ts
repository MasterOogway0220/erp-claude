import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { softDeleteData } from "@/lib/soft-delete";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.testingMaster.findFirst({
      where: { id, ...companyFilter(companyId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Testing type not found" }, { status: 404 });
    }

    const updated = await prisma.testingMaster.update({
      where: { id },
      data: {
        testName: body.testName ?? undefined,
        applicableFor: body.applicableFor ?? undefined,
        isMandatory: body.isMandatory ?? undefined,
      },
    });

    await createAuditLog({
      tableName: "TestingMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating testing master:", error);
    return NextResponse.json({ error: "Failed to update testing type" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await params;

    const existing = await prisma.testingMaster.findFirst({
      where: { id, ...companyFilter(companyId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Testing type not found" }, { status: 404 });
    }

    await prisma.testingMaster.update({ where: { id }, data: softDeleteData() });

    await createAuditLog({
      tableName: "TestingMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json({ message: "Testing type deleted" });
  } catch (error) {
    console.error("Error deleting testing master:", error);
    return NextResponse.json({ error: "Failed to delete testing type" }, { status: 500 });
  }
}
