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

    const unit = await prisma.uomMaster.findUnique({
      where: { id },
    });

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error fetching unit:", error);
    return NextResponse.json(
      { error: "Failed to fetch unit" },
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

    const unit = await prisma.uomMaster.update({
      where: { id },
      data: {
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    await createAuditLog({
      tableName: "UomMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
    });

    return NextResponse.json(unit);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Unit code already exists" },
        { status: 400 }
      );
    }
    console.error("Error updating unit:", error);
    return NextResponse.json(
      { error: "Failed to update unit" },
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

    const unit = await prisma.uomMaster.findUnique({
      where: { id },
      select: { code: true },
    });

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Proactive linked-record check
    const [quotationItemCount, prItemCount] = await Promise.all([
      prisma.quotationItem.count({ where: { uom: unit.code } }),
      prisma.pRItem.count({ where: { uom: unit.code } }),
    ]);
    const linkedUomCount = quotationItemCount + prItemCount;
    if (linkedUomCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete unit. It is referenced by ${linkedUomCount} line item(s) across quotations and purchase requisitions.` },
        { status: 400 }
      );
    }

    await prisma.uomMaster.delete({ where: { id } });

    await createAuditLog({
      tableName: "UomMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
    });

    return NextResponse.json({ message: "Unit deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete unit. It is referenced by other records." },
        { status: 400 }
      );
    }
    console.error("Error deleting unit:", error);
    return NextResponse.json(
      { error: "Failed to delete unit" },
      { status: 500 }
    );
  }
}
