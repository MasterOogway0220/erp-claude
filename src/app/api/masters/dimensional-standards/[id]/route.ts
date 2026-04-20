import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { softDeleteData } from "@/lib/soft-delete";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const standard = await prisma.dimensionalStandardMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      include: {
        products: { select: { id: true, product: true } },
      },
    });

    if (!standard) {
      return NextResponse.json({ error: "Dimensional standard not found" }, { status: 404 });
    }

    return NextResponse.json(standard);
  } catch (error) {
    console.error("Error fetching dimensional standard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dimensional standard" },
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

    const updated = await prisma.dimensionalStandardMaster.update({
      where: { id, ...companyFilter(companyId) },
      data: {
        name: body.name ?? undefined,
        code: body.code ?? undefined,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "DimensionalStandardMaster",
      recordId: id,
      companyId,
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A dimensional standard with this code already exists" },
        { status: 400 }
      );
    }
    console.error("Error updating dimensional standard:", error);
    return NextResponse.json(
      { error: "Failed to update dimensional standard" },
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

    const standard = await prisma.dimensionalStandardMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: {
        name: true,
        _count: { select: { products: true } },
      },
    });

    if (!standard) {
      return NextResponse.json({ error: "Dimensional standard not found" }, { status: 404 });
    }

    if (standard._count.products > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${standard.name}". It is used by ${standard._count.products} product specification(s).`,
        },
        { status: 400 }
      );
    }

    await prisma.dimensionalStandardMaster.update({ where: { id, ...companyFilter(companyId) }, data: softDeleteData() });

    createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      tableName: "DimensionalStandardMaster",
      recordId: id,
      companyId,
    }).catch(console.error);

    return NextResponse.json({ message: "Dimensional standard deleted successfully" });
  } catch (error) {
    console.error("Error deleting dimensional standard:", error);
    return NextResponse.json(
      { error: "Failed to delete dimensional standard" },
      { status: 500 }
    );
  }
}
