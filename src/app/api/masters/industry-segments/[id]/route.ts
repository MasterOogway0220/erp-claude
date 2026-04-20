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

    const updated = await prisma.industrySegmentMaster.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        category: body.category ?? undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    await createAuditLog({ tableName: "IndustrySegmentMaster", recordId: id, action: "UPDATE", userId: session.user?.id, companyId });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "Segment already exists" }, { status: 400 });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
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

    await prisma.industrySegmentMaster.update({ where: { id }, data: softDeleteData(true) });
    await createAuditLog({ tableName: "IndustrySegmentMaster", recordId: id, action: "DELETE", userId: session.user?.id, companyId });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
