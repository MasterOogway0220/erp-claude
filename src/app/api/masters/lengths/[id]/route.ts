import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const length = await prisma.lengthMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
    });

    if (!length) {
      return NextResponse.json({ error: "Length not found" }, { status: 404 });
    }

    return NextResponse.json(length);
  } catch (error) {
    console.error("Error fetching length:", error);
    return NextResponse.json(
      { error: "Failed to fetch length" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    const updated = await prisma.lengthMaster.update({
      where: { id, ...companyFilter(companyId) },
      data: {
        label: body.label ?? undefined,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "LengthMaster",
      recordId: id,
      companyId,
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A length with this label already exists" },
        { status: 400 }
      );
    }
    console.error("Error updating length:", error);
    return NextResponse.json(
      { error: "Failed to update length" },
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

    const length = await prisma.lengthMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
    });

    if (!length) {
      return NextResponse.json({ error: "Length not found" }, { status: 404 });
    }

    await prisma.lengthMaster.delete({ where: { id, ...companyFilter(companyId) } });

    createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      tableName: "LengthMaster",
      recordId: id,
      companyId,
    }).catch(console.error);

    return NextResponse.json({ message: "Length deleted successfully" });
  } catch (error) {
    console.error("Error deleting length:", error);
    return NextResponse.json(
      { error: "Failed to delete length" },
      { status: 500 }
    );
  }
}
